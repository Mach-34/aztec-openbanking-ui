import { CircleUserRound, Plus } from 'lucide-react';
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import DataTable from './DataTable';
import { useAztec } from '../contexts/AztecContext';
import {
  CreditorData,
  OPEN_POSITION_HEADERS,
  OWNED_POSITION_HEADERS,
} from '../utils/data';
import { formatUSDC } from '../utils';
import { Fr } from '@aztec/aztec.js';
import { OwnedPositions } from '../App';
import Loader from './Loader';
import logo from '../assets/logo.jpg';

const TABS = ['Your Positions', 'Open Orders'];

type AppContentProps = {
  fetchingOrders: boolean;
  fetchingPositions: boolean;
  orders: CreditorData[];
  positions: OwnedPositions[];
  setSelectedCreditor: Dispatch<SetStateAction<CreditorData | null>>;
  setShowDepositModal: Dispatch<SetStateAction<boolean>>;
  setShowIncreaseBalanceModal: Dispatch<SetStateAction<number>>;
  setShowWithdrawModal: Dispatch<SetStateAction<number>>;
};

export default function AppContent({
  fetchingOrders,
  fetchingPositions,
  orders,
  positions,
  setSelectedCreditor,
  setShowDepositModal,
  setShowIncreaseBalanceModal,
  setShowWithdrawModal,
}: AppContentProps): JSX.Element {
  const { connectWallet, connectingWallet, wallet } = useAztec();
  const [selectedTab, setSelectedTab] = useState<string>(TABS[1]);

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

  useEffect(() => {
    if (!wallet) {
      setSelectedTab(TABS[1]);
    }
  }, [wallet]);

  if (!wallet) {
    return (
      <div className='flex flex-1 flex-col gap-4 items-center justify-center'>
        <div className='text-2xl'>Connect Wallet to Continue</div>
        <button
          className='flex gap-2 items-center'
          disabled={connectingWallet}
          onClick={() => connectWallet()}
        >
          {connectingWallet ? 'Connecting Wallet...' : 'Connect Wallet'}
          {connectingWallet && <Loader size={16} />}
        </button>
      </div>
    );
  }

  return (
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
                  onClick: (rowIndex: number) => setShowWithdrawModal(rowIndex),
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
        ) : !fetchingOrders ? (
          <div className='flex flex-1 flex-col gap-4 items-center justify-center'>
            <img
              alt='Logo'
              className='animate-pulse border border-[#913DE5] h-24 rounded w-24'
              src={logo}
            />
            <div className='text-xl'>Fetching Orders</div>
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
                wallet && !fetchingOrders && !fetchingPositions
                  ? {
                      label: 'Pay',
                      onClick: (rowIndex: number) =>
                        setSelectedCreditor(orders[rowIndex]),
                    }
                  : undefined
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
