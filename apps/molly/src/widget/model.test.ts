import { BabyBuddyError } from '@molly/api';
import { dayPlan, dayRhythm } from '@molly/core';
import { describe, expect, it, vi } from 'vitest';

import { byClock } from '@/actions/trackers';
import { CHILD, fakeClient, runningSleep, savedChange, savedFeeding, savedMedication, savedSleep } from '@/test/fake-client';
import { formatClock } from '@/lib/time';
import { COPY, PLAIN } from '@/theme/copy';
import { THEMES } from '@/theme/themes';

import {
  EMPTY_CACHE,
  answeredCache,
  applyOutcome,
  WIDGET_INTENTS,
  fetchSnapshot,
  noteFor,
  parseIntent,
  parseWidgetCache,
  parseWidgetPins,
  refreshedCache,
  remindedCache,
  runIntent,
  tapAllowed,
  tapContext,
  widgetChild,
  widgetPinChoices,
  widgetLayout,
  widgetSchemes,
  widgetThemes,
  widgetView,
  napReminderRing,
  napRemindersAfter,
  withNapReminder,
  withoutGivenReminder,
  type ChildNapReminder,
  type WidgetCache,
  type WidgetIntent,
} from './model';

const snapshot = {
  fetchedAt: '2026-09-20T08:00:00.000Z',
  child: { id: CHILD, name: 'Molly', hue: 0 },
  sleepTimer: { start: '2026-09-20T07:30:00Z', byMe: false },
  feedingTimer: null,
  lastSleep: '2026-09-20T06:30:00Z',
  lastFeeding: '2026-09-20T07:10:00Z',
  lastFeedingMethod: 'left breast' as const,
  lastChange: null,
  nextSleep: null,
  lastBottle: null,
};

const NOW = new Date('2026-09-20T08:00:00Z');
const napWindow = { start: '07:00', end: '19:00' };
const context = {
  child: CHILD,
  night: byClock(napWindow),
  bottle: { type: 'formula', amount: 120 } as const,
};

describe('widget click intents', () => {
  it.each(WIDGET_INTENTS)('the %s button maps to its intent', (clickAction) => {
    // Given
    const action = clickAction;

    // When
    const intent = parseIntent(action);

    // Then
    expect(intent).toBe(clickAction);
  });

  it.each(['REFRESH', 'OPEN_APP', undefined])('the click action %s is ignored', (clickAction) => {
    // Given
    const action = clickAction;

    // When
    const intent = parseIntent(action);

    // Then
    expect(intent).toBeNull();
  });
});

describe('running a widget intent', () => {
  // An instant feed tapped as the sleep ended: a minute long, ending then.
  const instant = { start: '2026-09-20T12:59:00.000Z', end: '2026-09-20T13:00:00.000Z' };
  const CALLS: [WidgetIntent, boolean, keyof ReturnType<typeof fakeClient>, unknown][] = [
    ['SLEEP_START', false, 'startTimer', { child: CHILD, name: 'molly:sleep' }],
    ['SLEEP_STOP', true, 'stopSleep', { timer: 7, nap: true }],
    ['FEED_START', false, 'startTimer', { child: CHILD, name: 'molly:feeding' }],
    ['FEED_STOP_LEFT', true, 'stopFeeding', { timer: 7, type: 'breast milk', method: 'left breast' }],
    ['FEED_STOP_RIGHT', true, 'stopFeeding', { timer: 7, type: 'breast milk', method: 'right breast' }],
    ['FEED_STOP_BOTTLE', true, 'stopFeeding', { timer: 7, type: 'formula', method: 'bottle', amount: 120 }],
    ['FEED_STOP_BOTH', true, 'stopFeeding', { timer: 7, type: 'breast milk', method: 'both breasts' }],
    ['FEED_LOG_LEFT', false, 'logFeeding', { child: CHILD, ...instant, type: 'breast milk', method: 'left breast' }],
    ['FEED_LOG_RIGHT', false, 'logFeeding', { child: CHILD, ...instant, type: 'breast milk', method: 'right breast' }],
    ['FEED_LOG_BOTH', false, 'logFeeding', { child: CHILD, ...instant, type: 'breast milk', method: 'both breasts' }],
    ['FEED_LOG_BOTTLE', false, 'logFeeding', { child: CHILD, ...instant, type: 'formula', method: 'bottle', amount: 120 }],
    ['DIAPER_WET', false, 'logChange', { child: CHILD, wet: true, solid: false }],
    ['DIAPER_DIRTY', false, 'logChange', { child: CHILD, wet: false, solid: true }],
    ['DIAPER_BOTH', false, 'logChange', { child: CHILD, wet: true, solid: true }],
    ['VITAMIN_D_GIVEN', false, 'logMedication', { child: CHILD, name: 'Vitamin D' }],
  ];

  it.each(CALLS)('%s (timer running: %s) calls %s', async (intent, timerRunning, method, args) => {
    // Given
    const client = fakeClient({ findTimer: vi.fn(async () => (timerRunning ? runningSleep : null)) });

    // When
    await runIntent(intent, client, context, new Date(savedSleep.end));

    // Then
    expect(client[method]).toHaveBeenCalledWith(args);
  });

  it('SLEEP_STOP saves a sleep that ran past the nap-window end as night sleep', async () => {
    // Given
    const timer = { ...runningSleep, start: new Date(2026, 8, 20, 18, 45).toISOString() };
    const client = fakeClient({ findTimer: vi.fn(async () => timer) });

    // When
    await runIntent('SLEEP_STOP', client, context, new Date(2026, 8, 20, 19, 10));

    // Then
    expect(client.stopSleep).toHaveBeenCalledWith({ timer: timer.id, nap: false });
  });
});

describe('widget row notes', () => {
  it.each([
    ['SLEEP_START', { type: 'started', timer: runningSleep }, 'sleep', 'Started'],
    ['FEED_STOP_LEFT', { type: 'stopped', created: { kind: 'feeding', entry: savedFeeding } }, 'feeding', 'Saved'],
    ['DIAPER_WET', { type: 'logged', created: { kind: 'change', entry: savedChange } }, 'diaper', 'Saved'],
    ['VITAMIN_D_GIVEN', { type: 'logged', created: { kind: 'medication', entry: savedMedication } }, 'medication', 'Saved'],
  ] as const)('%s → %s shows in the %s row', (intent, outcome, row, text) => {
    // Given
    const result = outcome;

    // When
    const note = noteFor(intent, result, NOW, CHILD);

    // Then
    expect(note).toEqual({ row, text, tone: 'ok', at: NOW.toISOString(), child: CHILD });
  });

  it('a start while running shows since when', () => {
    // Given
    const outcome = { type: 'alreadyRunning', since: '2026-09-20T12:15:00Z', user: 3 } as const;

    // When
    const note = noteFor('SLEEP_START', outcome, NOW);

    // Then
    expect(note).toMatchObject({ row: 'sleep', text: 'Already running since 14:15', tone: 'ok' });
  });

  it.each([
    [{ type: 'alreadyStopped' }, 'Already stopped', 'ok'],
    // Short: a widget row truncates after about 20 characters.
    [{ type: 'permissionNeeded' }, 'No permission to stop', 'error'],
    [{ type: 'failed', error: 'unreachable' }, 'Not saved: offline', 'error'],
    [{ type: 'failed', error: 'server' }, 'Not saved: server error', 'error'],
  ] as const)('%o shows "%s"', (outcome, text, tone) => {
    // Given
    const result = outcome;

    // When
    const note = noteFor('SLEEP_STOP', result, NOW);

    // Then
    expect(note).toMatchObject({ row: 'sleep', text, tone });
  });
});

describe('the widget snapshot', () => {
  it('collects the running timers, the last time of each tracker and the last feeding method', async () => {
    // Given
    const client = {
      findTimer: vi.fn(async ({ name }: { name: string }) => (name === 'molly:sleep' ? runningSleep : null)),
      getLatestEntries: vi.fn(async () => ({
        sleep: { end: '2026-09-20T06:30:00Z' },
        feeding: { start: '2026-09-20T07:10:00Z', method: 'right breast' },
        change: null,
      })),
      listEntries: vi.fn(async () => []),
      listChildren: vi.fn(async () => [{ id: CHILD, first_name: 'Molly', birth_date: '2026-05-10' }]),
      listTimers: vi.fn(async () => []),
      listNotes: vi.fn(async () => []),
      getRecentBottles: async () => [],
      getRecentFeedings: async () => [],
    };

    // When
    const snapshot = await fetchSnapshot(client as never, { child: CHILD, userId: 2, napWindow, now: NOW });

    // Then
    expect(snapshot).toEqual({
      fetchedAt: NOW.toISOString(),
      child: { id: CHILD, name: 'Molly', hue: 0 },
      sleepTimer: { start: runningSleep.start, byMe: true, nightFrom: null },
      feedingTimer: null,
      lastSleep: '2026-09-20T06:30:00Z',
      lastFeeding: '2026-09-20T07:10:00Z',
      lastFeedingMethod: 'right breast',
      lastChange: null,
      nextSleep: null,
      lastBottle: { type: 'formula', amount: 120 },
    });
  });

  it('says from when stopping the running sleep saves a night sleep, by the child’s rhythm', async () => {
    // Given
    const on = (day: number, hours: number, minutes = 0) => new Date(2026, 8, day, hours, minutes);
    const entry = (from: Date, to: Date) => ({ ...savedSleep, start: from.toISOString(), end: to.toISOString() });
    // Ten days up at 07:00 after a night from 21:45, then today's sleep from 19:00.
    const sleeps = Array.from({ length: 11 }, (_, index) => entry(on(9 + index, 21, 45), on(10 + index, 7, 0)));
    const evening = { ...runningSleep, start: on(20, 19, 0).toISOString() };
    const client = {
      findTimer: vi.fn(async ({ name }: { name: string }) => (name === 'molly:sleep' ? evening : null)),
      getLatestEntries: vi.fn(async () => ({ sleep: null, feeding: null, change: null })),
      listEntries: vi.fn(async () => sleeps),
      listChildren: vi.fn(async () => [{ id: CHILD, first_name: 'Molly', birth_date: '2026-05-10' }]),
      listNotes: vi.fn(async () => []),
      getRecentBottles: async () => [],
      getRecentFeedings: async () => [],
    };

    // When
    const snapshot = await fetchSnapshot(client as never, { child: CHILD, userId: 2, napWindow, now: on(20, 19, 20) });

    // Then
    expect(snapshot.sleepTimer).toMatchObject({ start: evening.start, nightFrom: on(20, 21, 0).toISOString() });
  });

  it('plans the day from a 06:31 wake with the 08:15–10:26 back-to-sleep as its first nap', async () => {
    // Given
    const on = (day: number, hours: number, minutes = 0) => new Date(2026, 8, day, hours, minutes);
    const entry = (from: Date, to: Date) => ({ ...savedSleep, start: from.toISOString(), end: to.toISOString() });
    // Ten days up at 08:10 after a night from 21:00, napping 09:40–10:40 and 13:30–14:30; a setting whose day starts at 08:30.
    const usual = Array.from({ length: 10 }, (_, index) => [
      entry(on(9 + index, 21, 0), on(10 + index, 8, 10)),
      entry(on(10 + index, 9, 40), on(10 + index, 10, 40)),
      entry(on(10 + index, 13, 30), on(10 + index, 14, 30)),
    ]).flat();
    const sleeps = [...usual, entry(on(19, 20, 58), on(20, 6, 31)), entry(on(20, 8, 15), on(20, 10, 26))];
    const client = {
      findTimer: vi.fn(async () => null),
      getLatestEntries: vi.fn(async () => ({ sleep: null, feeding: null, change: null })),
      listEntries: vi.fn(async () => sleeps),
      listChildren: vi.fn(async () => [{ id: CHILD, first_name: 'Molly', birth_date: '2026-04-20' }]),
      listNotes: vi.fn(async () => []),
      getRecentBottles: async () => [],
      getRecentFeedings: async () => [],
    };

    // When
    const snapshot = await fetchSnapshot(client as never, { child: CHILD, userId: 2, napWindow: { start: '08:30', end: '20:00' }, now: on(20, 10, 40) });

    // Then
    expect(snapshot.nextSleep).toMatchObject({ kind: 'nap' });
  });

  it('keeps the last milk feed as the last feeding when a meal is newer', async () => {
    // Given
    const meal = { ...savedFeeding, id: 5, start: '2026-09-20T07:30:00Z', type: 'solid food', method: 'parent fed', amount: 0 };
    const milk = { ...savedFeeding, id: 4, start: '2026-09-20T06:10:00Z', type: 'breast milk', method: 'left breast' };
    const client = {
      findTimer: vi.fn(async () => null),
      getLatestEntries: vi.fn(async () => ({ sleep: null, feeding: meal, change: null })),
      getRecentFeedings: vi.fn(async () => [meal, milk]),
      listEntries: vi.fn(async () => []),
      listChildren: vi.fn(async () => []),
      listNotes: vi.fn(async () => []),
      getRecentBottles: vi.fn(async () => []),
    };

    // When
    const snapshot = await fetchSnapshot(client as never, { child: CHILD, userId: 2, napWindow, now: NOW });

    // Then
    expect(snapshot).toMatchObject({ lastFeeding: '2026-09-20T06:10:00Z', lastFeedingMethod: 'left breast' });
  });

  it("keeps the newest bottle with an amount, where the widget's Bottle saves from", async () => {
    // Given
    const bottles = [
      { ...savedFeeding, id: 3, start: '2026-09-20T07:00:00Z', type: 'breast milk', amount: null },
      { ...savedFeeding, id: 2, start: '2026-09-20T05:00:00Z', type: 'breast milk', amount: 135 },
    ];
    const client = {
      findTimer: vi.fn(async () => null),
      getLatestEntries: vi.fn(async () => ({ sleep: null, feeding: null, change: null })),
      listEntries: vi.fn(async () => []),
      listChildren: vi.fn(async () => []),
      listNotes: vi.fn(async () => []),
      getRecentBottles: vi.fn(async () => bottles),
    };

    // When
    const snapshot = await fetchSnapshot(client as never, { child: CHILD, userId: 2, napWindow, now: NOW });

    // Then
    expect(snapshot.lastBottle).toEqual({ type: 'breast milk', amount: 135 });
    expect(client.getRecentBottles).toHaveBeenCalledWith(CHILD);
  });

  it('keeps the next sleep\'s likely window, worked out from the last two weeks of sleeps and the birth date', async () => {
    // Given
    const night = { start: '2026-09-19T17:30:00Z', end: '2026-09-20T07:00:00Z', nap: false };
    const client = {
      findTimer: vi.fn(async () => null),
      getLatestEntries: vi.fn(async () => ({ sleep: night, feeding: null, change: null })),
      listEntries: vi.fn(async () => [{ id: 1, child: CHILD, duration: '', notes: null, tags: [], ...night }]),
      listChildren: vi.fn(async () => [{ id: CHILD, first_name: 'Molly', birth_date: '2026-05-10' }]),
      listTimers: vi.fn(async () => []),
      listNotes: vi.fn(async () => []),
      getRecentBottles: async () => [],
      getRecentFeedings: async () => [],
    };

    // When
    const snapshot = await fetchSnapshot(client as never, { child: CHILD, userId: 2, napWindow, now: NOW });

    // Then
    expect(snapshot.nextSleep).toEqual({ kind: 'nap', start: '2026-09-20T08:15:00.000Z', end: '2026-09-20T09:05:00.000Z' });
  });

  it('shows what the hero shows after a skip: the first likely sleep that is not skipped', async () => {
    // Given
    const night = { start: '2026-09-19T17:30:00Z', end: '2026-09-20T07:00:00Z', nap: false };
    const skip = { id: 5, child: CHILD, note: 'Skipped nap 10:15–11:05', time: NOW.toISOString(), tags: ['molly-skip'] };
    const client = {
      findTimer: vi.fn(async () => null),
      getLatestEntries: vi.fn(async () => ({ sleep: night, feeding: null, change: null })),
      listEntries: vi.fn(async () => [{ id: 1, child: CHILD, duration: '', notes: null, tags: [], ...night }]),
      listChildren: vi.fn(async () => [{ id: CHILD, first_name: 'Molly', birth_date: '2026-05-10' }]),
      listTimers: vi.fn(async () => []),
      listNotes: vi.fn(async () => [skip]),
      getRecentBottles: async () => [],
      getRecentFeedings: async () => [],
    };

    // When
    const snapshot = await fetchSnapshot(client as never, { child: CHILD, userId: 2, napWindow, now: NOW });

    // Then
    expect(snapshot.nextSleep).toEqual({ kind: 'nap', start: '2026-09-20T09:35:00.000Z', end: '2026-09-20T10:25:00.000Z' });
    expect(client.listNotes).toHaveBeenCalledWith(expect.objectContaining({ child: CHILD, tags: 'molly-skip' }));
  });

  it('shows no next sleep while a sleep runs, though the day plan has one', async () => {
    // Given
    const night = { start: '2026-09-19T17:30:00Z', end: '2026-09-20T07:00:00Z', nap: false };
    const nap = { ...runningSleep, name: 'molly:sleep', start: '2026-09-20T07:30:00Z' };
    const client = {
      findTimer: vi.fn(async ({ name }: { name: string }) => (name === 'molly:sleep' ? nap : null)),
      getLatestEntries: vi.fn(async () => ({ sleep: night, feeding: null, change: null })),
      listEntries: vi.fn(async () => [{ id: 1, child: CHILD, duration: '', notes: null, tags: [], ...night }]),
      listChildren: vi.fn(async () => [{ id: CHILD, first_name: 'Molly', birth_date: '2026-05-10' }]),
      listTimers: vi.fn(async () => []),
      listNotes: vi.fn(async () => []),
      getRecentBottles: async () => [],
      getRecentFeedings: async () => [],
    };

    // When
    const snapshot = await fetchSnapshot(client as never, { child: CHILD, userId: 2, napWindow, now: NOW });

    // Then
    expect(snapshot.nextSleep).toBeNull();
  });

  it('keeps the next sleep while a feed runs', async () => {
    // Given
    const night = { start: '2026-09-19T17:30:00Z', end: '2026-09-20T07:00:00Z', nap: false };
    const feed = { ...runningSleep, name: 'molly:feeding', start: '2026-09-20T07:50:00Z' };
    const client = {
      findTimer: vi.fn(async ({ name }: { name: string }) => (name === 'molly:feeding' ? feed : null)),
      getLatestEntries: vi.fn(async () => ({ sleep: night, feeding: null, change: null })),
      listEntries: vi.fn(async () => [{ id: 1, child: CHILD, duration: '', notes: null, tags: [], ...night }]),
      listChildren: vi.fn(async () => [{ id: CHILD, first_name: 'Molly', birth_date: '2026-05-10' }]),
      listTimers: vi.fn(async () => []),
      listNotes: vi.fn(async () => []),
      getRecentBottles: async () => [],
      getRecentFeedings: async () => [],
    };

    // When
    const snapshot = await fetchSnapshot(client as never, { child: CHILD, userId: 2, napWindow, now: NOW });

    // Then
    expect(snapshot.nextSleep).toEqual({ kind: 'nap', start: '2026-09-20T08:15:00.000Z', end: '2026-09-20T09:05:00.000Z' });
  });

  it('a cached snapshot loads back', () => {
    // Given
    const cache: WidgetCache = { snapshot, pinned: [], note: null, refreshFailedAt: null, keyRejected: false, pending: null, timers: [], reminders: [], napReminders: [] };

    // When
    const loaded = parseWidgetCache(JSON.stringify(cache));

    // Then
    expect(loaded).toEqual(cache);
  });

  it('a snapshot cached before the feeding method was kept loads with no method', () => {
    // Given
    const { lastFeedingMethod: _, ...older } = snapshot;
    const stored = JSON.stringify({ snapshot: older, note: null, refreshFailedAt: null });

    // When
    const loaded = parseWidgetCache(stored);

    // Then
    expect(loaded.snapshot).toEqual({ ...snapshot, lastFeedingMethod: null });
  });

  it('a snapshot cached before the next sleep was kept loads with none', () => {
    // Given
    const { nextSleep: _, ...older } = snapshot;
    const stored = JSON.stringify({ snapshot: older, note: null, refreshFailedAt: null });

    // When
    const loaded = parseWidgetCache(stored);

    // Then
    expect(loaded.snapshot).toEqual({ ...snapshot, nextSleep: null });
  });

  it('a snapshot cached before the last bottle was kept loads with none', () => {
    // Given
    const { lastBottle: _, ...older } = snapshot;
    const stored = JSON.stringify({ snapshot: older, note: null, refreshFailedAt: null });

    // When
    const loaded = parseWidgetCache(stored);

    // Then
    expect(loaded.snapshot).toEqual({ ...snapshot, lastBottle: null });
  });

  it('a cached last bottle loads back', () => {
    // Given
    const withBottle = { ...snapshot, lastBottle: { type: 'formula', amount: 140 } };
    const stored = JSON.stringify({ snapshot: withBottle, pinned: [withBottle], note: null, refreshFailedAt: null });

    // When
    const loaded = parseWidgetCache(stored);

    // Then
    expect([loaded.snapshot?.lastBottle, loaded.pinned[0]?.lastBottle]).toEqual([withBottle.lastBottle, withBottle.lastBottle]);
  });

  it('a cache written before rejected keys were noted loads as not rejected', () => {
    // Given
    const stored = JSON.stringify({ snapshot, note: null, refreshFailedAt: null });

    // When
    const loaded = parseWidgetCache(stored);

    // Then
    expect(loaded.keyRejected).toBe(false);
  });

  it.each(['{not json', '{"snapshot":{"fetchedAt":3}}', null])('a corrupt or missing cache (%s) loads as empty', (stored) => {
    // Given
    const corrupt = stored;

    // When
    const loaded = parseWidgetCache(corrupt);

    // Then
    expect(loaded).toEqual(EMPTY_CACHE);
  });
});

describe('refreshing the widget cache', () => {
  const refused = () => Promise.reject(new BabyBuddyError('forbidden'));
  const latest = async () => ({ sleep: null, feeding: null, change: null });
  const profile = async () => ({}) as never;
  const refreshContext = { child: CHILD, userId: 2, napWindow, now: NOW };
  const reads = {
    listEntries: async () => [],
    listChildren: async () => [],
    listNotes: async () => [],
    listTimers: async () => [],
    getRecentBottles: async () => [],
    getRecentFeedings: async () => [],
  };

  it('a refused refresh whose profile check is refused too notes the rejected key', async () => {
    // Given
    const client = { findTimer: refused, getLatestEntries: latest, getProfile: refused, ...reads };

    // When
    const cache = await refreshedCache({ ...EMPTY_CACHE, snapshot }, client, refreshContext);

    // Then
    expect(cache).toMatchObject({ snapshot, refreshFailedAt: NOW.toISOString(), keyRejected: true });
  });

  it('a refused refresh while the profile still loads is only a failed refresh', async () => {
    // Given
    const client = { findTimer: refused, getLatestEntries: latest, getProfile: profile, ...reads };

    // When
    const cache = await refreshedCache({ ...EMPTY_CACHE, snapshot }, client, refreshContext);

    // Then
    expect(cache).toMatchObject({ refreshFailedAt: NOW.toISOString(), keyRejected: false });
  });

  it('a refresh that works again clears the rejected key', async () => {
    // Given
    const client = { findTimer: async () => null, getLatestEntries: latest, getProfile: profile, ...reads };

    // When
    const cache = await refreshedCache({ ...EMPTY_CACHE, keyRejected: true }, client, refreshContext);

    // Then
    expect(cache).toMatchObject({ refreshFailedAt: null, keyRejected: false });
  });
});

describe('the widget view', () => {
  it('with a rejected key asks to open Molly', () => {
    // Given
    const cache = { ...EMPTY_CACHE, snapshot, keyRejected: true };

    // When
    const view = widgetView(cache, { now: NOW, signedIn: true });

    // Then
    expect(view).toEqual({ type: 'keyRejected' });
  });

  it('with Time feeds off draws the feed row as instant side buttons', () => {
    // Given
    const cache = { ...EMPTY_CACHE, snapshot };

    // When
    const view = widgetView(cache, { now: NOW, signedIn: true, feedTimer: false });

    // Then
    expect(view).toMatchObject({ feeding: { instant: true } });
  });

  it('with Time feeds on draws the feed row with Start as before', () => {
    // Given
    const cache = { ...EMPTY_CACHE, snapshot };

    // When
    const view = widgetView(cache, { now: NOW, signedIn: true, feedTimer: true });

    // Then
    expect(view).toMatchObject({ feeding: { instant: false } });
  });

  it('when signed out asks to open Molly', () => {
    // Given
    const cache = EMPTY_CACHE;

    // When
    const view = widgetView(cache, { now: NOW, signedIn: false });

    // Then
    expect(view).toEqual({ type: 'signedOut' });
  });

  it('with nothing running gives each last time, how long ago it was, and the last side', () => {
    // Given
    const cache = { ...EMPTY_CACHE, snapshot: { ...snapshot, sleepTimer: null } };

    // When
    const view = widgetView(cache, { now: NOW, signedIn: true });

    // Then
    expect(view).toEqual({
      type: 'ready',
      stale: null,
      badge: null,
      sleep: { running: null, lastAt: '08:30', ago: '1h 30m', note: null, pending: null, likely: null },
      feeding: { running: null, lastAt: '09:10', ago: '50m', side: 'Left', note: null, pending: null, instant: true },
      diaper: { running: null, lastAt: null, ago: null, note: null, pending: null },
    });
  });

  it('a running timer gives its start clock and, apart, the elapsed time as of this draw', () => {
    // Given
    const cache = { ...EMPTY_CACHE, snapshot };

    // When
    const view = widgetView(cache, { now: NOW, signedIn: true });

    // Then
    expect(view).toMatchObject({
      sleep: { running: { since: '09:30', elapsed: '30m', asOf: '10:00', byMe: false } },
      feeding: { running: null },
    });
  });

  it.each([
    [60_000, { text: 'Saved', tone: 'ok' }],
    [3 * 60_000, null],
  ])('a note %i ms old shows as %o', (age, expected) => {
    // Given
    const note = { row: 'diaper', text: 'Saved', tone: 'ok', at: new Date(NOW.getTime() - age).toISOString(), child: CHILD } as const;
    const cache = { ...EMPTY_CACHE, snapshot, note };

    // When
    const view = widgetView(cache, { now: NOW, signedIn: true });

    // Then
    expect(view).toMatchObject({ diaper: { note: expected && expect.objectContaining(expected) }, sleep: { note: null } });
  });

  it('after a failed refresh says since when it has not updated', () => {
    // Given
    const cache = { ...EMPTY_CACHE, snapshot, refreshFailedAt: '2026-09-20T08:40:00Z' };

    // When
    const view = widgetView(cache, { now: NOW, signedIn: true });

    // Then
    expect(view).toMatchObject({ stale: 'Not updated since 10:00' });
  });
});

describe('the next sleep on the widget', () => {
  const idle = { ...snapshot, sleepTimer: null };
  const likelyNap = { kind: 'nap' as const, start: '2026-09-20T08:15:00.000Z', end: '2026-09-20T09:05:00.000Z' };

  it('is shown as clock times only, short and long', () => {
    // Given
    const cache = { ...EMPTY_CACHE, snapshot: { ...idle, nextSleep: likelyNap } };

    // When
    const view = widgetView(cache, { now: NOW, signedIn: true });

    // Then
    expect(view.type === 'ready' && view.sleep.likely).toEqual({
      short: 'nap 10:15',
      window: 'Nap 10:15 – 11:05',
      inline: 'nap 10:15 – 11:05',
    });
  });

  it('says bed for bedtime', () => {
    // Given
    const bedtime = { kind: 'bedtime' as const, start: '2026-09-20T08:15:00.000Z', end: '2026-09-20T09:05:00.000Z' };
    const cache = { ...EMPTY_CACHE, snapshot: { ...idle, nextSleep: bedtime } };

    // When
    const view = widgetView(cache, { now: NOW, signedIn: true });

    // Then
    expect(view.type === 'ready' && view.sleep.likely).toEqual({
      short: 'bed 10:15',
      window: 'Bedtime 10:15 – 11:05',
      inline: 'bedtime 10:15 – 11:05',
    });
  });

  it('is gone while a sleep runs, even from a cache that still has it', () => {
    // Given
    const cache = { ...EMPTY_CACHE, snapshot: { ...snapshot, nextSleep: likelyNap } };

    // When
    const view = widgetView(cache, { now: NOW, signedIn: true });

    // Then
    expect(view.type === 'ready' && view.sleep.likely).toBeNull();
  });

  it('is gone more than 45 minutes after the window, even if the widget was not refreshed', () => {
    // Given
    const cache = { ...EMPTY_CACHE, snapshot: { ...idle, nextSleep: likelyNap } };

    // When
    const view = widgetView(cache, { now: new Date('2026-09-20T09:51:00Z'), signedIn: true });

    // Then
    expect(view.type === 'ready' && view.sleep.likely).toBeNull();
  });
});

describe('the widget layout', () => {
  it.each([
    [250, 70, 'glance'],
    [250, 160, 'medium'],
    [250, 260, 'full'],
  ] as const)('Molly at %i×%i dp is the %s layout', (width, height, layout) => {
    // Given
    const size = { width, height };

    // When
    const chosen = widgetLayout('Molly', size);

    // Then
    expect(chosen).toBe(layout);
  });

  it.each([
    ['Sleep', 70, 70, 'small'],
    ['Feeding', 160, 70, 'wide'],
    ['Diaper', 160, 160, 'large'],
    ['Feeding', 70, 160, 'small'],
  ] as const)('%s at %i×%i dp is the %s layout', (name, width, height, layout) => {
    // Given
    const size = { width, height };

    // When
    const chosen = widgetLayout(name, size);

    // Then
    expect(chosen).toBe(layout);
  });
});

describe('the widget theme', () => {
  it.each([
    ['system', { light: 'day', dark: 'night' }],
    ['day', { light: 'day', dark: 'day' }],
    ['night', { light: 'night', dark: 'night' }],
  ] as const)('with the %s preference draws %o for the light and dark system themes', (preference, schemes) => {
    // Given
    const chosen = preference;

    // When
    const drawn = widgetSchemes(chosen);

    // Then
    expect(drawn).toEqual(schemes);
  });
});

describe('widget theme', () => {
  it("draws Molly Classic's day and night looks with plain labels when nothing is chosen", () => {
    // Given
    const settings = { theme: 'system', look: 'classic', playful: true } as const;

    // When
    const themes = widgetThemes(settings);

    // Then
    expect(themes.light).toEqual({ look: THEMES.classic.day, copy: PLAIN });
    expect(themes.dark).toEqual({ look: THEMES.classic.night, copy: PLAIN });
  });

  it('draws the chosen scheme on both halves when the Colours choice is fixed', () => {
    // Given
    const settings = { theme: 'night', look: 'classic', playful: false } as const;

    // When
    const themes = widgetThemes(settings);

    // Then
    expect([themes.light.look, themes.dark.look]).toEqual([THEMES.classic.night, THEMES.classic.night]);
  });

  it("draws Arcade's looks with its labels, or the plain ones with playful labels off", () => {
    // Given
    const playful = { theme: 'system', look: 'arcade', playful: true } as const;
    const plain = { ...playful, playful: false };

    // When
    const themes = [widgetThemes(playful), widgetThemes(plain)];

    // Then
    expect(themes[0]).toEqual({
      light: { look: THEMES.arcade.day, copy: COPY.arcade },
      dark: { look: THEMES.arcade.night, copy: COPY.arcade },
    });
    expect(themes[1].light.copy).toEqual(PLAIN);
  });
});


describe('a widget tap waiting on Baby Buddy', () => {
  const secondsAgo = (seconds: number) => new Date(NOW.getTime() - seconds * 1000).toISOString();

  it('a cache written before pending existed loads with none, keeping everything else', () => {
    // Given
    const stored = JSON.stringify({ snapshot, note: null, refreshFailedAt: null, keyRejected: false });

    // When
    const loaded = parseWidgetCache(stored);

    // Then
    expect(loaded).toEqual({ snapshot, pinned: [], note: null, refreshFailedAt: null, keyRejected: false, pending: null, timers: [], reminders: [], napReminders: [] });
  });

  it('a pending tap loads back', () => {
    // Given
    const cache: WidgetCache = { ...EMPTY_CACHE, snapshot, pending: { intent: 'SLEEP_STOP', at: NOW.toISOString(), child: CHILD } };

    // When
    const loaded = parseWidgetCache(JSON.stringify(cache));

    // Then
    expect(loaded).toEqual(cache);
  });

  it('an unreadable pending loads as none', () => {
    // Given
    const stored = JSON.stringify({ ...EMPTY_CACHE, snapshot, pending: { intent: 'REFRESH', at: NOW.toISOString(), child: CHILD } });

    // When
    const loaded = parseWidgetCache(stored);

    // Then
    expect(loaded).toEqual({ ...EMPTY_CACHE, snapshot });
  });

  it('with nothing pending, no row is pending', () => {
    // Given
    const cache = { ...EMPTY_CACHE, snapshot };

    // When
    const view = widgetView(cache, { now: NOW, signedIn: true });

    // Then
    expect(view).toMatchObject({ sleep: { pending: null }, feeding: { pending: null }, diaper: { pending: null } });
  });

  it.each([
    ['SLEEP_START', 'sleep', 'Starting…'],
    ['SLEEP_STOP', 'sleep', 'Stopping…'],
    ['FEED_START', 'feeding', 'Starting…'],
    ['FEED_STOP_LEFT', 'feeding', 'Saving…'],
    ['FEED_STOP_RIGHT', 'feeding', 'Saving…'],
    ['FEED_STOP_BOTTLE', 'feeding', 'Saving…'],
    ['FEED_STOP_BOTH', 'feeding', 'Saving…'],
    ['FEED_LOG_LEFT', 'feeding', 'Saving…'],
    ['FEED_LOG_RIGHT', 'feeding', 'Saving…'],
    ['FEED_LOG_BOTH', 'feeding', 'Saving…'],
    ['FEED_LOG_BOTTLE', 'feeding', 'Saving…'],
    ['DIAPER_WET', 'diaper', 'Logging…'],
    ['DIAPER_DIRTY', 'diaper', 'Logging…'],
    ['DIAPER_BOTH', 'diaper', 'Logging…'],
  ] as const)('a fresh %s tap marks the %s row with "%s"', (intent, row, label) => {
    // Given
    const cache = { ...EMPTY_CACHE, snapshot, pending: { intent, at: secondsAgo(5), child: CHILD } };

    // When
    const view = widgetView(cache, { now: NOW, signedIn: true });

    // Then
    expect(view.type === 'ready' && view[row].pending).toEqual({ intent, label });
  });

  it("hides the row's last note while its next tap is on its way", () => {
    // Given
    const note = { row: 'diaper', text: 'Not saved: offline', tone: 'error', at: secondsAgo(40), child: CHILD } as const;
    const cache = { ...EMPTY_CACHE, snapshot, note, pending: { intent: 'DIAPER_WET' as const, at: secondsAgo(5), child: CHILD } };

    // When
    const view = widgetView(cache, { now: NOW, signedIn: true });

    // Then
    expect(view).toMatchObject({ diaper: { note: null, pending: { intent: 'DIAPER_WET' } } });
  });

  it("keeps another row's note while a tap is on its way", () => {
    // Given
    const note = { row: 'sleep', text: 'Saved', tone: 'ok', at: secondsAgo(40), child: CHILD } as const;
    const cache = { ...EMPTY_CACHE, snapshot, note, pending: { intent: 'DIAPER_WET' as const, at: secondsAgo(5), child: CHILD } };

    // When
    const view = widgetView(cache, { now: NOW, signedIn: true });

    // Then
    expect(view).toMatchObject({ sleep: { note: { text: 'Saved' } } });
  });

  it('only the tapped row is pending', () => {
    // Given
    const cache = { ...EMPTY_CACHE, snapshot, pending: { intent: 'DIAPER_WET' as const, at: secondsAgo(5), child: CHILD } };

    // When
    const view = widgetView(cache, { now: NOW, signedIn: true });

    // Then
    expect(view).toMatchObject({ sleep: { pending: null }, feeding: { pending: null } });
  });

  it.each([
    [29, true],
    [31, false],
  ])('a tap pending for %i s still shows: %s', (age, shows) => {
    // Given
    const cache = { ...EMPTY_CACHE, snapshot, pending: { intent: 'SLEEP_STOP' as const, at: secondsAgo(age), child: CHILD } };

    // When
    const view = widgetView(cache, { now: NOW, signedIn: true });

    // Then
    expect(view.type === 'ready' && view.sleep.pending !== null).toBe(shows);
  });

  it('a tap runs when nothing is pending', () => {
    // Given
    const cache = { ...EMPTY_CACHE, snapshot };

    // When
    const allowed = tapAllowed(cache, NOW);

    // Then
    expect(allowed).toBe(true);
  });

  it('a tap is dropped while another is pending, even on another row', () => {
    // Given
    const cache = { ...EMPTY_CACHE, snapshot, pending: { intent: 'SLEEP_STOP' as const, at: secondsAgo(5), child: CHILD } };

    // When
    const allowed = tapAllowed(cache, NOW);

    // Then
    expect(allowed).toBe(false);
  });

  it('a tap runs once the pending one is over 30 s old', () => {
    // Given
    const cache = { ...EMPTY_CACHE, snapshot, pending: { intent: 'SLEEP_STOP' as const, at: secondsAgo(31), child: CHILD } };

    // When
    const allowed = tapAllowed(cache, NOW);

    // Then
    expect(allowed).toBe(true);
  });

  it.each([
    [5, { intent: 'SLEEP_STOP', at: secondsAgo(5), child: CHILD }],
    [31, null],
  ] as const)('a plain refresh with a tap pending for %i s keeps %o', async (age, kept) => {
    // Given
    const pending = { intent: 'SLEEP_STOP' as const, at: secondsAgo(age), child: CHILD };
    const client = {
      findTimer: async () => null,
      getLatestEntries: async () => ({ sleep: null, feeding: null, change: null }),
      getProfile: async () => ({}) as never,
      listEntries: async () => [],
      listChildren: async () => [],
      listNotes: async () => [],
      getRecentBottles: async () => [],
      getRecentFeedings: async () => [],
      listTimers: async () => [],
    };

    // When
    const cache = await refreshedCache({ ...EMPTY_CACHE, pending }, client, { child: CHILD, userId: 2, napWindow, now: NOW });

    // Then
    expect(cache.pending).toEqual(kept);
  });
});

describe("drawing Baby Buddy's answer before the refresh", () => {
  const idle = { ...snapshot, sleepTimer: null };

  it('a started sleep sets the timer from Baby Buddy, started by this parent', () => {
    // Given
    const outcome = { type: 'started', timer: { id: 7, start: '2026-09-20T07:59:00Z' } } as const;

    // When
    const next = applyOutcome(idle, 'SLEEP_START', outcome);

    // Then
    expect(next).toEqual({ ...idle, sleepTimer: { start: '2026-09-20T07:59:00Z', byMe: true } });
  });

  it('a started feeding sets the feeding timer', () => {
    // Given
    const outcome = { type: 'started', timer: { id: 8, start: '2026-09-20T07:59:00Z' } } as const;

    // When
    const next = applyOutcome(idle, 'FEED_START', outcome);

    // Then
    expect(next).toEqual({ ...idle, feedingTimer: { start: '2026-09-20T07:59:00Z', byMe: true } });
  });

  it('a stopped sleep clears the timer and moves the last sleep to its end', () => {
    // Given
    const outcome = { type: 'stopped', created: { kind: 'sleep', entry: savedSleep } } as const;

    // When
    const next = applyOutcome(snapshot, 'SLEEP_STOP', outcome);

    // Then
    expect(next).toEqual({ ...snapshot, sleepTimer: null, lastSleep: savedSleep.end });
  });

  it('a stopped feeding clears the timer and moves the last feeding, its method and the last bottle', () => {
    // Given
    const feeding = { ...idle, feedingTimer: { start: savedFeeding.start, byMe: true } };
    const outcome = { type: 'stopped', created: { kind: 'feeding', entry: savedFeeding } } as const;

    // When
    const next = applyOutcome(feeding, 'FEED_STOP_BOTTLE', outcome);

    // Then
    expect(next).toEqual({
      ...idle,
      feedingTimer: null,
      lastFeeding: savedFeeding.start,
      lastFeedingMethod: 'bottle',
      lastBottle: { type: 'formula', amount: 120 },
    });
  });

  it('an instant feed moves the last feeding and its method, and leaves a running timer alone', () => {
    // Given
    const feeding = { ...idle, feedingTimer: { start: '2026-09-20T07:30:00Z', byMe: false } };
    const entry = { ...savedFeeding, type: 'breast milk' as const, method: 'right breast' as const, amount: null };
    const outcome = { type: 'stopped', created: { kind: 'feeding', entry }, instant: true } as const;

    // When
    const next = applyOutcome(feeding, 'FEED_LOG_RIGHT', outcome);

    // Then
    expect(next).toEqual({ ...feeding, lastFeeding: entry.start, lastFeedingMethod: 'right breast' });
  });

  it('a saved bottle with an amount becomes the last bottle', () => {
    // Given
    const outcome = { type: 'stopped', created: { kind: 'feeding', entry: { ...savedFeeding, amount: 135 } }, instant: true } as const;

    // When
    const next = applyOutcome(idle, 'FEED_LOG_BOTTLE', outcome);

    // Then
    expect(next.lastBottle).toEqual({ type: 'formula', amount: 135 });
  });

  it('a logged diaper moves the last diaper time', () => {
    // Given
    const outcome = { type: 'logged', created: { kind: 'change', entry: savedChange } } as const;

    // When
    const next = applyOutcome(snapshot, 'DIAPER_BOTH', outcome);

    // Then
    expect(next).toEqual({ ...snapshot, lastChange: savedChange.time });
  });

  it.each([
    { type: 'alreadyRunning', since: '2026-09-20T07:00:00Z', user: 3 },
    { type: 'alreadyStopped' },
    { type: 'permissionNeeded' },
    { type: 'failed', error: 'unreachable' },
  ] as const)('an answer that changes nothing (%o) leaves the snapshot', (outcome) => {
    // Given
    const answer = outcome;

    // When
    const next = applyOutcome(snapshot, 'SLEEP_STOP', answer);

    // Then
    expect(next).toBe(snapshot);
  });
});

describe('the Vitamin D check after a stop', () => {
  const OTHER = 9;
  const night = { ...savedSleep, nap: false, start: '2026-09-19T17:30:00Z', end: '2026-09-20T04:40:00Z' };
  const nap = { ...savedSleep, start: '2026-09-20T07:00:00Z', end: '2026-09-20T08:00:00Z' };
  const sleepStopped = { type: 'stopped', created: { kind: 'sleep', entry: nap } } as const;
  const dose = (name: string, time: string) => ({ ...savedMedication, name, time });
  const clientWith = (medication: (typeof savedMedication)[]) => ({
    listEntries: vi.fn(async (kind: string) => (kind === 'sleep' ? [night, nap] : medication)),
    listChildren: vi.fn(async () => []),
  });
  const check = { outcome: sleepStopped, enabled: true, child: CHILD, napWindow, now: NOW };
  const reminderFor = (child: number) => ({ child, cycleStart: '2026-09-20T04:40:00.000Z', lastGiven: null, at: '2026-09-20T05:00:00.000Z' });
  const showing = { ...EMPTY_CACHE, reminders: [reminderFor(CHILD)] };

  it('posts a reminder for the cycle from the morning wake when no Vitamin D was given', async () => {
    // Given
    const client = clientWith([dose('Paracetamol 2.5 ml', '2026-09-20T06:00:00Z')]);

    // When
    const cache = await remindedCache(EMPTY_CACHE, client as never, check);

    // Then
    expect(cache.reminders).toEqual([{ child: CHILD, cycleStart: '2026-09-20T04:40:00.000Z', lastGiven: null, at: NOW.toISOString() }]);
  });

  it('checks the stopped child only', async () => {
    // Given
    const client = clientWith([]);

    // When
    await remindedCache(EMPTY_CACHE, client as never, { ...check, child: OTHER });

    // Then
    expect(client.listEntries).toHaveBeenCalledWith('medication', expect.objectContaining({ child: OTHER }));
    expect(client.listEntries).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ child: CHILD }));
  });

  it("keeps another child's reminder next to the new one", async () => {
    // Given
    const client = clientWith([]);
    const otherShowing = { ...EMPTY_CACHE, reminders: [reminderFor(OTHER)] };

    // When
    const cache = await remindedCache(otherShowing, client as never, check);

    // Then
    expect(cache.reminders.map((reminder) => reminder.child)).toEqual([OTHER, CHILD]);
  });

  it('notes the last dose before the cycle', async () => {
    // Given
    const client = clientWith([dose('Vitamin D', '2026-09-19T06:10:00Z')]);

    // When
    const cache = await remindedCache(EMPTY_CACHE, client as never, check);

    // Then
    expect(cache.reminders[0]?.lastGiven).toBe('2026-09-19T06:10:00Z');
  });

  it("posts nothing, and clears the child's showing reminder, once a dose is in the cycle", async () => {
    // Given
    const client = clientWith([dose('Vitamin D3', '2026-09-20T05:30:00Z')]);

    // When
    const cache = await remindedCache({ ...showing, reminders: [reminderFor(CHILD), reminderFor(OTHER)] }, client as never, check);

    // Then
    expect(cache.reminders).toEqual([reminderFor(OTHER)]);
  });

  it('makes no request with the setting off', async () => {
    // Given
    const client = clientWith([]);

    // When
    const cache = await remindedCache(EMPTY_CACHE, client as never, { ...check, enabled: false });

    // Then
    expect(client.listEntries).not.toHaveBeenCalled();
    expect(cache).toEqual(EMPTY_CACHE);
  });

  it.each([
    [{ type: 'failed', error: 'server' }],
    [{ type: 'alreadyStopped' }],
    [{ type: 'stopped', created: { kind: 'feeding', entry: savedFeeding } }],
  ] as const)('makes no request after %o', async (outcome) => {
    // Given
    const client = clientWith([]);

    // When
    await remindedCache(EMPTY_CACHE, client as never, { ...check, outcome });

    // Then
    expect(client.listEntries).not.toHaveBeenCalled();
  });

  it("leaves the cache as it was when Baby Buddy can't be reached", async () => {
    // Given
    const client = { listEntries: vi.fn(() => Promise.reject(new BabyBuddyError('unreachable'))), listChildren: vi.fn(async () => []) };

    // When
    const cache = await remindedCache(EMPTY_CACHE, client as never, check);

    // Then
    expect(cache).toEqual(EMPTY_CACHE);
  });
});

describe('a refresh with a Vitamin D reminder showing', () => {
  const OTHER = 9;
  const latest = async () => ({ sleep: null, feeding: null, change: null });
  const reminder = { child: CHILD, cycleStart: '2026-09-20T04:40:00.000Z', lastGiven: null, at: '2026-09-20T05:00:00.000Z' };
  const otherReminder = { ...reminder, child: OTHER };
  const children = [
    { id: CHILD, first_name: 'Molly', birth_date: '2026-05-10' },
    { id: OTHER, first_name: 'Otto', birth_date: '2025-05-10' },
  ];
  const clientWith = (medication: (child: number) => (typeof savedMedication)[]) => ({
    findTimer: async () => null,
    getLatestEntries: latest,
    getProfile: async () => ({}) as never,
    listChildren: async () => children,
    listNotes: async () => [],
    getRecentBottles: async () => [],
    getRecentFeedings: async () => [],
    listTimers: async () => [],
    listEntries: vi.fn(async (kind: string, query: { child: number }) => (kind === 'medication' ? medication(query.child) : [])),
  });
  const refreshContext = { child: CHILD, userId: 2, napWindow, now: NOW };
  const vitaminD = { ...savedMedication, name: 'Vitamin D', time: '2026-09-20T07:00:00Z' };

  it('clears it once a dose shows up in its cycle', async () => {
    // Given
    const client = clientWith(() => [vitaminD]);

    // When
    const cache = await refreshedCache({ ...EMPTY_CACHE, reminders: [reminder] }, client as never, refreshContext);

    // Then
    expect(cache.reminders).toEqual([]);
  });

  it("clears each child's reminder on its own", async () => {
    // Given
    const client = clientWith((child) => (child === OTHER ? [vitaminD] : []));

    // When
    const cache = await refreshedCache({ ...EMPTY_CACHE, reminders: [reminder, otherReminder] }, client as never, refreshContext);

    // Then
    expect(cache.reminders).toEqual([reminder]);
  });

  it('keeps it while Vitamin D is still due', async () => {
    // Given
    const client = clientWith(() => []);

    // When
    const cache = await refreshedCache({ ...EMPTY_CACHE, reminders: [reminder] }, client as never, refreshContext);

    // Then
    expect(cache.reminders).toEqual([reminder]);
    expect(client.listEntries).toHaveBeenCalledWith('medication', { child: CHILD, date_min: reminder.cycleStart });
  });

  it("drops a hidden child's reminder", async () => {
    // Given
    const client = clientWith(() => []);

    // When
    const cache = await refreshedCache({ ...EMPTY_CACHE, reminders: [reminder, otherReminder] }, client as never, {
      ...refreshContext,
      prefs: { [OTHER]: { shown: false } },
    });

    // Then
    expect(cache.reminders).toEqual([reminder]);
  });

  it('clears it once its cycle is over, without asking for medication', async () => {
    // Given
    const client = clientWith(() => []);
    const old = { ...reminder, cycleStart: '2026-09-19T07:59:00.000Z' };

    // When
    const cache = await refreshedCache({ ...EMPTY_CACHE, reminders: [old] }, client as never, refreshContext);

    // Then
    expect(cache.reminders).toEqual([]);
    expect(client.listEntries).not.toHaveBeenCalledWith('medication', expect.anything());
  });

  it('keeps it when the medication check fails', async () => {
    // Given
    const client = {
      ...clientWith(() => []),
      listEntries: vi.fn(async (kind: string) => (kind === 'medication' ? Promise.reject(new BabyBuddyError('server')) : [])),
    };

    // When
    const cache = await refreshedCache({ ...EMPTY_CACHE, reminders: [reminder] }, client as never, refreshContext);

    // Then
    expect(cache.reminders).toEqual([reminder]);
  });

  it('without one asks for no medication', async () => {
    // Given
    const client = clientWith(() => []);

    // When
    await refreshedCache(EMPTY_CACHE, client as never, refreshContext);

    // Then
    expect(client.listEntries).not.toHaveBeenCalledWith('medication', expect.anything());
  });

  it('loads back from the cache', () => {
    // Given
    const cache: WidgetCache = { ...EMPTY_CACHE, snapshot, reminders: [reminder] };

    // When
    const loaded = parseWidgetCache(JSON.stringify(cache));

    // Then
    expect(loaded.reminders).toEqual([reminder]);
  });

  it('a reminder cached before several children, without its child, is dropped', () => {
    // Given
    const { child: _, ...older } = reminder;
    const stored = JSON.stringify({ ...EMPTY_CACHE, snapshot, reminders: undefined, reminder: older });

    // When
    const loaded = parseWidgetCache(stored);

    // Then
    expect(loaded.reminders).toEqual([]);
  });
});

describe('logging Vitamin D on this phone', () => {
  const OTHER = 9;
  const reminder = { child: CHILD, cycleStart: '2026-09-20T04:40:00.000Z', lastGiven: null, at: '2026-09-20T05:00:00.000Z' };
  const showing = { ...EMPTY_CACHE, reminders: [reminder, { ...reminder, child: OTHER }] };
  const logged = (name: string) => ({ type: 'logged', created: { kind: 'medication', entry: { ...savedMedication, name } } }) as const;

  it.each(['Vitamin D', 'Vitamin D3 10 µg'])('clears that child\'s reminder once "%s" is saved', (name) => {
    // When
    const cache = withoutGivenReminder(showing, logged(name), OTHER);

    // Then
    expect(cache.reminders).toEqual([reminder]);
  });

  it('keeps it after another medicine', () => {
    // When
    const cache = withoutGivenReminder(showing, logged('Paracetamol 2.5 ml'), CHILD);

    // Then
    expect(cache.reminders).toEqual(showing.reminders);
  });

  it('keeps it when Given now failed', () => {
    // When
    const cache = withoutGivenReminder(showing, { type: 'failed', error: 'unreachable' }, CHILD);

    // Then
    expect(cache.reminders).toEqual(showing.reminders);
  });
});

describe('several children on the widget', () => {
  const OTTO = 9;
  const molly = { id: CHILD, name: 'Molly', hue: 0 };
  const otto = { id: OTTO, name: 'Otto', hue: 1 };
  const secondsAgo = (seconds: number) => new Date(NOW.getTime() - seconds * 1000).toISOString();
  const both = [
    { child: molly, sleep: null, feeding: null },
    { child: otto, sleep: { start: '2026-09-20T07:00:00Z', byMe: false }, feeding: null },
  ];

  it('shows no badge with one child shown', () => {
    // Given
    const cache = { ...EMPTY_CACHE, snapshot, timers: [both[0]!] };

    // When
    const view = widgetView(cache, { now: NOW, signedIn: true });

    // Then
    expect(view).toMatchObject({ type: 'ready', badge: null });
  });

  it("shows the snapshot's child as a badge while more than one child is shown", () => {
    // Given
    const cache = { ...EMPTY_CACHE, snapshot, timers: both };

    // When
    const view = widgetView(cache, { now: NOW, signedIn: true });

    // Then
    expect(view).toMatchObject({ type: 'ready', badge: { initial: 'M', name: 'Molly', hue: 0 } });
  });

  it("doesn't draw another child's tap as pending on this child's buttons", () => {
    // Given
    const cache = { ...EMPTY_CACHE, snapshot, timers: both, pending: { intent: 'SLEEP_STOP' as const, at: secondsAgo(3), child: OTTO } };

    // When
    const view = widgetView(cache, { now: NOW, signedIn: true });

    // Then
    expect(view).toMatchObject({ sleep: { pending: null } });
  });

  it("doesn't show another child's answer in this child's row", () => {
    // Given
    const note = { row: 'sleep', text: 'Saved', tone: 'ok', at: secondsAgo(3), child: OTTO } as const;
    const cache = { ...EMPTY_CACHE, snapshot, timers: both, note };

    // When
    const view = widgetView(cache, { now: NOW, signedIn: true });

    // Then
    expect(view).toMatchObject({ sleep: { note: null } });
  });

  it("a refresh keeps every shown child's running timers, in Baby Buddy's order, without hidden ones", async () => {
    // Given
    const mia = { id: 12, first_name: 'Mia', birth_date: '2024-01-01' };
    const client = {
      findTimer: async () => null,
      getLatestEntries: async () => ({ sleep: null, feeding: null, change: null }),
      getProfile: async () => ({}) as never,
      listEntries: async () => [],
      listNotes: async () => [],
      getRecentBottles: async () => [],
      getRecentFeedings: async () => [],
      listChildren: async () => [
        { id: OTTO, first_name: 'Otto', birth_date: '2026-06-01' },
        { id: CHILD, first_name: 'Molly', birth_date: '2026-05-10' },
        mia,
      ],
      listTimers: vi.fn(async ({ name }: { name: string }) =>
        name === 'molly:sleep'
          ? [
              { ...runningSleep, child: OTTO, user: 2 },
              { ...runningSleep, child: mia.id, user: 3 },
            ]
          : [{ ...runningSleep, id: 8, name: 'molly:feeding', child: CHILD, user: 3, start: '2026-09-20T07:40:00Z' }],
      ),
    };

    // When
    const cache = await refreshedCache(EMPTY_CACHE, client as never, {
      child: CHILD,
      userId: 2,
      napWindow,
      now: NOW,
      prefs: { [mia.id]: { shown: false }, [CHILD]: { hue: 3 } },
    });

    // Then
    expect(cache.timers).toEqual([
      { child: { id: OTTO, name: 'Otto', hue: 0 }, sleep: { start: runningSleep.start, byMe: true }, feeding: null },
      { child: { id: CHILD, name: 'Molly', hue: 3 }, sleep: null, feeding: { start: '2026-09-20T07:40:00Z', byMe: false } },
    ]);
    expect(cache.snapshot?.child).toEqual({ id: CHILD, name: 'Molly', hue: 3 });
  });

  it("an answer for the snapshot's child changes the snapshot and that child's timers", () => {
    // Given
    const idle = { ...snapshot, sleepTimer: null };
    const outcome = { type: 'started', timer: { id: 7, start: '2026-09-20T07:59:00Z' } } as const;
    const cache = { ...EMPTY_CACHE, snapshot: idle, timers: both, pending: { intent: 'SLEEP_START' as const, at: secondsAgo(2), child: CHILD } };

    // When
    const next = answeredCache(cache, { intent: 'SLEEP_START', child: CHILD, outcome, tapped: NOW });

    // Then
    expect(next.snapshot?.sleepTimer).toEqual({ start: '2026-09-20T07:59:00Z', byMe: true });
    expect(next.timers[0]?.sleep).toEqual({ start: '2026-09-20T07:59:00Z', byMe: true });
    expect(next.timers[1]).toEqual(both[1]);
    expect(next).toMatchObject({ pending: null, note: { row: 'sleep', text: 'Started', child: CHILD } });
  });

  it("an instant feed leaves that child's running feed timer for the lock screen", () => {
    // Given
    const running = [{ child: { id: CHILD, name: 'Molly', hue: 0 }, sleep: null, feeding: { start: '2026-09-20T07:40:00Z', byMe: false } }];
    const outcome = { type: 'stopped', created: { kind: 'feeding', entry: savedFeeding }, instant: true } as const;
    const cache = { ...EMPTY_CACHE, snapshot, timers: running };

    // When
    const next = answeredCache(cache, { intent: 'FEED_LOG_BOTTLE', child: CHILD, outcome, tapped: NOW });

    // Then
    expect(next.timers).toEqual(running);
  });

  it("an answer for another child (its notification) leaves the widget's snapshot alone", () => {
    // Given
    const outcome = { type: 'stopped', created: { kind: 'sleep', entry: { ...savedSleep, child: OTTO } } } as const;
    const cache = { ...EMPTY_CACHE, snapshot, timers: both };

    // When
    const next = answeredCache(cache, { intent: 'SLEEP_STOP', child: OTTO, outcome, tapped: NOW });

    // Then
    expect(next.snapshot).toBe(snapshot);
    expect(next.timers[1]).toEqual({ child: otto, sleep: null, feeding: null });
    expect(next.timers[0]).toEqual(both[0]);
  });

  it('a snapshot cached before several children loads with no child and no timers', () => {
    // Given
    const { child: _, ...older } = snapshot;
    const stored = JSON.stringify({ snapshot: older, note: null, refreshFailedAt: null, pending: { intent: 'SLEEP_STOP', at: NOW.toISOString() } });

    // When
    const loaded = parseWidgetCache(stored);

    // Then
    expect(loaded).toMatchObject({ snapshot: { ...older, child: null }, timers: [], pending: { intent: 'SLEEP_STOP', child: null } });
  });

  it('per-child timers load back', () => {
    // Given
    const cache: WidgetCache = { ...EMPTY_CACHE, snapshot, timers: both };

    // When
    const loaded = parseWidgetCache(JSON.stringify(cache));

    // Then
    expect(loaded.timers).toEqual(both);
  });
});

describe('the child a tap acts on', () => {
  const OTTO = 9;
  const settings = {
    childId: OTTO,
    children: { [CHILD]: { napWindow: { start: '08:00', end: '18:00' }, bottle: { type: 'breast milk' as const, amount: 90 } } },
  };

  it("is the child the widget drew, with that child's setting and bottle, after the app switched child", () => {
    // Given
    const cache = { ...EMPTY_CACHE, snapshot };
    const evening = { start: new Date(2026, 8, 20, 18, 15), end: new Date(2026, 8, 20, 18, 40) };

    // When
    const context = tapContext(cache, settings);

    // Then
    expect(context).toMatchObject({ child: CHILD, bottle: { type: 'breast milk', amount: 90 } });
    expect(context?.night(evening)).toBe(true);
  });

  it("saves a stop by the refresh's nightFrom for the running sleep it saw", () => {
    // Given
    const start = new Date(2026, 8, 20, 19, 30);
    const sleep = { start: start.toISOString(), byMe: true, nightFrom: new Date(2026, 8, 20, 21, 30).toISOString() };
    const cache = { ...EMPTY_CACHE, snapshot, timers: [{ child: { id: CHILD, name: 'Molly', hue: 0 }, sleep, feeding: null }] };

    // When
    const night = tapContext(cache, settings)!.night;

    // Then
    expect([night({ start, end: new Date(2026, 8, 20, 19, 55) }), night({ start, end: new Date(2026, 8, 20, 21, 30) })]).toEqual([false, true]);
  });

  it("saves a bottle as the drawn child's last bottle when the widget knows one", () => {
    // Given
    const cache = { ...EMPTY_CACHE, snapshot: { ...snapshot, lastBottle: { type: 'formula' as const, amount: 140 } } };

    // When
    const context = tapContext(cache, settings);

    // Then
    expect(context?.bottle).toEqual({ type: 'formula', amount: 140 });
  });

  it("saves a bottle as a pinned child's last bottle for that child's notification", () => {
    // Given
    const pinned = { ...snapshot, child: { id: OTTO, name: 'Otto', hue: 1 }, lastBottle: { type: 'breast milk' as const, amount: 60 } };
    const cache = { ...EMPTY_CACHE, snapshot, pinned: [pinned] };

    // When
    const context = tapContext(cache, settings, OTTO);

    // Then
    expect(context?.bottle).toEqual({ type: 'breast milk', amount: 60 });
  });

  it("is the notification's own child when it says one", () => {
    // Given
    const cache = { ...EMPTY_CACHE, snapshot };

    // When
    const context = tapContext(cache, settings, OTTO);

    // Then
    expect(context).toMatchObject({ child: OTTO, bottle: { type: 'formula', amount: 120 } });
  });

  it("is the app's child when the cached snapshot doesn't say whose it is", () => {
    // Given
    const cache = { ...EMPTY_CACHE, snapshot: { ...snapshot, child: null } };

    // When
    const context = tapContext(cache, settings);

    // Then
    expect(context?.child).toBe(OTTO);
  });

  it('is nobody when signed out of every child', () => {
    // When
    const context = tapContext(EMPTY_CACHE, { childId: null, children: {} });

    // Then
    expect(context).toBeNull();
  });
});

describe('widgets pinned to a child', () => {
  const OTTO = 9;
  const ottoSnapshot = { ...snapshot, child: { id: OTTO, name: 'Otto', hue: 1 }, sleepTimer: null, lastSleep: '2026-09-20T07:45:00Z' };

  it('reads no pins from nothing or from garbage', () => {
    // When
    const pins = [parseWidgetPins(null), parseWidgetPins('not json'), parseWidgetPins('[1,2]')];

    // Then
    expect(pins).toEqual([{}, {}, {}]);
  });

  it('keeps each widget pinned to a child or following the app, and drops broken entries', () => {
    // Given
    const stored = JSON.stringify({ 3: OTTO, 4: 'follow', 5: 'someone', 6: null });

    // When
    const pins = parseWidgetPins(stored);

    // Then
    expect(pins).toEqual({ 3: OTTO, 4: 'follow' });
  });

  it("draws the app's child on a widget with no pin or following the app", () => {
    // Given
    const cache = { ...EMPTY_CACHE, snapshot, pinned: [ottoSnapshot] };

    // When
    const children = [widgetChild(cache, undefined), widgetChild(cache, 'follow')];

    // Then
    expect(children).toEqual([CHILD, CHILD]);
  });

  it('draws the pinned child when the cache has its snapshot', () => {
    // Given
    const cache = { ...EMPTY_CACHE, snapshot, pinned: [ottoSnapshot] };

    // When
    const child = widgetChild(cache, OTTO);

    // Then
    expect(child).toBe(OTTO);
  });

  it("draws the app's child for a pin to a child that is hidden or gone (no snapshot of it)", () => {
    // Given
    const cache = { ...EMPTY_CACHE, snapshot, pinned: [] };

    // When
    const child = widgetChild(cache, OTTO);

    // Then
    expect(child).toBe(CHILD);
  });

  it("draws the pinned child's snapshot, with its badge, and not the app child's tap", () => {
    // Given
    const molly = { id: CHILD, name: 'Molly', hue: 0 };
    const timers = [
      { child: molly, sleep: null, feeding: null },
      { child: ottoSnapshot.child, sleep: null, feeding: null },
    ];
    const pending = { intent: 'SLEEP_STOP' as const, at: NOW.toISOString(), child: CHILD };
    const cache = { ...EMPTY_CACHE, snapshot, pinned: [ottoSnapshot], timers, pending };

    // When
    const view = widgetView(cache, { now: NOW, signedIn: true, child: OTTO });

    // Then
    expect(view).toMatchObject({
      type: 'ready',
      badge: { initial: 'O', name: 'Otto', hue: 1 },
      sleep: { running: null, lastAt: formatClock('2026-09-20T07:45:00Z'), pending: null },
    });
  });

  it("a refresh fetches a snapshot for each pinned, shown child besides the app's, and none for a hidden one", async () => {
    // Given
    const MIA = 12;
    const client = {
      findTimer: vi.fn(async () => null),
      getLatestEntries: async () => ({ sleep: null, feeding: null, change: null }),
      getProfile: async () => ({}) as never,
      listEntries: async () => [],
      listNotes: async () => [],
      getRecentBottles: async () => [],
      getRecentFeedings: async () => [],
      listChildren: async () => [
        { id: OTTO, first_name: 'Otto', birth_date: '2026-06-01' },
        { id: CHILD, first_name: 'Molly', birth_date: '2026-05-10' },
        { id: MIA, first_name: 'Mia', birth_date: '2024-01-01' },
      ],
      listTimers: async () => [],
    };

    // When
    const cache = await refreshedCache(EMPTY_CACHE, client as never, {
      child: CHILD,
      userId: 2,
      napWindow,
      now: NOW,
      prefs: { [MIA]: { shown: false } },
      pinned: [OTTO, CHILD, MIA, OTTO],
    });

    // Then
    expect(cache.snapshot?.child?.id).toBe(CHILD);
    expect(cache.pinned.map((pinned) => pinned.child)).toEqual([{ id: OTTO, name: 'Otto', hue: 0 }]);
    expect(client.findTimer).toHaveBeenCalledTimes(4);
  });

  it("an answer for a pinned child updates that child's snapshot and leaves the app child's alone", () => {
    // Given
    const outcome = { type: 'started', timer: { id: 7, start: '2026-09-20T07:59:00Z' } } as const;
    const cache = { ...EMPTY_CACHE, snapshot, pinned: [ottoSnapshot] };

    // When
    const next = answeredCache(cache, { intent: 'SLEEP_START', child: OTTO, outcome, tapped: NOW });

    // Then
    expect(next.pinned[0]?.sleepTimer).toEqual({ start: '2026-09-20T07:59:00Z', byMe: true });
    expect(next.snapshot).toBe(snapshot);
  });

  it('pinned snapshots load back', () => {
    // Given
    const cache: WidgetCache = { ...EMPTY_CACHE, snapshot, pinned: [ottoSnapshot] };

    // When
    const loaded = parseWidgetCache(JSON.stringify(cache));

    // Then
    expect(loaded.pinned).toEqual([ottoSnapshot]);
  });

  it('asks whose a widget is with Follow the app first, then every shown child', () => {
    // Given
    const molly = { id: CHILD, name: 'Molly', hue: 0 };
    const otto = { id: OTTO, name: 'Otto', hue: 1 };
    const cache = { ...EMPTY_CACHE, timers: [molly, otto].map((child) => ({ child, sleep: null, feeding: null })) };

    // When
    const choices = widgetPinChoices(cache);

    // Then
    expect(choices).toEqual([{ pin: 'follow' }, { pin: CHILD, child: molly }, { pin: OTTO, child: otto }]);
  });

  it("doesn't ask with one shown child, or before any refresh", () => {
    // Given
    const one = { ...EMPTY_CACHE, timers: [{ child: { id: CHILD, name: 'Molly', hue: 0 }, sleep: null, feeding: null }] };

    // When
    const choices = [widgetPinChoices(one), widgetPinChoices(EMPTY_CACHE)];

    // Then
    expect(choices).toEqual([null, null]);
  });
});

describe('the nap reminder in the widget cache', () => {
  const OTHER = 9;
  /** Thursday 24 September 2026, Stockholm. */
  const on = (hours: number, minutes = 0, day = 24) => new Date(2026, 8, day, hours, minutes);
  const entry = (from: Date, to: Date, nap: boolean) => ({ ...savedSleep, start: from.toISOString(), end: to.toISOString(), nap });
  /** Woke 06:40 after a night from 19:30, napped 08:40–09:25; four months old, so the age guide plans the day. */
  const sleeps = [entry(on(19, 30, 23), on(6, 40), false), entry(on(8, 40), on(9, 25), true)];
  const born = '2026-05-19';
  const now = on(10, 0);
  const plan = dayPlan(sleeps, null, born, dayRhythm(sleeps, born, napWindow, now), [], now);
  const data = { sleeps, running: null, birthDate: born, napWindow, skips: [], allowed: true, now };
  /** Set at 09:50 for nap 2 of the day that woke at 06:40. */
  const stored = { place: 2, day: on(6, 40).toISOString(), setAt: on(9, 50).toISOString() };
  const ring = { slot: 2, start: plan[0]!.start.toISOString(), end: plan[0]!.end.toISOString() };
  const reminder = (child: number, overrides: Partial<ChildNapReminder> = {}): ChildNapReminder => ({ child, ...stored, ring, ...overrides });

  it('rings at the start of the planned sleep it was set for', () => {
    // When
    const rings = napReminderRing(stored, data);

    // Then
    expect(rings).toEqual(ring);
  });

  it('is cancelled once a sleep runs', () => {
    // When
    const rings = napReminderRing(stored, { ...data, running: { start: on(9, 55).toISOString() } });

    // Then
    expect(rings).toBeNull();
  });

  it("is set for one child, replacing that child's earlier one and keeping the other child's", () => {
    // Given
    const cache = { ...EMPTY_CACHE, napReminders: [reminder(CHILD, { place: 3 }), reminder(OTHER)] };

    // When
    const next = withNapReminder(cache, CHILD, { ...stored, ring });

    // Then
    expect(next.napReminders).toEqual([reminder(OTHER), reminder(CHILD)]);
  });

  it("is removed for one child, keeping the other child's", () => {
    // Given
    const cache = { ...EMPTY_CACHE, napReminders: [reminder(CHILD), reminder(OTHER)] };

    // When
    const next = withNapReminder(cache, CHILD, null);

    // Then
    expect(next.napReminders).toEqual([reminder(OTHER)]);
  });

  it('is kept by a stored cache, and a cache from before it has none', () => {
    // Given
    const cache = { ...EMPTY_CACHE, napReminders: [reminder(CHILD)] };
    const { napReminders: _, ...older } = cache;

    // When
    const [kept, none] = [parseWidgetCache(JSON.stringify(cache)), parseWidgetCache(JSON.stringify(older))];

    // Then
    expect(kept.napReminders).toEqual([reminder(CHILD)]);
    expect(none.napReminders).toEqual([]);
  });

  describe('changed while a refresh was out', () => {
    const before = { ...EMPTY_CACHE, napReminders: [reminder(OTHER)] };
    const refreshed = { ...EMPTY_CACHE, napReminders: [reminder(OTHER, { ring: null })] };

    it('keeps one set meanwhile', () => {
      // Given
      const latest = { ...before, napReminders: [reminder(OTHER), reminder(CHILD)] };

      // When
      const next = napRemindersAfter(refreshed, before, latest);

      // Then
      expect(next.napReminders).toEqual([reminder(OTHER, { ring: null }), reminder(CHILD)]);
    });

    it('drops one removed meanwhile', () => {
      // When
      const next = napRemindersAfter(refreshed, before, { ...before, napReminders: [] });

      // Then
      expect(next.napReminders).toEqual([]);
    });

    it("keeps the refresh's answer for one nobody touched", () => {
      // When
      const next = napRemindersAfter(refreshed, before, before);

      // Then
      expect(next.napReminders).toEqual(refreshed.napReminders);
    });
  });

  describe('on a refresh', () => {
    const latest = async () => ({ sleep: null, feeding: null, change: null });
    const child = (id: number) => ({ id, first_name: 'Molly', last_name: '', birth_date: born, birth_time: null, slug: `c${id}`, picture: null });
    const children = [child(CHILD), child(OTHER)];
    // Typed loosely: `listEntries` answers sleeps only.
    const clientWith = (overrides: object = {}): never => ({
      findTimer: vi.fn(async () => null),
      getLatestEntries: latest,
      getProfile: async () => ({}) as never,
      listEntries: vi.fn(async () => sleeps),
      listChildren: async () => children,
      listNotes: async () => [],
      getRecentBottles: async () => [],
      getRecentFeedings: async () => [],
      listTimers: async () => [],
      ...overrides,
    }) as never;
    const refreshContext = { child: CHILD, userId: 2, napWindow, now, notificationsAllowed: true };

    it("follows its sleep's window", async () => {
      // Given
      const cache = { ...EMPTY_CACHE, napReminders: [reminder(CHILD, { ring: null })] };

      // When
      const next = await refreshedCache(cache, clientWith(), refreshContext);

      // Then
      expect(next.napReminders).toEqual([reminder(CHILD)]);
    });

    it('is dropped once notifications are not allowed', async () => {
      // Given
      const cache = { ...EMPTY_CACHE, napReminders: [reminder(CHILD)] };

      // When
      const next = await refreshedCache(cache, clientWith(), { ...refreshContext, notificationsAllowed: false });

      // Then
      expect(next.napReminders).toEqual([]);
    });

    it('is dropped for a hidden child', async () => {
      // Given
      const cache = { ...EMPTY_CACHE, napReminders: [reminder(CHILD)] };

      // When
      const next = await refreshedCache(cache, clientWith(), { ...refreshContext, prefs: { [CHILD]: { shown: false } } });

      // Then
      expect(next.napReminders).toEqual([]);
    });

    it("is kept as it was when its child's sleeps can't be fetched", async () => {
      // Given
      const cache = { ...EMPTY_CACHE, napReminders: [reminder(OTHER)] };
      const listEntries = vi.fn(async (_kind: string, { child: id }: { child: number }) =>
        id === OTHER ? Promise.reject(new BabyBuddyError('unreachable')) : sleeps,
      );

      // When
      const next = await refreshedCache(cache, clientWith({ listEntries }), refreshContext);

      // Then
      expect(next).toMatchObject({ refreshFailedAt: null, napReminders: [reminder(OTHER)] });
    });
  });
});
