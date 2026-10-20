import { requireNativeModule } from 'expo';

import type { ThemePreference } from '@/storage/types';

const MollyNotify = requireNativeModule<{ setNightMode(preference: ThemePreference): void }>('MollyNotify');

/** Android keeps the app's night mode across restarts: the next cold start's splash follows the choice. */
export function setNightMode(preference: ThemePreference): void {
  try {
    MollyNotify.setNightMode(preference);
  } catch (error) {
    console.warn('Molly night mode', error);
  }
}
