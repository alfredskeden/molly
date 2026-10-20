import type { Sleep } from '@molly/api';

import { counted, durationText } from '../format';
import { atClock, isNightSleep, type NapWindow } from '../nap';
import { sleptBetween } from '../totals';
import type { GuidePage } from './pages';
import type { SourceId } from './sources';
import type { GuideRegion } from './types';

const DAYS = 7;
const MIN_DAYS = 3;

export type SleepComparison = { days: number; perDayMs: number; naps: number; text: string };

/**
 * The child's own sleep over the last 7 full days, to show beside the typical range: sleep per day (a
 * sleep across midnight split between its days) and naps per day (by `isNightSleep`, counted on the day
 * they start). Today isn't full, so a sleep still running never counts. A day counts when some sleep is
 * logged on it and it's after the day of the first sleep known (which may have started part way). Nothing
 * with fewer than 3 such days. Numbers only, never a verdict.
 */
export function sleepComparison(sleeps: readonly Sleep[], napWindow: NapWindow, now: Date): SleepComparison | null {
  if (sleeps.length === 0) return null;
  const firstDay = atClock(new Date(Math.min(...sleeps.map((entry) => Date.parse(entry.start)))), 1, '00:00');
  const days = Array.from({ length: DAYS }, (_, index) => ({
    from: atClock(now, index - DAYS, '00:00').getTime(),
    to: atClock(now, index - DAYS + 1, '00:00').getTime(),
  }))
    .filter(({ from }) => from >= firstDay.getTime())
    .map(({ from, to }) => ({
      slept: sleeps.reduce((total, entry) => total + sleptBetween(entry, from, to), 0),
      naps: sleeps.filter((entry) => {
        const start = new Date(entry.start);
        return start.getTime() >= from && start.getTime() < to && !isNightSleep(start, new Date(entry.end), napWindow);
      }).length,
    }))
    .filter(({ slept }) => slept > 0);
  if (days.length < MIN_DAYS) return null;
  const perDayMs = days.reduce((total, day) => total + day.slept, 0) / days.length;
  const naps = Math.round(days.reduce((total, day) => total + day.naps, 0) / days.length);
  return {
    days: days.length,
    perDayMs,
    naps,
    text: `last ${days.length} days: ${durationText(perDayMs)} a day, ${naps === 0 ? 'no naps' : counted(naps, 'nap')}`,
  };
}

/**
 * Hours in 24, naps included, from the first page of each band. Sweden follows 1177 (0–3 months, 4–11,
 * 1–2 years, 3–5). International follows the AASM consensus, which gives nothing under 4 months, so the
 * NSF's range stands in there; at 12 months AASM's 4–12 month and 1–2 year bands meet, and the page
 * (12 to 14 months) takes the 1–2 years one.
 */
const TYPICAL_SLEEP: Record<GuideRegion, { from: GuidePage; min: number; max: number; source: SourceId }[]> = {
  sweden: [
    { from: 36, min: 10, max: 14, source: '1177-sleep' },
    { from: 12, min: 10, max: 16, source: '1177-sleep' },
    { from: 4, min: 12, max: 16, source: '1177-sleep' },
    { from: 0, min: 14, max: 18, source: '1177-sleep' },
  ],
  international: [
    { from: 36, min: 10, max: 13, source: 'aasm-sleep' },
    { from: 12, min: 11, max: 14, source: 'aasm-sleep' },
    { from: 4, min: 12, max: 16, source: 'aasm-sleep' },
    { from: 0, min: 14, max: 17, source: 'nsf-sleep' },
  ],
};

/** AASM gives no range under 4 months: sleep varies too much that young. */
const AASM_FROM = 4;

/** The Sleep topic's typical range for a page, from the region's source. */
export function typicalSleep(page: GuidePage, region: GuideRegion): { min: number; max: number; source: SourceId; text: string } {
  const { min, max, source } = TYPICAL_SLEEP[region].find((band) => page >= band.from)!;
  // 1177 describes how much children sleep; AASM and the NSF recommend amounts (NSF's "suggest" stands in under 4 months).
  const range = `${min}–${max} hours in 24 hours`;
  const text =
    region === 'sweden'
      ? `Many children this age sleep ${range}, naps included.`
      : `Sleep experts ${page < AASM_FROM ? 'suggest' : 'recommend'} ${range} at this age, naps included.`;
  return { min, max, source, text: page < AASM_FROM ? `${text} Sleep varies a lot at this age.` : text };
}
