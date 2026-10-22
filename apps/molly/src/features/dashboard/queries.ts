import { createClient, type Timer } from '@molly/api';
import {
  lastBottle,
  NEEDS_TUNING,
  recentFoods,
  rhythm,
  SKIP_TAG,
  windowsBefore,
  type BottleDefaults,
  type DayWindow,
  type EntriesByKind,
  type NapWindow,
} from '@molly/core';
import { useQuery, useQueryClient, type Query } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { TIMER_NAMES, type Tracker } from '@/actions/trackers';
import { checkKeyOnce, watchRefusals } from '@/session/key-check';
import { useSession, useSignedInSession } from '@/session/session';
import { loadSettings } from '@/storage/settings';
import { syncWidget } from '@/widget/sync';

import { usePolling } from './writes';

/** No push from Baby Buddy: poll while the dashboard shows, so the other parent's changes appear. */
export const POLL_MS = 30_000;

/**
 * After Baby Buddy refuses a request: resolves to whether the key itself is rejected, in which case the
 * session switches to the "can't sign in" screen. False means a missing permission (or no answer).
 */
export function useKeyRejected() {
  const { credentials } = useSignedInSession();
  const { rejectKey } = useSession();
  return useCallback(async () => {
    const verdict = await checkKeyOnce(createClient(credentials), credentials.token);
    if (verdict === 'invalidKey') rejectKey();
    return verdict === 'invalidKey';
  }, [credentials, rejectKey]);
}

/** Any refused request, read or write, checks whether the key still works. */
export function useClient() {
  const { credentials } = useSignedInSession();
  const keyRejected = useKeyRejected();
  return useMemo(
    () => watchRefusals(createClient(credentials), () => void keyRejected().catch(() => undefined)),
    [credentials, keyRejected],
  );
}

export function useRunningTimer(tracker: Tracker) {
  const client = useClient();
  const { childId } = useSignedInSession();
  return useQuery({
    queryKey: ['timer', childId, tracker],
    queryFn: ({ signal }) => client.findTimer({ child: childId, name: TIMER_NAMES[tracker] }, { signal }),
    ...usePolling(POLL_MS),
  });
}

/** How far back the next-sleep prediction looks: `NEXT_SLEEP_TUNING.historyDays`, plus today. */
export const PREDICTION_DAYS = 15;

/**
 * Since yesterday's midnight: enough for today's totals (a night sleep starts yesterday) and the timeline.
 * Sleeps go back two weeks, for the next-sleep prediction: one list, so a tap's guess reaches the ring
 * and the prediction together.
 */
export function useRecentEntries() {
  const client = useClient();
  const { childId } = useSignedInSession();
  return useQuery({
    queryKey: ['entries', childId],
    queryFn: async ({ signal }) => {
      const now = new Date();
      const day = (back: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - back).toISOString();
      const since = day(1);
      // UTC (toISOString): a "+02:00" offset in the query string turns into a space and is refused.
      const [sleep, feeding, change, medication] = await Promise.all([
        client.listEntries('sleep', { child: childId, end_min: day(PREDICTION_DAYS) }, { signal }),
        client.listEntries('feeding', { child: childId, start_min: since }, { signal }),
        client.listEntries('change', { child: childId, date_min: since }, { signal }),
        client.listEntries('medication', { child: childId, date_min: since }, { signal }),
      ]);
      return { sleep, feeding, change, medication };
    },
    ...usePolling(POLL_MS),
  });
}

/**
 * The bottle a new one starts from (`lastBottle`, falling back to the child's bottle): the newest bottles
 * reach further back than the entries' two days, and the entries add one saved since.
 */
export function useLastBottle(fallback: BottleDefaults): BottleDefaults {
  const client = useClient();
  const { childId } = useSignedInSession();
  const bottles = useQuery({
    queryKey: ['bottles', childId],
    queryFn: ({ signal }) => client.getRecentBottles(childId, { signal }),
  });
  const recent = useRecentEntries().data?.feeding;
  return useMemo(() => lastBottle([...(recent ?? []), ...(bottles.data ?? [])], fallback), [recent, bottles.data, fallback]);
}

/**
 * The Solids panel's chips (`recentFoods`): the newest meals reach further back than the entries' two days,
 * and the entries add one saved since.
 */
export function useRecentFoods(): string[] {
  const client = useClient();
  const { childId } = useSignedInSession();
  const solids = useQuery({
    queryKey: ['solids', childId],
    queryFn: ({ signal }) => client.getRecentSolids(childId, { signal }),
  });
  const recent = useRecentEntries().data?.feeding;
  // A meal in both lists gives the same foods twice, which `recentFoods` keeps once.
  return useMemo(() => recentFoods([...(recent ?? []), ...(solids.data ?? [])]), [recent, solids.data]);
}

/** The past page starts after the midnight this many days back (yesterday's day, seen after midnight). */
const PAST_MIDNIGHTS = 2;

/** The past page is fetched this long after the dashboard's first load, so it's ready to swipe to. */
export const PREFETCH_PAST_MS = 2000;

/**
 * The past page's data: every entry since two midnights back, and sleeps two more weeks back, which
 * the Likely lane predicts a past day from. Fetched ahead once the dashboard has loaded (`enabled`);
 * polled only while the past page is showing (`polling`).
 */
export function usePastEntries(enabled: boolean, polling: boolean) {
  const client = useClient();
  const { childId } = useSignedInSession();
  const queryClient = useQueryClient();
  // A write while the page was hidden only marked it out of date: refetched once it shows.
  useEffect(() => {
    if (polling && queryClient.getQueryState(['past', childId])?.isInvalidated) {
      queryClient.refetchQueries({ queryKey: ['past', childId] }).catch(() => undefined);
    }
  }, [polling, childId, queryClient]);
  return useQuery({
    queryKey: ['past', childId],
    enabled,
    queryFn: async ({ signal }) => {
      const now = new Date();
      const day = (back: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - back).toISOString();
      const since = day(PAST_MIDNIGHTS);
      const [sleep, feeding, change, medication] = await Promise.all([
        client.listEntries('sleep', { child: childId, end_min: day(PAST_MIDNIGHTS + PREDICTION_DAYS) }, { signal }),
        client.listEntries('feeding', { child: childId, start_min: since }, { signal }),
        client.listEntries('change', { child: childId, date_min: since }, { signal }),
        client.listEntries('medication', { child: childId, date_min: since }, { signal }),
      ]);
      return { sleep, feeding, change, medication };
    },
    // Read by the refresh after a write: refetched then only while showing.
    meta: { showing: polling },
    ...usePolling(polling ? POLL_MS : false),
  });
}

/** Notes tagged `molly-skip` since two midnights back: today's plan and the past page's Likely lane. */
export function useSkipNotes() {
  const client = useClient();
  const { childId } = useSignedInSession();
  return useQuery({
    queryKey: ['skips', childId],
    queryFn: ({ signal }) => {
      const now = new Date();
      const since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - PAST_MIDNIGHTS).toISOString();
      return client.listNotes({ child: childId, tags: SKIP_TAG, date_min: since }, { signal });
    },
    ...usePolling(POLL_MS),
  });
}

/** How far back Life Sim's rhythm looks for the usual gaps between feeds and between changes. */
export const RHYTHM_DAYS = 14;

/**
 * Life Sim's usual gaps for the live window's kind (`rhythm` in core), from the last two weeks of feeds and
 * changes, split into days and nights by the sleeps the `entries` query already holds. Fetched once per
 * child and window (its start is in the key): never polled, never refreshed after a write or on return
 * (`staleTime: Infinity`), and persisted. The rules' version is in the key too, so an update that changes
 * them never reuses a rhythm worked out the old way. Only the two medians are kept, no entries. Enabled only while the
 * theme draws needs.
 */
export function useRhythm(window: DayWindow | null, sleeps: EntriesByKind['sleep'] | undefined, napWindow: NapWindow, enabled: boolean) {
  const client = useClient();
  const { childId } = useSignedInSession();
  return useQuery({
    queryKey: ['rhythm', childId, NEEDS_TUNING.rhythmVersion, window?.kind, window?.start.getTime()],
    enabled: enabled && window !== null && sleeps !== undefined,
    staleTime: Infinity,
    queryFn: async ({ signal }) => {
      const now = new Date();
      const since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - RHYTHM_DAYS).toISOString();
      const [feeding, change] = await Promise.all([
        client.listEntries('feeding', { child: childId, start_min: since }, { signal }),
        client.listEntries('change', { child: childId, date_min: since }, { signal }),
      ]);
      const entries = { sleep: sleeps!, feeding: [], change: [], medication: [] };
      const windows = [window!, ...windowsBefore(entries, napWindow, now, RHYTHM_DAYS)];
      return rhythm({ feeding, change }, windows, window!.kind);
    },
  });
}

/** Shared with Settings' child picker. */
export function useChildren() {
  const client = useClient();
  return useQuery({ queryKey: ['children'], queryFn: ({ signal }) => client.listChildren({ signal }), staleTime: CHILDREN_STALE_MS });
}

/** Names, birth dates and pictures rarely change. */
const CHILDREN_STALE_MS = 5 * 60_000;

/** Stored on this device and invalidated on every save: never stale on its own. */
export function useSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: loadSettings, staleTime: Infinity });
}

export function useRefreshAfterWrite() {
  const queryClient = useQueryClient();
  return () => {
    // Not awaited: the widget catches up in the background.
    syncWidget().catch(() => undefined);
    // The past windows and Recent days' weeks are refetched now only while on screen; otherwise when next shown.
    const showing = (query: Query) => query.meta?.showing !== false && query.isActive();
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ['timer'] }),
      queryClient.invalidateQueries({ queryKey: ['entries'] }),
      queryClient.invalidateQueries({ queryKey: ['skips'] }),
      queryClient.invalidateQueries({ queryKey: ['lastSleep'] }),
      ...[['past'], ['days']].map((queryKey) =>
        queryClient.invalidateQueries({ queryKey, refetchType: 'none' }).then(() =>
          queryClient.refetchQueries({ queryKey, predicate: showing }),
        ),
      ),
    ]);
  };
}

/**
 * A poll can find a timer the other parent started or stopped. The widget and the lock-screen
 * notification only learn about it when they're synced, so sync when the running timers change.
 * Optimistic guesses (negative ids) are skipped: the write after them syncs anyway.
 */
export function useSyncWhenTimersChange(...timers: (Timer | null | undefined)[]) {
  const key = timers.some((timer) => timer === undefined || (timer && timer.id < 0))
    ? null
    : timers.map((timer) => (timer ? `${timer.id}@${timer.start}` : '-')).join(',');
  const previous = useRef<string | null>(null);
  useEffect(() => {
    if (key === null) return;
    // The first load is covered by the sync on app start and foreground.
    if (previous.current !== null && previous.current !== key) syncWidget().catch(() => undefined);
    previous.current = key;
  }, [key]);
}
