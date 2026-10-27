import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * État réseau. Sur le web on se fie à navigator.onLine (aucune requête de
 * sondage) ; sur mobile, NetInfo.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (Platform.OS === 'web' && typeof navigator !== 'undefined' ? navigator.onLine !== false : true));
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return;
      const up = () => setOnline(true);
      const down = () => setOnline(false);
      window.addEventListener('online', up);
      window.addEventListener('offline', down);
      return () => {
        window.removeEventListener('online', up);
        window.removeEventListener('offline', down);
      };
    }
    const unsub = NetInfo.addEventListener((s) => {
      setOnline(s.isConnected !== false && s.isInternetReachable !== false);
    });
    return () => unsub();
  }, []);
  return online;
}
