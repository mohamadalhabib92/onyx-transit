import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/** Respect de « Réduire les animations » (web). Sur natif : false tant que l’API n’est pas branchée. */
export function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduce(mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);
  return reduce;
}
