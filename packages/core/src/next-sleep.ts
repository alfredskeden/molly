import type { Sleep, Timer } from '@molly/api';

import { dayWindow, morningWake } from './day-window';
import { atClock, isNightSleep, type NapWindow } from './nap';
import { sleepGuide, wakeForSlot, type SleepGuide, type Slot, type WakeRange } from './sleep-guide';

const MINUTE_MS = 60 * 1000;

/** The knobs the replay (`scripts/replay-naps.ts`) tunes. Minutes unless named otherwise. */
export type NextSleepTuning = {
  /** A window this long past its end is dropped. */
  dropAfter: number;
  /** Awake longer than this since the last sleep looks like a logging gap: no guess. */
  staleAfter: number;
  /** Shorter sleeps are catnaps: they don't end a wake window. */
  catnapUnder: number;
  historyDays: number;
  /** Minutes either side of the history median. */
  spread: number;
  /** Under this many days of history, the age guide alone. */
  blendFrom: number;
  /** From this many, the history alone. */
  historyFrom: number;
  /** A window starting this close to the usual bedtime, or later, is bedtime. */
  bedtimeWithin: number;
  /** Fewer logged bedtimes than this, and the nap-window end stands in for the usual one. */
  bedtimesNeeded: number;
  /** How much of the band's range the first and last windows of the day use. */
  slotShare: number;
};

export const NEXT_SLEEP_TUNING: NextSleepTuning = {
  dropAfter: 45,
  staleAfter: 6 * 60,
  catnapUnder: 15,
  historyDays: 14,
  spread: 20,
  blendFrom: 3,
  historyFrom: 10,
  bedtimeWithin: 60,
  bedtimesNeeded: 3,
  slotShare: 2 / 3,
};

/** The day plan's knobs, next to `NEXT_SLEEP_TUNING`, for the replay to vary. Minutes. */
export type DayPlanTuning = {
  /** How long a planned nap, or the running one, is assumed to last without logged naps in its slot. */
  napLength: number;
  /** The nap after a skipped one opens this long after the skipped window ends. */
  afterSkip: number;
  /** However many naps are skipped or short, bedtime moves at most this much earlier. */
  earliestBy: number;
  /** Past days with a logged bedtime needed before their usual number of naps ends the plan. */
  napCountFrom: number;
  /** Bedtime moves earlier by this share of how much shorter today's naps were than usual (a fraction). */
  shortNapShare: number;
};

export const DAY_PLAN_TUNING: DayPlanTuning = {
  napLength: 45,
  afterSkip: 30,
  earliestBy: 60,
  napCountFrom: 3,
  shortNapShare: 0.5,
};

/**
 * When the next sleep is likely, and everything the "Why this window" sheet shows about it. `anchor`
 * is the wake the window counts from, `guide` the age band with the range used for this window,
 * `history` the median ± spread of minutes awake on past days (with `samples` days behind it).
 */
export type NextSleep = {
  kind: 'nap' | 'bedtime';
  /** Which wake window of the day this is: after the morning wake, before bed, or one between. */
  slot: Slot;
  start: Date;
  end: Date;
  state: 'before' | 'open' | 'past';
  source: 'age' | 'blend' | 'history';
  anchor: Date;
  guide: SleepGuide;
  history: WakeRange | null;
  samples: number;
};

/**
 * The next nap, or bedtime once the evening window is next, from the logged sleeps and the child's
 * age. While a sleep timer (`running`) goes, the sleep after it, as `sleepContext` projects the
 * running nap. Null while the bedtime sleep runs, at night, after a logging gap, for an age outside
 * the guide, and 45 min after the window ended. Takes a birth date, not a child, so the widget's
 * headless task can call it.
 */
export function nextSleep(
  sleeps: Sleep[],
  running: Timer | null,
  birthDate: string | null,
  napWindow: NapWindow,
  now: Date,
  tuning: NextSleepTuning = NEXT_SLEEP_TUNING,
  planTuning: DayPlanTuning = DAY_PLAN_TUNING,
): NextSleep | null {
  const context = sleepContext(sleeps, running, birthDate, napWindow, now, tuning, planTuning);
  if (!context) return null;
  const next = predictSleep(context, context.anchor, context.slot, tuning);
  if (now.getTime() > next.end.getTime() + tuning.dropAfter * MINUTE_MS) return null;
  return { ...next, state: stateAt(next.start, next.end, now) };
}

/**
 * What every window of the day is predicted from: the last wake (`anchor`) and which wake window of
 * the day follows it (`slot`, from 1), the age band, the logged past days, today's usual bedtime
 * (`bedtimeKnown` when enough past bedtimes were logged to set it) and how many naps a day usually
 * has (`usualNaps`, null with too few logged days). `naps` are today's naps so far in minutes, in
 * order, a running one at its assumed length, and `earlier` how many minutes bedtime moves earlier
 * for them: `shortNapShare` of how much shorter they were than usual for their slots, at most
 * `earliestBy`. Null in every case where there's no prediction.
 *
 * A running sleep (`running`) is the current nap, unless it's the bedtime (bedtime was next when it
 * started, or it has turned the day into the night: then null). Its wake is assumed at its slot's
 * usual length (`usualNapLength`, `napLength` without past naps), or now once it runs longer, so the
 * plan holds still through a normal nap and slides with the clock after. Checks that look back
 * (logging gap, night, age) are made at its start.
 */
export type SleepContext = {
  anchor: Date;
  slot: number;
  band: SleepGuide;
  pastDays: PastDay[];
  bedtime: Date;
  bedtimeKnown: boolean;
  usualNaps: number | null;
  naps: number[];
  earlier: number;
};

export function sleepContext(
  sleeps: Sleep[],
  running: Timer | null,
  birthDate: string | null,
  napWindow: NapWindow,
  now: Date,
  tuning: NextSleepTuning = NEXT_SLEEP_TUNING,
  planTuning: DayPlanTuning = DAY_PLAN_TUNING,
): SleepContext | null {
  if (!running) return awakeContext(sleeps, birthDate, napWindow, now, tuning, planTuning);
  // A running sleep is the current nap, assumed to end at its usual length (or now, once longer).
  const start = new Date(running.start);
  const before = awakeContext(
    sleeps.filter((entry) => new Date(entry.start) < start),
    birthDate,
    napWindow,
    start,
    tuning,
    planTuning,
  );
  if (!before) return null;
  // Unless it is the bedtime: bedtime was next when it started, or it has turned the day into the night.
  if (predictSleep(before, before.anchor, before.slot, tuning).kind === 'bedtime') return null;
  if (dayWindow({ sleep: sleeps, feeding: [], change: [], medication: [] }, running, napWindow, now).kind === 'night') {
    return null;
  }
  const usualEnd = minutesAfter(start, usualNapLength(before.pastDays, before.slot, planTuning.napLength));
  const anchor = usualEnd > now ? usualEnd : now;
  const naps = [...before.naps, minutesFrom(start, anchor)];
  return { ...before, anchor, slot: before.slot + 1, naps, earlier: shortNapsEarlier(naps, before.pastDays, planTuning) };
}

/** The context for a baby awake since the last sleep of 15 min or more. */
function awakeContext(
  sleeps: Sleep[],
  birthDate: string | null,
  napWindow: NapWindow,
  now: Date,
  tuning: NextSleepTuning,
  planTuning: DayPlanTuning,
): SleepContext | null {
  const long = sleeps
    .filter((entry) => Date.parse(entry.end) - Date.parse(entry.start) >= tuning.catnapUnder * MINUTE_MS)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const last = long.at(-1);
  const band = birthDate ? sleepGuide(birthDate, now) : null;
  if (!last || !band) return null;
  const anchor = new Date(last.end);
  if (now.getTime() - anchor.getTime() > tuning.staleAfter * MINUTE_MS) return null;
  const today = dayWindow({ sleep: sleeps, feeding: [], change: [], medication: [] }, null, napWindow, now);
  // Night wakings aren't predicted.
  if (today.kind === 'night') return null;
  const naps = long
    .filter((entry) => new Date(entry.start) > today.wake && new Date(entry.end) <= anchor)
    .map((entry) => minutesFrom(new Date(entry.start), new Date(entry.end)));
  const pastDays = daysBefore(long, sleeps, napWindow, now, tuning.historyDays);
  const bedtimes = pastDays.filter((day) => day.bedtime).length;
  return {
    anchor,
    slot: naps.length + 1,
    band,
    pastDays,
    bedtime: usualBedtime(pastDays, napWindow, now, tuning.bedtimesNeeded),
    bedtimeKnown: bedtimes >= tuning.bedtimesNeeded,
    usualNaps: usualNapCount(pastDays, planTuning.napCountFrom),
    naps,
    earlier: shortNapsEarlier(naps, pastDays, planTuning),
  };
}

/**
 * How many naps a day usually has (the median over past days with a logged bedtime), or null with
 * fewer than `needed`. A day without a logged nap is a logging gap, not a day without naps.
 */
function usualNapCount(pastDays: PastDay[], needed: number): number | null {
  const counts = pastDays.flatMap((day) => (day.bedtime && day.naps.length > 0 ? [day.naps.length] : []));
  return counts.length >= needed ? Math.round(median(counts)) : null;
}

/** Minutes the nap in this slot lasted on past days (the median), or `fallback` without any. */
export function usualNapLength(pastDays: PastDay[], slot: number, fallback: number): number {
  return pastNapLength(pastDays, slot) ?? fallback;
}

/** Minutes the nap in this slot lasted on past days (the median), or null without any. */
function pastNapLength(pastDays: PastDay[], slot: number): number | null {
  const lengths = pastDays.flatMap((day) => {
    const nap = day.naps[slot - 1];
    return nap ? [minutesFrom(new Date(nap.start), new Date(nap.end))] : [];
  });
  return lengths.length > 0 ? median(lengths) : null;
}

/**
 * The window for the sleep after a wake at `anchor` in wake window `slot`: a nap, or bedtime once
 * it's near or the day already has its usual naps. Bedtime starts no later than `bedtimeWithin`
 * after the usual one (once it's known), and when the nap count ended the day no earlier than as
 * much before it: the count lags when the baby drops or adds a nap, and the evening after an early
 * last nap is longer than the logged ones.
 */
export function predictSleep(
  context: SleepContext,
  anchor: Date,
  slot: number,
  tuning: NextSleepTuning = NEXT_SLEEP_TUNING,
): Omit<NextSleep, 'state'> {
  const { band, pastDays, bedtime, bedtimeKnown, usualNaps } = context;
  const counted = usualNaps !== null && slot > usualNaps;
  const nap = candidate('nap', anchor, band, slot > 1 ? 'middle' : 'first', pastDays.map(napAwake(slot)), tuning);
  if (!counted && nap.start.getTime() < bedtime.getTime() - tuning.bedtimeWithin * MINUTE_MS) return nap;
  const predicted = candidate('bedtime', anchor, band, 'last', pastDays.map(bedtimeAwake), tuning);
  const earliest = counted ? minutesAfter(bedtime, -tuning.bedtimeWithin) : null;
  const latest = bedtimeKnown ? minutesAfter(bedtime, tuning.bedtimeWithin) : null;
  return earlierBedtime(startBetween(predicted, earliest, latest), context.earlier, context, tuning);
}

/**
 * Bedtime moved `earlier` minutes, but never before the last wake plus the age guide's shortest
 * window before bed (nor later than it was). Its width stays.
 */
export function earlierBedtime<T extends { start: Date; end: Date }>(
  bedtime: T,
  earlier: number,
  { anchor, band }: SleepContext,
  tuning: NextSleepTuning,
): T {
  if (earlier <= 0) return bedtime;
  const floor = minutesAfter(anchor, wakeForSlot(band.wake, 'last', tuning.slotShare).min);
  const moved = minutesAfter(bedtime.start, -earlier).getTime();
  const start = new Date(Math.max(moved, Math.min(bedtime.start.getTime(), floor.getTime())));
  return { ...bedtime, start, end: new Date(start.getTime() + bedtime.end.getTime() - bedtime.start.getTime()) };
}

/**
 * Minutes bedtime moves earlier for short naps today: `shortNapShare` of how much shorter they were
 * than their slot's usual length, in all (never below 0), at most `earliestBy`. A slot without past
 * naps counts nothing.
 */
function shortNapsEarlier(naps: number[], pastDays: PastDay[], { shortNapShare, earliestBy }: DayPlanTuning): number {
  const short = naps.reduce((total, minutes, index) => {
    const usual = pastNapLength(pastDays, index + 1);
    return usual === null ? total : total + usual - minutes;
  }, 0);
  return Math.min(earliestBy, shortNapShare * Math.max(0, short));
}

/** The window moved, at its width, to start no earlier than `earliest` and no later than `latest`. */
function startBetween<T extends { start: Date; end: Date }>(window: T, earliest: Date | null, latest: Date | null): T {
  let start = window.start;
  if (earliest && start < earliest) start = earliest;
  if (latest && start > latest) start = latest;
  if (start === window.start) return window;
  return { ...window, start, end: new Date(start.getTime() + window.end.getTime() - window.start.getTime()) };
}

/**
 * A logged past day: its morning wake, its naps of 15 min or more and its bedtime (the first night
 * sleep by `isNightSleep`, null if none was logged). The saved `nap` flag is never read.
 */
export type PastDay = { wake: Date; naps: Sleep[]; bedtime: Sleep | null };

/** The window for a sleep, from the age guide for its slot blended with minutes awake on past days. */
function candidate(
  kind: NextSleep['kind'],
  anchor: Date,
  band: SleepGuide,
  slot: Slot,
  pastAwake: (number | null)[],
  tuning: NextSleepTuning,
): Omit<NextSleep, 'state'> {
  const awake = pastAwake.filter((minutes) => minutes !== null);
  const wake = wakeForSlot(band.wake, slot, tuning.slotShare);
  const middle = awake.length > 0 ? median(awake) : null;
  const history = middle === null ? null : { min: middle - tuning.spread, max: middle + tuning.spread };
  const weight = historyWeight(awake.length, tuning);
  const window = history ? blend(wake, history, weight) : wake;
  return {
    kind,
    slot,
    start: minutesAfter(anchor, window.min),
    end: minutesAfter(anchor, window.max),
    source: weight >= 1 ? 'history' : weight > 0 ? 'blend' : 'age',
    anchor,
    guide: { band: band.band, wake },
    history,
    samples: awake.length,
  };
}

/** Each of the last `count` days with a logged morning wake. */
function daysBefore(long: Sleep[], sleeps: Sleep[], napWindow: NapWindow, now: Date, count: number): PastDay[] {
  const days: PastDay[] = [];
  for (let back = 1; back <= count; back++) {
    const wake = morningWake(sleeps, napWindow, atClock(now, -back, napWindow.start));
    if (!wake) continue;
    const nextMorning = atClock(wake, 1, napWindow.start);
    const day = long.filter((entry) => new Date(entry.start) > wake && new Date(entry.start) < nextMorning);
    const bed = day.findIndex((entry) => isNightSleep(new Date(entry.start), new Date(entry.end), napWindow));
    days.push({ wake, naps: bed < 0 ? day : day.slice(0, bed), bedtime: day[bed] ?? null });
  }
  return days;
}

/** Minutes awake before the nap in this slot, on a day that had one. */
function napAwake(slot: number) {
  return (day: PastDay): number | null => {
    const nap = day.naps[slot - 1];
    return nap ? awakeBefore(day, nap, slot - 1) : null;
  };
}

/** Minutes awake before bedtime, on a day it was logged. */
function bedtimeAwake(day: PastDay): number | null {
  return day.bedtime ? awakeBefore(day, day.bedtime, day.naps.length) : null;
}

/** Today at the median clock time of past bedtimes, or at the nap-window end with too few. */
function usualBedtime(pastDays: PastDay[], napWindow: NapWindow, now: Date, needed: number): Date {
  const minutes = pastDays.flatMap((day) => {
    return day.bedtime ? [clockMinutes(new Date(day.bedtime.start), day.wake)] : [];
  });
  if (minutes.length < needed) return atClock(now, 0, napWindow.end);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, median(minutes));
}

/** Wall-clock minutes since the midnight that began `day`, so a bedtime after midnight is late, not early. */
function clockMinutes(time: Date, day: Date): number {
  const nextDay = time.getDate() !== day.getDate() ? 24 * 60 : 0;
  return nextDay + time.getHours() * 60 + time.getMinutes();
}

/** Minutes from the wake before a day's sleep (after `index` naps) to that sleep's start. */
function awakeBefore(day: PastDay, sleep: Sleep, index: number): number {
  const before = index === 0 ? day.wake.getTime() : Date.parse(day.naps[index - 1]!.end);
  return (Date.parse(sleep.start) - before) / MINUTE_MS;
}

export function stateAt(start: Date, end: Date, now: Date): NextSleep['state'] {
  if (now < start) return 'before';
  return now < end ? 'open' : 'past';
}

function minutesFrom(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / MINUTE_MS;
}

export function minutesAfter(time: Date, minutes: number): Date {
  return new Date(Math.round(time.getTime() / MINUTE_MS + minutes) * MINUTE_MS);
}

/** 0 (age guide only) under `blendFrom` days, rising by an equal step per day to 1 at `historyFrom`. */
function historyWeight(samples: number, { blendFrom, historyFrom }: NextSleepTuning): number {
  const steps = historyFrom - blendFrom + 1;
  return Math.min(1, Math.max(0, (samples - blendFrom + 1) / steps));
}

function blend(guide: WakeRange, history: WakeRange, weight: number): WakeRange {
  const mix = (a: number, b: number) => a * (1 - weight) + b * weight;
  return { min: mix(guide.min, history.min), max: mix(guide.max, history.max) };
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}
