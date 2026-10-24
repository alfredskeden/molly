import type { Sleep, Timer } from '@molly/api';

import type { EntriesByKind } from './latest';
import { atClock, isNightSleep, type NapWindow } from './nap';

/** How far from the nap-window start a night sleep may end and still be the morning wake. */
const WAKE_RANGE_MS = 2 * 60 * 60 * 1000;
/** The strip always runs at least this far past now. */
const HALF_HOUR_MS = 30 * 60 * 1000;

/** Epoch ms; a running sleep ends now. */
type Span = { start: number; end: number };
type Interval = { start: Date; end: Date };

/**
 * What the Today card covers: a day from the morning wake, or a night from bedtime. `wake` is the
 * morning wake that opened the current day (for a night, the one before its bedtime). `clock` means
 * no usable wake was logged, so the nap window alone set `start` (and `wake`).
 */
export type DayWindow = { kind: 'day' | 'night'; start: Date; end: Date; wake: Date; clock: boolean };

/**
 * The baby's current day or night, recomputed from the entries and nap window: nothing is stored. A
 * day with a plan (`bedtime`, the plan's bedtime window) ends where that window does.
 */
export function dayWindow(
  entries: EntriesByKind,
  running: Timer | null,
  napWindow: NapWindow,
  now: Date,
  bedtime: { end: Date } | null = null,
): DayWindow {
  const sleeps = spans(entries.sleep, running, now);
  const found = fromWake(entries, sleeps, napWindow, now) ?? byClock(napWindow, now);
  const window = found.kind === 'day' && bedtime ? { ...found, end: bedtime.end } : found;
  const soon = new Date(now.getTime() + HALF_HOUR_MS);
  return { ...window, end: window.end > soon ? window.end : soon };
}

/** The window opened by today's morning wake, or before its range has closed, last night's. */
function fromWake(entries: EntriesByKind, sleeps: Span[], napWindow: NapWindow, now: Date): DayWindow | null {
  const today = napWindowOn(now, 0, napWindow);
  const wake = morningWake(entries.sleep, napWindow, today.start);
  if (wake) {
    return nightAfter(sleeps, wake, today, napWindow) ?? { kind: 'day', start: wake, end: today.end, wake, clock: false };
  }
  if (now.getTime() >= today.start.getTime() + WAKE_RANGE_MS) return null;
  const yesterday = napWindowOn(now, -1, napWindow);
  const yesterdaysWake = morningWake(entries.sleep, napWindow, yesterday.start);
  // A day never runs past midnight: yesterday's wake is only any use with a bedtime after it.
  return yesterdaysWake && nightAfter(sleeps, yesterdaysWake, yesterday, napWindow);
}

/** The night that began at the first bedtime after a morning wake, if there has been one. */
function nightAfter(sleeps: Span[], wake: Date, nap: Interval, napWindow: NapWindow): DayWindow | null {
  const bed = bedtime(sleeps, wake, nap, napWindow);
  return bed && { kind: 'night', start: bed, end: nextNapStart(bed, napWindow), wake, clock: false };
}

/** No usable wake: Today during the nap window, Tonight from its last end outside it. */
function byClock(napWindow: NapWindow, now: Date): DayWindow {
  const today = napWindowOn(now, 0, napWindow);
  if (now >= today.start && now < today.end) {
    return { kind: 'day', start: today.start, end: today.end, wake: today.start, clock: true };
  }
  const start = now >= today.end ? today.end : napWindowOn(now, -1, napWindow).end;
  return { kind: 'night', start, end: nextNapStart(start, napWindow), wake: start, clock: true };
}

/**
 * The days and nights before the live one, newest first (`running` is the sleep timer, as for
 * `dayWindow`), back `days` days: the Days screen's rows. A past day runs from its morning wake to
 * its bedtime; without a logged wake or bedtime the nap window stands in, as in `dayWindow`.
 */
export function windowsBefore(
  entries: EntriesByKind,
  napWindow: NapWindow,
  now: Date,
  days = 7,
  running: Timer | null = null,
): DayWindow[] {
  const live = dayWindow(entries, running, napWindow, now);
  // A running bedtime sleep ends the day before it, as it opened the live night.
  const sleeps = withRunning(entries.sleep, running, now);
  const pages: DayWindow[] = [];
  for (let back = 0; back <= days + 1; back++) {
    const { day, night } = windowsOn(sleeps, napWindow, napWindowOn(now, -back, napWindow));
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
export function previousWindow(
  entries: EntriesByKind,
  napWindow: NapWindow,
  now: Date,
  running: Timer | null = null,
): DayWindow {
  return windowsBefore(entries, napWindow, now, 1, running)[0]!;
}

/** A calendar day's day and night windows, from its morning wake and bedtime, or the nap window without. */
function windowsOn(sleeps: Sleep[], napWindow: NapWindow, nap: Interval) {
  const split = dayOn(sleeps, napWindow, nap);
  const wake = split?.wake ?? null;
  const bed = split?.bedtime ? new Date(split.bedtime.start) : null;
  const day: DayWindow = wake
    ? { kind: 'day', start: wake, end: bed ?? nap.end, wake, clock: false }
    : { kind: 'day', start: nap.start, end: nap.end, wake: nap.start, clock: true };
  const night: DayWindow = bed
    ? { kind: 'night', start: bed, end: nextNapStart(bed, napWindow), wake: wake!, clock: false }
    : { kind: 'night', start: nap.end, end: nextNapStart(nap.end, napWindow), wake: wake ?? nap.end, clock: true };
  return { day, night };
}

/**
 * A logged day: its morning wake, the sleeps after it until bedtime (`naps`) and its bedtime (the
 * first night sleep, null if none was logged). The saved `nap` flag is never read.
 */
export type PastDay = { wake: Date; naps: Sleep[]; bedtime: Sleep | null };

/** Each of the last `count` days before `now` with a logged morning wake, newest first. */
export function pastDays(sleeps: Sleep[], napWindow: NapWindow, now: Date, count: number): PastDay[] {
  return Array.from({ length: count }, (_, back) => dayOn(sleeps, napWindow, napWindowOn(now, -back - 1, napWindow))).filter(
    (day) => day !== null,
  );
}

/**
 * The day in a calendar day's nap window: the morning wake, then every sleep from it to the next
 * morning in order, split at the bedtime. One that started before the window is an early wake's
 * back-to-sleep, not a bedtime. Null without a wake.
 */
function dayOn(sleeps: Sleep[], napWindow: NapWindow, nap: Interval): PastDay | null {
  const wake = morningWake(sleeps, napWindow, nap.start);
  if (!wake) return null;
  const nextMorning = atClock(nap.start, 1, napWindow.start);
  const after = sleeps
    .filter((entry) => new Date(entry.start) > wake && new Date(entry.start) < nextMorning)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const bed = after.findIndex(
    (entry) => new Date(entry.start) >= nap.start && isNightSleep(new Date(entry.start), new Date(entry.end), napWindow),
  );
  return { wake, naps: bed < 0 ? after : after.slice(0, bed), bedtime: after[bed] ?? null };
}

/** The end of a night sleep (`isNightSleep`), closest to the nap-window start and within range of it. */
export function morningWake(sleeps: Sleep[], napWindow: NapWindow, napStart: Date): Date | null {
  const distance = (time: number) => Math.abs(time - napStart.getTime());
  const ends = sleeps
    .filter((entry) => isNightSleep(new Date(entry.start), new Date(entry.end), napWindow))
    .map((entry) => Date.parse(entry.end))
    .filter((end) => distance(end) <= WAKE_RANGE_MS)
    .sort((a, b) => distance(a) - distance(b));
  return ends.length > 0 ? new Date(ends[0]!) : null;
}

/**
 * The first night sleep (`isNightSleep`) after the wake. One that started before the window is an
 * early wake's back-to-sleep, not a bedtime; one from the next morning on belongs to a later day.
 */
function bedtime(sleeps: Span[], wake: Date, nap: Interval, napWindow: NapWindow): Date | null {
  const nextMorning = atClock(nap.start, 1, napWindow.start);
  const starts = sleeps
    .filter(
      (span) =>
        span.start > wake.getTime() &&
        span.start < nextMorning.getTime() &&
        span.start >= nap.start.getTime() &&
        isNightSleep(new Date(span.start), new Date(span.end), napWindow),
    )
    .map((span) => span.start)
    .sort((a, b) => a - b);
  return starts.length > 0 ? new Date(starts[0]!) : null;
}

/** Logged sleeps as spans, plus the running one up to now. */
function spans(entries: Sleep[], running: Timer | null, now: Date): Span[] {
  return [
    ...entries.map((entry) => ({ start: Date.parse(entry.start), end: Date.parse(entry.end) })),
    ...(running ? [{ start: Date.parse(running.start), end: now.getTime() }] : []),
  ];
}

/** Logged sleeps, plus the running one up to now. */
function withRunning(entries: Sleep[], running: Timer | null, now: Date): Sleep[] {
  if (!running) return entries;
  const sleeping = { id: running.id, child: running.child, start: running.start, end: now.toISOString(), duration: '', nap: false };
  return [...entries, { ...sleeping, notes: null, tags: [] }];
}

/** The nap window on the day some days from `day`. */
function napWindowOn(day: Date, days: number, napWindow: NapWindow): Interval {
  return { start: atClock(day, days, napWindow.start), end: atClock(day, days, napWindow.end) };
}

/** The first nap-window start after `time`: the morning a night runs to. */
function nextNapStart(time: Date, napWindow: NapWindow): Date {
  const sameDay = atClock(time, 0, napWindow.start);
  return sameDay > time ? sameDay : atClock(time, 1, napWindow.start);
}
