import type { Weight } from '@molly/api';

import type { Sex } from './children';
import { daysBetween, dayMonth, localDate, measurementText, newestMeasurements, signedChange } from './measurements';
import { ageInMonths } from './sleep-guide';
import { WHO_WEIGHT_BOYS, WHO_WEIGHT_GIRLS, type LmsRow } from './who-weight';

/** The WHO centiles Molly draws, in grams: 3rd–97th (faint), 15th–85th, the 50th dashed. */
export type WeightBands = { p3: number; p15: number; p50: number; p85: number; p97: number };

/** The z-score of each drawn centile. */
const CENTILES = [
  { name: '3rd', key: 'p3', z: -1.881 },
  { name: '15th', key: 'p15', z: -1.036 },
  { name: '50th', key: 'p50', z: 0 },
  { name: '85th', key: 'p85', z: 1.036 },
  { name: '97th', key: 'p97', z: 1.881 },
] as const;

/** Within this many z of a centile a weight is "close to" it, within `JUST_Z` "just above" or "just below" it. */
const CLOSE_Z = 0.05;
const JUST_Z = 0.25;

const YEAR_DAYS = 365;

/** L, M and S on a day, interpolated between the table's rows; held at its ends. */
function lmsAt(sex: Sex, day: number): [l: number, m: number, s: number] {
  const table = sex === 'girl' ? WHO_WEIGHT_GIRLS : WHO_WEIGHT_BOYS;
  const last = table[table.length - 1]!;
  if (day >= last[0]) return [last[1], last[2], last[3]];
  if (day <= 0) return [table[0]![1], table[0]![2], table[0]![3]];
  const after = table.findIndex((row) => row[0] >= day);
  const high: LmsRow = table[after]!;
  const low: LmsRow = table[after - 1] ?? high;
  const t = high[0] === low[0] ? 0 : (day - low[0]) / (high[0] - low[0]);
  return [1, 2, 3].map((i) => low[i]! + (high[i]! - low[i]!) * t) as [number, number, number];
}

/** The weight at a z-score: `M · (1 + L·S·z)^(1/L)`, in grams. */
function weightAtZ(sex: Sex, day: number, z: number): number {
  const [l, m, s] = lmsAt(sex, day);
  return m * (1 + l * s * z) ** (1 / l) * 1000;
}

/** How many standard deviations a weight is from the median for the age: `((W/M)^L − 1) / (L·S)`. */
function zScore(sex: Sex, day: number, grams: number): number {
  const [l, m, s] = lmsAt(sex, day);
  return ((grams / 1000 / m) ** l - 1) / (l * s);
}

/** The WHO weight-for-age centiles at an age in days, in whole grams. */
export function whoBands(sex: Sex, day: number): WeightBands {
  const grams = (z: number) => Math.round(weightAtZ(sex, day, z));
  return { p3: grams(-1.881), p15: grams(-1.036), p50: grams(0), p85: grams(1.036), p97: grams(1.881) };
}

/** Days from birth to the entry's date. */
const ageDays = (birthDate: string, entry: Weight) => daysBetween(localDate(birthDate), localDate(entry.date));

type Place = { centile: (typeof CENTILES)[number]['name']; offset: number };

/** The centile line a weight is nearest, and how far above (+) or below (−) it, in z. */
function place(sex: Sex, birthDate: string, entry: Weight): Place {
  const z = zScore(sex, ageDays(birthDate, entry), entry.weight);
  const nearest = CENTILES.reduce((best, line) => (Math.abs(z - line.z) < Math.abs(z - best.z) ? line : best));
  return { centile: nearest.name, offset: z - nearest.z };
}

/** `Close to the 50th centile`, `Just above the 50th centile`, `Below the 3rd centile`. */
function placeText({ centile, offset }: Place, straddles = false): string {
  const line = `the ${centile} centile`;
  if (straddles || Math.abs(offset) < CLOSE_Z) return `Close to ${line}`;
  const side = offset > 0 ? 'above' : 'below';
  return Math.abs(offset) <= JUST_Z ? `Just ${side} ${line}` : `${side[0]!.toUpperCase()}${side.slice(1)} ${line}`;
}

const rank = (centile: Place['centile']) => CENTILES.findIndex((line) => line.name === centile);

/** `, up from the 15th at birth` when the nearest centile has changed since the earlier weight. */
function movedText(latest: Place, earlier: Place, since: string): string {
  const way = rank(latest.centile) > rank(earlier.centile) ? 'up' : 'down';
  return `, ${way} from the ${earlier.centile} ${since}`;
}

/**
 * Where the latest weight sits among the WHO centiles, compared with birth in the first year (a weight on
 * the birth date) or with the past year after it. Nothing without the sex or a weight.
 */
export function centileChip(weights: Weight[], sex: Sex | null, birthDate: string, now: Date): string | null {
  if (sex === null) return null;
  const newest = newestMeasurements('weight', weights);
  const latest = newest[0];
  if (!latest) return null;
  const latestPlace = place(sex, birthDate, latest);
  if (ageInMonths(birthDate, now) < 12) {
    const birth = newest.find((entry) => entry.date === birthDate);
    if (!birth || birth === latest) return placeText(latestPlace);
    const birthPlace = place(sex, birthDate, birth);
    return birthPlace.centile === latestPlace.centile
      ? `${placeText(latestPlace)}, as at birth`
      : `${placeText(latestPlace)}${movedText(latestPlace, birthPlace, 'at birth')}`;
  }
  const year = newest.filter((entry) => daysBetween(localDate(entry.date), now) <= YEAR_DAYS);
  if (year.length < 2) return placeText(latestPlace);
  const places = year.map((entry) => place(sex, birthDate, entry));
  const oldest = places[places.length - 1]!;
  if (places.some((other) => other.centile !== latestPlace.centile)) {
    return oldest.centile === latestPlace.centile
      ? placeText(latestPlace)
      : `${placeText(latestPlace)}${movedText(latestPlace, oldest, 'a year ago')}`;
  }
  const straddles = places.some((other) => other.offset >= 0) && places.some((other) => other.offset < 0);
  return `${placeText(latestPlace, straddles)} all year`;
}

/** `16 days` under 60 days, then `2 months`. */
function gapText(days: number): string {
  if (days < 60) return `${days} day${days === 1 ? '' : 's'}`;
  const months = Math.round(days / 30.44);
  return `${months} month${months === 1 ? '' : 's'}`;
}

/** The newest entry and the newest one of an earlier date, so two weighings on one day don't make a 0-day gap. */
function lastTwo(weights: Weight[]): [Weight, Weight | null] | null {
  const newest = newestMeasurements('weight', weights);
  const latest = newest[0];
  if (!latest) return null;
  return [latest, newest.find((entry) => entry.date < latest.date) ?? null];
}

/**
 * The line under the weight: its date, the gain since the weight before and over how long, and a rate whose
 * unit follows age: `about 29 g a day` under 3 months, `about 110 g a week` to 12 months, `about 180 g a
 * month` after (weekly and monthly rates to the nearest 10 g).
 */
export function gainLine(weights: Weight[], birthDate: string, now: Date): string | null {
  const pair = lastTwo(weights);
  if (!pair) return null;
  const [latest, before] = pair;
  const date = dayMonth(localDate(latest.date), now);
  if (!before) return date;
  const days = daysBetween(localDate(before.date), localDate(latest.date));
  const gain = latest.weight - before.weight;
  const perDay = gain / days;
  const months = ageInMonths(birthDate, now);
  const grams = (value: number) => `${value < 0 ? '−' : ''}${Math.abs(value)} g`;
  const tens = (value: number) => grams(Math.round(value / 10) * 10);
  const rate =
    months < 3
      ? `${grams(Math.round(perDay))} a day`
      : months < 12
        ? `${tens(perDay * 7)} a week`
        : `${tens(perDay * 30.44)} a month`;
  return `${date} · ${signedChange('weight', gain)} in ${gapText(days)} · about ${rate}`;
}

const DIP_DAYS = 14;

/**
 * The birth-dip card under 3 months: the lowest weight in the first two weeks, its day, how far under
 * the weight on the birth date, and the day back to it. Nothing without a birth-date weight or a lower one.
 */
export function birthDipText(weights: Weight[], birthDate: string, now: Date): string | null {
  if (ageInMonths(birthDate, now) >= 3) return null;
  const oldest = newestMeasurements('weight', weights).reverse();
  const birth = oldest.find((entry) => entry.date === birthDate);
  if (!birth) return null;
  const early = oldest.filter((entry) => ageDays(birthDate, entry) <= DIP_DAYS && entry.weight < birth.weight);
  if (early.length === 0) return null;
  const lowest = early.reduce((low, entry) => (entry.weight < low.weight ? entry : low));
  const back = oldest.find((entry) => entry.date > lowest.date && entry.weight >= birth.weight);
  const under = Math.round(((birth.weight - lowest.weight) / birth.weight) * 100);
  const backText = back ? `Back to birth weight on day ${ageDays(birthDate, back)}.` : 'Not back to birth weight yet.';
  return `Lowest ${measurementText('weight', lowest.weight)} on day ${ageDays(birthDate, lowest)}, ${under}% under birth weight. ${backText}`;
}

/** Over 12 months the chart shows the last year (the default) or everything since birth. */
export type WeightRange = 'lastYear' | 'sinceBirth';

export type AxisTick = { day: number; label: string };

/** The chart's x axis in days since birth. `switchable`: over 12 months, offer Last year | Since birth. */
export type WeightAxis = { from: number; to: number; ticks: AxisTick[]; switchable: boolean };

const NEWBORN_DAYS = 84;

/** Days from birth to the child's `months`-month birthday (the month's last day when it's too short). */
function monthDay(birthDate: string, months: number): number {
  const birth = localDate(birthDate);
  const target = new Date(birth.getFullYear(), birth.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(birth.getDate(), lastDay));
  return daysBetween(birth, target);
}

/** `Birth`, `5m`, `1y`, `16m`, `2y`. */
const monthLabel = (months: number) => (months === 0 ? 'Birth' : months % 12 === 0 ? `${months / 12}y` : `${months}m`);

function monthTicks(birthDate: string, from: number, to: number, every: number): AxisTick[] {
  const ticks: AxisTick[] = [];
  for (let months = 0; monthDay(birthDate, months) <= to; months += every) {
    const day = monthDay(birthDate, months);
    if (day >= from) ticks.push({ day, label: monthLabel(months) });
  }
  return ticks;
}

/**
 * Under 3 months: birth to 12 weeks (or today, if later), ticked every 4 weeks. 3–12 months: birth to now,
 * ticked every month. Over 12 months: the last year ticked every 4 months, or since birth every 6.
 */
export function weightAxis(birthDate: string, now: Date, range: WeightRange): WeightAxis {
  const today = daysBetween(localDate(birthDate), now);
  const months = ageInMonths(birthDate, now);
  if (months < 3) {
    const to = Math.max(NEWBORN_DAYS, today);
    const ticks = [0, 28, 56, 84].map((day) => ({ day, label: day === 0 ? 'Birth' : `${day / 7}w` }));
    return { from: 0, to, ticks, switchable: false };
  }
  if (months < 12) return { from: 0, to: today, ticks: monthTicks(birthDate, 0, today, 1), switchable: false };
  const from = range === 'lastYear' ? today - YEAR_DAYS : 0;
  return { from, to: today, ticks: monthTicks(birthDate, from, today, range === 'lastYear' ? 4 : 6), switchable: true };
}

export type WeightPoint = { day: number; grams: number };

/**
 * What the weight chart draws: the axis, the WHO bands sampled along it (null without the sex), the weights
 * on it oldest first, and a y range in grams that fits both, padded and rounded to 500 g.
 */
export type WeightChart = {
  axis: WeightAxis;
  bands: (WeightBands & { day: number })[] | null;
  points: WeightPoint[];
  min: number;
  max: number;
};

const BAND_SAMPLES = 24;
const Y_STEP = 500;

export function weightChart(
  weights: Weight[],
  sex: Sex | null,
  birthDate: string,
  now: Date,
  range: WeightRange,
): WeightChart {
  const axis = weightAxis(birthDate, now, range);
  const points = newestMeasurements('weight', weights)
    .reverse()
    .map((entry) => ({ day: ageDays(birthDate, entry), grams: entry.weight }))
    .filter(({ day }) => day >= axis.from && day <= axis.to);
  const bands =
    sex === null
      ? null
      : Array.from({ length: BAND_SAMPLES + 1 }, (_, i) => {
          const day = axis.from + ((axis.to - axis.from) * i) / BAND_SAMPLES;
          return { day, ...whoBands(sex, day) };
        });
  const values = [...points.map((point) => point.grams), ...(bands ?? []).flatMap((band) => [band.p3, band.p97])];
  const low = values.length > 0 ? Math.min(...values) : 3000;
  const high = values.length > 0 ? Math.max(...values) : 4000;
  const pad = Math.max((high - low) * 0.05, 100);
  const min = Math.floor((low - pad) / Y_STEP) * Y_STEP;
  return { axis, bands, points, min, max: Math.max(Math.ceil((high + pad) / Y_STEP) * Y_STEP, min + Y_STEP) };
}

/** `WHO girls`, `WHO boys · gain shown per month after the first year`, or where to set the sex. */
export function weightFooter(sex: Sex | null, birthDate: string, now: Date): string {
  if (sex === null) return 'Set girl or boy on the child screen to see the WHO ranges';
  const table = sex === 'girl' ? 'WHO girls' : 'WHO boys';
  return ageInMonths(birthDate, now) >= 12 ? `${table} · gain shown per month after the first year` : table;
}
