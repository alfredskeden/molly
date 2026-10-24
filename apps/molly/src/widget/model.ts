// Widget logic without the widget library, so it can be unit-tested and shared with the app.
import { BabyBuddyError, type Client, type FeedingMethod, type Sleep } from '@molly/api';
import {
  childPrefs,
  dayPlan,
  dayRhythm,
  dayWindow,
  isSolidFeed,
  isVitaminD,
  lastBottle,
  milkFeeds,
  napReminderAt,
  newest,
  NEXT_SLEEP_TUNING,
  nightFrom,
  parseSkip,
  SKIP_TAG,
  vitaminDCycle,
  vitaminDCycleFrom,
  vitaminDStatus,
  shownChildren,
  type BottleDefaults,
  type ChildrenPrefs,
  type LikelySlot,
  type NapReminder,
  type NapWindow,
  type Skip,
} from '@molly/core';

import {
  byClock,
  logDiaper,
  logFeed,
  logMedication,
  startTimer,
  stopFeeding,
  stopSleep,
  TIMER_NAMES,
  type NightRule,
  type Outcome,
  type TrackerClient,
} from '@/actions/trackers';
import { METHOD_LABELS } from '@/features/dashboard/timeline-text';
import { formatClock, formatElapsed } from '@/lib/time';
import { checkKey, isRefusal } from '@/session/key-check';
import type { Settings, ThemePreference } from '@/storage/types';
import { copyFor, type Copy } from '@/theme/copy';
import { THEMES, type Look } from '@/theme/themes';
import type { Scheme } from '@/theme/tokens';

export const WIDGET_INTENTS = [
  'SLEEP_START',
  'SLEEP_STOP',
  'FEED_START',
  'FEED_STOP_LEFT',
  'FEED_STOP_RIGHT',
  'FEED_STOP_BOTTLE',
  'FEED_STOP_BOTH',
  // Time feeds off: a side saves a finished feed at once.
  'FEED_LOG_LEFT',
  'FEED_LOG_RIGHT',
  'FEED_LOG_BOTTLE',
  'FEED_LOG_BOTH',
  'DIAPER_WET',
  'DIAPER_DIRTY',
  'DIAPER_BOTH',
  // The Vitamin D reminder's Given now; no widget draws it.
  'VITAMIN_D_GIVEN',
] as const;

export type WidgetIntent = (typeof WIDGET_INTENTS)[number];

export function parseIntent(clickAction: string | undefined): WidgetIntent | null {
  return WIDGET_INTENTS.find((intent) => intent === clickAction) ?? null;
}

export type IntentContext = {
  child: number;
  /** What a Stop saves the sleep as: by the last refresh's `nightFrom` for that timer, else by the clock. */
  night: NightRule;
  bottle: BottleDefaults;
};

/**
 * What a widget or notification tap acts on: the notification's own child (`child`, from its extras), else the
 * child the widget drew (the cached snapshot's), else the app's; with that child's night rule (`nightRule`), and
 * as bottle the child's last one as the refresh saw it (else the child's bottle). A tap never lands on whatever
 * the app switched to after the widget was drawn.
 */
export function tapContext(
  cache: WidgetCache,
  settings: Pick<Settings, 'childId' | 'children'>,
  child?: number | null,
): IntentContext | null {
  const id = child ?? cache.snapshot?.child?.id ?? settings.childId;
  if (id === null) return null;
  const { napWindow, bottle } = childPrefs([], settings.children, id);
  const drawn = [cache.snapshot, ...cache.pinned].find((snapshot) => snapshot && (snapshot.child?.id ?? id) === id);
  const sleeping = cache.timers.find((timers) => timers.child.id === id)?.sleep ?? drawn?.sleepTimer ?? null;
  return { child: id, night: nightRule(sleeping, napWindow), bottle: drawn?.lastBottle ?? bottle };
}

/**
 * Whether stopping a sleep saves the night, without the child's sleeps at hand: for the running sleep the refresh
 * saw (same start), from its `nightFrom` on; otherwise, or from a cache before it, by the clock (`byClock`).
 */
export function nightRule(timer: RunningTimer | null, napWindow: NapWindow): NightRule {
  return ({ start, end }) => {
    if (timer?.nightFrom === undefined || Date.parse(timer.start) !== start.getTime()) return byClock(napWindow)({ start, end });
    return timer.nightFrom !== null && end.getTime() >= Date.parse(timer.nightFrom);
  };
}

/** `now`: when a stop happens, which decides whether a sleep is saved as a nap. */
export function runIntent(
  intent: WidgetIntent,
  client: TrackerClient,
  context: IntentContext,
  now: Date = new Date(),
): Promise<Outcome> {
  const { child, night, bottle } = context;
  switch (intent) {
    case 'SLEEP_START':
      return startTimer(client, { child, tracker: 'sleep' });
    case 'SLEEP_STOP':
      return stopSleep(client, { child, night, now });
    case 'FEED_START':
      return startTimer(client, { child, tracker: 'feeding' });
    case 'FEED_STOP_LEFT':
      return stopFeeding(client, { child, button: 'left', bottle });
    case 'FEED_STOP_RIGHT':
      return stopFeeding(client, { child, button: 'right', bottle });
    case 'FEED_STOP_BOTTLE':
      return stopFeeding(client, { child, button: 'bottle', bottle });
    case 'FEED_STOP_BOTH':
      return stopFeeding(client, { child, button: 'both', bottle });
    case 'FEED_LOG_LEFT':
      return logFeed(client, { child, button: 'left', bottle, now });
    case 'FEED_LOG_RIGHT':
      return logFeed(client, { child, button: 'right', bottle, now });
    case 'FEED_LOG_BOTTLE':
      return logFeed(client, { child, button: 'bottle', bottle, now });
    case 'FEED_LOG_BOTH':
      return logFeed(client, { child, button: 'both', bottle, now });
    case 'DIAPER_WET':
      return logDiaper(client, { child, button: 'wet' });
    case 'DIAPER_DIRTY':
      return logDiaper(client, { child, button: 'dirty' });
    case 'DIAPER_BOTH':
      return logDiaper(client, { child, button: 'both' });
    case 'VITAMIN_D_GIVEN':
      // The dashboard's one-tap name; no time, so Baby Buddy stamps it.
      return logMedication(client, { child, name: 'Vitamin D' });
  }
}

/** `medication` is the Vitamin D reminder's; no widget has that row. */
export type WidgetRow = 'sleep' | 'feeding' | 'diaper' | 'medication';

/** `child`: whose tap it answered (null in caches from before several children). */
export type WidgetNote = { row: WidgetRow; text: string; tone: 'ok' | 'error'; at: string; child: number | null };

const ROW_OF: Record<WidgetIntent, WidgetRow> = {
  SLEEP_START: 'sleep',
  SLEEP_STOP: 'sleep',
  FEED_START: 'feeding',
  FEED_STOP_LEFT: 'feeding',
  FEED_STOP_RIGHT: 'feeding',
  FEED_STOP_BOTTLE: 'feeding',
  FEED_STOP_BOTH: 'feeding',
  FEED_LOG_LEFT: 'feeding',
  FEED_LOG_RIGHT: 'feeding',
  FEED_LOG_BOTTLE: 'feeding',
  FEED_LOG_BOTH: 'feeding',
  DIAPER_WET: 'diaper',
  DIAPER_DIRTY: 'diaper',
  DIAPER_BOTH: 'diaper',
  VITAMIN_D_GIVEN: 'medication',
};

/** What a tapped button says while its write is on its way: plain in every theme. */
const PENDING_LABELS: Record<WidgetIntent, string> = {
  SLEEP_START: 'Starting…',
  SLEEP_STOP: 'Stopping…',
  FEED_START: 'Starting…',
  FEED_STOP_LEFT: 'Saving…',
  FEED_STOP_RIGHT: 'Saving…',
  FEED_STOP_BOTTLE: 'Saving…',
  FEED_STOP_BOTH: 'Saving…',
  FEED_LOG_LEFT: 'Saving…',
  FEED_LOG_RIGHT: 'Saving…',
  FEED_LOG_BOTTLE: 'Saving…',
  FEED_LOG_BOTH: 'Saving…',
  DIAPER_WET: 'Logging…',
  DIAPER_DIRTY: 'Logging…',
  DIAPER_BOTH: 'Logging…',
  VITAMIN_D_GIVEN: 'Saving…',
};

export function pendingLabel(intent: WidgetIntent): string {
  return PENDING_LABELS[intent];
}

export function rowOf(intent: WidgetIntent): WidgetRow {
  return ROW_OF[intent];
}

export function noteFor(intent: WidgetIntent, outcome: Outcome, now: Date, child: number | null = null): WidgetNote {
  const note = (text: string, tone: WidgetNote['tone'] = 'ok') => ({
    row: ROW_OF[intent],
    text,
    tone,
    at: now.toISOString(),
    child,
  });
  switch (outcome.type) {
    case 'started':
      return note('Started');
    case 'stopped':
    case 'logged':
      return note('Saved');
    case 'cancelled':
      return note('Cancelled');
    case 'alreadyRunning':
      return note(`Already running since ${formatClock(outcome.since)}`);
    case 'alreadyStopped':
      return note('Already stopped');
    case 'permissionNeeded':
      return note('No permission to stop', 'error');
    case 'failed':
      return note(
        outcome.error === 'unreachable' ? 'Not saved: offline' : 'Not saved: server error',
        'error',
      );
  }
}

/**
 * The snapshot as a confirmed write left it, drawn before the refresh brings Baby Buddy's full view. Answers
 * that changed nothing leave it as it is.
 */
export function applyOutcome(snapshot: WidgetSnapshot, intent: WidgetIntent, outcome: Outcome): WidgetSnapshot {
  const timer = ROW_OF[intent] === 'sleep' ? 'sleepTimer' : 'feedingTimer';
  switch (outcome.type) {
    case 'started':
      // Only this parent's tap starts one.
      return { ...snapshot, [timer]: { start: outcome.timer.start, byMe: true } };
    case 'cancelled':
      return { ...snapshot, [timer]: null };
    case 'stopped': {
      const { created } = outcome;
      if (created.kind === 'sleep') return { ...snapshot, sleepTimer: null, lastSleep: created.entry.end };
      const { entry } = created;
      return {
        ...snapshot,
        // An instant feed stopped no timer: one running stays.
        feedingTimer: outcome.instant ? snapshot.feedingTimer : null,
        lastFeeding: entry.start,
        lastFeedingMethod: entry.method,
        lastBottle: lastBottle([entry], snapshot.lastBottle),
      };
    }
    case 'logged':
      return outcome.created.kind === 'change' ? { ...snapshot, lastChange: outcome.created.entry.time } : snapshot;
    default:
      return snapshot;
  }
}

/** A running timer as the cache keeps it, per child. */
function timersAfter(entry: ChildTimers, intent: WidgetIntent, outcome: Outcome): ChildTimers {
  const tracker = ROW_OF[intent] === 'sleep' ? 'sleep' : 'feeding';
  switch (outcome.type) {
    case 'started':
      return { ...entry, [tracker]: { start: outcome.timer.start, byMe: true } };
    case 'cancelled':
      return { ...entry, [tracker]: null };
    case 'stopped':
      // An instant feed stopped no timer.
      return outcome.instant ? entry : { ...entry, [tracker]: null };
    default:
      return entry;
  }
}

/**
 * The cache once Baby Buddy answered a tap for `child`: only that child's snapshot changes (the app's or a pinned
 * one; a notification can act on a child no widget shows), that child's timers change, the row's note
 * says the answer, and nothing is pending any more.
 */
export function answeredCache(
  cache: WidgetCache,
  { intent, child, outcome, tapped }: { intent: WidgetIntent; child: number; outcome: Outcome; tapped: Date },
): WidgetCache {
  const { snapshot } = cache;
  const ours = snapshot && (snapshot.child?.id ?? child) === child;
  return {
    ...cache,
    snapshot: snapshot && ours ? applyOutcome(snapshot, intent, outcome) : snapshot,
    pinned: cache.pinned.map((pinned) => (pinned.child?.id === child ? applyOutcome(pinned, intent, outcome) : pinned)),
    timers: cache.timers.map((entry) => (entry.child.id === child ? timersAfter(entry, intent, outcome) : entry)),
    note: noteFor(intent, outcome, tapped, child),
    pending: null,
  };
}

export type SnapshotClient = Pick<
  Client,
  | 'findTimer'
  | 'listTimers'
  | 'getLatestEntries'
  | 'getRecentFeedings'
  | 'listEntries'
  | 'listChildren'
  | 'listNotes'
  | 'getRecentBottles'
>;

/**
 * A running timer as a refresh found it. A sleep's `nightFrom`: from when stopping it saves a night sleep
 * (`nightFrom` in core, null: a nap whenever), worked out by the refresh from the child's sleeps; absent where
 * it couldn't be (a timer this phone just started, a child without its sleeps fetched, an older cache).
 */
type RunningTimer = { start: string; byMe: boolean; nightFrom?: string | null };

/** Whose data a snapshot is, as the widget badge draws it: the first name and the colour's index. */
export type WidgetChild = { id: number; name: string; hue: number };

/** A shown child's running timers, for the lock-screen notifications (every shown child, in Baby Buddy's order). */
export type ChildTimers = { child: WidgetChild; sleep: RunningTimer | null; feeding: RunningTimer | null };

/** The next sleep's likely window as the refresh saw it; the widget draws clock times only. */
type LikelySleep = { kind: 'nap' | 'bedtime'; start: string; end: string };

/** Sleeps the prediction needs: its history days, plus today. */
const PREDICTION_DAYS = NEXT_SLEEP_TUNING.historyDays + 1;

/**
 * What the widget shows, cached so it can draw before (or without) a fresh fetch. `child`: whose it is (the
 * child on screen in the app when it was fetched); null in caches from before several children.
 */
export type WidgetSnapshot = {
  fetchedAt: string;
  child: WidgetChild | null;
  sleepTimer: RunningTimer | null;
  feedingTimer: RunningTimer | null;
  lastSleep: string | null;
  lastFeeding: string | null;
  lastFeedingMethod: FeedingMethod | null;
  lastChange: string | null;
  nextSleep: LikelySleep | null;
  /** What the widget's Bottle saves: the newest bottle with an amount, else the child's bottle. */
  lastBottle: BottleDefaults | null;
};

type SnapshotContext = { child: number; userId: number; napWindow: NapWindow; now: Date; prefs?: ChildrenPrefs };

/**
 * A refresh also fetches the children widgets are pinned to (`pinned`), each with its own nap window, and
 * moves or cancels the nap reminders (cancelled while Android doesn't allow notifications: `notificationsAllowed`).
 */
type RefreshContext = SnapshotContext & { pinned?: number[]; notificationsAllowed?: boolean };

export async function fetchSnapshot(client: SnapshotClient, context: SnapshotContext): Promise<WidgetSnapshot> {
  return (await fetchSnapshotAndChildren(client, context)).snapshot;
}

async function fetchSnapshotAndChildren(
  client: SnapshotClient,
  { child, userId, napWindow, now, prefs = {} }: SnapshotContext,
) {
  const day = (back: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - back).toISOString();
  const [sleepTimer, feedingTimer, latest, sleeps, children, notes, bottles] = await Promise.all([
    client.findTimer({ child, name: TIMER_NAMES.sleep }),
    client.findTimer({ child, name: TIMER_NAMES.feeding }),
    client.getLatestEntries(child),
    client.listEntries('sleep', { child, end_min: day(PREDICTION_DAYS) }),
    client.listChildren(),
    // A skip lasts until the next sleep, so yesterday's are the oldest that can still count.
    client.listNotes({ child, tags: SKIP_TAG, date_min: day(1) }),
    client.getRecentBottles(child),
  ]);
  // The last side follows milk: past a meal, the newest milk feed among the recent feedings.
  const lastFeed = latest.feeding && isSolidFeed(latest.feeding) ? newest(milkFeeds(await client.getRecentFeedings(child))) : latest.feeding;
  const running = (timer: typeof sleepTimer) => timer && { start: timer.start, byMe: timer.user === userId };
  const found = children.find((candidate) => candidate.id === child);
  const birthDate = found?.birth_date ?? null;
  const rhythm = dayRhythm(sleeps, birthDate, napWindow, now);
  const skips = notes.flatMap((note) => parseSkip(note) ?? []);
  // What the hero shows: the day plan's first sleep that isn't skipped. None while a sleep runs.
  const plan = sleepTimer ? [] : dayPlan(sleeps, null, birthDate, rhythm, skips, now);
  const night = sleepTimer && nightFrom(new Date(sleepTimer.start), sleeps, rhythm, now);
  const next = plan.find((sleep) => !sleep.skipped);
  const snapshot: WidgetSnapshot = {
    fetchedAt: now.toISOString(),
    child: found ? { id: child, name: found.first_name, hue: childPrefs(children, prefs, child).hue } : null,
    sleepTimer: sleepTimer && { ...running(sleepTimer)!, nightFrom: night ? night.toISOString() : null },
    feedingTimer: running(feedingTimer),
    lastSleep: latest.sleep?.end ?? null,
    lastFeeding: lastFeed?.start ?? null,
    lastFeedingMethod: lastFeed?.method ?? null,
    lastChange: latest.change?.time ?? null,
    nextSleep: next ? { kind: next.kind, start: next.start.toISOString(), end: next.end.toISOString() } : null,
    lastBottle: lastBottle(bottles, childPrefs(children, prefs, child).bottle),
  };
  return { snapshot, children, running };
}

export type WidgetCache = {
  /** The app's child on screen at the last refresh: what widgets following the app draw. */
  snapshot: WidgetSnapshot | null;
  /** Every other shown child a widget is pinned to. */
  pinned: WidgetSnapshot[];
  /** The last button's confirmation or error, shown briefly in its row. */
  note: WidgetNote | null;
  /** Set when the latest refresh failed, so the widget can say it's showing old data. */
  refreshFailedAt: string | null;
  /** Baby Buddy rejects the key: only the app can take a new one, so the widget and notification send the parent there. */
  keyRejected: boolean;
  /** A button tap whose write is on its way; every widget and the notification show it until the answer is in. */
  pending: WidgetPending | null;
  /** Every shown child's running timers as the last refresh found them: the lock-screen notifications. */
  timers: ChildTimers[];
  /** The Vitamin D reminders this phone posted, one per child at most, until a dose shows up or the cycle ends. */
  reminders: ChildReminder[];
  /** The nap reminders set on this phone (the likely-sleep panel's bell), one per child at most. */
  napReminders: ChildNapReminder[];
};

/** When a nap reminder rings and what for: the sleep as the panel names it (`slot`), its window as ISO times. */
export type NapRingAt = { slot: LikelySlot; start: string; end: string };

/** A nap reminder, the child it's for, and when it rings as last worked out (null: not scheduled). */
export type ChildNapReminder = NapReminder & { child: number; ring: NapRingAt | null };

/**
 * `cycleStart` is the cycle the check found no dose in (it ends 24 h later), `lastGiven` the newest dose
 * before it, and `at` when the check ran: a reminder swiped away stays away until the next check.
 */
export type VitaminDReminder = { cycleStart: string; lastGiven: string | null; at: string };

/** A reminder and the child it's for. */
export type ChildReminder = VitaminDReminder & { child: number };

/** `child`: the child the tap acts on (null in caches from before several children). */
export type WidgetPending = { intent: WidgetIntent; at: string; child: number | null };

export const EMPTY_CACHE: WidgetCache = {
  snapshot: null,
  pinned: [],
  note: null,
  refreshFailedAt: null,
  keyRejected: false,
  pending: null,
  timers: [],
  reminders: [],
  napReminders: [],
};

/** A task killed mid-write can't clear its pending tap: past this it's ignored, so nothing stays locked. */
export const PENDING_MS = 30_000;

export function freshPending(cache: WidgetCache, now: Date): WidgetPending | null {
  const { pending } = cache;
  return pending && now.getTime() - Date.parse(pending.at) < PENDING_MS ? pending : null;
}

/** One write at a time: a tap while another is on its way is dropped. */
export function tapAllowed(cache: WidgetCache, now: Date): boolean {
  return freshPending(cache, now) === null;
}

/**
 * A fresh snapshot, or the cached one marked stale. A refused refresh asks the profile whether the key
 * itself is rejected (Baby Buddy also refuses for a missing permission).
 */
export async function refreshedCache(
  base: WidgetCache,
  client: SnapshotClient & Pick<Client, 'getProfile'>,
  context: RefreshContext,
): Promise<WidgetCache> {
  const { now, prefs = {}, pinned: pins = [] } = context;
  // Each child once; the app's child is the main snapshot. Hidden children aren't fetched; one deleted in Baby
  // Buddy only shows as missing from its list, so it's dropped after.
  const others = [...new Set(pins)].filter((id) => id !== context.child && childPrefs([], prefs, id).shown);
  try {
    const [{ snapshot, children, running }, sleeps, feedings, ...fetched] = await Promise.all([
      fetchSnapshotAndChildren(client, context),
      client.listTimers({ name: TIMER_NAMES.sleep }),
      client.listTimers({ name: TIMER_NAMES.feeding }),
      ...others.map((child) =>
        fetchSnapshot(client, { ...context, child, napWindow: childPrefs([], prefs, child).napWindow }),
      ),
    ]);
    const shown = shownChildren(children, prefs);
    const pinned = fetched.filter((pin) => shown.some((child) => child.id === pin.child?.id));
    // A sleep's `nightFrom` is known for the children whose sleeps a snapshot fetched.
    const sleepOf = (id: number) => {
      const timer = running(sleeps.find((found) => found.child === id) ?? null);
      const seen = [snapshot, ...pinned].find((drawn) => drawn.child?.id === id)?.sleepTimer;
      return timer && seen?.start === timer.start && seen.nightFrom !== undefined ? { ...timer, nightFrom: seen.nightFrom } : timer;
    };
    const timers = shown.map((child) => ({
      child: { id: child.id, name: child.first_name, hue: childPrefs(children, prefs, child.id).hue },
      sleep: sleepOf(child.id),
      feeding: running(feedings.find((timer) => timer.child === child.id) ?? null),
    }));
    // A hidden (or deleted) child's reminder goes with its notifications.
    const showing = base.reminders.filter((reminder) => shown.some((child) => child.id === reminder.child));
    const reminders = await Promise.all(showing.map((reminder) => reminderStillDue(reminder, client, now)));
    const napReminders = await Promise.all(
      base.napReminders.flatMap((reminder) => {
        const child = shown.find((candidate) => candidate.id === reminder.child);
        if (!child) return [];
        const { napWindow } = childPrefs([], prefs, child.id);
        const allowed = context.notificationsAllowed ?? false;
        return [napReminderStillSet(reminder, client, { birthDate: child.birth_date, napWindow, allowed, now })];
      }),
    );
    return {
      ...base,
      snapshot,
      pinned,
      timers,
      refreshFailedAt: null,
      keyRejected: false,
      pending: freshPending(base, now),
      reminders: reminders.filter((reminder) => reminder !== null),
      napReminders: napReminders.filter((reminder) => reminder !== null),
    };
  } catch (error) {
    if (!(error instanceof BabyBuddyError)) throw error;
    const keyRejected = isRefusal(error.kind) && (await checkKey(client)) === 'invalidKey';
    return { ...base, refreshFailedAt: now.toISOString(), keyRejected, pending: freshPending(base, now) };
  }
}

/** A sleep this phone just stopped: the moment to check whether Vitamin D is still due. */
function endedSleep(outcome: Outcome): boolean {
  return outcome.type === 'stopped' && outcome.created.kind === 'sleep';
}

const midnightBefore = (now: Date, days: number) =>
  new Date(now.getFullYear(), now.getMonth(), now.getDate() - days).toISOString();

/**
 * After this phone stopped a sleep of `child` (with that child's reminder on): its reminder for the child's current
 * cycle while no Vitamin D is in it, else none. Other children's reminders stay. Checked with Baby Buddy, as the other parent may have logged it; when it
 * can't be reached nothing changes, as a guess could nag after a dose.
 */
export async function remindedCache(
  base: WidgetCache,
  client: Pick<Client, 'listEntries' | 'listChildren'>,
  { outcome, enabled, child, napWindow, now }: { outcome: Outcome; enabled: boolean; child: number; napWindow: NapWindow; now: Date },
): Promise<WidgetCache> {
  if (!enabled || !endedSleep(outcome)) return base;
  try {
    // Fetched after the stop, so a morning wake just logged opens a new cycle. The cycle starts at most about a
    // day ago; medication from two days before it can say when the last dose was. The sleeps go back as far as
    // the child's rhythm is learned from.
    const [sleeps, medication, children] = await Promise.all([
      client.listEntries('sleep', { child, end_min: midnightBefore(now, PREDICTION_DAYS) }),
      client.listEntries('medication', { child, date_min: midnightBefore(now, 3) }),
      client.listChildren(),
    ]);
    const birthDate = children.find((found) => found.id === child)?.birth_date ?? null;
    const rhythm = dayRhythm(sleeps, birthDate, napWindow, now);
    const window = dayWindow({ sleep: sleeps, feeding: [], change: [], medication: [] }, null, rhythm, now);
    const cycle = vitaminDCycle(window, rhythm, now);
    const { due, last } = vitaminDStatus(cycle, medication);
    const others = base.reminders.filter((reminder) => reminder.child !== child);
    const reminder = { child, cycleStart: cycle.start.toISOString(), lastGiven: last?.time ?? null, at: now.toISOString() };
    return { ...base, reminders: due ? [...others, reminder] : others };
  } catch (error) {
    if (!(error instanceof BabyBuddyError)) throw error;
    return base;
  }
}

/** A showing reminder, until a dose shows up in its cycle or the cycle is over; kept when the check fails. */
async function reminderStillDue(
  reminder: ChildReminder,
  client: Pick<Client, 'listEntries'>,
  now: Date,
): Promise<ChildReminder | null> {
  const cycle = vitaminDCycleFrom(new Date(reminder.cycleStart));
  if (now >= cycle.end) return null;
  try {
    const medication = await client.listEntries('medication', { child: reminder.child, date_min: reminder.cycleStart });
    return vitaminDStatus(cycle, medication).due ? reminder : null;
  } catch (error) {
    if (!(error instanceof BabyBuddyError)) throw error;
    return reminder;
  }
}

/** What a nap reminder's ring is worked out from: the child's sleeps (with the running one), plan and skips. */
type NapReminderData = {
  sleeps: Sleep[];
  running: { start: string } | null;
  birthDate: string | null;
  napWindow: NapWindow;
  skips: Skip[];
  allowed: boolean;
  now: Date;
};

/**
 * When a stored nap reminder rings, from the child's day as the app plans it (`dayPlan`, the live day window,
 * the naps logged since its start, a running one counted), or null once it's cancelled (`napReminderAt`).
 */
export function napReminderRing(reminder: NapReminder, data: NapReminderData): NapRingAt | null {
  const { sleeps, running, birthDate, napWindow, skips, allowed, now } = data;
  const timer = running && { id: 0, child: 0, name: TIMER_NAMES.sleep, start: running.start, duration: '', user: 0 };
  const rhythm = dayRhythm(sleeps, birthDate, napWindow, now);
  const plan = dayPlan(sleeps, timer, birthDate, rhythm, skips, now);
  const bedtime = plan.at(-1)?.kind === 'bedtime' ? plan.at(-1) : undefined;
  const window = dayWindow({ sleep: sleeps, feeding: [], change: [], medication: [] }, timer, rhythm, now, bedtime);
  const napsSoFar = sleeps.filter((sleep) => Date.parse(sleep.start) >= window.start.getTime()).length + (running ? 1 : 0);
  const ring = napReminderAt({ reminder, plan, napsSoFar, window, running, sleeps, allowed, now });
  return ring && { slot: ring.slot, start: ring.start.toISOString(), end: ring.end.toISOString() };
}

/** Sets (or with null removes) `child`'s nap reminder; one per child, so a new one replaces the old. */
export function withNapReminder(cache: WidgetCache, child: number, reminder: (NapReminder & { ring: NapRingAt | null }) | null): WidgetCache {
  const others = cache.napReminders.filter((stored) => stored.child !== child);
  return { ...cache, napReminders: reminder ? [...others, { child, ...reminder }] : others };
}

/**
 * A refresh's nap reminders (`next`, worked out from `base`), with whatever the bell changed while it was out
 * (`latest`, the cache as saved now): a child's reminder set, replaced or removed meanwhile wins.
 */
export function napRemindersAfter(next: WidgetCache, base: WidgetCache, latest: WidgetCache): WidgetCache {
  const setAt = (cache: WidgetCache, child: number) => cache.napReminders.find((reminder) => reminder.child === child)?.setAt;
  const children = new Set([...base.napReminders, ...latest.napReminders].map((reminder) => reminder.child));
  const touched = [...children].filter((child) => setAt(base, child) !== setAt(latest, child));
  return {
    ...next,
    napReminders: [
      ...next.napReminders.filter((reminder) => !touched.includes(reminder.child)),
      ...latest.napReminders.filter((reminder) => touched.includes(reminder.child)),
    ],
  };
}

/** A nap reminder moved to its sleep's current window, or null once cancelled; kept as it was when the fetch fails. */
async function napReminderStillSet(
  reminder: ChildNapReminder,
  client: SnapshotClient,
  { birthDate, napWindow, allowed, now }: { birthDate: string | null; napWindow: NapWindow; allowed: boolean; now: Date },
): Promise<ChildNapReminder | null> {
  if (!allowed) return null;
  const { child } = reminder;
  const day = (back: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - back).toISOString();
  try {
    const [sleeps, running, notes] = await Promise.all([
      client.listEntries('sleep', { child, end_min: day(PREDICTION_DAYS) }),
      client.findTimer({ child, name: TIMER_NAMES.sleep }),
      client.listNotes({ child, tags: SKIP_TAG, date_min: day(1) }),
    ]);
    const skips = notes.flatMap((note) => parseSkip(note) ?? []);
    const ring = napReminderRing(reminder, { sleeps, running, birthDate, napWindow, skips, allowed, now });
    return ring && { ...reminder, ring };
  } catch (error) {
    if (!(error instanceof BabyBuddyError)) throw error;
    return reminder;
  }
}

/** This phone saved a Vitamin D for `child` (Given now, the one-tap button, Other with its name): its reminder goes at once. */
export function withoutGivenReminder(cache: WidgetCache, outcome: Outcome, child: number): WidgetCache {
  const given = outcome.type === 'logged' && outcome.created.kind === 'medication' && isVitaminD(outcome.created.entry.name);
  return given ? { ...cache, reminders: cache.reminders.filter((reminder) => reminder.child !== child) } : cache;
}

export const WIDGET_CACHE_KEY = 'molly.widget';

/** Anything unreadable loads as empty; the next refresh refills it. */
export function parseWidgetCache(stored: string | null): WidgetCache {
  try {
    const value: unknown = stored === null ? null : JSON.parse(stored);
    if (
      isRecord(value) &&
      (value.snapshot === null || isSnapshot(value.snapshot)) &&
      (value.note === null || isNote(value.note)) &&
      isTimeOrNull(value.refreshFailedAt)
    ) {
      const snapshot = value.snapshot && {
        ...value.snapshot,
        // Caches written before the method was kept have none; the next refresh fills it in.
        lastFeedingMethod: value.snapshot.lastFeedingMethod ?? null,
        // Likewise before the next sleep was kept.
        nextSleep: isLikely(value.snapshot.nextSleep) ? value.snapshot.nextSleep : null,
        // And before several children: whose it is shows after the next refresh.
        child: isChild(value.snapshot.child) ? value.snapshot.child : null,
        // And before instant feeds: Bottle saves the child's bottle until the next refresh.
        lastBottle: value.snapshot.lastBottle ?? null,
      };
      return {
        snapshot,
        // Caches from before widgets were pinned have none; the next refresh fetches them.
        pinned: Array.isArray(value.pinned) ? value.pinned.filter(isSnapshot).filter((pin) => isChild(pin.child)) : [],
        note: value.note && { ...value.note, child: typeof value.note.child === 'number' ? value.note.child : null },
        refreshFailedAt: value.refreshFailedAt,
        // Caches written before rejected keys were noted have no flag.
        keyRejected: value.keyRejected === true,
        // Likewise before pending taps were kept.
        pending: isPending(value.pending)
          ? { ...value.pending, child: typeof value.pending.child === 'number' ? value.pending.child : null }
          : null,
        // Before several children there were no per-child timers (the next refresh fills them) and one reminder
        // without its child, which is dropped: the next stop checks again.
        timers: Array.isArray(value.timers) ? value.timers.filter(isChildTimers) : [],
        reminders: Array.isArray(value.reminders) ? value.reminders.filter(isChildReminder) : [],
        // Caches from before the nap reminder have none.
        napReminders: Array.isArray(value.napReminders) ? value.napReminders.filter(isChildNapReminder) : [],
      };
    }
  } catch {
    // Not JSON: fall through to empty.
  }
  return EMPTY_CACHE;
}

function isSnapshot(value: unknown): value is WidgetSnapshot {
  return (
    isRecord(value) &&
    typeof value.fetchedAt === 'string' &&
    isTimerOrNull(value.sleepTimer) &&
    isTimerOrNull(value.feedingTimer) &&
    isTimeOrNull(value.lastSleep) &&
    isTimeOrNull(value.lastFeeding) &&
    isTimeOrNull(value.lastChange)
  );
}

function isLikely(value: unknown): value is LikelySleep {
  return (
    isRecord(value) &&
    (value.kind === 'nap' || value.kind === 'bedtime') &&
    typeof value.start === 'string' &&
    typeof value.end === 'string'
  );
}

function isPending(value: unknown): value is Omit<WidgetPending, 'child'> & { child?: unknown } {
  return isRecord(value) && parseIntent(value.intent as string) !== null && typeof value.at === 'string';
}

function isChildReminder(value: unknown): value is ChildReminder {
  return (
    isRecord(value) &&
    typeof value.child === 'number' &&
    typeof value.cycleStart === 'string' &&
    isTimeOrNull(value.lastGiven) &&
    typeof value.at === 'string'
  );
}

function isChildNapReminder(value: unknown): value is ChildNapReminder {
  const place = isRecord(value) ? value.place : null;
  const ring = isRecord(value) ? value.ring : null;
  return (
    isRecord(value) &&
    typeof value.child === 'number' &&
    (typeof place === 'number' || place === 'bedtime') &&
    typeof value.day === 'string' &&
    typeof value.setAt === 'string' &&
    (ring === null ||
      (isRecord(ring) && (typeof ring.slot === 'number' || ring.slot === 'bedtime') && typeof ring.start === 'string' && typeof ring.end === 'string'))
  );
}

function isChild(value: unknown): value is WidgetChild {
  return isRecord(value) && typeof value.id === 'number' && typeof value.name === 'string' && typeof value.hue === 'number';
}

function isChildTimers(value: unknown): value is ChildTimers {
  return isRecord(value) && isChild(value.child) && isTimerOrNull(value.sleep) && isTimerOrNull(value.feeding);
}

function isTimerOrNull(value: unknown): value is RunningTimer | null {
  if (value === null) return true;
  if (!isRecord(value) || typeof value.start !== 'string' || typeof value.byMe !== 'boolean') return false;
  return value.nightFrom === undefined || value.nightFrom === null || typeof value.nightFrom === 'string';
}

function isNote(value: unknown): value is Omit<WidgetNote, 'child'> & { child?: unknown } {
  return (
    isRecord(value) &&
    ['sleep', 'feeding', 'diaper', 'medication'].includes(value.row as string) &&
    typeof value.text === 'string' &&
    (value.tone === 'ok' || value.tone === 'error') &&
    typeof value.at === 'string'
  );
}

function isTimeOrNull(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Whose a widget is: a child's id, or `follow` for the app's child on screen. Per device, by widget id. */
export type WidgetPin = number | 'follow';

export type WidgetPins = Record<string, WidgetPin>;

export const WIDGET_PINS_KEY = 'molly.widget-pins';

/** Anything unreadable is no pin: the widget follows the app. */
export function parseWidgetPins(stored: string | null): WidgetPins {
  try {
    const value: unknown = stored === null ? null : JSON.parse(stored);
    if (!isRecord(value) || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter((entry): entry is [string, WidgetPin] => typeof entry[1] === 'number' || entry[1] === 'follow'),
    );
  } catch {
    return {};
  }
}

/**
 * The child a widget draws and acts on: its pinned child while the cache has that child's snapshot (a hidden or
 * gone child has none), else the app's child from the last refresh.
 */
export function widgetChild(cache: WidgetCache, pin: WidgetPin | undefined): number | null {
  if (typeof pin === 'number' && cache.pinned.some((pinned) => pinned.child?.id === pin)) return pin;
  return cache.snapshot?.child?.id ?? null;
}

export type WidgetPinChoice = { pin: 'follow' } | { pin: number; child: WidgetChild };

/**
 * What "Whose widget?" offers: Follow the app first, then every shown child (the last refresh's, in Baby Buddy's
 * order). Null when there's nobody to choose between: the widget follows the app without asking.
 */
export function widgetPinChoices(cache: WidgetCache): WidgetPinChoice[] | null {
  if (cache.timers.length < 2) return null;
  return [{ pin: 'follow' }, ...cache.timers.map(({ child }) => ({ pin: child.id, child }))];
}

/** How long a button's confirmation or error stays in its row. */
export const NOTE_MS = 2 * 60_000;

/** A widget can't tick: `elapsed` is as of this draw, so layouts show `since` large and `elapsed` small. */
export type RunningView = { since: string; elapsed: string; asOf: string; byMe: boolean };

/** `lastAt` is a clock and `ago` how long before this draw; both null when nothing is logged yet. */
/** `pending`: this row's tapped button and what it says until the answer is in; the row's other buttons dim. */
export type PendingView = { intent: WidgetIntent; label: string };

export type RowView = {
  running: RunningView | null;
  lastAt: string | null;
  ago: string | null;
  note: WidgetNote | null;
  pending: PendingView | null;
};

/** The next sleep as clock times: `nap 08:55` (1×1), `Nap 08:55 – 09:25` (2×2), `nap 08:55 – 09:25` (rows). */
export type LikelyView = { short: string; window: string; inline: string };

/** A widget can be drawn from a cache this long past the window's end: `NEXT_SLEEP_TUNING.dropAfter`. */
const LIKELY_DROP_MS = NEXT_SLEEP_TUNING.dropAfter * 60_000;

const LIKELY_WORDS = {
  nap: { short: 'nap', title: 'Nap', inline: 'nap' },
  bedtime: { short: 'bed', title: 'Bedtime', inline: 'bedtime' },
} as const;

function likelyView(snapshot: WidgetSnapshot, now: Date): LikelyView | null {
  const likely = snapshot.nextSleep;
  if (!likely || snapshot.sleepTimer || now.getTime() > Date.parse(likely.end) + LIKELY_DROP_MS) return null;
  const [start, end] = [formatClock(likely.start), formatClock(likely.end)];
  const words = LIKELY_WORDS[likely.kind];
  return { short: `${words.short} ${start}`, window: `${words.title} ${start} – ${end}`, inline: `${words.inline} ${start} – ${end}` };
}

export type WidgetView =
  | { type: 'signedOut' }
  | { type: 'keyRejected' }
  | { type: 'loading' }
  | {
      type: 'ready';
      stale: string | null;
      /** Whose buttons these are, while more than one child is shown: the initial on the child's colour. */
      badge: { initial: string; name: string; hue: number } | null;
      sleep: RowView & { likely: LikelyView | null };
      /** `instant`: Time feeds off, so an idle feed row draws side buttons that save at once. */
      feeding: RowView & { side: string | null; instant: boolean };
      diaper: RowView;
    };

/** `child`: whose the widget is (`widgetChild`); none draws the app's child. `feedTimer`: this phone's Time feeds. */
export function widgetView(
  cache: WidgetCache,
  { now, signedIn, child, feedTimer = false }: { now: Date; signedIn: boolean; child?: number | null; feedTimer?: boolean },
): WidgetView {
  if (!signedIn) return { type: 'signedOut' };
  if (cache.keyRejected) return { type: 'keyRejected' };
  const snapshot = cache.pinned.find((pinned) => child != null && pinned.child?.id === child) ?? cache.snapshot;
  if (!snapshot) return { type: 'loading' };
  const last = (time: string | null) => ({
    lastAt: time && formatClock(time),
    ago: time && formatElapsed(now.getTime() - Date.parse(time)),
  });
  // A tap for another child (its notification) says nothing on this child's widget.
  const ours = (child: number | null) => child === null || snapshot.child === null || child === snapshot.child.id;
  const note = cache.note && ours(cache.note.child) ? cache.note : null;
  const recent = note && now.getTime() - Date.parse(note.at) < NOTE_MS ? note : null;
  const fresh = freshPending(cache, now);
  const pending = fresh && ours(fresh.child) ? fresh : null;
  const pendingIn = (row: WidgetRow) =>
    pending && ROW_OF[pending.intent] === row ? { intent: pending.intent, label: PENDING_LABELS[pending.intent] } : null;
  // A row's last note is about the tap before: hidden while the next one is on its way.
  const noteIn = (row: WidgetRow) => (recent?.row === row && !pendingIn(row) ? recent : null);
  const running = (timer: WidgetSnapshot['sleepTimer']) =>
    timer && {
      since: formatClock(timer.start),
      elapsed: formatElapsed(now.getTime() - Date.parse(timer.start)),
      asOf: formatClock(now.toISOString()),
      byMe: timer.byMe,
    };
  return {
    type: 'ready',
    stale: cache.refreshFailedAt ? `Not updated since ${formatClock(snapshot.fetchedAt)}` : null,
    badge:
      snapshot.child && cache.timers.length > 1
        ? { initial: initialOf(snapshot.child.name), name: snapshot.child.name, hue: snapshot.child.hue }
        : null,
    sleep: {
      running: running(snapshot.sleepTimer),
      ...last(snapshot.lastSleep),
      note: noteIn('sleep'),
      pending: pendingIn('sleep'),
      likely: likelyView(snapshot, now),
    },
    feeding: {
      running: running(snapshot.feedingTimer),
      ...last(snapshot.lastFeeding),
      side: snapshot.lastFeedingMethod && METHOD_LABELS[snapshot.lastFeedingMethod],
      instant: !feedTimer,
      note: noteIn('feeding'),
      pending: pendingIn('feeding'),
    },
    diaper: { running: null, ...last(snapshot.lastChange), note: noteIn('diaper'), pending: pendingIn('diaper') },
  };
}

/** The first letter of a first name, as the avatars show it. */
export const initialOf = (name: string) => (Array.from(name.trim())[0] ?? '?').toUpperCase();

export const WIDGET_NAMES = ['Molly', 'Sleep', 'Feeding', 'Diaper'] as const;

export type WidgetName = (typeof WIDGET_NAMES)[number];

/** Molly (all three trackers): glance 2×1, medium 4×2, full 4×3. One tracker: small 1×1, wide 2×1, large 2×2. */
export type WidgetLayout = 'glance' | 'medium' | 'full' | 'small' | 'wide' | 'large';

// Launcher cells are roughly 70–110 dp: one cell is under 110 dp, two under 220.
const ONE_CELL = 110;
const TWO_CELLS = 220;

export function widgetLayout(name: WidgetName, { width, height }: { width: number; height: number }): WidgetLayout {
  if (name === 'Molly') return height < ONE_CELL ? 'glance' : height < TWO_CELLS ? 'medium' : 'full';
  if (width < ONE_CELL) return 'small';
  return height < ONE_CELL ? 'wide' : 'large';
}

/**
 * Which palette the widget draws while the phone is light or dark. For `system` the library hands
 * Android both, so the widget follows dark mode without a redraw; an override draws the same twice.
 */
export function widgetSchemes(preference: ThemePreference): { light: Scheme; dark: Scheme } {
  return preference === 'system' ? { light: 'day', dark: 'night' } : { light: preference, dark: preference };
}

/** What one half of a widget's day/night pair draws with: the theme's look for that scheme, and its labels. */
export type WidgetTheme = { look: Look; copy: Copy };

/** The chosen theme's looks for Android's light and dark widget halves, and the labels for both. */
export function widgetThemes({ theme, look, playful }: Pick<Settings, 'theme' | 'look' | 'playful'>): {
  light: WidgetTheme;
  dark: WidgetTheme;
} {
  const schemes = widgetSchemes(theme);
  const copy = copyFor(look, playful);
  return { light: { look: THEMES[look][schemes.light], copy }, dark: { look: THEMES[look][schemes.dark], copy } };
}
