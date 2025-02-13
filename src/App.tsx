import Header from './components/Header';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Modal from 'react-modal';
import DepositModal from './components/DepositModal';
import { useAztec } from './contexts/AztecContext';
import { Fr } from '@aztec/aztec.js';
import { formatUSDC, toUSDCDecimals } from './utils';
import { generateAztecInputs } from '@openbanking.nr/js-inputs/dist/src/inputGen';
import { IntentAction } from '@shieldswap/wallet-sdk/eip1193';
import DataTable from './components/DataTable';
import PaymentModal from './components/PaymentModal';
import { Plus } from 'lucide-react';
import IncreaseBalanceModal from './components/IncreaseBalanceModal';
import WithdrawModal from './components/WithdrawModal';
import {
  CreditorData,
  CurrencyCode,
  OPEN_POSITION_DATA,
  OPEN_POSITION_HEADERS,
  OWNED_POSITION_HEADERS,
} from './utils/data';
import useWebSocket from './hooks/useWebsocket';
Modal.setAppElement('#root');

const TABS = ['Your Positions', 'Open Orders'];

type OwnedPositions = {
  balance: bigint;
  currency: string;
  withdrawable_at: bigint;
  withdrawable_balance: bigint;
};

const {
  VITE_APP_SERVER_URL: SERVER_URL,
  VITE_APP_WEBSOCKET_URL: WEBSOCKET_URL,
} = import.meta.env;

function App() {
  const { escrowContract, setTokenBalance, tokenContract, wallet } = useAztec();
  const [orders] = useState<Array<CreditorData>>(OPEN_POSITION_DATA);
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

  // TODO: Set up table component to handle different data formats insteads of mapping through array
  const formattedPositions = useMemo(() => {
    return positions.map((position) => ({
      balance: `$${formatUSDC(position.balance)}`,
      currency: position.currency,
      withdrawable_at: position.withdrawable_at.toString(),
      withdrawable_balance: `$${formatUSDC(position.withdrawable_balance)}`,
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
        Buffer.from(currencyCode).reverse()
      );

      // create authwit for escrow to transfer from user's private balance
      const action = await tokenContract.methods
        .transfer_to_public(
          wallet.getAddress(),
          escrowContract.address,
          depositAmount,
          0
        )
        .request();

      const authWitness: IntentAction = {
        caller: escrowContract.address,
        action,
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

      // update positions
      setPositions([
        {
          balance: depositAmount,
          currency: 'GBP',
          withdrawable_at: 0n,
          withdrawable_balance: 0n,
        },
      ]);

      toast.success('Succesfully initialized provider balance');
    } catch (err) {
      console.log('Error: ', err);
      toast.error('Error initializing provider balance');
    }
  };

  const getCommitments = async () => {
    const res = await fetch(
      'https://9ca5-80-87-23-81.ngrok-free.app/commitments'
    );
    const data = await res.text();
    console.log('Data: ', data);
  };

  const getEscrowLiquidityPositions = useCallback(async () => {
    if (!escrowContract || !wallet) return;
    try {
      const escrowOwnerNote: any = await escrowContract.methods
        .get_escrow_owner_note(wallet.getAddress())
        .simulate();

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
  }, [escrowContract, wallet]);

  const increaseBalance = async (amount: bigint) => {
    if (!escrowContract || !tokenContract || !wallet) return;
    const convertedDecimals = toUSDCDecimals(amount);
    try {
      const action = await tokenContract.methods
        .transfer_to_public(
          wallet.getAddress(),
          escrowContract.address,
          convertedDecimals,
          0
        )
        .request();

      const authWitness: IntentAction = {
        caller: escrowContract.address,
        action,
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

      toast.success(`Successfully withdrew ${amount} USDC`);
    } catch {
      toast.error('Error occurred withdrawing funds');
    }
  };

  useEffect(() => {
    (async () => {
      if (!wallet) {
        setSelectedTab(TABS[1]);
      }
      // getCommitments();
      getEscrowLiquidityPositions();
    })();
  }, [escrowContract, wallet]);

  return (
    <>
      <Header />
      <div className='h-[calc(100vh-40px)] mt-10 px-10'>
        <div className='flex items-center justify-between'>
          <div className='flex gap-2 text-lg'>
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
          {!fetchingPositions && wallet && (
            <button
              className='flex gap-2 items-center px-2 py-1'
              onClick={() => setShowDepositModal(true)}
            >
              New Position <Plus size={20} />
            </button>
          )}
        </div>
        <div className='flex justify-center'>
          <div className='mt-6 w-[90%]'>
            {selectedTab === TABS[0] ? (
              positions.length ? (
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
              ) : (
                <div className='flex flex-col items-center gap-4 justify-center mt-20'>
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
            ) : (
              <DataTable
                data={orders}
                headers={OPEN_POSITION_HEADERS}
                primaryAction={{
                  label: 'Pay',
                  onClick: (rowIndex: number) =>
                    setSelectedCreditor(orders[rowIndex]),
                }}
              />
            )}
          </div>
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
        onClose={() => setSelectedCreditor(null)}
        open={!!selectedCreditor}
      />
      <WithdrawModal
        onClose={() => setShowWithdrawModal(-1)}
        onFinish={withdraw}
        open={showWithdrawModal > -1}
      />
    </>
  );
}

export default App;
