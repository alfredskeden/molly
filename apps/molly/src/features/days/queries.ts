import type { Note } from '@molly/api';
import { SKIP_TAG, type EntriesByKind } from '@molly/core';
import { useInfiniteQuery } from '@tanstack/react-query';

import { PREDICTION_DAYS, useClient } from '@/features/dashboard/queries';
import { useSignedInSession } from '@/session/session';

import { mergeWeeks, weekWindow } from './weeks';

/** `entries` also holds sleeps from two weeks before `from`, which a day's Likely lane predicts from. */
export type DaysPage = { entries: EntriesByKind; skips: Note[]; from: Date };

/**
 * Past days a week at a time, newest first; each next page fetches the week before. Sleeps are fetched
 * by overlap from `PREDICTION_DAYS` before the week, the rest by when they happened, and the week's
 * `molly-skip` notes.
 */
export function useDays(enabled = true) {
  const client = useClient();
  const { childId } = useSignedInSession();
  return useInfiniteQuery({
    queryKey: ['days', childId],
    enabled,
    initialPageParam: 0,
    getNextPageParam: (_last: DaysPage, pages: DaysPage[]) => pages.length,
    queryFn: async ({ pageParam, signal }): Promise<DaysPage> => {
      const { from, to } = weekWindow(pageParam, new Date());
      const [min, max] = [from.toISOString(), to.toISOString()];
      const predictFrom = new Date(from.getFullYear(), from.getMonth(), from.getDate() - PREDICTION_DAYS).toISOString();
      const [sleep, feeding, change, medication, skips] = await Promise.all([
        client.listEntries('sleep', { child: childId, end_min: predictFrom, start_max: max }, { signal }),
        client.listEntries('feeding', { child: childId, start_min: min, start_max: max }, { signal }),
        client.listEntries('change', { child: childId, date_min: min, date_max: max }, { signal }),
        client.listEntries('medication', { child: childId, date_min: min, date_max: max }, { signal }),
        client.listNotes({ child: childId, tags: SKIP_TAG, date_min: min, date_max: max }, { signal }),
      ]);
      return { entries: { sleep, feeding, change, medication }, skips, from };
    },
  });
}

/** Every loaded week's entries and skips as one set, without the repeats where weeks overlap. */
export function mergeDays(pages: DaysPage[]): { entries: EntriesByKind; skips: Note[] } {
  const skips = new Map(pages.flatMap((page) => page.skips).map((note) => [note.id, note]));
  return { entries: mergeWeeks(pages), skips: [...skips.values()] };
}
