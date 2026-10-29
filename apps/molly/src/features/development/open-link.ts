import * as Linking from 'expo-linking';

import { leaveOnPurpose } from '@/features/return/trip';

/** A source page, in the phone's browser. */
export function openLink(url: string): void {
  // Back from the browser, the page is still here, however long the reading took (features/return).
  leaveOnPurpose();
  void Linking.openURL(url).catch(() => undefined);
}
