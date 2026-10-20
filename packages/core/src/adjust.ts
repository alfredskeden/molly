import { clockText } from './format';

const MINUTE = 60_000;

/**
 * "N minutes ago" for Adjust time. Baby Buddy refuses future times and an end at or before its start,
 * so the result is never after now and, given the entry's start (`after`), at least a minute past it.
 */
export function adjustedTime({ minutesAgo, now, after }: { minutesAgo: number; now: Date; after?: Date }): Date {
  let time = now.getTime() - Math.max(0, minutesAgo) * MINUTE;
  if (after) time = Math.max(time, after.getTime() + MINUTE);
  return new Date(Math.min(time, now.getTime()));
}

type StartStep = { start: Date; minutes: number; now: Date; earliest?: Date };

/**
 * A running timer's start moved by a step. Baby Buddy refuses a future start, and refuses the stop of a
 * timer that overlaps the last entry of its kind, so the start stays within [earliest, now]. A start
 * already outside that range never jumps the opposite way to the step.
 */
export function steppedStart({ start, minutes, now, earliest }: StartStep): Date {
  const floor = earliest ? Math.min(earliest.getTime(), start.getTime()) : -Infinity;
  const ceiling = Math.max(now.getTime(), start.getTime());
  return new Date(Math.min(Math.max(start.getTime() + minutes * MINUTE, floor), ceiling));
}

/** Which ways `steppedStart` can still move the start by a step of `minutes`, to disable a button at its limit. */
export function startSteps({ minutes, ...rest }: StartStep): { earlier: boolean; later: boolean } {
  const step = (sign: number) => steppedStart({ ...rest, minutes: sign * Math.abs(minutes) });
  return { earlier: step(-1) < rest.start, later: step(1) > rest.start };
}

/**
 * The digits of a typed `HHMM` after one more key, filled from the left. A digit that can't lead to a valid
 * time is ignored, so four digits are always a time: a first hour digit of 3–9 becomes `0X`, the hour stops
 * at 23 and the minutes' tens at 5.
 */
export function typedDigit(digits: string, key: string): string {
  if (!/^\d$/.test(key) || digits.length >= 4) return digits;
  const digit = Number(key);
  switch (digits.length) {
    case 0:
      return digit > 2 ? `0${key}` : key;
    case 1:
      return digits === '2' && digit > 3 ? digits : digits + key;
    case 2:
      return digit > 5 ? digits : digits + key;
    default:
      return digits + key;
  }
}

/**
 * The time four typed digits mean: today at that clock time, or yesterday if that's still to come (Baby
 * Buddy refuses future times). An end (`after` is its start) at or before the start is `beforeStart`, since
 * Baby Buddy refuses that too. Null until all four digits are typed.
 */
export function typedTime({ digits, now, after }: { digits: string; now: Date; after?: Date }): Date | 'beforeStart' | null {
  if (digits.length < 4) return null;
  const [hours, minutes] = [Number(digits.slice(0, 2)), Number(digits.slice(2))];
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
  const time = today > now ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, hours, minutes) : today;
  return after && time <= after ? 'beforeStart' : time;
}

/**
 * The big time while typing: the typed digits as `HH:MM` from the left (the colon counts as typed once both
 * hour digits are), and the rest of the time shown before typing began, drawn faint.
 */
export function typedText(digits: string, previous: Date): { typed: string; faint: string } {
  const typed = digits.length >= 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
  return { typed, faint: clockText(previous).slice(typed.length) };
}
