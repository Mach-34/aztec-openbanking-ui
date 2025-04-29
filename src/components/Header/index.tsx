import { JSX, useMemo, useRef, useState } from 'react';
import { useAztec } from '../../contexts/AztecContext';
import { truncateAddress } from '../../utils';
import useOutsideAlerter from '../../hooks/useOutsideAlerter';
import PXEBadge from './components/PXEBadge';
import ContractSection from './components/ContractSection';
import TokenBalanceSection from './components/TokenBalanceSection';
import Loader from '../Loader';
import { CircleHelp } from 'lucide-react';
import { Tooltip } from 'react-tooltip';

export default function Header(): JSX.Element {
  const { connectingWallet, connectWallet, disconnectWallet, wallet } =
    useAztec();
  const menuRef = useRef<HTMLDivElement>(null);
  const [showMenu, setShowMenu] = useState<boolean>(false);

  useOutsideAlerter(menuRef, () => setShowMenu(false));

  const walletButtonText = useMemo(() => {
    if (wallet) {
      return truncateAddress(wallet.getAddress().toString());
    } else {
      return connectingWallet ? 'Loading Obsidion...' : 'Connect Wallet';
    }
  }, [connectingWallet, wallet]);

  return (
    <div className='flex items-center justify-between py-5 px-10'>
      <div className='flex gap-2 items-center'>
        <PXEBadge />
        {wallet && <ContractSection />}
      </div>
      <div className='flex gap-4'>
        <TokenBalanceSection />
        <div className='flex gap-1 items-center'>
          <button
            className='flex gap-2 items-center ml-auto relative'
            disabled={connectingWallet}
            onClick={() => (wallet ? setShowMenu(!showMenu) : connectWallet())}
          >
            {walletButtonText}
            {connectingWallet && <Loader size={16} />}
            {!!wallet && showMenu && (
              <div
                className='absolute bg-[#913DE5] left-0 rounded top-[calc(100%+12px)] w-full'
                ref={menuRef}
              >
                <div
                  className='cursor-pointer p-2 rounded hover:bg-[#A8A6A6] w-full'
                  onClick={() => disconnectWallet()}
                >
                  Logout
                </div>
              </div>
            )}
          </button>
          <CircleHelp data-tooltip-id='obsidion-help' size={20} />
          <Tooltip clickable id='obsidion-help'>
            <div>Obsidion setup</div>
            <a
              href='https://youtu.be/jdA-T-B8jY4'
              rel='no-referrer'
              target='_blank'
            >
              guide
            </a>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
