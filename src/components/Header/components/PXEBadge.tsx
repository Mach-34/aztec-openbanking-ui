import { useMemo } from 'react';
import { useAztec } from '../../../contexts/AztecContext';
import Loader from '../../Loader';

const { VITE_APP_AZTEC_NODE_URL: AZTEC_NODE_URL } = import.meta.env;

export default function NodeBadge() {
  const { connectedToNode } = useAztec();

  const waitingForPXE = false;

  const badgeClass = useMemo((): string => {
    let badgeColor = '';
    if (waitingForPXE) {
      badgeColor = 'border-yellow-500 text-yellow-500';
    } else {
      badgeColor = connectedToNode
        ? 'border-green-500 text-green-500'
        : 'border-red-500 text-red-500';
    }
    return `border-2 flex gap-2 items-center px-2 py-1 rounded-full text-xs ${badgeColor}`;
  }, [connectedToNode, waitingForPXE]);

  return (
    <div className={badgeClass}>
      {waitingForPXE
        ? `Waiting for Aztec Node at ${AZTEC_NODE_URL}...`
        : connectedToNode
        ? 'Connected to Node'
        : `Lost connection at ${AZTEC_NODE_URL}`}
      {waitingForPXE && <Loader size={12} />}
      {!connectedToNode && !waitingForPXE && (
        <button
          className='bg-red-500 py-0.5 px-1 rounded-full text-white text-[10px]'
          // onClick={() => connectToPXE()}
        >
          Reconnect
        </button>
      )}
      {connectedToNode && (
        <div className='animate-pulse bg-green-500 rounded-full h-1.5 w-1.5' />
      )}
    </div>
  );
}
