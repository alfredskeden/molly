// The nap reminder (plans/implan-nap-detail): a bell on the likely-sleep panel reminds this phone when that
// sleep's window opens. Stored as which sleep it's for, not a time, so it follows the window as logs move it.

import type { Sleep } from '@molly/api';

import { likelySlots, type LikelySlot, type PlanSleep } from './likely-detail';

/**
 * A stored reminder: the sleep's `place` in the day (the nap's number counted from the morning wake with
 * skipped naps included, so a later skip never moves it to another nap; or bedtime), the start of the day
 * window it was set in (`day`) and when it was set (`setAt`), ISO strings.
 */
export type NapReminder = { place: number | 'bedtime'; day: string; setAt: string };

/** When to ring, and what: the sleep as the panel names it (`slot`) and its window. */
export type NapRing = { at: Date; slot: LikelySlot; start: Date; end: Date };

/** The plan index of the sleep at `place`, with `napsSoFar` naps logged since the morning wake. */
function indexOf(plan: PlanSleep[], place: NapReminder['place'], napsSoFar: number): number {
  if (place === 'bedtime') return plan.findIndex((sleep) => sleep.kind === 'bedtime');
  const index = place - napsSoFar - 1;
  return plan[index]?.kind === 'nap' ? index : -1;
}

/**
 * The reminder the bell sets for the panel's sleep in `slot`, or null once its window has opened (the bell
 * is off then).
 */
export function reminderFor(
  plan: PlanSleep[],
  slot: LikelySlot,
  napsSoFar: number,
  window: { start: Date },
  now: Date,
): NapReminder | null {
  const place = placeOf(plan, slot, napsSoFar);
  const sleep = plan[likelySlots(plan, napsSoFar).indexOf(slot)];
  if (place === null || !sleep || sleep.start <= now) return null;
  return { place, day: window.start.toISOString(), setAt: now.toISOString() };
}

/** The place in the day of the panel's sleep in `slot` (skipped naps counted), or null without one. */
export function placeOf(plan: PlanSleep[], slot: LikelySlot, napsSoFar: number): NapReminder['place'] | null {
  const index = likelySlots(plan, napsSoFar).indexOf(slot);
  const sleep = plan[index];
  if (!sleep) return null;
  return sleep.kind === 'bedtime' ? 'bedtime' : napsSoFar + 1 + index;
}

/**
 * When a stored reminder rings: at its sleep's start in the current plan, so it moves as logs move the
 * window (in the past while the window is open: at once). Null, cancelling it, without one, with
 * notifications not allowed, once a sleep runs or has started since it was set, once its sleep is skipped
 * or gone from the plan, its window has ended, or the day window it was set in is over.
 */
export function napReminderAt(input: {
  reminder: NapReminder | null;
  plan: PlanSleep[];
  napsSoFar: number;
  window: { kind: 'day' | 'night'; start: Date };
  running: { start: string } | null;
  sleeps: Pick<Sleep, 'start'>[];
  allowed: boolean;
  now: Date;
}): NapRing | null {
  const { reminder, plan, napsSoFar, window, running, sleeps, allowed, now } = input;
  if (!reminder || !allowed || running) return null;
  if (window.kind !== 'day' || window.start.toISOString() !== reminder.day) return null;
  const setAt = Date.parse(reminder.setAt);
  if (sleeps.some((sleep) => Date.parse(sleep.start) >= setAt)) return null;
  const index = indexOf(plan, reminder.place, napsSoFar);
  const sleep = plan[index];
  const slot = likelySlots(plan, napsSoFar)[index];
  if (!sleep || slot == null || now >= sleep.end) return null;
  return { at: sleep.start, slot, start: sleep.start, end: sleep.end };
}
