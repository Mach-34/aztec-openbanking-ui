import { useMemo, useRef, useState } from 'react';
import { useAztec } from '../../contexts/AztecContext';
import { truncateAddress } from '../../utils';
import useOutsideAlerter from '../../hooks/useOutsideAlerter';
import { toast } from 'react-toastify';
import { Copy } from 'lucide-react';
import { AztecAddress } from '@aztec/circuits.js';
import { AccountWalletWithSecretKey } from '@aztec/aztec.js';
import PXEBadge from './components/PXEBadge';
import ContractSection from './components/ContractSection';
import TokenBalanceSection from './components/TokenBalanceSection';
import Loader from '../Loader';

export default function Header(): JSX.Element {
  const { connectWallet, disconnectWallet, pxe, wallet, wallets } = useAztec();
  const menuRef = useRef<HTMLDivElement>(null);
  const [showMenu, setShowMenu] = useState<boolean>(false);

  useOutsideAlerter(menuRef, () => setShowMenu(false));

  const availableWallets = useMemo(() => {
    return wallets.filter(
      (resolvedWallet) =>
        !resolvedWallet
          .getAddress()
          .equals(wallet?.getAddress() ?? AztecAddress.ZERO)
    );
  }, [wallet, wallets]);

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
    if (!wallets.length) {
      return 'Loading Aztec Wallets...';
    } else if (wallet) {
      return truncateAddress(wallet.getAddress().toString());
    } else {
      return 'Connect Wallet';
    }
  }, [wallet, wallets]);

  return (
    <div className='flex items-center justify-between py-5 px-10'>
      <PXEBadge />
      <ContractSection />
      <div className='flex gap-4'>
        <TokenBalanceSection />
        {pxe && (
          <div>
            <button
              className='flex gap-2 items-center ml-auto relative'
              disabled={!wallets.length}
              onClick={() =>
                wallet ? setShowMenu(!showMenu) : connectWallet(wallets[0])
              }
            >
              {walletButtonText}
              {!wallets.length && <Loader size={16} />}
              {!!wallet && showMenu && (
                <div
                  className='absolute bg-zimburseGray left-0 rounded top-[calc(100%+12px)]'
                  ref={menuRef}
                >
                  {availableWallets.map(
                    (wallet: AccountWalletWithSecretKey) => (
                      <div
                        className='cursor-pointer flex gap-2 items-center justify-between p-4 rounded hover:bg-[#A8A6A6]'
                        key={wallet.getAddress().toString()}
                        onClick={() => {
                          connectWallet(wallet);
                        }}
                      >
                        <div>
                          {truncateAddress(wallet.getAddress().toString())}
                        </div>
                        <button
                          className='bg-zimburseBlue p-1 rounded'
                          onClick={(e) => copyAddress(e, wallet.getAddress())}
                        >
                          <Copy color='white' size={14} />
                        </button>
                      </div>
                    )
                  )}
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
