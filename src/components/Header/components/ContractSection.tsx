import { useAztec } from '../../../contexts/AztecContext';
import { ReceiptText } from 'lucide-react';
import Loader from '../../Loader';
import { truncateAddress } from '../../../utils';

export default function ContractSection() {
  const { escrowContract, loadingContracts, pxe, tokenContract } = useAztec();

  if (!pxe) {
    return <></>;
  } else if (loadingContracts) {
    return (
      <div className='flex gap-2 items-center mr-8'>
        <div className='text-sm'>Loading contracts...</div>
        <Loader size={16} />
      </div>
    );
  } else {
    return (
      <div className='border border-black flex gap-4 items-center rounded px-2 py-1'>
        <div>
          <div>
            <div className='flex gap-1 items-center'>
              <div className='text-xs'>Contracts</div>
              <ReceiptText size={12} />
            </div>
          </div>
        </div>
        <div className='mt-2'>
          <div className='flex gap-4 justify-between text-xs'>
            <div>Usdc:</div>
            <div>
              {tokenContract
                ? truncateAddress(tokenContract.address.toString())
                : 'None found'}
            </div>
          </div>
          <div className='flex gap-4 justify-between text-xs'>
            <div>Escrow Registry:</div>
            <div>
              {escrowContract
                ? truncateAddress(escrowContract.address.toString())
                : 'None found'}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
