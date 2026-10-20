import type { Entry, EntryKind } from '@molly/api';

import { entryTime } from './entry-time';
import type { EntriesByKind } from './latest';

export type TimelineItem = { [K in EntryKind]: { kind: K; at: string; entry: Entry<K> } }[EntryKind];

const KIND_ORDER: Record<EntryKind, number> = { sleep: 0, feeding: 1, change: 2, medication: 3 };

export function mergeTimeline(entries: EntriesByKind): TimelineItem[] {
  const items: TimelineItem[] = [
    ...entries.sleep.map((entry) => ({ kind: 'sleep' as const, at: entryTime(entry), entry })),
    ...entries.feeding.map((entry) => ({ kind: 'feeding' as const, at: entryTime(entry), entry })),
    ...entries.change.map((entry) => ({ kind: 'change' as const, at: entryTime(entry), entry })),
    ...entries.medication.map((entry) => ({ kind: 'medication' as const, at: entryTime(entry), entry })),
  ];
  return items.sort(
    (a, b) =>
      Date.parse(b.at) - Date.parse(a.at) || KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || b.entry.id - a.entry.id,
  );
}
