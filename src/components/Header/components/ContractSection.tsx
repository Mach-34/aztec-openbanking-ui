import { useAztec } from '../../../contexts/AztecContext';
import { ReceiptText } from 'lucide-react';
import Loader from '../../Loader';
import { truncateAddress } from '../../../utils';
import { AZTEC_SCAN_CONTRACT_URL } from '../../../utils/constants';

export default function ContractSection() {
  const { escrowContract, loadingContracts, tokenContract, wallet } =
    useAztec();

  const escrowAddr = escrowContract?.address.toString();
  const tokenAddr = tokenContract?.address.toString();

  if (!wallet) {
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
      <div className='border border-white flex gap-4 items-start rounded px-2 py-1'>
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
            {tokenAddr ? (
              <a
                href={`${AZTEC_SCAN_CONTRACT_URL}/${tokenAddr}`}
                rel='noreferrer'
                target='_blank'
              >
                {truncateAddress(tokenAddr)}
              </a>
            ) : (
              <div>None found</div>
            )}
          </div>
          <div className='flex gap-4 justify-between text-xs'>
            <div>Escrow:</div>
            {escrowAddr ? (
              <a
                href={`${AZTEC_SCAN_CONTRACT_URL}/${escrowAddr}`}
                rel='noreferrer'
                target='_blank'
              >
                {truncateAddress(escrowAddr)}
              </a>
            ) : (
              <div>None found</div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
