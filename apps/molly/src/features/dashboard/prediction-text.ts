import type { NextSleep } from '@molly/core';

import { formatClock, formatElapsed, spokenDuration } from '@/lib/time';

const MINUTE_MS = 60_000;
/** The bar runs this far past the window's end, so the end isn't flush with the edge. */
/** What "usual" looks back over: `NEXT_SLEEP_TUNING.historyDays`. */
const HISTORY_DAYS = 14;

const KIND = { nap: 'Nap', bedtime: 'Bedtime' } as const;
const clock = (date: Date) => formatClock(date.toISOString());

/** Relative, so for the app only (it updates live); widgets show clock times alone. */
export function stateLabel(prediction: NextSleep, now: Date): string {
  if (prediction.state === 'before') return `Opens in ${formatElapsed(prediction.start.getTime() - now.getTime())}`;
  return prediction.state === 'open' ? 'Window open' : 'Past the window';
}

export function spokenPrediction(prediction: NextSleep, now: Date): string {
  const window = `${KIND[prediction.kind]} likely between ${clock(prediction.start)} and ${clock(prediction.end)}.`;
  const state =
    prediction.state === 'before'
      ? `Opens in ${spokenDuration(prediction.start.getTime() - now.getTime())}.`
      : `${stateLabel(prediction, now)}.`;
  return `${window} ${state}`;
}

/** The toast right after a skip: `Nap skipped · bedtime likely 18:10`. */
export function skipToast(bedtime: { start: Date } | null): string {
  return bedtime ? `Nap skipped · bedtime likely ${clock(bedtime.start)}` : 'Nap skipped';
}

const months = (count: number) => `${count} month${count === 1 ? '' : 's'}`;

/** The line under every prediction, with the tap target that opens the Why sheet. */
export function disclaimer(prediction: NextSleep, ageMonths: number): { text: string; link: string } {
  return prediction.source === 'age'
    ? { text: `Based on age (${months(ageMonths)}) only · not medical advice`, link: '›' }
    : { text: 'Estimate · not medical advice', link: 'Why ›' };
}

const USUAL = { first: 'Usual first wake window', middle: 'Usual wake window', last: 'Usual time up before bed' } as const;
const WEIGHTED = { age: 'Age guide', blend: 'Your logs and age', history: 'Your logs' } as const;
const duration = (minutes: number) => formatElapsed(Math.round(minutes) * MINUTE_MS);
const range = ({ min, max }: { min: number; max: number }) => `${duration(min)} – ${duration(max)}`;

export type WhyRow = { label: string; detail?: string; value: string };

/** Where the window came from, for the "Why this window" sheet. */
export function whyRows(prediction: NextSleep, ageMonths: number, now: Date): WhyRow[] {
  const usual = prediction.kind === 'bedtime' ? USUAL.last : USUAL[prediction.slot];
  const days = prediction.samples;
  return [
    { label: 'Awake for', value: formatElapsed(now.getTime() - prediction.anchor.getTime()) },
    {
      label: usual,
      detail: days > 0 ? `last ${HISTORY_DAYS} days · ${days} day${days === 1 ? '' : 's'}` : `none logged in the last ${HISTORY_DAYS} days`,
      value: prediction.history ? range(prediction.history) : '–',
    },
    { label: 'Age guide', detail: months(ageMonths), value: range(prediction.guide.wake) },
    { label: 'Weighted towards', value: WEIGHTED[prediction.source] },
  ];
}
