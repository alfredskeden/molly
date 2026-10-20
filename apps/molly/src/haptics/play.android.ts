import { AndroidHaptics, performAndroidHapticsAsync } from 'expo-haptics';

import type { Strength } from './model';

/**
 * Through the view's haptic feedback, which respects the system's touch-feedback setting. Why these
 * constants: see NOTES.md.
 */
const ANDROID: Record<Strength, AndroidHaptics> = {
  medium: AndroidHaptics.Virtual_Key,
  success: AndroidHaptics.Confirm,
  light: AndroidHaptics.Keyboard_Tap,
  selection: AndroidHaptics.Clock_Tick,
  warning: AndroidHaptics.Long_Press,
  error: AndroidHaptics.Reject,
};

export const hasHaptics = true;

export function playHaptic(strength: Strength): void {
  performAndroidHapticsAsync(ANDROID[strength]).catch(() => undefined);
}
