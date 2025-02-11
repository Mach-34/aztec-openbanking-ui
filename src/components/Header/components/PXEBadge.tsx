import { useMemo } from 'react';
import { useAztec } from '../../../contexts/AztecContext';
import { DEFAULT_PXE_URL } from '../../../utils/constants';
import Loader from '../../Loader';

export default function PXEBadge() {
  const { connectToPXE, pxe, waitingForPXE } = useAztec();

  const badgeClass = useMemo((): string => {
    let badgeColor = '';
    if (waitingForPXE) {
      badgeColor = 'border-yellow-500 text-yellow-500';
    } else {
      badgeColor = pxe
        ? 'border-green-500 text-green-500'
        : 'border-red-500 text-red-500';
    }
    return `border flex gap-2 items-center px-2 py-1 rounded-full text-xs ${badgeColor}`;
  }, [pxe, waitingForPXE]);

  return (
    <div className={badgeClass}>
      {waitingForPXE
        ? `Waiting for PXE at ${DEFAULT_PXE_URL}...`
        : pxe
        ? 'Connected to PXE'
        : `Connection to PXE at ${DEFAULT_PXE_URL} lost`}
      {waitingForPXE && <Loader size={12} />}
      {!pxe && !waitingForPXE && (
        <button
          className='bg-red-500 py-0.5 px-1 rounded-full text-white text-[10px]'
          onClick={() => connectToPXE()}
        >
          Reconnect
        </button>
      )}
    </div>
  );
}
