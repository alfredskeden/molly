import type { ThemePreference } from '@/storage/types';

import type { Scheme } from './tokens';

/** `system` is React Native's colour scheme: 'dark', 'light', or nothing when the OS doesn't say. */
export function resolveScheme(preference: ThemePreference, system: string | null | undefined): Scheme {
  if (preference !== 'system') return preference;
  return system === 'dark' ? 'night' : 'day';
}
