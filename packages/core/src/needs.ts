import type { Change, Feeding, Sleep, Timer } from '@molly/api';

import { dayWindow, morningWake, type DayWindow } from './day-window';
import { milkFeeds, newest, type EntriesByKind } from './latest';
import { atClock, isNightSleep, type NapWindow } from './nap';
import { DAY_PLAN_TUNING, median, NEXT_SLEEP_TUNING, sleepContext } from './next-sleep';
import { isVitaminD } from './vitamin-d';

const HOUR_MS = 60 * 60 * 1000;

/** The knobs of the needs rules. */
export const NEEDS_TUNING = {
  /** Bumped whenever these rules change what `rhythm` returns: the cached rhythm is fetched again. */
  rhythmVersion: 2,
  /** Fewer gaps of a kind in a window kind than this, and the fallback stands in. */
  gapsNeeded: 5,
  /** A longer gap is a missed log, not a rhythm. */
  longestGap: 12 * HOUR_MS,
  /** How long each need lasts without a usual gap (sleep: without a likely next sleep). */
  fallback: { sleep: 2.5 * HOUR_MS, feed: 3 * HOUR_MS, diaper: 3.5 * HOUR_MS },
  /** A Vitamin D lasts a day. */
  medicine: 24 * HOUR_MS,
  /** A running feed shows this value (filling up, never empty), and so does the mood while asleep. */
  running: 82,
  /** Fewer logged morning wakes than this, and the nap-window start stands in for the usual one. */
  wakesNeeded: 3,
  /** Mood thresholds on the average need, from the top. */
  moods: { giggly: 70, content: 45, fussy: 25 },
  /** The baby wants the lowest need under this. */
  wantsUnder: 60,
  /** A need under this earns its bad moodlet. */
  lowUnder: 25,
  /** Something logged this recently earns its good moodlet. */
  recent: 30 * 60 * 1000,
};

/** A need's level, from full (0) to empty (3): which of the theme's four words it shows. */
export type NeedLevel = 0 | 1 | 2 | 3;

/** 100 at `since`, 0 at `due` and after, in a straight line between. */
export function needValue(since: Date, due: Date, now: Date): number {
  const length = due.getTime() - since.getTime();
  if (length <= 0) return 0;
  const left = 1 - (now.getTime() - since.getTime()) / length;
  return Math.min(100, Math.max(0, 100 * left));
}

export function needLevel(value: number): NeedLevel {
  return value > 75 ? 0 : value > 50 ? 1 : value > 25 ? 2 : 3;
}

/** Something logged, as the time it began and ended (the same for a diaper change). */
export type Span = { start: Date; end: Date };

/** How long the child usually goes between two entries of a kind, per window kind: null with too few gaps. */
export type Rhythm = { feed: number | null; diaper: number | null };

/**
 * The median gap, from one entry's end to the next one's start, over the gaps whose middle falls in a
 * window of `kind`: the gap from the last feed before bed to the morning's belongs to the night, though it
 * starts in the day. Gaps whose middle is in no window, and gaps over `longestGap`, are left out.
 */
export function usualGap(spans: Span[], windows: DayWindow[], kind: DayWindow['kind']): number | null {
  const sorted = [...spans].sort((a, b) => a.start.getTime() - b.start.getTime());
  const gaps = sorted.slice(1).flatMap((next, index) => {
    const from = sorted[index]!.end;
    const gap = next.start.getTime() - from.getTime();
    const middle = new Date(from.getTime() + gap / 2);
    const window = windows.find((found) => found.start <= middle && middle < found.end);
    return window?.kind === kind && gap > 0 && gap <= NEEDS_TUNING.longestGap ? [gap] : [];
  });
  return gaps.length >= NEEDS_TUNING.gapsNeeded ? median(gaps) : null;
}

/** The usual gaps between milk feeds and between changes in windows of `kind`: a meal doesn't replace milk. */
export function rhythm(entries: { feeding: Feeding[]; change: Change[] }, windows: DayWindow[], kind: DayWindow['kind']): Rhythm {
  const feeds = milkFeeds(entries.feeding).map((entry) => ({ start: new Date(entry.start), end: new Date(entry.end) }));
  const changes = entries.change.map((entry) => ({ start: new Date(entry.time), end: new Date(entry.time) }));
  return { feed: usualGap(feeds, windows, kind), diaper: usualGap(changes, windows, kind) };
}

export type NeedKind = 'sleep' | 'feed' | 'diaper' | 'medicine';

/** A need's value (0–100) and level; `running` while its timer goes (sleep or feed). */
export type Need = { value: number; level: NeedLevel; running: boolean };

/** Each need, or null when there's nothing to measure it from (nothing logged, medicine without the reminder). */
export type Needs = Record<NeedKind, Need | null>;

/**
 * What the needs are measured from: the logged entries, the running sleep (its start and likely wake,
 * `sleepingSpan`) and whether a feed runs, the next likely sleep (`nextSleep`), the rhythm for the current
 * window kind and whether the child's Vitamin D reminder is on.
 */
export type NeedsInput = {
  entries: EntriesByKind;
  running: { sleep: Sleeping | null; feeding: boolean };
  next: { start: Date } | null;
  rhythm: Rhythm;
  vitaminD: boolean;
};

export function needs(input: NeedsInput, now: Date): Needs {
  const { entries, running, rhythm, next } = input;
  const lastSleep = newest(entries.sleep);
  const lastFeed = newest(milkFeeds(entries.feeding));
  const lastChange = newest(entries.change);
  const lastDose = newest(entries.medication.filter((entry) => isVitaminD(entry.name)));
  const wake = lastSleep && new Date(lastSleep.end);
  return {
    sleep: running.sleep ? sleeping(running.sleep, now) : wake && need(wake, next?.start ?? after(wake, NEEDS_TUNING.fallback.sleep), now),
    feed: running.feeding ? charging() : lastFeed && usually(new Date(lastFeed.end), rhythm.feed, NEEDS_TUNING.fallback.feed, running.sleep, now),
    diaper: lastChange && usually(new Date(lastChange.time), rhythm.diaper, NEEDS_TUNING.fallback.diaper, running.sleep, now),
    medicine: !input.vitaminD ? null : lastDose ? lasting(new Date(lastDose.time), NEEDS_TUNING.medicine, now) : shown(0),
  };
}

function need(since: Date, due: Date, now: Date): Need {
  return shown(needValue(since, due, now));
}

/**
 * A need due `usual` after `since`. Without a usual gap, `fallback` after it, but while a sleep runs not
 * before the child likely wakes: a sleeping baby isn't due a feed or change on the day's fixed times.
 */
function usually(since: Date, usual: number | null, fallback: number, asleep: Sleeping | null, now: Date): Need {
  if (usual !== null) return lasting(since, usual, now);
  const due = after(since, fallback);
  return need(since, asleep && asleep.wake > due ? asleep.wake : due, now);
}

function lasting(since: Date, length: number, now: Date): Need {
  return need(since, after(since, length), now);
}

/** A running sleep fills from 0 at its start to 100 at its likely wake. */
function sleeping({ start, wake }: Sleeping, now: Date): Need {
  return shown(100 - needValue(start, wake, now), true);
}

function charging(): Need {
  return shown(NEEDS_TUNING.running, true);
}

function shown(value: number, running = false): Need {
  return { value, level: needLevel(value), running };
}

function after(time: Date, ms: number): Date {
  return new Date(time.getTime() + ms);
}

export type Mood = 'giggly' | 'content' | 'fussy' | 'wailing' | 'dreaming';

/** The needs that make up the mood and Wants: medicine never does (a baby on none would always look upset). */
const FELT = ['sleep', 'feed', 'diaper'] as const;

/**
 * The mood from the average of sleep, feed and diaper (unknown ones left out), with that average for
 * its colour. Dreaming while a sleep runs; null with no need known.
 */
export function mood(needs: Needs): { mood: Mood; value: number } | null {
  if (needs.sleep?.running) return { mood: 'dreaming', value: NEEDS_TUNING.running };
  const values = FELT.flatMap((kind) => (needs[kind] ? [needs[kind].value] : []));
  if (values.length === 0) return null;
  const value = values.reduce((sum, each) => sum + each, 0) / values.length;
  const { giggly, content, fussy } = NEEDS_TUNING.moods;
  const name = value >= giggly ? 'giggly' : value >= content ? 'content' : value >= fussy ? 'fussy' : 'wailing';
  return { mood: name, value };
}

/** The lowest of sleep, feed and diaper under `wantsUnder` (ties in that order), sleep while asleep, else null. */
export function wants(needs: Needs): (typeof FELT)[number] | null {
  if (needs.sleep?.running) return 'sleep';
  return FELT.reduce<(typeof FELT)[number] | null>((lowest, kind) => {
    const value = needs[kind]?.value;
    if (value === undefined || value >= NEEDS_TUNING.wantsUnder) return lowest;
    return lowest === null || value < needs[lowest]!.value ? kind : lowest;
  }, null);
}

export type MoodletKey =
  | 'well-rested'
  | 'milk-drunk'
  | 'fresh-bum'
  | 'soothed-gums'
  | 'sleepy'
  | 'hangry'
  | 'soggy'
  | 'recharging'
  | 'snug';

export type Moodlet = { key: MoodletKey; points: number };

const GOOD: Record<NeedKind, Moodlet> = {
  sleep: { key: 'well-rested', points: 2 },
  feed: { key: 'milk-drunk', points: 2 },
  diaper: { key: 'fresh-bum', points: 1 },
  medicine: { key: 'soothed-gums', points: 1 },
};

const BAD: Record<(typeof FELT)[number], Moodlet> = {
  sleep: { key: 'sleepy', points: -2 },
  feed: { key: 'hangry', points: -3 },
  diaper: { key: 'soggy', points: -2 },
};

const SLEEPING: Moodlet[] = [
  { key: 'recharging', points: 3 },
  { key: 'snug', points: 1 },
];

/**
 * A good moodlet for each kind logged in the last `recent` (a sleep or feed by its end, any medicine),
 * then a bad one for each need of sleep, feed and diaper under `lowUnder`. The sleeping pair while a sleep runs.
 */
export function moodlets(input: NeedsInput, now: Date): Moodlet[] {
  if (input.running.sleep) return SLEEPING;
  const { entries } = input;
  const last: Record<NeedKind, string | undefined> = {
    sleep: newest(entries.sleep)?.end,
    feed: newest(milkFeeds(entries.feeding))?.end,
    diaper: newest(entries.change)?.time,
    medicine: newest(entries.medication)?.time,
  };
  const recent = (time: string | undefined) =>
    time !== undefined && now.getTime() - Date.parse(time) <= NEEDS_TUNING.recent;
  const found = needs(input, now);
  const low = (need: Need | null) => need !== null && !need.running && need.value < NEEDS_TUNING.lowUnder;
  return [
    ...(Object.keys(GOOD) as NeedKind[]).filter((kind) => recent(last[kind])).map((kind) => GOOD[kind]),
    ...FELT.filter((kind) => low(found[kind])).map((kind) => BAD[kind]),
  ];
}

const MINUTE_MS = 60 * 1000;

/** A running sleep: when it started and when the child likely wakes. */
export type Sleeping = { start: Date; wake: Date };

/**
 * The running sleep from its start to when the child likely wakes. A night's sleep (it started outside the
 * nap window or ran past its end, or the day has turned into the night) to the usual morning wake: the
 * median clock time of the last two weeks' (`morningWake`), the nap-window start with fewer than
 * `wakesNeeded`. A nap to its slot's usual length (`sleepContext`'s assumed wake), or `napLength` without
 * a prediction. Never before now: a sleep that runs longer is full.
 */
export function sleepingSpan(sleeps: Sleep[], running: Timer, birthDate: string | null, napWindow: NapWindow, now: Date): Sleeping {
  const start = new Date(running.start);
  const entries = { sleep: sleeps, feeding: [], change: [], medication: [] };
  const night = isNightSleep(start, now, napWindow) || dayWindow(entries, running, napWindow, now).kind === 'night';
  const nap = night ? null : sleepContext(sleeps, running, birthDate, napWindow, now);
  const wake = night ? usualMorningAfter(sleeps, napWindow, start) : (nap?.anchor ?? after(start, DAY_PLAN_TUNING.napLength * MINUTE_MS));
  return { start, wake: wake > now ? wake : now };
}

/** The first usual morning wake after `time`, as a clock time in minutes past midnight. */
function usualMorningAfter(sleeps: Sleep[], napWindow: NapWindow, time: Date): Date {
  const wakes = Array.from({ length: NEXT_SLEEP_TUNING.historyDays }, (_, back) =>
    morningWake(sleeps, napWindow, atClock(time, -back, napWindow.start)),
  ).flatMap((wake) => (wake && wake < time ? [wake.getHours() * 60 + wake.getMinutes()] : []));
  const usual = wakes.length >= NEEDS_TUNING.wakesNeeded ? median(wakes) : minutesOf(napWindow.start);
  const sameDay = new Date(time.getFullYear(), time.getMonth(), time.getDate(), 0, usual);
  return sameDay > time ? sameDay : new Date(time.getFullYear(), time.getMonth(), time.getDate() + 1, 0, usual);
}

/** `HH:MM` as minutes past midnight. */
function minutesOf(clock: string): number {
  const [hours, minutes] = clock.split(':').map(Number);
  return hours! * 60 + minutes!;
}
