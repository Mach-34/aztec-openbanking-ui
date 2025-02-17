import { useEffect, useRef } from 'react';
import { PXE } from '@aztec/aztec.js';
import { toast } from 'react-toastify';

export default function usePXEHealth(
  pxe: PXE | null,
  onPXEConnectionLost: () => void
) {
  const intervalIdRef = useRef(null);
  const isProcessingRef = useRef(false);

  const { VITE_APP_PXE_URL: PXE_URL } = import.meta.env;

  useEffect(() => {
    // Clear any existing interval when pxe changes or on cleanup
    const clearExistingInterval = () => {
      if (intervalIdRef.current !== null) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };

    if (pxe) {
      // Set up a new interval
      // @ts-ignore
      intervalIdRef.current = setInterval(async () => {
        if (isProcessingRef.current) return;

        isProcessingRef.current = true;
        try {
          await pxe.getPXEInfo();
        } catch {
          onPXEConnectionLost();
          toast.error(`Lost connection to PXE at ${PXE_URL}`);
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
  }, [onPXEConnectionLost, pxe]);
}
