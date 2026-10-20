import { useMemo } from 'react';

import { useSettings } from '@/features/dashboard/queries';

import { hapticPlayer } from './model';
import { playHaptic } from './play';

/** Plays a strength from `HAPTICS` or `answerStrength`, unless haptics are off in Settings. */
export function useHaptic() {
  const enabled = useSettings().data?.haptics ?? true;
  return useMemo(() => hapticPlayer(playHaptic, enabled), [enabled]);
}
