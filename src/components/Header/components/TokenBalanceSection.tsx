import { useAztec } from '../../../contexts/AztecContext';
import { useState } from 'react';
import Loader from '../../Loader';
import usdc from '../../../assets/usdc.png';
import { formatUSDC, toUSDCDecimals } from '../../../utils';
import { toast } from 'react-toastify';
import { Lock, LockOpen, Plus } from 'lucide-react';
import { AztecAddress, SponsoredFeePaymentMethod } from '@aztec/aztec.js';
import { AZTEC_TX_TIMEOUT } from '../../../utils/constants';

const { VITE_APP_FPC_ADDRESS: FPC_ADDRESS } = import.meta.env;

export default function TokenBalanceSection() {
  const {
    fetchingTokenBalances,
    pxe,
    setTokenBalance,
    tokenAdmin,
    tokenBalance,
    tokenContract,
    wallet,
  } = useAztec();

  const [minting, setMinting] = useState<boolean>(false);

  const MINT_AMOUNT = toUSDCDecimals(10n ** 7n);

  const mintUsdc = async () => {
    if (!FPC_ADDRESS || !tokenAdmin || !tokenContract || !wallet) return;
    try {
      setMinting(true);
      const paymentMethod = new SponsoredFeePaymentMethod(
        AztecAddress.fromString(FPC_ADDRESS)
      );

      const privateMintCall = tokenContract
        .withWallet(tokenAdmin)
        .methods.mint_to_private(
          tokenAdmin.getAddress(),
          wallet.getAddress(),
          MINT_AMOUNT
        )
        .send({ fee: { paymentMethod } });

      await tokenContract
        .withWallet(tokenAdmin)
        .methods.mint_to_public(wallet.getAddress(), MINT_AMOUNT)
        .send({ fee: { paymentMethod } })
        .wait({ timeout: AZTEC_TX_TIMEOUT });
      await privateMintCall.wait({ timeout: AZTEC_TX_TIMEOUT });
      setTokenBalance((prev) => ({
        public: prev.public + MINT_AMOUNT,
        private: prev.private + MINT_AMOUNT,
      }));
      toast.success(
        `Successfully minted ${formatUSDC(
          MINT_AMOUNT
        )} USDC to public and private balance`
      );
    } catch (err) {
      console.log('Error: ', err);
      toast.error('Error minting tokens.');
    } finally {
      setMinting(false);
    }
  };

  if (!pxe) {
    return <></>;
  } else {
    return (
      <>
        {wallet &&
          (fetchingTokenBalances ? (
            <div className='flex gap-2 items-center mr-8'>
              <div className='text-sm'>Fetching token balances...</div>
              <Loader size={16} />
            </div>
          ) : (
            <>
              <div className='border border-white border-solid p-1 rounded'>
                <div className='flex items-start gap-4'>
                  <div>
                    <div className='flex gap-1 items-center'>
                      <div>Balance</div>
                      <img alt='USDC' className='h-4 w-4' src={usdc} />
                    </div>
                    <button
                      className='border border-[#00C950] bg-[rgba(0,201,80,.5)] flex gap-1 items-center px-1 py-0.5 rounded-full text-white text-[10px]'
                      onClick={() => mintUsdc()}
                    >
                      {minting ? 'Minting...' : 'Mint'}
                      {!minting && <Plus size={10} />}
                      {minting && <Loader size={10} />}
                    </button>
                  </div>
                  <div>
                    <div className='flex items-center text-xs'>
                      Public <LockOpen className='mx-1' size={12} />: $
                      {formatUSDC(tokenBalance.public)}
                    </div>
                    <div className='flex items-center text-xs'>
                      Private <Lock className='mx-1' size={12} />: $
                      {formatUSDC(tokenBalance.private)}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ))}
      </>
    );
  }
}
