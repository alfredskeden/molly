// The panel of a likely sleep (design `Molly Nap Detail` 2b, plans/implan-nap-detail): which sleep of the
// plan it is, when, how it went yesterday and usually, and the rest of the day after it.

import type { Sleep } from '@molly/api';

import type { PastDay } from './day-window';
import { clockText, durationText, whenText } from './format';
import { median } from './next-sleep';

/** A likely sleep of the plan, as `dayPlan` gives it. */
export type PlanSleep = { kind: 'nap' | 'bedtime'; start: Date; end: Date; skipped: boolean };

/** Which sleep of the day a likely one is: the nap's number counted from the morning wake, or bedtime. */
export type LikelySlot = number | 'bedtime';

/**
 * Each planned sleep's slot, in plan order: the naps numbered after the `napsSoFar` logged since the
 * morning wake (a running one counted), bedtime as bedtime. A skipped nap has none, so the next takes its number.
 */
export function likelySlots(plan: PlanSleep[], napsSoFar: number): (LikelySlot | null)[] {
  let naps = napsSoFar;
  return plan.map((sleep) => (sleep.skipped ? null : sleep.kind === 'bedtime' ? 'bedtime' : ++naps));
}

export type LikelyDetail = {
  slot: LikelySlot;
  start: Date;
  end: Date;
  /** The first sleep of the plan that isn't skipped: the one Why and Skip are for. */
  next: boolean;
  /** `12:56 – 13:26`. */
  range: string;
  /** `in 1h 16m`, `20m left`, `14m ago`. */
  when: string;
  /** The same sleep on the most recent past day, and the median over the past days that had it. */
  yesterday: PastSleep | null;
  usually: PastSleep | null;
  /** Every likely sleep after it that isn't skipped, in order. */
  later: { slot: LikelySlot; range: string }[];
};

/** A past sleep's start clock and, for a nap, its length (`13:05`, `1h 5m`); bedtime has no length. */
export type PastSleep = { start: string; length: string | null };

/** The panel for the likely sleep in `slot`, or null once the plan no longer has it. */
export function likelyDetail(plan: PlanSleep[], slot: LikelySlot, napsSoFar: number, pastDays: PastDay[], now: Date): LikelyDetail | null {
  const slots = likelySlots(plan, napsSoFar);
  const index = slots.indexOf(slot);
  const sleep = plan[index];
  if (!sleep) return null;
  return {
    slot,
    start: sleep.start,
    end: sleep.end,
    next: slots.findIndex((candidate) => candidate !== null) === index,
    range: rangeText(sleep),
    when: whenText(sleep, now),
    ...pastSleeps(pastDays, slot, now),
    later: plan.flatMap((later, at) => {
      const laterSlot = slots[at];
      return at > index && laterSlot != null ? [{ slot: laterSlot, range: rangeText(later) }] : [];
    }),
  };
}

const MINUTE_MS = 60_000;

/**
 * The sleep in `slot` on past days (newest first): yesterday's, if the most recent day had one, and the
 * median start and median length over the days that did. Starts are counted from the midnight before
 * the day's wake, so a bedtime after midnight is late, not early. Yesterday is the day that woke on the
 * calendar day before `now`.
 */
function pastSleeps(pastDays: PastDay[], slot: LikelySlot, now: Date): { yesterday: PastSleep | null; usually: PastSleep | null } {
  const sleepIn = (day: PastDay): Sleep | null => (slot === 'bedtime' ? day.bedtime : (day.naps[slot - 1] ?? null));
  const had = pastDays.flatMap((day) => {
    const sleep = sleepIn(day);
    if (!sleep) return [];
    const [start, end] = [Date.parse(sleep.start), Date.parse(sleep.end)];
    const midnight = new Date(day.wake.getFullYear(), day.wake.getMonth(), day.wake.getDate()).getTime();
    return [{ day, start: (start - midnight) / MINUTE_MS, length: (end - start) / MINUTE_MS }];
  });
  const text = (start: number, length: number): PastSleep => ({
    start: clockText(new Date(2000, 0, 1, 0, Math.round(start))),
    length: slot === 'bedtime' ? null : durationText(Math.round(length) * MINUTE_MS),
  });
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toDateString();
  const latest = had.find((sleep) => sleep.day.wake.toDateString() === yesterday);
  return {
    yesterday: latest ? text(latest.start, latest.length) : null,
    usually: had.length > 0 ? text(median(had.map((sleep) => sleep.start)), median(had.map((sleep) => sleep.length))) : null,
  };
}

const rangeText = ({ start, end }: { start: Date; end: Date }) => `${clockText(start)} – ${clockText(end)}`;
