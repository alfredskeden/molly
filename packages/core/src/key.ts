import type { BabyBuddyErrorKind } from '@molly/api';

export type KeyVerdict = 'keyWorks' | 'invalidKey' | 'unconfirmed';

/**
 * Baby Buddy refuses both a bad key and a missing permission (a caregiver stopping someone else's
 * timer). After a refused request, `GET /api/profile` tells them apart: it needs no permission, so
 * refusing it too means the key itself is rejected.
 */
export function keyCheckVerdict(profile: 'ok' | BabyBuddyErrorKind): KeyVerdict {
  if (profile === 'ok') return 'keyWorks';
  return profile === 'forbidden' || profile === 'unauthorized' ? 'invalidKey' : 'unconfirmed';
}
