import type { Entry, EntryKind, Feeding } from '@molly/api';

import { entryTime } from './entry-time';
import { isSolidFeed } from './feeding';

export type EntriesByKind = { [K in EntryKind]: Entry<K>[] };

/** The widget's snapshot and the hero: medication isn't part of it, and the feeding is the last milk feed (a meal doesn't replace milk). */
export type LastOfEach = { [K in Exclude<EntryKind, 'medication'>]: Entry<K> | null };

export function lastOfEach(entries: EntriesByKind): LastOfEach {
  return { sleep: newest(entries.sleep), feeding: newest(milkFeeds(entries.feeding)), change: newest(entries.change) };
}

/** The feedings that are milk: meals left out. */
export function milkFeeds(feedings: Feeding[]): Feeding[] {
  return feedings.filter((feeding) => !isSolidFeed(feeding));
}

export function newest<T extends Entry<EntryKind>>(entries: T[]): T | null {
  return entries.reduce<T | null>(
    (latest, entry) => (!latest || Date.parse(entryTime(entry)) > Date.parse(entryTime(latest)) ? entry : latest),
    null,
  );
}
