import type { Sleep, Timer } from '@molly/api';
import { useQueries, useQuery } from '@tanstack/react-query';

import { TIMER_NAMES } from '@/actions/trackers';
import { POLL_MS, useClient } from '@/features/dashboard/queries';
import { usePolling } from '@/features/dashboard/writes';

/**
 * Every child's running `molly:sleep` timer, in one request: the other-child strip and the Children sheet.
 * Under `timer`, so writes invalidate it and it's persisted like the child on screen's timers. `enabled`:
 * off with one shown child, who has no other child to watch.
 */
export function useRunningSleeps(enabled = true) {
  const client = useClient();
  return useQuery({
    queryKey: ['timer', 'all', 'sleep'],
    queryFn: ({ signal }) => client.listTimers({ name: TIMER_NAMES.sleep }, { signal }),
    enabled,
    ...usePolling(POLL_MS),
  });
}

/** The running sleep of one child, from the all-children list. */
export function runningSleepOf(timers: Timer[] | undefined, childId: number): Timer | null {
  return timers?.find((timer) => timer.child === childId) ?? null;
}

/** Each child's newest sleep, for "Awake 1h 25m": only fetched for the children asked for (`enabled`). */
export function useLastSleeps(childIds: number[], enabled: boolean) {
  const client = useClient();
  const polling = usePolling(enabled ? POLL_MS : false);
  return useQueries({
    queries: childIds.map((childId) => ({
      queryKey: ['lastSleep', childId],
      queryFn: ({ signal }): Promise<Sleep | null> => client.getLatestEntry('sleep', childId, { signal }),
      enabled,
      ...polling,
    })),
    combine: (results) =>
      new Map(childIds.map((childId, index) => [childId, results[index]?.data?.end ?? null] as const)),
  });
}
