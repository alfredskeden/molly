import type { Temperature } from '@molly/api';

import { dayMonth, daysBetween, measurementText, measurementWhen, newestMeasurements } from './measurements';

export type TemperatureZone = 'Low' | 'Normal' | 'Raised' | 'Fever';

/** Fixed zones, no age adjustment: Low under 36.0, Normal to 37.4, Raised to 37.9, Fever from 38.0 °C. */
export function temperatureZone(celsius: number): TemperatureZone {
  if (celsius >= 38) return 'Fever';
  if (celsius >= 37.5) return 'Raised';
  return celsius < 36 ? 'Low' : 'Normal';
}

/** The zone bar's span. */
export const TEMPERATURE_SCALE = { min: 35.5, max: 40 } as const;

/** Where a reading sits along the bar, 0–1, kept at its ends. */
function barX(celsius: number): number {
  const { min, max } = TEMPERATURE_SCALE;
  return Math.min(1, Math.max(0, (celsius - min) / (max - min)));
}

const PINS = 4;

export type TemperatureView = {
  latest: { x: number } | null;
  /** The readings before the latest, newest first, each fainter. */
  pins: { x: number; fade: number }[];
  /** `Today 07:40 · Normal`. */
  line: string | null;
};

export function temperatureView(readings: Temperature[], now: Date): TemperatureView {
  const [latest, ...before] = newestMeasurements('temperature', readings);
  if (!latest) return { latest: null, pins: [], line: null };
  return {
    latest: { x: barX(latest.temperature) },
    pins: before.slice(0, PINS).map((reading, i) => ({ x: barX(reading.temperature), fade: Number((0.5 - i * 0.08).toFixed(2)) })),
    line: `${measurementWhen('temperature', latest, now)} · ${temperatureZone(latest.temperature)}`,
  };
}

const EPISODE_DAYS = 30;
const HOUR_MS = 60 * 60 * 1000;

/** `26h` under two days, then `3 days`. */
function lastedText(ms: number): string {
  const hours = Math.round(ms / HOUR_MS);
  return hours < 48 ? `${hours}h` : `${Math.round(hours / 24)} days`;
}

const MONTH_DAY = /^(\d+) (\w+)(.*)$/;

/** `27 Sep`, `26 – 27 Sep`, `30 Sep – 1 Oct`. */
function spanText(start: Date, end: Date, now: Date): string {
  const [from, to] = [dayMonth(start, now), dayMonth(end, now)];
  if (from === to) return from;
  const [, fromDay, fromRest] = MONTH_DAY.exec(from) ?? [];
  const [, , toRest] = MONTH_DAY.exec(to) ?? [];
  return fromRest === toRest ? `${fromDay} – ${to}` : `${from} – ${to}`;
}

export type FeverCard = { title: string; detail: string };

/**
 * The most recent fever episode whose last reading is in the past 30 days: from the first reading of 38.0 °C
 * or more until the first Normal reading after it (Raised ones don't end it), or still going.
 */
export function feverCard(readings: Temperature[], now: Date): FeverCard | null {
  const oldest = newestMeasurements('temperature', readings).reverse();
  let episode: Temperature[] | null = null;
  let ended = false;
  for (const reading of oldest) {
    const zone = temperatureZone(reading.temperature);
    if (episode && !ended) {
      episode.push(reading);
      ended = zone === 'Normal';
    } else if (zone === 'Fever') {
      [episode, ended] = [[reading], false];
    }
  }
  if (!episode) return null;
  const start = new Date(episode[0]!.time);
  const end = new Date(episode[episode.length - 1]!.time);
  if (daysBetween(end, now) > EPISODE_DAYS) return null;
  const peak = measurementText('temperature', Math.max(...episode.map((reading) => reading.temperature)));
  const count = `${episode.length} reading${episode.length === 1 ? '' : 's'}`;
  if (!ended) return { title: `Fever since ${dayMonth(start, now)}`, detail: `Peak ${peak} · still going · ${count}` };
  return {
    title: `Fever ${spanText(start, end, now)}`,
    detail: `Peak ${peak} · back to normal after ${lastedText(end.getTime() - start.getTime())} · ${count}`,
  };
}

export type TemperatureRow = { date: string; value: string; zone: TemperatureZone };

/** The newest readings: `Today 07:40` or `27 Sep 20:10`, the value and its zone. */
export function temperatureRows(readings: Temperature[], now: Date, count: number): TemperatureRow[] {
  return newestMeasurements('temperature', readings)
    .slice(0, count)
    .map((reading) => ({
      date: measurementWhen('temperature', reading, now),
      value: measurementText('temperature', reading.temperature),
      zone: temperatureZone(reading.temperature),
    }));
}
