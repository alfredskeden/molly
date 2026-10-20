// Haptics are Android only (see play.android.ts); the web and the widget play nothing.
import type { Strength } from './model';

export const hasHaptics = false;

export function playHaptic(_strength: Strength): void {}
