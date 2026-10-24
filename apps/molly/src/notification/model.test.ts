import { describe, expect, it } from 'vitest';

import { EMPTY_CACHE, type ChildTimers, type WidgetCache, type WidgetSnapshot } from '@/widget/model';

import {
  lockScreenPrompt,
  napReminderNotifications,
  notificationCardLine,
  timerNotifications,
  vitaminDNotifications,
  type ChildReminderNotification,
  type ChildTimerNotification,
} from './model';

const MOLLY = { id: 1, name: 'Molly', hue: 0 };
const OTTO = { id: 9, name: 'Otto', hue: 1 };

const idle: WidgetSnapshot = {
  fetchedAt: '2026-09-20T08:00:00.000Z',
  child: MOLLY,
  sleepTimer: null,
  feedingTimer: null,
  lastSleep: '2026-09-20T06:30:00Z',
  lastFeeding: '2026-09-20T05:10:00Z',
  lastFeedingMethod: 'left breast',
  lastChange: null,
  nextSleep: null,
  lastBottle: null,
};

const NOW = new Date('2026-09-20T08:00:00Z');
const napWindow = { start: '07:00', end: '19:00' };
const options = { enabled: true, napWindowOf: () => napWindow, now: NOW };

/** One child, Molly, with the snapshot's timers as her running timers. */
const withSnapshot = (snapshot: Partial<WidgetSnapshot>): WidgetCache => {
  const full = { ...idle, ...snapshot };
  return { ...EMPTY_CACHE, snapshot: full, timers: [{ child: MOLLY, sleep: full.sleepTimer, feeding: full.feedingTimer }] };
};

/** The one child's sleep and feeding notifications, as they read before several children. */
function byTracker(list: ChildTimerNotification[]) {
  const pick = (tracker: 'sleep' | 'feeding') => {
    const found = list.find((notification) => notification.tracker === tracker);
    if (!found) return null;
    const { tracker: _, child: __, avatar: ___, ...rest } = found;
    return rest;
  };
  return { sleep: pick('sleep'), feeding: pick('feeding') };
}

const one = (list: ChildReminderNotification[]) => {
  const [found] = list;
  if (!found) return null;
  const { child: _, ...rest } = found;
  return rest;
};

describe('lock-screen timer notifications', () => {
  it('shows nothing before anything is known', () => {
    // Given
    const cache = EMPTY_CACHE;

    // When
    const notifications = byTracker(timerNotifications(cache, options));

    // Then
    expect(notifications).toEqual({ sleep: null, feeding: null });
  });

  it('shows nothing while no timer runs', () => {
    // Given
    const cache = withSnapshot({});

    // When
    const notifications = byTracker(timerNotifications(cache, options));

    // Then
    expect(notifications).toEqual({ sleep: null, feeding: null });
  });

  it('shows a running feeding with its start, who started it, the last side and the stop buttons', () => {
    // Given
    const cache = withSnapshot({ feedingTimer: { start: '2026-09-20T07:02:00Z', byMe: true } });

    // When
    const { feeding } = byTracker(timerNotifications(cache, options));

    // Then
    expect(feeding).toEqual({
      title: 'Feeding',
      text: 'since 09:02 · by you · last side Left',
      start: Date.parse('2026-09-20T07:02:00Z'),
      actions: [
        { intent: 'FEED_STOP_LEFT', label: 'Left', pending: 'Saving…' },
        { intent: 'FEED_STOP_RIGHT', label: 'Right', pending: 'Saving…' },
        { intent: 'FEED_STOP_BOTTLE', label: 'Bottle', pending: 'Saving…' },
      ],
    });
  });

  it("says when the other parent started the feeding", () => {
    // Given
    const cache = withSnapshot({ feedingTimer: { start: '2026-09-20T07:02:00Z', byMe: false } });

    // When
    const { feeding } = byTracker(timerNotifications(cache, options));

    // Then
    expect(feeding?.text).toBe('since 09:02 · by someone else · last side Left');
  });

  it.each(['bottle', 'parent fed', null] as const)('leaves out the side when the last feed was %s', (method) => {
    // Given
    const cache = withSnapshot({
      feedingTimer: { start: '2026-09-20T07:02:00Z', byMe: true },
      lastFeedingMethod: method,
    });

    // When
    const { feeding } = byTracker(timerNotifications(cache, options));

    // Then
    expect(feeding?.text).toBe('since 09:02 · by you');
  });

  it('shows a running daytime sleep as a nap with a stop button', () => {
    // Given
    const cache = withSnapshot({ sleepTimer: { start: '2026-09-20T06:32:00Z', byMe: false } });

    // When
    const { sleep } = byTracker(timerNotifications(cache, options));

    // Then
    expect(sleep).toEqual({
      title: 'Sleeping',
      text: 'since 08:32 · saves as nap',
      start: Date.parse('2026-09-20T06:32:00Z'),
      actions: [{ intent: 'SLEEP_STOP', label: 'Stop', pending: 'Stopping…' }],
    });
  });

  it('shows a sleep started outside the nap window as night sleep', () => {
    // Given
    const cache = withSnapshot({ sleepTimer: { start: '2026-09-19T19:30:00Z', byMe: true } });

    // When
    const { sleep } = byTracker(timerNotifications(cache, options));

    // Then
    expect(sleep?.text).toBe('since 21:30 · saves as night sleep');
  });

  it.each([
    ['nap before the nap-window end', '2026-09-20T16:55:00Z', 'nap'],
    ['night sleep once it runs past the nap-window end', '2026-09-20T17:05:00Z', 'night sleep'],
  ])('says a sleep started 18:45 saves as %s', (_case, now, kind) => {
    // Given
    const cache = withSnapshot({ sleepTimer: { start: '2026-09-20T16:45:00Z', byMe: true } });

    // When
    const { sleep } = byTracker(timerNotifications(cache, { ...options, now: new Date(now) }));

    // Then
    expect(sleep?.text).toBe(`since 18:45 · saves as ${kind}`);
  });

  it('shows both when sleep and feeding run at once', () => {
    // Given
    const cache = withSnapshot({
      sleepTimer: { start: '2026-09-20T06:32:00Z', byMe: true },
      feedingTimer: { start: '2026-09-20T07:02:00Z', byMe: true },
    });

    // When
    const notifications = byTracker(timerNotifications(cache, options));

    // Then
    expect([notifications.sleep?.title, notifications.feeding?.title]).toEqual(['Sleeping', 'Feeding']);
  });

  it('shows nothing when the parent turned notifications off', () => {
    // Given
    const cache = withSnapshot({ sleepTimer: { start: '2026-09-20T06:32:00Z', byMe: true } });

    // When
    const notifications = byTracker(timerNotifications(cache, { ...options, enabled: false }));

    // Then
    expect(notifications).toEqual({ sleep: null, feeding: null });
  });

  it('with a rejected key says to open Molly instead of offering buttons that would fail', () => {
    // Given
    const cache: WidgetCache = {
      ...withSnapshot({ sleepTimer: { start: '2026-09-20T07:02:00Z', byMe: true } }),
      keyRejected: true,
    };

    // When
    const { sleep } = byTracker(timerNotifications(cache, options));

    // Then
    expect(sleep).toEqual({
      title: "Can't sign in",
      text: 'Open Molly to add a new key',
      start: Date.parse('2026-09-20T07:02:00Z'),
      actions: [],
    });
  });

  it('shows a failed stop in place of the details, so the parent can try again', () => {
    // Given
    const cache: WidgetCache = {
      ...withSnapshot({ feedingTimer: { start: '2026-09-20T07:02:00Z', byMe: true } }),
      note: { row: 'feeding', text: 'Not saved: offline', tone: 'error', at: '2026-09-20T07:59:00Z', child: MOLLY.id },
    };

    // When
    const { feeding } = byTracker(timerNotifications(cache, options));

    // Then
    expect(feeding?.text).toBe('Not saved: offline');
  });

  it.each([
    ['a back-to-sleep after the morning wake', '2026-09-20T06:15:00Z', null, '2026-09-20T08:20:00Z', 'nap'],
    ['an evening catnap before the bedtime cut', '2026-09-20T17:30:00Z', null, '2026-09-20T17:45:00Z', 'nap'],
    ['an early evening sleep once it has run long', '2026-09-20T17:00:00Z', '2026-09-20T19:00:00Z', '2026-09-20T19:05:00Z', 'night sleep'],
  ])("says %s saves as the refresh's rhythm reading has it", (_case, start, nightFrom, now, kind) => {
    // Given
    const cache = withSnapshot({ sleepTimer: { start, byMe: true, nightFrom } });

    // When
    const { sleep } = byTracker(timerNotifications(cache, { ...options, now: new Date(now) }));

    // Then
    expect(sleep?.text).toMatch(new RegExp(`saves as ${kind}$`));
  });

  it("keeps an error to its own tracker's notification", () => {
    // Given
    const cache: WidgetCache = {
      ...withSnapshot({
        sleepTimer: { start: '2026-09-20T06:32:00Z', byMe: true },
        feedingTimer: { start: '2026-09-20T07:02:00Z', byMe: true },
      }),
      note: { row: 'feeding', text: 'Not saved: offline', tone: 'error', at: '2026-09-20T07:59:00Z', child: MOLLY.id },
    };

    // When
    const { sleep } = byTracker(timerNotifications(cache, options));

    // Then
    expect(sleep?.text).toBe('since 08:32 · saves as nap');
  });

  it('drops an error once it is older than a widget note lasts', () => {
    // Given
    const cache: WidgetCache = {
      ...withSnapshot({ feedingTimer: { start: '2026-09-20T07:02:00Z', byMe: true } }),
      note: { row: 'feeding', text: 'Not saved: offline', tone: 'error', at: '2026-09-20T07:58:00Z', child: MOLLY.id },
    };

    // When
    const { feeding } = byTracker(timerNotifications(cache, options));

    // Then
    expect(feeding?.text).toBe('since 09:02 · by you · last side Left');
  });
});

describe('a lock-screen tap waiting on Baby Buddy', () => {
  const running = {
    sleepTimer: { start: '2026-09-20T07:30:00Z', byMe: true },
    feedingTimer: { start: '2026-09-20T07:02:00Z', byMe: true },
  };
  const pendingFor = (intent: 'SLEEP_STOP' | 'FEED_STOP_LEFT' | 'DIAPER_WET', secondsAgo: number): WidgetCache => ({
    ...withSnapshot(running),
    pending: { intent, at: new Date(NOW.getTime() - secondsAgo * 1000).toISOString(), child: MOLLY.id },
  });

  it('a sleep stop being sent shows the pending line with no buttons, still counting from the start', () => {
    // Given
    const cache = pendingFor('SLEEP_STOP', 5);

    // When
    const { sleep } = byTracker(timerNotifications(cache, options));

    // Then
    expect(sleep).toEqual({ title: 'Sleeping', text: 'Stopping…', start: Date.parse('2026-09-20T07:30:00Z'), actions: [] });
  });

  it('a feeding stop being sent shows Saving… on the feeding and leaves the sleep as it is', () => {
    // Given
    const cache = pendingFor('FEED_STOP_LEFT', 5);

    // When
    const { sleep, feeding } = byTracker(timerNotifications(cache, options));

    // Then
    expect(feeding).toMatchObject({ title: 'Feeding', text: 'Saving…', actions: [] });
    expect(sleep?.actions).toHaveLength(1);
  });

  it('a diaper being sent changes neither notification', () => {
    // Given
    const cache = pendingFor('DIAPER_WET', 5);

    // When
    const notifications = byTracker(timerNotifications(cache, options));

    // Then
    expect(notifications).toEqual(byTracker(timerNotifications(withSnapshot(running), options)));
  });

  it('a tap pending for over 30 s brings the buttons back', () => {
    // Given
    const cache = pendingFor('SLEEP_STOP', 31);

    // When
    const { sleep } = byTracker(timerNotifications(cache, options));

    // Then
    expect(sleep).toMatchObject({ text: 'since 09:30 · saves as nap', actions: [{ intent: 'SLEEP_STOP' }] });
  });
});

describe('asking for the lock-screen notification', () => {
  const ready = { hasNotifications: true, enabled: true, allowed: false, prompted: false };

  it('asks with the sheet when a timer is started and notifications are off', () => {
    // Given
    const state = ready;

    // When
    const prompt = lockScreenPrompt(state);

    // Then
    expect(prompt).toBe('sheet');
  });

  it('after the question was answered, only offers the quiet line in the hero', () => {
    // Given
    const state = { ...ready, prompted: true };

    // When
    const prompt = lockScreenPrompt(state);

    // Then
    expect(prompt).toBe('heroLine');
  });

  it.each([
    ['notifications are allowed', { allowed: true }],
    ['the parent turned the lock-screen timer off', { enabled: false }],
    ['the platform has no notification (web)', { hasNotifications: false }],
  ])('never asks when %s', (_, change) => {
    // Given
    const state = { ...ready, prompted: true, ...change };

    // When
    const prompt = lockScreenPrompt(state);

    // Then
    expect(prompt).toBeNull();
  });
});

describe('the line under the lock-screen timer in Settings', () => {
  const working = { enabled: true, reminder: false, notifications: 'allowed', liveUpdates: 'on' } as const;

  it('shows nothing when the parent turned the lock-screen timer off', () => {
    // Given
    const state = { ...working, enabled: false, notifications: 'blocked', liveUpdates: 'off' } as const;

    // When
    const line = notificationCardLine(state);

    // Then
    expect(line).toBeNull();
  });

  it.each([
    ['off', 'notificationsOff'],
    ['blocked', 'notificationsBlocked'],
  ] as const)('shows the permission line, not the Live Updates one, when notifications are %s', (notifications, expected) => {
    // Given
    const state = { ...working, notifications, liveUpdates: 'off' } as const;

    // When
    const line = notificationCardLine(state);

    // Then
    expect(line).toBe(expected);
  });

  it('shows the permission line for the Vitamin D reminder with the lock-screen timer off', () => {
    // Given
    const state = { ...working, enabled: false, reminder: true, notifications: 'off' } as const;

    // When
    const line = notificationCardLine(state);

    // Then
    expect(line).toBe('notificationsOff');
  });

  it('leaves out the Live Updates line with only the Vitamin D reminder on: reminders are never promoted', () => {
    // Given
    const state = { ...working, enabled: false, reminder: true, liveUpdates: 'off' } as const;

    // When
    const line = notificationCardLine(state);

    // Then
    expect(line).toBeNull();
  });

  it('shows the Live Updates line when notifications are allowed but Android won\'t promote them', () => {
    // Given
    const state = { ...working, liveUpdates: 'off' } as const;

    // When
    const line = notificationCardLine(state);

    // Then
    expect(line).toBe('liveUpdatesOff');
  });

  it.each([
    ['on', 'on'],
    ['unsupported (before Android 16)', 'unsupported'],
    ['not read yet', null],
  ] as const)('shows nothing when notifications are allowed and Live Updates are %s', (_, liveUpdates) => {
    // Given
    const state = { ...working, liveUpdates };

    // When
    const line = notificationCardLine(state);

    // Then
    expect(line).toBeNull();
  });
});

describe('the Vitamin D reminder notification', () => {
  const at = '2026-09-20T06:00:00.000Z';
  const reminder = { child: MOLLY.id, cycleStart: '2026-09-20T04:40:00.000Z', lastGiven: null, at };
  const showing: WidgetCache = { ...EMPTY_CACHE, timers: [{ child: MOLLY, sleep: null, feeding: null }], reminders: [reminder] };
  const on = { enabledFor: () => true, now: NOW };
  const givenNow = { intent: 'VITAMIN_D_GIVEN', label: 'Given now', pending: 'Saving…' };

  it('shows nothing when the setting is off', () => {
    // When
    const notification = one(vitaminDNotifications(showing, { ...on, enabledFor: () => false }));

    // Then
    expect(notification).toBeNull();
  });

  it('shows nothing when no reminder is due', () => {
    // When
    const notification = one(vitaminDNotifications(EMPTY_CACHE, on));

    // Then
    expect(notification).toBeNull();
  });

  it('says Vitamin D, not given today, with Given now, and no avatar with one child', () => {
    // When
    const notification = one(vitaminDNotifications(showing, on));

    // Then
    expect(notification).toEqual({
      title: 'Vitamin D',
      text: 'Not given today',
      key: Date.parse(at),
      actions: [givenNow],
      avatar: null,
    });
  });

  it('says not given today whenever the last dose was', () => {
    // Given
    const cache = { ...showing, reminders: [{ ...reminder, lastGiven: '2026-09-19T06:10:00Z' }] };

    // When
    const notification = one(vitaminDNotifications(cache, on));

    // Then
    expect(notification?.text).toBe('Not given today');
  });

  it('shows Saving… with no buttons while Given now is on its way', () => {
    // Given
    const cache: WidgetCache = { ...showing, pending: { intent: 'VITAMIN_D_GIVEN', at: '2026-09-20T07:59:55Z', child: MOLLY.id } };

    // When
    const notification = one(vitaminDNotifications(cache, on));

    // Then
    expect(notification).toMatchObject({ text: 'Saving…', actions: [] });
  });

  it('shows the error with its buttons back when Given now failed', () => {
    // Given
    const note = { row: 'medication', text: 'Not saved: offline', tone: 'error', at: '2026-09-20T07:59:00Z', child: MOLLY.id } as const;
    const cache: WidgetCache = { ...showing, note };

    // When
    const notification = one(vitaminDNotifications(cache, on));

    // Then
    expect(notification).toMatchObject({ text: 'Not saved: offline', actions: [givenNow] });
  });

  it('shows nothing while the key is rejected', () => {
    // Given
    const cache = { ...showing, keyRejected: true };

    // When
    const notification = one(vitaminDNotifications(cache, on));

    // Then
    expect(notification).toBeNull();
  });
});

describe('lock-screen notifications with several children', () => {
  const sleeping = (start: string) => ({ start, byMe: true });
  const timers: ChildTimers[] = [
    { child: MOLLY, sleep: sleeping('2026-09-20T06:30:00Z'), feeding: null },
    { child: OTTO, sleep: sleeping('2026-09-20T07:10:00Z'), feeding: null },
  ];
  const cache: WidgetCache = { ...EMPTY_CACHE, snapshot: idle, timers };

  it('shows a sleep notification per sleeping child, each with its child and name in the title', () => {
    // When
    const list = timerNotifications(cache, options);

    // Then
    expect(list.map(({ tracker, child, title }) => ({ tracker, child, title }))).toEqual([
      { tracker: 'sleep', child: MOLLY.id, title: 'Molly · Sleeping' },
      { tracker: 'sleep', child: OTTO.id, title: 'Otto · Sleeping' },
    ]);
  });

  it("carries each child's avatar (initial and colour) while several children are shown", () => {
    // When
    const list = timerNotifications(cache, options);

    // Then
    expect(list.map((notification) => notification.avatar)).toEqual([
      { initial: 'M', hue: 0 },
      { initial: 'O', hue: 1 },
    ]);
  });

  it("uses each child's own nap window", () => {
    // When
    const list = timerNotifications(cache, {
      ...options,
      napWindowOf: (child) => (child === OTTO.id ? { start: '10:00', end: '19:00' } : napWindow),
    });

    // Then
    expect(list.map((notification) => notification.text)).toEqual([
      'since 08:30 · saves as nap',
      'since 09:10 · saves as night sleep',
    ]);
  });

  it('shows a tap being sent only on its own child\'s notification', () => {
    // Given
    const pending = { intent: 'SLEEP_STOP' as const, at: '2026-09-20T07:59:58Z', child: OTTO.id };

    // When
    const list = timerNotifications({ ...cache, pending }, options);

    // Then
    expect(list.map((notification) => notification.text)).toEqual(['since 08:30 · saves as nap', 'Stopping…']);
  });

  it("shows a failed stop only on its own child's notification", () => {
    // Given
    const note = { row: 'sleep', text: 'Not saved: offline', tone: 'error', at: '2026-09-20T07:59:00Z', child: MOLLY.id } as const;

    // When
    const list = timerNotifications({ ...cache, note }, options);

    // Then
    expect(list.map((notification) => notification.text)).toEqual(['Not saved: offline', 'since 09:10 · saves as nap']);
  });

  it("names nobody with one child shown, even when it isn't the widget's child", () => {
    // Given
    const onlyOtto = { ...cache, timers: [timers[1]!] };

    // When
    const list = timerNotifications(onlyOtto, options);

    // Then
    expect(list).toMatchObject([{ child: OTTO.id, title: 'Sleeping', avatar: null }]);
  });

  it('shows nothing for a child that is not shown', () => {
    // Given
    const withoutOtto = { ...cache, timers: [timers[0]!] };

    // When
    const list = timerNotifications(withoutOtto, options);

    // Then
    expect(list.map((notification) => notification.child)).toEqual([MOLLY.id]);
  });

  it("gives the last side only for the widget's own child, the only one it knows it for", () => {
    // Given
    const feeding = { start: '2026-09-20T07:02:00Z', byMe: true };
    const both: WidgetCache = {
      ...cache,
      timers: [
        { child: MOLLY, sleep: null, feeding },
        { child: OTTO, sleep: null, feeding },
      ],
    };

    // When
    const list = timerNotifications(both, options);

    // Then
    expect(list.map((notification) => notification.text)).toEqual(['since 09:02 · by you · last side Left', 'since 09:02 · by you']);
  });

  it("a reminder per child, with the child's name when several are shown", () => {
    // Given
    const reminder = { cycleStart: '2026-09-20T04:40:00.000Z', lastGiven: null, at: '2026-09-20T06:00:00.000Z' };
    const reminders = [
      { ...reminder, child: MOLLY.id },
      { ...reminder, child: OTTO.id },
    ];

    // When
    const list = vitaminDNotifications({ ...cache, reminders }, { enabledFor: (child) => child === OTTO.id, now: NOW });

    // Then
    expect(list).toEqual([
      {
        child: OTTO.id,
        title: 'Otto · Vitamin D',
        text: 'Not given today',
        key: Date.parse(reminder.at),
        actions: [{ intent: 'VITAMIN_D_GIVEN', label: 'Given now', pending: 'Saving…' }],
        avatar: { initial: 'O', hue: 1 },
      },
    ]);
  });
});

describe('the nap reminder notification', () => {
  const setAt = '2026-09-20T07:50:00.000Z';
  /** Nap 2 likely 12:56 – 13:26 Stockholm time. */
  const ring = { slot: 2, start: '2026-09-20T10:56:00.000Z', end: '2026-09-20T11:26:00.000Z' };
  const reminder = { child: MOLLY.id, place: 2, day: '2026-09-20T04:40:00.000Z', setAt, ring };
  const set: WidgetCache = { ...EMPTY_CACHE, timers: [{ child: MOLLY, sleep: null, feeding: null }], napReminders: [reminder] };
  const startSleep = { intent: 'SLEEP_START', label: 'Start sleep', pending: 'Starting…' };

  it('rings at the window start, saying which sleep and its window, with Start sleep', () => {
    // When
    const notifications = napReminderNotifications(set);

    // Then
    expect(notifications).toEqual([
      { child: MOLLY.id, avatar: null, title: 'Nap 2 likely', text: '12:56 – 13:26', key: Date.parse(setAt), at: Date.parse(ring.start), actions: [startSleep] },
    ]);
  });

  it('names bedtime', () => {
    // Given
    const cache = { ...set, napReminders: [{ ...reminder, place: 'bedtime' as const, ring: { ...ring, slot: 'bedtime' as const } }] };

    // When
    const [notification] = napReminderNotifications(cache);

    // Then
    expect(notification?.title).toBe('Bedtime likely');
  });

  it("puts the child's name first and its initial as the icon with several children", () => {
    // Given
    const cache = { ...set, timers: [{ child: MOLLY, sleep: null, feeding: null }, { child: OTTO, sleep: null, feeding: null }] };

    // When
    const [notification] = napReminderNotifications(cache);

    // Then
    expect(notification).toMatchObject({ title: 'Molly · Nap 2 likely', avatar: { initial: 'M', hue: 0 } });
  });

  it('is none for a reminder that is not scheduled', () => {
    // Given
    const cache = { ...set, napReminders: [{ ...reminder, ring: null }] };

    // When
    const notifications = napReminderNotifications(cache);

    // Then
    expect(notifications).toEqual([]);
  });

  it("is none while Baby Buddy rejects the key: its button couldn't work", () => {
    // When
    const notifications = napReminderNotifications({ ...set, keyRejected: true });

    // Then
    expect(notifications).toEqual([]);
  });
});
