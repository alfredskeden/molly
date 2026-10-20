import type { Measurement, MeasurementKind } from '@molly/api';

import { clockText } from './format';

export type { MeasurementKind } from '@molly/api';

/** Every entry Molly has of each measurement, any order. */
export type MeasurementLists = { [K in MeasurementKind]?: Measurement<K>[] };

const UNITS: Record<MeasurementKind, string> = { weight: 'g', height: 'cm', head: 'cm', temperature: '°C', bmi: '' };

/** The add sheet's − / + step. */
export const MEASUREMENT_STEPS: Record<MeasurementKind, number> = {
  weight: 10,
  height: 0.5,
  head: 0.5,
  temperature: 0.1,
  bmi: 0.1,
};

/** Baby Buddy accepts any number, so Molly refuses values no child could have before saving. */
const RANGES: Record<MeasurementKind, [number, number]> = {
  weight: [500, 30_000],
  height: [30, 130],
  head: [20, 60],
  temperature: [34, 43],
  bmi: [5, 40],
};

/** Where the add sheet starts with nothing logged: a newborn's values, a normal temperature. */
const DEFAULTS: Record<MeasurementKind, number> = { weight: 3500, height: 50, head: 35, temperature: 36.8, bmi: 14 };

/** Grams are whole, the rest have one decimal. */
const DECIMALS = (kind: MeasurementKind) => (kind === 'weight' ? 0 : 1);

const round = (kind: MeasurementKind, value: number) => Number(value.toFixed(DECIMALS(kind)));

export function measurementValue<K extends MeasurementKind>(kind: K, entry: Measurement<K>): number {
  const values = entry as Measurement<MeasurementKind> & Record<string, unknown>;
  return Number(values[kind === 'head' ? 'head_circumference' : kind]);
}

/** When it was taken: the time of a temperature, local midnight of the others' date. */
export function measurementDate<K extends MeasurementKind>(kind: K, entry: Measurement<K>): Date {
  if (kind === 'temperature') return new Date((entry as Measurement<'temperature'>).time);
  return localDate((entry as Measurement<'weight'>).date);
}

/** A Baby Buddy `YYYY-MM-DD` as local midnight. */
export function localDate(date: string): Date {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** `7 050` (thin groups of three for grams), `65.5`, `89.0`, and the unit: `g`, `cm`, `°C`, none for BMI. */
export function measurementParts(kind: MeasurementKind, value: number): { number: string; unit: string } {
  const number =
    kind === 'weight' ? String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : value.toFixed(1);
  return { number, unit: UNITS[kind] };
}

/** `7 050 g`, `65.5 cm`, `36.9 °C`, `16.3`. */
export function measurementText(kind: MeasurementKind, value: number): string {
  const { number, unit } = measurementParts(kind, value);
  return unit ? `${number} ${unit}` : number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `23 Sep`, with the year when it isn't this year's: `20 Sep 2025`. */
export function dayMonth(date: Date, now: Date): string {
  const text = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear() ? text : `${text} ${date.getFullYear()}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole calendar days from `from` to `to`, by local date. */
export function daysBetween(from: Date, to: Date): number {
  const day = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((day(to) - day(from)) / DAY_MS);
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/** `yesterday`, `5 days ago`, `3 weeks ago` from two weeks, `3 months ago` from two months, `1 year ago`. */
function daysAgo(days: number): string {
  if (days === 1) return 'yesterday';
  if (days < 14) return `${plural(days, 'day')} ago`;
  if (days < 60) return `${plural(Math.floor(days / 7), 'week')} ago`;
  if (days < 365) return `${plural(Math.floor(days / 30.44), 'month')} ago`;
  return `${plural(Math.floor(days / 365.25), 'year')} ago`;
}

/** `Today 07:40`, `27 Sep 20:10` for a temperature; `Today`, `23 Sep` for the others. */
function takenText(kind: MeasurementKind, taken: Date, now: Date): string {
  const today = daysBetween(taken, now) === 0;
  if (kind !== 'temperature') return today ? 'Today' : dayMonth(taken, now);
  return `${today ? 'Today' : dayMonth(taken, now)} ${clockText(taken)}`;
}

/** The row's line: `23 Sep · 5 days ago`, `Today`; a temperature's `Today 07:40`; `None yet`. */
export function measurementWhen<K extends MeasurementKind>(kind: K, latest: Measurement<K> | null, now: Date): string {
  if (latest === null) return 'None yet';
  const taken = measurementDate(kind, latest);
  const days = daysBetween(taken, now);
  if (kind === 'temperature' || days === 0) return takenText(kind, taken, now);
  return `${dayMonth(taken, now)} · ${daysAgo(days)}`;
}

/** Newest first. Baby Buddy leaves entries of one date in no set order, so the later logged (higher id) first. */
export function newestMeasurements<K extends MeasurementKind>(kind: K, entries: Measurement<K>[]): Measurement<K>[] {
  return [...entries].sort(
    (a, b) => measurementDate(kind, b).getTime() - measurementDate(kind, a).getTime() || b.id - a.id,
  );
}

function latestOf<K extends MeasurementKind>(kind: K, lists: MeasurementLists): Measurement<K> | null {
  return newestMeasurements(kind, (lists[kind] ?? []) as Measurement<K>[])[0] ?? null;
}

/** Kilograms over metres squared, to one decimal. */
export function bmiFrom(grams: number, cm: number): number {
  return round('bmi', grams / 1000 / (cm / 100) ** 2);
}

/** The newest of a measurement on the same date as `day`, or null. */
function onDay<K extends MeasurementKind>(kind: K, lists: MeasurementLists, day: Date): Measurement<K> | null {
  const entries = newestMeasurements(kind, (lists[kind] ?? []) as Measurement<K>[]);
  return entries.find((entry) => daysBetween(measurementDate(kind, entry), day) === 0) ?? null;
}

/**
 * Where the stepper starts: the last value, or a default with none. BMI starts from today's weight and
 * height when both were measured today.
 */
export function sheetStart(kind: MeasurementKind, lists: MeasurementLists, now: Date): number {
  if (kind === 'bmi') {
    const weight = onDay('weight', lists, now);
    const height = onDay('height', lists, now);
    if (weight && height) return bmiFrom(weight.weight, height.height);
  }
  const latest = latestOf(kind, lists);
  return latest ? measurementValue(kind, latest) : DEFAULTS[kind];
}

const clamp = (kind: MeasurementKind, value: number) => {
  const [min, max] = RANGES[kind];
  return Math.min(max, Math.max(min, value));
};

/** One step up (1) or down (-1), kept within the range Molly accepts. */
export function stepMeasurement(kind: MeasurementKind, value: number, direction: 1 | -1): number {
  return round(kind, clamp(kind, value + direction * MEASUREMENT_STEPS[kind]));
}

/**
 * A typed value: spaces dropped, a comma read as a decimal point, rounded to whole grams or one decimal.
 * `outOfRange` when no child could measure it (grams typed as kilograms, `369` for 36.9 °C), null when
 * it isn't a number.
 */
export function typedMeasurement(kind: MeasurementKind, text: string): number | 'outOfRange' | null {
  const cleaned = text.replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d*)?$|^\.\d+$/.test(cleaned)) return null;
  const value = round(kind, Number(cleaned));
  const [min, max] = RANGES[kind];
  return value < min || value > max ? 'outOfRange' : value;
}

/** `Last 7 000 g · 23 Sep`, `Last 36.9 °C · Today 07:40`. */
export function lastMeasurementText<K extends MeasurementKind>(kind: K, latest: Measurement<K>, now: Date): string {
  return `Last ${measurementText(kind, measurementValue(kind, latest))} · ${takenText(kind, measurementDate(kind, latest), now)}`;
}

/** `+50 g · steps of 10 g · tap to type`, or `Steps of 10 g · tap to type` at the starting value. */
export function stepHint(kind: MeasurementKind, start: number, value: number): string {
  const change = round(kind, value - start);
  const steps = `steps of ${measurementText(kind, MEASUREMENT_STEPS[kind])} · tap to type`;
  if (change === 0) return steps[0]!.toUpperCase() + steps.slice(1);
  return `${change > 0 ? '+' : '−'}${measurementText(kind, Math.abs(change))} · ${steps}`;
}

/** `+470 g`, `−120 g`, `+0.7 cm`. */
export function signedChange(kind: MeasurementKind, change: number): string {
  return `${change < 0 ? '−' : '+'}${measurementText(kind, Math.abs(change))}`;
}

export type MeasurementRow = { date: string; value: string; change: string };

/** `16d` under 60 days, then `2m`. */
const shortGap = (days: number) => (days < 60 ? `${days}d` : `${Math.round(days / 30.44)}m`);

/**
 * The newest `count` entries with the change from the one before (`+470 g`), and with `gap` how long
 * before (`+470 g · 16d`). The oldest entry has no change.
 */
export function measurementRows<K extends MeasurementKind>(
  kind: K,
  entries: Measurement<K>[],
  now: Date,
  { count, gap }: { count: number; gap: boolean },
): MeasurementRow[] {
  const newest = newestMeasurements(kind, entries);
  return newest.slice(0, count).map((entry, i) => {
    const before = newest[i + 1];
    const value = measurementValue(kind, entry);
    const taken = measurementDate(kind, entry);
    let change = '';
    if (before) {
      change = signedChange(kind, round(kind, value - measurementValue(kind, before)));
      if (gap) change += ` · ${shortGap(daysBetween(measurementDate(kind, before), taken))}`;
    }
    return { date: dayMonth(taken, now), value: measurementText(kind, value), change };
  });
}
