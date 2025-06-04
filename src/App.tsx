import Header from './components/Header';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useCallback, useEffect, useState } from 'react';
import Modal from 'react-modal';
import DepositModal from './components/DepositModal';
import { useAztec } from './contexts/AztecContext';
import { Fr } from '@aztec/aztec.js';
import { toUSDCDecimals } from './utils';
import { IntentAction } from '@nemi-fi/wallet-sdk';
import PaymentModal from './components/PaymentModal';
import IncreaseBalanceModal from './components/IncreaseBalanceModal';
import WithdrawModal from './components/WithdrawModal';
import { CreditorData, CurrencyCode } from './utils/data';
import useWebSocket from './hooks/useWebsocket';
import { poseidon2Hash } from '@aztec/foundation/crypto';
import { AZTEC_TX_TIMEOUT } from './utils/constants';
import AppContent from './components/AppContent';
Modal.setAppElement('#root');

export type OwnedPositions = {
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
  const { escrowContract, setTokenBalance, tokenContract, wallet } = useAztec();
  const [orders, setOrders] = useState<CreditorData[]>([]);
  const [fetchingOrders, setFetchingOrders] = useState<boolean>(false);
  const [fetchingPositions, setFetchingTokenPositions] =
    useState<boolean>(true);
  const [positions, setPositions] = useState<OwnedPositions[]>([]);
  const [selectedCreditor, setSelectedCreditor] = useState<CreditorData | null>(
    null
  );
  const [showDepositModal, setShowDepositModal] = useState<boolean>(false);
  const [showIncreaseBalanceModal, setShowIncreaseBalanceModal] =
    useState<number>(-1);
  const [showWithdrawModal, setShowWithdrawModal] = useState<number>(-1);

  const { message } = useWebSocket(WEBSOCKET_URL);

  const depositFunds = async (
    sortCodeAccNum: string,
    currencyCode: string,
    amount: number
  ) => {
    if (!escrowContract || !tokenContract || !wallet) return;

    const depositAmount = toUSDCDecimals(BigInt(amount));

    try {
      const sortCodeAccNumField = Fr.fromBufferReduce(
        Buffer.from(sortCodeAccNum).reverse()
      );
      const currencyCodeField = Fr.fromBufferReduce(
        Buffer.from(currencyCode.slice(0, 3)).reverse()
      );

      // create authwit for escrow to transfer from user's private balance
      const executionPayload = await tokenContract.methods
        .transfer_private_to_public(
          wallet.getAddress(),
          escrowContract.address,
          depositAmount,
          0
        )
        .request();

      const authWitness: IntentAction = {
        caller: escrowContract.address,
        action: executionPayload,
      };

      await escrowContract
        .withAccount(wallet)
        .methods.init_escrow_balance(
          sortCodeAccNumField,
          currencyCodeField,
          depositAmount,
          Fr.random(),
          { authWitnesses: [authWitness] }
        )
        .send()
        .wait({ timeout: AZTEC_TX_TIMEOUT });

      // update token balance
      setTokenBalance((prev) => ({
        ...prev,
        private: prev.private - depositAmount,
      }));

      // compute commitmentment and post to DB
      const commitment = await poseidon2Hash([
        sortCodeAccNumField,
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
          sortCode: sortCodeAccNum,
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
          sortCodeAccNum,
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
          console.time('fetch');
          const balance = await escrowContract.methods
            .get_escrow_liqudity_position(commitment.commitment)
            .simulate();
          console.timeEnd('fetch');
          return {
            ...commitment,
            balance,
          };
        })
      );

      // filter out nonexistent balances
      const formatted = escrowBalances
        .filter((balance) => balance.balance.initialized)
        .map((balance: any) => {
          return {
            balance: balance.balance.balance,
            commitment: balance.commitment,
            currency: CurrencyCode.GBP,
            sortCodeAccNum: balance.sortCode,
          };
        });
      setOrders(formatted);
    } catch (err) {
      console.log('Error: ', err);
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

        if (commitmentBalance.initialized) {
          // format position data for table
          setPositions([
            {
              // @ts-ignore
              balance: commitmentBalance.balance,
              commitment: commitment,
              currency: CurrencyCode.GBP,
              // @ts-ignore
              withdrawable_at: commitmentBalance.withdrawable_at,
              withdrawable_balance:
                // @ts-ignore
                commitmentBalance.withdrawable_balance,
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
        .transfer_private_to_public(
          wallet.getAddress(),
          escrowContract.address,
          convertedDecimals,
          0
        )
        .request();

      const authWitness: IntentAction = {
        caller: escrowContract.address,
        action: executionPayload,
      };

      await escrowContract
        .withAccount(wallet)
        .methods.increment_escrow_balance(convertedDecimals, {
          authWitnesses: [authWitness],
        })
        .send()
        .wait({ timeout: AZTEC_TX_TIMEOUT });

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
        .wait({ timeout: AZTEC_TX_TIMEOUT });

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
      }
      getEscrowLiquidityPositions();
    })();
  }, [getEscrowLiquidityPositions, getOrders, wallet]);

  return (
    <div className='h-screen flex flex-col'>
      <Header />
      <AppContent
        fetchingOrders={fetchingOrders}
        fetchingPositions={fetchingPositions}
        orders={orders}
        positions={positions}
        setSelectedCreditor={setSelectedCreditor}
        setShowDepositModal={setShowDepositModal}
        setShowIncreaseBalanceModal={setShowIncreaseBalanceModal}
        setShowWithdrawModal={setShowWithdrawModal}
      />
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
