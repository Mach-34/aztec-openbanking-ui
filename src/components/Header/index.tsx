import { useMemo, useRef, useState } from 'react';
import { useAztec } from '../../contexts/AztecContext';
import { truncateAddress } from '../../utils';
import useOutsideAlerter from '../../hooks/useOutsideAlerter';
import { toast } from 'react-toastify';
import { AztecAddress } from '@aztec/circuits.js';
import PXEBadge from './components/PXEBadge';
import ContractSection from './components/ContractSection';
import TokenBalanceSection from './components/TokenBalanceSection';

export default function Header(): JSX.Element {
  const { connectWallet, disconnectWallet, pxe, wallet } = useAztec();
  const menuRef = useRef<HTMLDivElement>(null);
  const [showMenu, setShowMenu] = useState<boolean>(false);

  useOutsideAlerter(menuRef, () => setShowMenu(false));

  const copyAddress = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    address: AztecAddress
  ) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address.toString());
      toast.success('Address copied to clipboard!');
    } catch {
      toast.error('Error occurred.');
    }
  };

  const walletButtonText = useMemo(() => {
    if (wallet) {
      return truncateAddress(wallet.getAddress().toString());
    } else {
      return 'Connect Wallet';
    }
  }, [wallet]);

  return (
    <div className='flex items-center justify-between py-5 px-10'>
      <div className='flex gap-2 items-center'>
        <PXEBadge />
        {wallet && <ContractSection />}
      </div>
      <div className='flex gap-4'>
        <TokenBalanceSection />
        {pxe && (
          <div>
            <button
              className='flex gap-2 items-center ml-auto relative'
              onClick={() =>
                wallet ? setShowMenu(!showMenu) : connectWallet()
              }
            >
              {walletButtonText}
              {!!wallet && showMenu && (
                <div
                  className='absolute bg-zimburseGray left-0 rounded top-[calc(100%+12px)]'
                  ref={menuRef}
                >
                  <div
                    className='cursor-pointer p-4 rounded hover:bg-[#A8A6A6]'
                    onClick={() => disconnectWallet()}
                  >
                    Logout
                  </div>
                </div>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
