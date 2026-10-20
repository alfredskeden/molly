import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

/** Quicker than this and nothing is said: a reload that fast needs no sign. */
const SHOW_AFTER_MS = 400;
/** Coming back without a reload (everything was fresh) ends the wait. */
const START_WITHIN_MS = 2000;

/**
 * True while the dashboard reloads after the app comes back, once it has taken long enough to notice.
 * Reloads after a tap don't count: the tap's guess is already on screen.
 */
export function useUpdatingOnReturn(fetching: boolean) {
  const [phase, setPhase] = useState<'idle' | 'returned' | 'slow'>('idle');
  const started = useRef(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      started.current = false;
      setPhase(status === 'active' ? 'returned' : 'idle');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (phase === 'idle') return;
    if (fetching) {
      started.current = true;
      if (phase === 'slow') return;
      const timeout = setTimeout(() => setPhase('slow'), SHOW_AFTER_MS);
      return () => clearTimeout(timeout);
    }
    // The reload that coming back started has settled, or none started.
    const timeout = setTimeout(() => setPhase('idle'), started.current ? 0 : START_WITHIN_MS);
    return () => clearTimeout(timeout);
  }, [phase, fetching]);

  return phase === 'slow' && fetching;
}
