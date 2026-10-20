import type { Entry, EntryKind } from '@molly/api';

import { entryTime } from './entry-time';

export type EntriesByKind = { [K in EntryKind]: Entry<K>[] };

/** The widget's snapshot and the hero: medication isn't part of it. */
export type LastOfEach = { [K in Exclude<EntryKind, 'medication'>]: Entry<K> | null };

export function lastOfEach(entries: EntriesByKind): LastOfEach {
  return { sleep: newest(entries.sleep), feeding: newest(entries.feeding), change: newest(entries.change) };
}

export function newest<T extends Entry<EntryKind>>(entries: T[]): T | null {
  return entries.reduce<T | null>(
    (latest, entry) => (!latest || Date.parse(entryTime(entry)) > Date.parse(entryTime(latest)) ? entry : latest),
    null,
  );
}
