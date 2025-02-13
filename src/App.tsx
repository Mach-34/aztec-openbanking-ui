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
Modal.setAppElement('#root');

const TABS = ['Your Positions', 'Open Orders'];

type OwnedPositions = {
  balance: bigint;
  currency: string;
  withdrawable_at: bigint;
  withdrawable_balance: bigint;
};

const { VITE_APP_SERVER_URL: SERVER_URL } = import.meta.env;

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

  // TODO: Set up table component to handle different data formats insteads of mapping through array
  const formattedPositions = useMemo(() => {
    return positions.map((position) => ({
      balance: `$${formatUSDC(position.balance)}`,
      currency: position.currency,
      withdrawable_at: position.withdrawable_at.toString(),
      withdrawable_balance: `$${formatUSDC(position.withdrawable_balance)}`,
    }));
  }, [positions]);

  const claim = async (paymentData: any) => {
    const POPUP_HEIGHT = 600;
    const POPUP_WIDTH = 600;
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;

    // calculate position
    const left = (screenWidth - POPUP_WIDTH) / 2;
    const top = (screenHeight - POPUP_HEIGHT) / 2;

    // if (!escrowContract || !wallet) return;

    // get auth url
    const res = await fetch(`${SERVER_URL}/api/initialize-payment`, {
      body: JSON.stringify(paymentData),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });

    const { authUrl } = await res.json();
    console.log('Authorization url: ', authUrl);
    window.open(
      authUrl,
      '_blank',
      `width=${POPUP_WIDTH},height=${POPUP_HEIGHT},top=${top},left=${left}`
    );

    // const signature =
    //   '3e42c30cab535ed5a20dcac4d405004b5098451c72a80b4460b4e3e9a4bc89f131fa6078c1f7de1d740bfd8216e0ea8b67e5d78eaa7897d02902d73c50d3d0e7bbeb4e1b4b6b4d0281bcfb0e029c44f3ea90363e4e1d7ec591e09fc2bdd832428396b054f4f89336df49c01a88bb7e5b5015e706cd179467bf9794a79474884e799fb388050a7fdcaa074225bdc1b856048640e4fb7955a06675649acd89b049b603c0dc32dc5f37796453602f36cc982f86257055162457db6aec9377e7e9fdcb31e4ebce5d6e445c722f0e6a20936bda5c83481b12013078c0cc72551373586dc69db541d729b8d02521a26bb4f42068764438443e9c9164dca039b0fb1176';
    // const payloadFetch = await fetch('/data/revolut_payload.txt');
    // const payload = await payloadFetch.text();
    // const modulus_limbs = [
    //   '0x53f4e0523650eac2cf25a8d137a949',
    //   '0x8aa514aa79ddfb14ad539ba6089caf',
    //   '0x11364d0fb2a1fe18b7c6acfa8b080c',
    //   '0x21702e5ff991caf0692e85a50be53e',
    //   '0x1eb37782945b58fe288411139bc05e',
    //   '0xc6227242a22cfbee2b69499615e157',
    //   '0x941e221ef8eebce8c971e97c4c7fcb',
    //   '0xcff8ed09f5a6ecdb505b19e09e32f9',
    //   '0xcd136a4458ed79af0a22e31141d76a',
    //   '0x29b062040a315b0ea187d7f2bd7003',
    //   '0x4659d51b02bbe68a6a297a8d09441b',
    //   '0x7a6d9eec0ca5d777a36859d1c26700',
    //   '0x40aeba9b1ff45bc3ad8e031481d835',
    //   '0x8ff166583e658caa574561e80ec810',
    //   '0x21ac80c3672cee586822845ddc2bfa',
    //   '0xb3d18b761a488941cddb10c14c8887',
    //   '0xf68b666736044f9188b5b9da6d04a4',
    //   '0xab',
    // ];

    // const redc_limbs = [
    //   '0x1bc3ba714c79e6ea406b76000c897d',
    //   '0xe80e3e98dfd4f9e6a8f711a5360bb4',
    //   '0x1f51410637a462b6d3b383c2279503',
    //   '0x8ccbf5e4d719703ce883a2eeef20a0',
    //   '0x499a9b8fe78218f2f266a4f72ef2a8',
    //   '0xb08bd8044d41445928bfda98750f0a',
    //   '0x9d7974a23107a0ca7020a97d964fc4',
    //   '0x0e7acbc37d788a410ab679c26acf41',
    //   '0xeb334c2fb63ea2f65abc995159e56e',
    //   '0x96a2531f4b0b4ad14410496a45f25e',
    //   '0xe5287ebd7ae1945a3dbe9a38c0b012',
    //   '0xfb7d4c3cf84f02b0752f9e5802af39',
    //   '0x76cb3b25b0d54de92ce03fd93dd749',
    //   '0x768afbc61af80cc4b4cd0b48db658d',
    //   '0x22954ff874f609b81892bd3ad7b935',
    //   '0x6bd94a7a6df27eef8e710a83de6f35',
    //   '0xae77b841eb2a2a2bdd189569a248a7',
    //   '0x17d1',
    // ];

    // const inputs = generateAztecInputs(
    //   payload,
    //   signature,
    //   modulus_limbs,
    //   redc_limbs
    // );

    // // claim tokens on Aztec
    // await escrowContract
    //   .withAccount(wallet)
    //   // @ts-ignore
    //   .methods.prove_payment_and_claim(inputs)
    //   .send()
    //   .wait();

    // toast.success('Successfully proved payment');
  };

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
        onClose={() => setSelectedCreditor(null)}
        onFinish={claim}
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
