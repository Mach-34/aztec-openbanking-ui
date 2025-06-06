import { useState, useEffect, useRef } from 'react';

const useWebSocket = (url: string) => {
  const [message, setMessage] = useState<string>('');
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      console.log('WebSocket Connected');
    };

    ws.current.onmessage = (event) => {
      setMessage((prev) => {
        if (prev === event.data) {
          return prev + '';
        }
        return event.data;
      });
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };

    ws.current.onclose = () => {
      console.log('WebSocket Disconnected');
    };

    return () => {
      ws.current?.close();
    };
  }, [url]);

  return { message };
};

export default useWebSocket;
