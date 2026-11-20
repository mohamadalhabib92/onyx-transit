import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * « Réduire les animations » : API d'accessibilité (iOS, Android) et prefers-reduced-motion (web).
 */
export function usePrefersReducedMotion(): boolean {
  const [nativeReduce, setNativeReduce] = useState(false);
  const [webReduce, setWebReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => alive && setNativeReduce(!!v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v: boolean) => setNativeReduce(!!v));
    let mq: MediaQueryList | null = null;
    const onMq = () => setWebReduce(!!mq?.matches);
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      onMq();
      mq.addEventListener?.('change', onMq);
    }
    return () => {
      alive = false;
      sub?.remove?.();
      mq?.removeEventListener?.('change', onMq);
    };
  }, []);
  return nativeReduce || webReduce;
}
