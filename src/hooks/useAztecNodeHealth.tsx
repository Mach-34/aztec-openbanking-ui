import { useEffect, useRef } from 'react';
import { AztecNode } from '@aztec/aztec.js';
import { toast } from 'react-toastify';

export default function useAztecNodeHealth(
  node: AztecNode | null,
  onNodeConnectionLost: () => void
) {
  const intervalIdRef = useRef(null);
  const isProcessingRef = useRef(false);

  const { VITE_APP_AZTEC_NODE_URL: AZTEC_NODE_URL } = import.meta.env;

  useEffect(() => {
    // Clear any existing interval when pxe changes or on cleanup
    const clearExistingInterval = () => {
      if (intervalIdRef.current !== null) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };

    if (node) {
      // Set up a new interval
      // @ts-ignore
      intervalIdRef.current = setInterval(async () => {
        if (isProcessingRef.current) return;

        isProcessingRef.current = true;
        try {
          await node.getNodeInfo();
        } catch {
          onNodeConnectionLost();
          toast.error(`Lost connection to Aztec Node at ${AZTEC_NODE_URL}`);
        } finally {
          isProcessingRef.current = false;
        }
      }, 5000);
    } else {
      clearExistingInterval();
    }

    return () => {
      clearExistingInterval();
    };
  }, [AZTEC_NODE_URL, node, onNodeConnectionLost]);
}
