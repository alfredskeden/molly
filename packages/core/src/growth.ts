import type { Bmi, HeadCircumference, Height, Measurement, MeasurementKind } from '@molly/api';

import {
  dayMonth,
  daysBetween,
  localDate,
  measurementDate,
  measurementText,
  measurementValue,
  newestMeasurements,
  signedChange,
  type MeasurementLists,
} from './measurements';
import { ageInMonths } from './sleep-guide';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const YEAR_DAYS = 365;

/** Older entries are fainter: the oldest at `from`, the newest fully drawn. */
function fades(count: number, from: number): number[] {
  return Array.from({ length: count }, (_, i) =>
    count === 1 ? 1 : Math.round((from + (i / (count - 1)) * (1 - from)) * 100) / 100,
  );
}

/** `since August`, `since 2 Sep` in the same month, `since December 2025` in another year. */
function sinceText(before: Date, latest: Date): string {
  if (before.getFullYear() !== latest.getFullYear()) return `since ${MONTH_NAMES[before.getMonth()]} ${before.getFullYear()}`;
  if (before.getMonth() === latest.getMonth()) return `since ${dayMonth(before, latest)}`;
  return `since ${MONTH_NAMES[before.getMonth()]}`;
}

/** `23 Sep · +0.7 cm since August`: the latest entry's date and the change from the one before, or only the date. */
export function sinceLine<K extends MeasurementKind>(kind: K, entries: Measurement<K>[], now: Date): string | null {
  const [latest, before] = newestMeasurements(kind, entries);
  if (!latest) return null;
  const taken = measurementDate(kind, latest);
  const date = dayMonth(taken, now);
  if (!before) return date;
  const change = Number((measurementValue(kind, latest) - measurementValue(kind, before)).toFixed(1));
  return `${date} · ${signedChange(kind, change)} ${sinceText(measurementDate(kind, before), taken)}`;
}

export type RulerTick = { cm: number; long: boolean; label: string };
export type HeightMark = { cm: number; value: string; label: string; fade: number };

/** The doorframe: a ruler in cm and a mark per height, oldest first. `line` goes under the big value. */
export type HeightView = { ruler: { min: number; max: number; ticks: RulerTick[] }; marks: HeightMark[]; line: string | null };

/** `1 year`, `15 months`, `2 years`. */
function ageText(months: number): string {
  if (months % 12 !== 0) return `${months} months`;
  return months === 12 ? '1 year' : `${months / 12} years`;
}

/**
 * Under 1 year, every height since birth labelled by date (`Birth`, `21 May`) and the line says how much taller
 * than at birth. Over 1 year, the last year's heights labelled by age, and the change since the one before.
 */
export function heightView(heights: Height[], birthDate: string, now: Date): HeightView {
  const firstYear = ageInMonths(birthDate, now) < 12;
  const oldest = newestMeasurements('height', heights).reverse();
  const shown = firstYear ? oldest : oldest.filter((entry) => daysBetween(localDate(entry.date), now) <= YEAR_DAYS);
  const opacity = fades(shown.length, 0.45);
  const marks = shown.map((entry, i) => ({
    cm: entry.height,
    value: measurementText('height', entry.height),
    label: firstYear
      ? entry.date === birthDate
        ? 'Birth'
        : dayMonth(localDate(entry.date), now)
      : ageText(ageInMonths(birthDate, localDate(entry.date))),
    fade: opacity[i]!,
  }));
  const values = marks.map((mark) => mark.cm);
  const min = Math.floor(values.length > 0 ? Math.min(...values) : 50) - 3;
  const max = Math.ceil((values.length > 0 ? Math.max(...values) : 60) + 2.5);
  const ticks = Array.from({ length: max - min - 1 }, (_, i) => {
    const cm = min + 1 + i;
    return { cm, long: cm % 5 === 0, label: cm % 5 === 0 ? String(cm) : '' };
  });
  return { ruler: { min, max, ticks }, marks, line: heightLine(oldest, firstYear, birthDate, now) };
}

function heightLine(oldest: Height[], firstYear: boolean, birthDate: string, now: Date): string | null {
  const latest = oldest[oldest.length - 1];
  const birth = oldest.find((entry) => entry.date === birthDate);
  if (!latest) return null;
  if (!firstYear || !birth || birth === latest) return sinceLine('height', oldest, now);
  const taller = measurementText('height', Number((latest.height - birth.height).toFixed(1)));
  return `${dayMonth(localDate(latest.date), now)} · ${taller} taller than at birth`;
}

export type HeadRing = { size: number; fade: number; latest: boolean };

/**
 * One ring per head circumference, smallest (oldest) first, sized 0–1 against the largest over a stretched
 * range so growth shows; the latest is drawn thicker. The centre holds the birth value, or the oldest one.
 */
export function headRings(
  heads: HeadCircumference[],
  birthDate: string,
  now: Date,
): { rings: HeadRing[]; centre: { label: string; value: string } | null } {
  const oldest = newestMeasurements('head', heads).reverse();
  const first = oldest[0];
  if (!first) return { rings: [], centre: null };
  const values = oldest.map((entry) => entry.head_circumference);
  const low = Math.floor(Math.min(...values)) - 4.5;
  const high = Math.max(...values);
  const opacity = fades(oldest.length, 0.25);
  const rings = oldest.map((entry, i) => ({
    size: Math.round((0.21 + 0.79 * ((entry.head_circumference - low) / (high - low))) * 1000) / 1000,
    fade: opacity[i]!,
    latest: i === oldest.length - 1,
  }));
  const label = first.date === birthDate ? 'Birth' : dayMonth(localDate(first.date), now);
  return { rings, centre: { label, value: measurementText('head', first.head_circumference) } };
}

export type BmiBar = { value: string; label: string; height: number; latest: boolean };

const BARS = 6;

/** The newest six BMIs, oldest first, labelled by age (`Birth`, `2m`, `1y`), as tall as their value (0–1). */
export function bmiBars(bmis: Bmi[], birthDate: string): BmiBar[] {
  const shown = newestMeasurements('bmi', bmis).slice(0, BARS).reverse();
  if (shown.length === 0) return [];
  const values = shown.map((entry) => entry.bmi);
  const low = Math.floor(Math.min(...values)) - 2;
  const high = Math.ceil(Math.max(...values));
  return shown.map((entry, i) => {
    const months = ageInMonths(birthDate, localDate(entry.date));
    return {
      value: measurementText('bmi', entry.bmi),
      label: entry.date === birthDate ? 'Birth' : months % 12 === 0 && months > 0 ? `${months / 12}y` : `${months}m`,
      height: (entry.bmi - low) / (high - low),
      latest: i === shown.length - 1,
    };
  });
}

/** `7.00 kg` ÷ `0.655 m` (squared): the weight and height on the latest BMI's date, or null without both. */
export function bmiFormula(lists: MeasurementLists): { weight: string; height: string } | null {
  const latest = newestMeasurements('bmi', lists.bmi ?? [])[0];
  if (!latest) return null;
  const weight = newestMeasurements('weight', lists.weight ?? []).find((entry) => entry.date === latest.date);
  const height = newestMeasurements('height', lists.height ?? []).find((entry) => entry.date === latest.date);
  if (!weight || !height) return null;
  return { weight: `${(weight.weight / 1000).toFixed(2)} kg`, height: `${(height.height / 100).toFixed(3)} m` };
}
