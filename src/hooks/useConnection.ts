import { useEffect, useState } from 'react';

import { observeConnection } from '../services/chatService';

/**
 * Conectividade com o Firebase via `.info/connected` do Realtime Database.
 * Começa como `true` para não piscar o aviso enquanto a conexão é aberta.
 */
export function useConnection(): boolean {
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    let firstEvent = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = observeConnection((isConnected) => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      // O primeiro "desconectado" chega antes do handshake; espera um pouco.
      if (!isConnected && firstEvent) {
        timer = setTimeout(() => setConnected(false), 3000);
      } else {
        setConnected(isConnected);
      }
      firstEvent = false;
    });

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      unsubscribe();
    };
  }, []);

  return connected;
}
