import type { Measurement, MeasurementKind, NewMeasurement } from '@molly/api';
import { localDay } from '@molly/core';

import type { Copy } from '@/theme/copy';

type Measure = {
  kind: MeasurementKind;
  /** The plain name, always the one screen readers hear; `themed` is the theme's (`useCopy()`). */
  name: string;
  themed: keyof Copy;
  add: string;
  title: string;
  save: string;
};

/** The five rows of the Measurements card, in the design's order, with their plain words. */
export const MEASURES: Measure[] = [
  { kind: 'weight', name: 'Weight', themed: 'measureWeight', add: 'Weight', title: 'Weight entry', save: 'Save weight' },
  { kind: 'height', name: 'Height', themed: 'measureHeight', add: 'Height', title: 'Height entry', save: 'Save height' },
  { kind: 'head', name: 'Head circumference', themed: 'measureHead', add: 'Head', title: 'Head entry', save: 'Save head' },
  { kind: 'temperature', name: 'Temperature', themed: 'measureTemperature', add: 'Reading', title: 'Temperature entry', save: 'Save temperature' },
  { kind: 'bmi', name: 'BMI', themed: 'measureBmi', add: 'BMI', title: 'BMI entry', save: 'Save BMI' },
];

export const measureOf = (kind: MeasurementKind) => MEASURES.find((measure) => measure.kind === kind)!;

export const isMeasurementKind = (value: unknown): value is MeasurementKind => MEASURES.some((measure) => measure.kind === value);

export type DayChoice = 'today' | 'yesterday' | 'picked';

/** Local midnight of the chosen day. */
export function entryDay(choice: DayChoice, picked: Date | null, now: Date): Date {
  const day = choice === 'picked' && picked ? picked : now;
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() - (choice === 'yesterday' ? 1 : 0));
}

const FIELDS: Record<Exclude<MeasurementKind, 'temperature'>, string> = {
  weight: 'weight',
  height: 'height',
  head: 'head_circumference',
  bmi: 'bmi',
};

/** `today`: no date sent, so Baby Buddy uses its own today (it refuses a date ahead of its time zone's). */
type SheetValues = { child: number; value: number; day: Date | 'today'; clock: string; notes: string };

/**
 * What Save sends: the value on the chosen date, a temperature at the chosen clock time on it. `future`
 * for a time still to come (Baby Buddy refuses it); the date choices never pick a future day.
 */
export function newMeasurement<K extends MeasurementKind>(kind: K, { child, value, day, clock, notes }: SheetValues, now: Date): NewMeasurement<K> | 'future' {
  const note = notes.trim() ? { notes: notes.trim() } : {};
  if (kind === 'temperature') {
    const [hours = 0, minutes = 0] = clock.split(':').map(Number);
    const date = day === 'today' ? now : day;
    const time = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);
    if (time > now) return 'future';
    return { child, temperature: value, time: time.toISOString(), ...note } as NewMeasurement<K>;
  }
  const date = day === 'today' ? {} : { date: localDay(day) };
  return { child, [FIELDS[kind as keyof typeof FIELDS]]: value, ...date, ...note } as NewMeasurement<K>;
}

/** The new measurement as a list entry, with a negative id, until Baby Buddy's answer replaces it. Undated is today. */
export function guessMeasurement<K extends MeasurementKind>(kind: K, entry: NewMeasurement<K>, now: Date): Measurement<K> {
  const stamp = kind === 'temperature' ? { time: now.toISOString() } : { date: localDay(now) };
  return { notes: null, tags: [], ...stamp, ...entry, id: -Date.now() } as unknown as Measurement<K>;
}
