import type { Entry } from '@molly/api';

import type { EntriesByKind } from './latest';

const minute = (time: string) => Math.floor(Date.parse(time) / 60_000);

/**
 * The entry another phone saved when it stopped this timer: Baby Buddy gives an entry saved from a
 * timer the timer's start. The newest (latest end) wins if several of that tracker share the minute.
 */
export function entrySavedFromTimer<K extends 'sleep' | 'feeding'>(
  kind: K,
  timerStart: string,
  entries: EntriesByKind,
): Entry<K> | null {
  const candidates = (entries[kind] as Entry<K>[]).filter((entry) => minute(entry.start) === minute(timerStart));
  return candidates.reduce<Entry<K> | null>(
    (newest, entry) => (!newest || Date.parse(entry.end) > Date.parse(newest.end) ? entry : newest),
    null,
  );
}
