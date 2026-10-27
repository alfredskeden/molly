import type { Sleep, Timer } from '@molly/api';

import { firstWake, minutesPast, onTimeOn, type DayRhythm } from './day-rhythm';
import type { EntriesByKind } from './latest';
import { atClock, isNightSleep, minutesOf, type NapWindow } from './nap';

const MINUTE_MS = 60 * 1000;
/** The strip always runs at least this far past now. */
const HALF_HOUR_MS = 30 * MINUTE_MS;

type Interval = { start: Date; end: Date };

/**
 * What the Today card covers: a day from the morning wake, or a night from bedtime. `wake` is the
 * morning wake that opened the current day (for a night, the one before its bedtime). `clock` means
 * no usable wake was logged, so the setting alone set `start` (and `wake`).
 */
export type DayWindow = { kind: 'day' | 'night'; start: Date; end: Date; wake: Date; clock: boolean };

/**
 * The baby's current day or night, recomputed from the entries and the child's rhythm: nothing is
 * stored. A day with a plan (`bedtime`, the plan's bedtime window) ends where that window does.
 */
export function dayWindow(
  entries: EntriesByKind,
  running: Timer | null,
  rhythm: DayRhythm,
  now: Date,
  bedtime: { end: Date } | null = null,
): DayWindow {
  const found = fromWake(withRunning(entries.sleep, running, now), rhythm, now) ?? byClock(rhythm.napWindow, now);
  const window = found.kind === 'day' && bedtime ? { ...found, end: bedtime.end } : found;
  const soon = new Date(now.getTime() + HALF_HOUR_MS);
  return { ...window, end: window.end > soon ? window.end : soon };
}

/**
 * The window opened by today's morning wake, or before its range has closed, last night's. Yesterday's
 * day runs on past midnight while its bedtime may still come (up to `bedtimeCut` after the usual one);
 * then, with no bedtime logged, the night by the clock starts where that day ended.
 */
function fromWake(sleeps: Sleep[], rhythm: DayRhythm, now: Date): DayWindow | null {
  const today = dayOn(sleeps, rhythm, now, 0, now);
  if (today.wake) return today.bedtime ? nightOf(today, rhythm) : dayOf(today, rhythm);
  if (now >= today.range.end) return null;
  const yesterday = dayOn(sleeps, rhythm, now, -1, now);
  if (!yesterday.wake) return null;
  if (yesterday.bedtime) return nightOf(yesterday, rhythm);
  const bedtimeOver = minutesPast(yesterday.midnight, 0, rhythm.bedtime + rhythm.tuning.bedtimeCut);
  if (now < bedtimeOver) return dayOf(yesterday, rhythm);
  const night = clockNightAfter(dayOf(yesterday, rhythm), rhythm.napWindow);
  return now < night.end ? night : null;
}

/** No usable wake: Today during the setting's day, Tonight from its last end outside it. */
function byClock(napWindow: NapWindow, now: Date): DayWindow {
  const today = napWindowOn(now, 0, napWindow);
  if (now >= today.start && now < today.end) return clockDay(today);
  return clockNightAfter(clockDay(now >= today.end ? today : napWindowOn(now, -1, napWindow)), napWindow);
}

/**
 * The days and nights before the live one, newest first (`running` is the sleep timer, as for
 * `dayWindow`), back `days` days: the Days screen's rows. They tile, with no overlap or gap: a past
 * day runs from its morning wake to its bedtime (the usual bedtime without one), and a past night
 * from there to the next day's start (its morning wake, or "Day starts" without one). Without a
 * logged wake the setting stands in, as in `dayWindow`.
 */
export function windowsBefore(
  entries: EntriesByKind,
  rhythm: DayRhythm,
  now: Date,
  days = 7,
  running: Timer | null = null,
): DayWindow[] {
  const live = dayWindow(entries, running, rhythm, now);
  // A running bedtime sleep ends the day before it, as it opened the live night.
  const sleeps = withRunning(entries.sleep, running, now);
  const pages: DayWindow[] = [];
  for (let back = 0; back <= days + 1; back++) {
    const { day, night } = windowsOn(sleeps, rhythm, now, -back);
    pages.push(night, day);
  }
  // Tonight's page comes after the day that just ended, which counts on top of the 7 days.
  const count = 2 * days + (live.kind === 'night' ? 1 : 0);
  return pages.filter((page) => page.start < live.start).slice(0, count);
}

/**
 * The Today card's one past page: the newest day or night that started before the live one. Today
 * looks back to last night, Tonight to the day that just ended.
 */
export function previousWindow(entries: EntriesByKind, rhythm: DayRhythm, now: Date, running: Timer | null = null): DayWindow {
  return windowsBefore(entries, rhythm, now, 1, running)[0]!;
}

/**
 * A calendar day's day and night windows, from its morning wake and bedtime, or the setting without.
 * They tile: the night starts where the day ends and runs to where the next day starts.
 */
function windowsOn(sleeps: Sleep[], rhythm: DayRhythm, now: Date, days: number): { day: DayWindow; night: DayWindow } {
  const found = dayOn(sleeps, rhythm, now, days, now);
  const day = found.wake ? dayOf(found, rhythm) : clockDay(napWindowOn(now, days, rhythm.napWindow));
  const ended = found.bedtime ? { ...day, end: new Date(found.bedtime.start) } : day;
  const night = found.bedtime ? nightOf(found, rhythm) : clockNightAfter(day, rhythm.napWindow);
  return { day: ended, night: { ...night, end: dayStart(sleeps, rhythm, now, days + 1) } };
}

/** Where a calendar day starts: at its morning wake, or at "Day starts" without one. */
function dayStart(sleeps: Sleep[], rhythm: DayRhythm, now: Date, days: number): Date {
  return dayOn(sleeps, rhythm, now, days, now).wake ?? napWindowOn(now, days, rhythm.napWindow).start;
}

/**
 * A logged day: its morning wake, the sleeps after it until bedtime (`naps`) and its bedtime (the
 * first night sleep, null if none was logged). The saved `nap` flag is never read.
 */
export type PastDay = { wake: Date; naps: Sleep[]; bedtime: Sleep | null };

/** Each of the last `count` days before `now` with a logged morning wake, newest first. */
export function pastDays(sleeps: Sleep[], rhythm: DayRhythm, now: Date, count: number): PastDay[] {
  return Array.from({ length: count }, (_, back) => dayOn(sleeps, rhythm, now, -back - 1, now)).flatMap(({ wake, naps, bedtime }) =>
    wake ? [{ wake, naps, bedtime }] : [],
  );
}

/** A calendar day: the range its morning wake may fall in, the wake (null without one), and its naps and bedtime after it. */
type Found = { midnight: Date; range: Interval; wake: Date | null; naps: Sleep[]; bedtime: Sleep | null };

/**
 * A calendar day as logged. Its morning wake is the first sleep end within the age band's range around
 * the usual wake and "Day starts" (`wakeRange`) after which the baby stayed awake the band's
 * threshold (`firstWake`), or, within `onTime` of the usual wake, at once unless the baby was back
 * asleep within that threshold; an end that fails is a night waking. Then every sleep from
 * the wake to the next day's range, in order, split at the bedtime (`isBedtime`).
 */
function dayOn(sleeps: Sleep[], rhythm: DayRhythm, day: Date, days: number, now: Date): Found {
  const midnight = minutesPast(day, days, 0);
  const range = wakeRange(rhythm, day, days);
  const wake = firstWake(sleeps, range, rhythm.band.awake, now, onTimeOn(rhythm, day, days));
  if (!wake) return { midnight, range, wake: null, naps: [], bedtime: null };
  const nextMorning = wakeRange(rhythm, day, days + 1).start;
  const after = sleeps
    .filter((entry) => Date.parse(entry.start) > wake.getTime() && Date.parse(entry.start) < nextMorning.getTime())
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const usual = minutesPast(midnight, 0, rhythm.bedtime);
  const bed = after.findIndex((entry) => isBedtime(entry, usual, rhythm, now));
  return { midnight, range, wake, naps: bed < 0 ? after : after.slice(0, bed), bedtime: after[bed] ?? null };
}

/**
 * The clock range a day's morning wake may fall in: from `before` ahead of the earlier of the usual
 * wake and the setting's "Day starts", to `after` past the later one, so a wake near either counts.
 */
function wakeRange(rhythm: DayRhythm, day: Date, days: number): Interval {
  const { before, after } = rhythm.band;
  const setting = minutesOf(rhythm.napWindow.start);
  const [earlier, later] = [Math.min(rhythm.wake, setting), Math.max(rhythm.wake, setting)];
  return { start: minutesPast(day, days, earlier - before), end: minutesPast(day, days, later + after) };
}

/**
 * Whether a sleep after the morning wake is the night: it starts no earlier than `bedtimeCut` before
 * the usual bedtime, or no earlier than `eveningFrom` before it and runs the band's `long` (a running
 * sleep up to `now`). Anything else is a nap.
 */
function isBedtime(entry: Sleep, usual: Date, rhythm: DayRhythm, now: Date): boolean {
  const start = Date.parse(entry.start);
  const { bedtimeCut, eveningFrom } = rhythm.tuning;
  if (start >= usual.getTime() - bedtimeCut * MINUTE_MS) return true;
  const ran = Math.min(Date.parse(entry.end), now.getTime()) - start;
  return start >= usual.getTime() - eveningFrom * MINUTE_MS && ran >= rhythm.band.long * MINUTE_MS;
}

/**
 * Whether a sleep (finished, or running with `end` now) is the night, by the child's rhythm and the
 * sleeps around it as known at `now`: before its day's morning wake, or from that day's bedtime on.
 * Without a wake to place it by (no history), the setting by the clock (`isNightSleep`). The saved
 * flag follows it, decided once at stop or log.
 */
export function isNight(sleep: { start: Date; end: Date }, sleeps: Sleep[], rhythm: DayRhythm, now: Date): boolean {
  const entries = withSleep(sleeps, sleep);
  const start = sleep.start.getTime();
  const day = dayOn(entries, rhythm, sleep.start, 0, now);
  if (day.wake) return start < day.wake.getTime() || (day.bedtime !== null && start >= Date.parse(day.bedtime.start));
  const before = dayOn(entries, rhythm, sleep.start, -1, now);
  if (before.wake && before.bedtime && start < day.range.end.getTime()) return start >= Date.parse(before.bedtime.start);
  return isNightSleep(sleep.start, sleep.end, rhythm.napWindow);
}

/**
 * From when stopping the sleep running since `start` saves a night sleep (`isNight` with the stop as its
 * end), as known at `now`: its start if it already would, else once it has run the band's `long` if it
 * would then, else null (a nap whenever it stops). What a tap without the sleeps at hand goes by.
 */
export function nightFrom(start: Date, sleeps: Sleep[], rhythm: DayRhythm, now: Date): Date | null {
  const end = now > start ? now : start;
  if (isNight({ start, end }, sleeps, rhythm, end)) return start;
  const long = new Date(start.getTime() + rhythm.band.long * MINUTE_MS);
  if (long <= end) return null;
  return isNight({ start, end: long }, sleeps, rhythm, long) ? long : null;
}

/** The morning wake and bedtime of the calendar day `day` is on, as known at `now`; null for either not found. */
export function wakeAndBedtime(sleeps: Sleep[], rhythm: DayRhythm, day: Date, now: Date): { wake: Date | null; bedtime: Date | null } {
  const { wake, bedtime } = dayOn(sleeps, rhythm, day, 0, now);
  return { wake, bedtime: bedtime && new Date(bedtime.start) };
}

/** A day that began at its morning wake, until the usual bedtime. */
function dayOf(found: Found, rhythm: DayRhythm): DayWindow {
  const wake = found.wake!;
  return { kind: 'day', start: wake, end: minutesPast(found.midnight, 0, rhythm.bedtime), wake, clock: false };
}

/** The setting's day, by the clock. */
function clockDay(napWindow: Interval): DayWindow {
  return { kind: 'day', start: napWindow.start, end: napWindow.end, wake: napWindow.start, clock: true };
}

/** The night after a day with no bedtime: from the day's end to the next "Day starts". */
function clockNightAfter(day: DayWindow, napWindow: NapWindow): DayWindow {
  return { kind: 'night', start: day.end, end: nextNapStart(day.end, napWindow), wake: day.clock ? day.end : day.wake, clock: true };
}

/** The night from a day's bedtime to the next usual wake: the live night's guess (a past one ends at the next day's start). */
function nightOf(found: Found, rhythm: DayRhythm): DayWindow {
  const start = new Date(found.bedtime!.start);
  return { kind: 'night', start, end: usualWakeAfter(rhythm, start), wake: found.wake!, clock: false };
}

/** The first usual morning wake after `time`. */
export function usualWakeAfter(rhythm: DayRhythm, time: Date): Date {
  const sameDay = minutesPast(time, 0, rhythm.wake);
  return sameDay > time ? sameDay : minutesPast(time, 1, rhythm.wake);
}

/** Logged sleeps, plus the running one up to now. */
function withRunning(entries: Sleep[], running: Timer | null, now: Date): Sleep[] {
  return running ? withSleep(entries, { start: new Date(running.start), end: now }) : entries;
}

/** The sleeps with one more, unless it's among them already (same start). */
function withSleep(entries: Sleep[], sleep: { start: Date; end: Date }): Sleep[] {
  if (entries.some((entry) => Date.parse(entry.start) === sleep.start.getTime())) return entries;
  const added = { id: -1, child: 0, start: sleep.start.toISOString(), end: sleep.end.toISOString(), duration: '', nap: false };
  return [...entries, { ...added, notes: null, tags: [] }];
}

/** The setting's day on the day some days from `day`. */
function napWindowOn(day: Date, days: number, napWindow: NapWindow): Interval {
  return { start: atClock(day, days, napWindow.start), end: atClock(day, days, napWindow.end) };
}

/** The first setting start after `time`: the morning a night by the clock runs to. */
function nextNapStart(time: Date, napWindow: NapWindow): Date {
  const sameDay = atClock(time, 0, napWindow.start);
  return sameDay > time ? sameDay : atClock(time, 1, napWindow.start);
}
