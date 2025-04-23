import Header from './components/Header';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Modal from 'react-modal';
import DepositModal from './components/DepositModal';
import { useAztec } from './contexts/AztecContext';
import { Fr } from '@aztec/aztec.js';
import { formatUSDC, toUSDCDecimals } from './utils';
import { IntentAction } from '@nemi-fi/wallet-sdk/eip1193';
import DataTable from './components/DataTable';
import PaymentModal from './components/PaymentModal';
import { CircleUserRound, Plus } from 'lucide-react';
import IncreaseBalanceModal from './components/IncreaseBalanceModal';
import WithdrawModal from './components/WithdrawModal';
import {
  CreditorData,
  CurrencyCode,
  OPEN_POSITION_HEADERS,
  OWNED_POSITION_HEADERS,
} from './utils/data';
import useWebSocket from './hooks/useWebsocket';
import Loader from './components/Loader';
import { poseidon2Hash } from '@aztec/foundation/crypto';
Modal.setAppElement('#root');

const TABS = ['Your Positions', 'Open Orders'];

type OwnedPositions = {
  balance: bigint;
  commitment: bigint;
  currency: string;
  withdrawable_at: bigint;
  withdrawable_balance: bigint;
};

const {
  VITE_APP_SERVER_URL: SERVER_URL,
  VITE_APP_WEBSOCKET_URL: WEBSOCKET_URL,
} = import.meta.env;

function App() {
  const {
    escrowContract,
    setTokenBalance,
    tokenContract,
    tokenContractTest,
    wallet,
  } = useAztec();
  const [orders, setOrders] = useState<Array<CreditorData>>([]);
  const [fetchingOrders, setFetchingOrders] = useState<boolean>(true);
  const [fetchingPositions, setFetchingTokenPositions] =
    useState<boolean>(true);
  const [positions, setPositions] = useState<OwnedPositions[]>([]);
  const [selectedCreditor, setSelectedCreditor] = useState<CreditorData | null>(
    null
  );
  const [selectedTab, setSelectedTab] = useState<string>(TABS[1]);
  const [showDepositModal, setShowDepositModal] = useState<boolean>(false);
  const [showIncreaseBalanceModal, setShowIncreaseBalanceModal] =
    useState<number>(-1);
  const [showWithdrawModal, setShowWithdrawModal] = useState<number>(-1);

  const { message } = useWebSocket(WEBSOCKET_URL);

  const formattedOrders = useMemo(() => {
    const position = positions[0];
    return orders.map((order) => ({
      ...order,
      pool:
        order.commitment === position?.commitment ? (
          <div className='flex items-center gap-2'>
            <div>{new Fr(order.commitment).toShortString()}</div>
            <div className='border border-[#904FD1] bg-[rgba(145,61,229,.5)] flex gap-1 items-center p-0.5 rounded-full text-xs'>
              Owned
              <CircleUserRound size={12} />
            </div>
          </div>
        ) : (
          new Fr(order.commitment).toShortString()
        ),
      balance: `£${formatUSDC(order.balance)}`,
      disableAction: order.commitment === position?.commitment,
    }));
  }, [orders, positions]);

  // TODO: Set up table component to handle different data formats insteads of mapping through array
  const formattedPositions = useMemo(() => {
    return positions.map((position) => ({
      balance: `£${formatUSDC(position.balance)}`,
      currency: position.currency,
      withdrawable_at: position.withdrawable_at.toString(),
      withdrawable_balance: `£${formatUSDC(position.withdrawable_balance)}`,
    }));
  }, [positions]);

  const depositFunds = async (
    sortCode: string,
    currencyCode: string,
    amount: number
  ) => {
    if (!escrowContract || !tokenContract || !wallet) return;

    const depositAmount = toUSDCDecimals(BigInt(amount));

    try {
      const sortcodeField = Fr.fromBufferReduce(
        Buffer.from(sortCode).reverse()
      );
      const currencyCodeField = Fr.fromBufferReduce(
        Buffer.from(currencyCode.slice(0, 3)).reverse()
      );

      // create authwit for escrow to transfer from user's private balance
      const executionPayload = await tokenContract.methods
        .transfer_to_public(
          wallet.getAddress(),
          escrowContract.address,
          depositAmount,
          0
        )
        .request();

      const authWitness: IntentAction = {
        caller: escrowContract.address,
        action: executionPayload.calls[0],
      };

      await escrowContract
        .withAccount(wallet)
        .methods.init_escrow_balance(
          sortcodeField,
          currencyCodeField,
          depositAmount,
          Fr.random(),
          { authWitnesses: [authWitness] }
        )
        .send()
        .wait();

      // update token balance
      setTokenBalance((prev) => ({
        ...prev,
        private: prev.private - depositAmount,
      }));

      // compute commitmentment and post to DB
      const commitment = await poseidon2Hash([
        sortcodeField,
        currencyCodeField,
      ]);

      // update positions
      setPositions([
        {
          balance: depositAmount,
          commitment: commitment.toBigInt(),
          currency: 'GBP',
          withdrawable_at: 0n,
          withdrawable_balance: 0n,
        },
      ]);

      // store commitment on DB
      await fetch(`${SERVER_URL}/commitment`, {
        body: JSON.stringify({
          sortCode,
          commitment: commitment.toBigInt().toString(),
        }),
        headers: {
          'content-type': 'application/json',
          'ngrok-skip-browser-warning': '69420',
        },
        method: 'POST',
      });

      // set order
      setOrders((prev) => {
        const order: CreditorData = {
          balance: depositAmount,
          commitment: commitment.toBigInt(),
          currency: CurrencyCode.GBP,
          sortCode,
        };
        return [...prev, order];
      });

      toast.success('Succesfully initialized provider balance');
    } catch (err) {
      console.log('Error: ', err);
      toast.error('Error initializing provider balance');
    }
  };

  const getCommitments = async () => {
    const res = await fetch(`${SERVER_URL}/commitments`, {
      headers: { 'ngrok-skip-browser-warning': '69420' },
    });
    const commitments = await res.json();
    return commitments;
  };

  const getEscrowOwnerNote = useCallback(async () => {
    if (!escrowContract || !wallet) return;
    return await escrowContract.methods
      .get_escrow_owner_note(wallet.getAddress())
      .simulate();
  }, [escrowContract, wallet]);

  const getOrders = useCallback(async () => {
    if (!escrowContract) return;
    setFetchingOrders(true);
    try {
      const commitments = await getCommitments();
      const providerData = commitments.map(({ commitment, sortCode }: any) => ({
        commitment: BigInt(commitment),
        sortCode,
      }));

      // TODO: Get fetch all commitment function working
      const escrowBalances = await Promise.all(
        providerData.map(async (commitment: any) => {
          const balance = await escrowContract.methods
            .get_escrow_liqudity_position(commitment.commitment)
            .simulate();

          return {
            ...commitment,
            balance,
          };
        })
      );

      // filter out nonexistent balances
      const formatted = escrowBalances
        .filter((balance) => balance.balance._is_some)
        .map((balance: any) => {
          return {
            balance: balance.balance._value.balance,
            commitment: balance.commitment,
            currency: CurrencyCode.GBP,
            sortCode: balance.sortCode,
          };
        });
      setOrders(formatted);
    } catch (err) {
      toast.error('Error occurred fetching orders');
    } finally {
      setFetchingOrders(false);
    }
  }, [escrowContract]);

  const getEscrowLiquidityPositions = useCallback(async () => {
    if (!escrowContract || !wallet) return;
    try {
      const escrowOwnerNote: any = await getEscrowOwnerNote();

      if (escrowOwnerNote._is_some) {
        const commitment: bigint = escrowOwnerNote._value.commitment;

        const commitmentBalance: any = await escrowContract.methods
          .get_escrow_liqudity_position(commitment)
          .simulate();

        if (commitmentBalance._is_some) {
          // format position data for table
          setPositions([
            {
              // @ts-ignore
              balance: commitmentBalance._value.balance,
              commitment: commitment,
              currency: CurrencyCode.GBP,
              // @ts-ignore
              withdrawable_at: commitmentBalance._value.withdrawable_at,
              withdrawable_balance:
                // @ts-ignore
                commitmentBalance._value.withdrawable_balance,
            },
          ]);
        }
      }
    } catch {
    } finally {
      setFetchingTokenPositions(false);
    }
  }, [escrowContract, getEscrowOwnerNote, wallet]);

  const increaseBalance = async (amount: bigint) => {
    if (!escrowContract || !tokenContract || !wallet) return;
    const convertedDecimals = toUSDCDecimals(amount);
    try {
      const executionPayload = await tokenContract.methods
        .transfer_to_public(
          wallet.getAddress(),
          escrowContract.address,
          convertedDecimals,
          0
        )
        .request();

      const authWitness: IntentAction = {
        caller: escrowContract.address,
        action: executionPayload.calls[0],
      };

      await escrowContract
        .withAccount(wallet)
        .methods.increment_escrow_balance(convertedDecimals, {
          authWitnesses: [authWitness],
        })
        .send()
        .wait();

      // update token balances
      setTokenBalance((prev) => ({
        ...prev,
        private: prev.private - convertedDecimals,
      }));

      // update position balance
      setPositions((prev) => {
        const copy = [...prev];
        copy[0] = { ...copy[0], balance: copy[0].balance + convertedDecimals };
        return copy;
      });

      // update orders
      setOrders((prev) => {
        const copy = [...prev];
        const ownedIndex = copy.findIndex(
          (order) => order.commitment === positions[0].commitment
        );
        copy[ownedIndex] = {
          ...copy[ownedIndex],
          balance: copy[ownedIndex].balance + convertedDecimals,
        };
        return copy;
      });

      toast.success(`Successfully incremented balance by ${amount} USDC`);
    } catch (err) {
      console.log('Err: ', err);
      toast.error('Error occurred incrementing');
    }
  };

  const withdraw = async (amount: bigint) => {
    if (!escrowContract || !wallet) return;
    const convertedDecimals = toUSDCDecimals(amount);
    try {
      await escrowContract
        .withAccount(wallet)
        .methods.withdraw_escrow_balance(convertedDecimals)
        .send()
        .wait();

      // update token balances
      setTokenBalance((prev) => ({
        ...prev,
        private: prev.private + convertedDecimals,
      }));

      // update position balance
      setPositions((prev) => {
        const copy = [...prev];
        copy[0] = { ...copy[0], balance: copy[0].balance - convertedDecimals };
        return copy;
      });

      // update orders
      setOrders((prev) => {
        const copy = [...prev];
        const ownedIndex = copy.findIndex(
          (order) => order.commitment === positions[0].commitment
        );
        copy[ownedIndex] = {
          ...copy[ownedIndex],
          balance: copy[ownedIndex].balance - convertedDecimals,
        };
        return copy;
      });

      toast.success(`Successfully withdrew ${amount} USDC`);
    } catch {
      toast.error('Error occurred withdrawing funds');
    }
  };

  useEffect(() => {
    getOrders();
  }, [escrowContract, getOrders]);

  useEffect(() => {
    (async () => {
      if (!wallet) {
        setPositions([]);
        setSelectedTab(TABS[1]);
      }
      getEscrowLiquidityPositions();
    })();
  }, [getEscrowLiquidityPositions, getOrders, wallet]);

  return (
    <div className='h-screen flex flex-col'>
      <Header />
      <div className='flex flex-col flex-1 px-10 py-4'>
        <div className='flex items-center justify-between'>
          <div className='flex gap-2 text-lg mb-10'>
            {TABS.slice(wallet && !fetchingPositions ? 0 : 1).map(
              (tab: string) => (
                <div
                  className='border border-[#913DE5] cursor-pointer px-2 py-1 rounded-lg text-lg'
                  onClick={() => setSelectedTab(tab)}
                  style={{
                    backgroundColor:
                      selectedTab === tab ? '#913DE5' : 'transparent',
                    color: selectedTab === tab ? 'white' : '#913DE5',
                  }}
                >
                  {tab}
                </div>
              )
            )}
          </div>
          {wallet && !fetchingPositions && !positions.length && (
            <button
              className='flex gap-2 items-center px-2 py-1'
              onClick={() => setShowDepositModal(true)}
            >
              New Position <Plus size={20} />
            </button>
          )}
        </div>
        <div className='flex flex-1 justify-center'>
          {selectedTab === TABS[0] ? (
            positions.length ? (
              <div className='flex flex-1 items-start'>
                <DataTable
                  data={formattedPositions}
                  headers={OWNED_POSITION_HEADERS}
                  primaryAction={{
                    label: 'Increase',
                    onClick: (rowIndex: number) =>
                      setShowIncreaseBalanceModal(rowIndex),
                  }}
                  secondaryAction={{
                    label: 'Withdraw',
                    onClick: (rowIndex: number) =>
                      setShowWithdrawModal(rowIndex),
                  }}
                />
              </div>
            ) : (
              <div className='flex flex-1 flex-col items-center gap-4 justify-center'>
                <div className='text-2xl'>
                  You do not currently have any open liquidity positions
                </div>
                <button
                  className='flex gap-2 items-center px-2 py-1'
                  onClick={() => setShowDepositModal(true)}
                >
                  New Position <Plus size={20} />
                </button>
              </div>
            )
          ) : fetchingOrders ? (
            <div className='flex flex-1 flex-col gap-4 items-center justify-center'>
              <div className='text-3xl'>Fetching Orders</div>
              <Loader color='#913DE5' size={50} />
            </div>
          ) : formattedOrders.length === 0 ? (
            <div className='flex flex-col gap-4 items-center justify-center text-3xl'>
              No open orders
            </div>
          ) : (
            <div className='flex flex-1 items-start'>
              <DataTable
                // @ts-ignore
                data={formattedOrders}
                headers={OPEN_POSITION_HEADERS}
                primaryAction={
                  wallet &&
                  !fetchingOrders && {
                    label: 'Pay',
                    onClick: (rowIndex: number) =>
                      setSelectedCreditor(orders[rowIndex]),
                  }
                }
              />
            </div>
          )}
        </div>
      </div>
      <ToastContainer position='bottom-right' theme='colored' />
      <DepositModal
        onClose={() => setShowDepositModal(false)}
        onFinish={depositFunds}
        open={showDepositModal}
      />
      <IncreaseBalanceModal
        onClose={() => setShowIncreaseBalanceModal(-1)}
        onFinish={increaseBalance}
        open={showIncreaseBalanceModal > -1}
      />
      <PaymentModal
        creditiorData={selectedCreditor}
        message={message}
        setOrders={setOrders}
        onClose={() => setSelectedCreditor(null)}
        open={!!selectedCreditor}
      />
      <WithdrawModal
        onClose={() => setShowWithdrawModal(-1)}
        onFinish={withdraw}
        open={showWithdrawModal > -1}
      />
    </div>
  );
}

export default App;
