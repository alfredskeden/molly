import type { Sleep } from '@molly/api';

import { median } from './median';
import { minutesOf, type NapWindow } from './nap';
import { ageInMonths } from './sleep-guide';

const MINUTE_MS = 60 * 1000;
const DAY_MINUTES = 24 * 60;

/**
 * What an age changes about day and night, in minutes: how far `before` and `after` the usual wake a
 * morning wake may be, how long the baby must then stay `awake` (a wake at the usual time only needs
 * not to be back asleep within it), and how `long` an evening sleep must
 * run to be the night when it starts early. Under 3 months there's no stable wake to learn
 * (`learnsWake`): the setting's "Day starts" stands in.
 */
export type AgeBand = { fromMonths: number; before: number; after: number; awake: number; long: number; learnsWake: boolean };

/** The knobs of the day and night rule, for the replay (`scripts/replay-naps.ts`) to vary. Minutes. */
export type DayTuning = {
  /** Days back the rhythm is learned from. */
  historyDays: number;
  /** Fewer learned days than this, and the setting stands in. */
  learnedFrom: number;
  /** Clock range (minutes past midnight) a usual wake is learned in, and clamped to. */
  wakeRange: { from: number; to: number };
  /** Clock range a usual bedtime is learned in, and clamped to; past 24:00 is after midnight. */
  bedtimeRange: { from: number; to: number };
  /** A sleep starting this close before the usual bedtime, or later, is the night. */
  bedtimeCut: number;
  /** From this long before the usual bedtime, a sleep that runs the band's `long` is the night. */
  eveningFrom: number;
  /** The awake threshold is at most this share of the child's usual first wake window. */
  awakeShare: number;
  /** A morning wake this close to the usual wake, either side, starts the day without the awake wait. */
  onTime: number;
  /** Oldest first, so the first match wins. */
  bands: AgeBand[];
  /** The age a child without a birth date is taken to be. */
  unknownAgeMonths: number;
};

export const DAY_TUNING: DayTuning = {
  historyDays: 14,
  learnedFrom: 3,
  wakeRange: { from: 5 * 60, to: 11 * 60 },
  bedtimeRange: { from: 18 * 60, to: DAY_MINUTES + 30 },
  bedtimeCut: 90,
  eveningFrom: 3 * 60,
  awakeShare: 2 / 3,
  onTime: 30,
  bands: [
    { fromMonths: 12, before: 120, after: 180, awake: 40, long: 120, learnsWake: true },
    { fromMonths: 6, before: 120, after: 180, awake: 45, long: 120, learnsWake: true },
    { fromMonths: 3, before: 120, after: 180, awake: 60, long: 120, learnsWake: true },
    { fromMonths: 0, before: 120, after: 180, awake: 75, long: 180, learnsWake: false },
  ],
  unknownAgeMonths: 3,
};

/**
 * The child's day as Molly has learned it: the usual `wake` and `bedtime` as minutes past midnight
 * (a bedtime past 24:00 is after midnight), the usual first wake window (null until learned), the age
 * band with its awake threshold capped by that window, and the setting (`napWindow`) for the clock
 * fallback. `wakeLearned` / `bedtimeLearned` are false while the setting stands in.
 */
export type DayRhythm = {
  wake: number;
  bedtime: number;
  firstWindow: number | null;
  wakeLearned: boolean;
  bedtimeLearned: boolean;
  band: AgeBand;
  napWindow: NapWindow;
  tuning: DayTuning;
};

/** The age band for a birth date (`unknownAgeMonths` without one). */
export function ageBand(birthDate: string | null, now: Date, tuning: DayTuning = DAY_TUNING): AgeBand {
  const months = birthDate ? ageInMonths(birthDate, now) : tuning.unknownAgeMonths;
  return tuning.bands.find((band) => months >= band.fromMonths) ?? tuning.bands.at(-1)!;
}

/**
 * The child's rhythm from the days before today (`historyDays` of them), recomputed on every call:
 * nothing is stored. The past wakes and bedtimes are found with a wide rule that knows nothing of the
 * usual times (the clamp ranges, the age's threshold, a long sleep for bedtime), so the usual times
 * never learn from decisions made with them and can't drift.
 */
export function dayRhythm(
  sleeps: Sleep[],
  birthDate: string | null,
  napWindow: NapWindow,
  now: Date,
  tuning: DayTuning = DAY_TUNING,
): DayRhythm {
  const age = ageBand(birthDate, now, tuning);
  const sorted = [...sleeps].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const wakes: number[] = [];
  const bedtimes: number[] = [];
  const windows: number[] = [];
  for (let back = 1; back <= tuning.historyDays; back++) {
    const day = minutesPast(now, -back, 0);
    const wake = firstWake(sorted, { start: minutesPast(day, 0, tuning.wakeRange.from), end: minutesPast(day, 0, tuning.wakeRange.to) }, age.awake, now);
    const bed = firstLongSleep(sorted, minutesPast(day, 0, tuning.bedtimeRange.from), minutesPast(day, 0, tuning.bedtimeRange.to), age, now);
    if (wake) wakes.push(clockMinutes(wake, day));
    if (bed) bedtimes.push(clockMinutes(bed, day));
    const evening = bed ?? minutesPast(day, 0, tuning.bedtimeRange.from);
    const first = wake && sorted.find((entry) => Date.parse(entry.start) > wake.getTime() && Date.parse(entry.start) < evening.getTime());
    if (first) windows.push((Date.parse(first.start) - wake!.getTime()) / MINUTE_MS);
  }
  const wakeLearned = age.learnsWake && wakes.length >= tuning.learnedFrom;
  const bedtimeLearned = bedtimes.length >= tuning.learnedFrom;
  const firstWindow = windows.length >= tuning.learnedFrom ? median(windows) : null;
  return {
    wake: wakeLearned ? clamp(median(wakes), tuning.wakeRange) : minutesOf(napWindow.start),
    bedtime: bedtimeLearned ? clamp(median(bedtimes), tuning.bedtimeRange) : minutesOf(napWindow.end),
    firstWindow,
    wakeLearned,
    bedtimeLearned,
    band: firstWindow === null ? age : { ...age, awake: Math.min(age.awake, Math.round(firstWindow * tuning.awakeShare)) },
    napWindow,
    tuning,
  };
}

/** The usual wake and bedtime as `HH:MM` clock times, each null while the setting stands in for it. */
export function learnedTimes(rhythm: DayRhythm): { wake: string | null; bedtime: string | null } {
  return { wake: rhythm.wakeLearned ? clockOf(rhythm.wake) : null, bedtime: rhythm.bedtimeLearned ? clockOf(rhythm.bedtime) : null };
}

/**
 * The earliest end of a sleep inside `range` after which the baby stayed awake `awake` minutes: the
 * next sleep started that much later, or none has and that much time has passed by `now`. An end
 * `onTime` (within its minutes of the usual wake) needs no wait while no sleep has followed it; once
 * one has, it must still start `awake` later. Only after a night: some sleep started between the same
 * clock time as the range's end a day earlier and the range's start. A sleep still running (its end
 * is now) never ends it. Null without one. Learning leaves out `onTime`, so it never uses the usual
 * wake to find the wakes it learns it from.
 */
export function firstWake(
  sleeps: Sleep[],
  range: { start: Date; end: Date },
  awake: number,
  now: Date,
  onTime?: { at: Date; within: number },
): Date | null {
  const nightFrom = minutesPast(range.end, -1, range.end.getHours() * 60 + range.end.getMinutes());
  const started = (entry: Sleep) => Date.parse(entry.start);
  const after = sleeps.filter((entry) => started(entry) > nightFrom.getTime());
  if (!after.some((entry) => started(entry) < range.start.getTime())) return null;
  const ends = after
    .map((entry) => Date.parse(entry.end))
    .filter((end) => end >= range.start.getTime() && end <= range.end.getTime() && end < now.getTime())
    .sort((a, b) => a - b);
  const wake = ends.find((end) => {
    const next = Math.min(...sleeps.map(started).filter((start) => start >= end));
    if (onTime && isOnTime(new Date(end), onTime) && next === Infinity) return true;
    return Math.min(next, now.getTime()) - end >= awake * MINUTE_MS;
  });
  return wake === undefined ? null : new Date(wake);
}

/** Whether a wake is within `within` minutes of the usual wake `at`, either side. */
export function isOnTime(wake: Date, onTime: { at: Date; within: number }): boolean {
  return Math.abs(wake.getTime() - onTime.at.getTime()) <= onTime.within * MINUTE_MS;
}

/**
 * The start of the first sleep starting between `from` and `to` that runs the band's `long`, counting
 * the sleeps after it while the baby was back asleep within the band's `awake` minutes (a waking soon
 * after bedtime). A running sleep runs to `now`.
 */
function firstLongSleep(sleeps: Sleep[], from: Date, to: Date, band: AgeBand, now: Date): Date | null {
  const index = sleeps.findIndex((entry, at) => {
    const start = Date.parse(entry.start);
    return start >= from.getTime() && start <= to.getTime() && asleepFrom(sleeps, at, band.awake, now) - start >= band.long * MINUTE_MS;
  });
  return index < 0 ? null : new Date(sleeps[index]!.start);
}

/** When the baby was last up for `awake` minutes or more after the sleep at `index` started (sorted by start). */
function asleepFrom(sleeps: Sleep[], index: number, awake: number, now: Date): number {
  let end = Math.min(Date.parse(sleeps[index]!.end), now.getTime());
  for (const next of sleeps.slice(index + 1)) {
    if (Date.parse(next.start) - end >= awake * MINUTE_MS) break;
    end = Math.max(end, Math.min(Date.parse(next.end), now.getTime()));
  }
  return end;
}

/** A clock time, as minutes past the midnight that began `day`, some days from it (by the calendar). */
export function minutesPast(day: Date, days: number, minutes: number): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() + days, 0, minutes);
}

/** Wall-clock minutes since the midnight that began `day`, so a time on the next day is past 24:00. */
export function clockMinutes(time: Date, day: Date): number {
  const days = Math.round((minutesPast(time, 0, 0).getTime() - minutesPast(day, 0, 0).getTime()) / (DAY_MINUTES * MINUTE_MS));
  return days * DAY_MINUTES + time.getHours() * 60 + time.getMinutes();
}

function clamp(minutes: number, range: { from: number; to: number }): number {
  return Math.min(range.to, Math.max(range.from, minutes));
}

/** Minutes past midnight as an `HH:MM` clock time; past 24:00 wraps to the next day's. */
function clockOf(minutes: number): string {
  const clock = Math.round(minutes) % DAY_MINUTES;
  return `${String(Math.floor(clock / 60)).padStart(2, '0')}:${String(clock % 60).padStart(2, '0')}`;
}
