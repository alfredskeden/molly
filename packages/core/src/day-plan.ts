import type { Sleep, Timer } from '@molly/api';

import type { DayRhythm } from './day-rhythm';
import { clockText } from './format';
import { atClock } from './nap';
import {
  DAY_PLAN_TUNING,
  type DayPlanTuning,
  earlierBedtime,
  minutesAfter,
  NEXT_SLEEP_TUNING,
  predictSleep,
  sleepContext,
  stateAt,
  type NextSleep,
  type NextSleepTuning,
  usualNapLength,
} from './next-sleep';

const MINUTE_MS = 60 * 1000;

export { DAY_PLAN_TUNING, type DayPlanTuning } from './next-sleep';

/** A nap skipped in the hero: when it was tapped (`at`) and the window it skipped, as shown then. */
export type Skip = { at: Date; start: Date; end: Date };

/** A likely sleep of the day ahead; a skipped nap keeps its place, drawn at the skipped window. */
export type PlannedSleep = NextSleep & { skipped: boolean };

/**
 * The likely sleeps from now until bedtime, in order: the next sleep (as `nextSleep` has it), then
 * each later nap predicted from the one before, assumed to start mid-window and last its usual
 * length, until bedtime: the usual bedtime is near, or the day has as many naps as past days usually
 * had. Empty whenever `nextSleep` is null. Recomputed every render, so a logged nap moves the rest.
 *
 * Skips tapped since the last wake (`at` after it) each take the next nap that isn't skipped yet,
 * oldest first: it stays in the plan, marked and at the skipped window, and bedtime moves earlier by
 * its usual length. Short naps today move it earlier too, by `shortNapShare` of their shortfall; with
 * the skips, at most `earliestBy`. Bedtime is never skipped. A sleep of 15 min or more moves the wake and so ends them,
 * as does a running nap (its assumed wake is the anchor).
 */
export function dayPlan(
  sleeps: Sleep[],
  running: Timer | null,
  birthDate: string | null,
  rhythm: DayRhythm,
  skips: Skip[],
  now: Date,
  tuning: DayPlanTuning = DAY_PLAN_TUNING,
  nextTuning: NextSleepTuning = NEXT_SLEEP_TUNING,
): PlannedSleep[] {
  const context = sleepContext(sleeps, running, birthDate, rhythm, now, nextTuning, tuning);
  if (!context) return [];
  const active = skips.filter((skip) => skip.at > context.anchor).sort((a, b) => a.at.getTime() - b.at.getTime());
  const plan: PlannedSleep[] = [];
  // Short naps already moved bedtime (`context.earlier`); skips share what's left of the limit.
  let earlier = 0;
  let slot = context.slot;
  let next = predictSleep(context, context.anchor, slot, nextTuning);
  while (next.kind === 'nap') {
    const skip = active.shift();
    const length = usualNapLength(context.pastDays, slot, tuning.napLength);
    plan.push(skip ? planned({ ...next, start: skip.start, end: skip.end }, now, true) : planned(next, now, false));
    if (skip) earlier = Math.min(tuning.earliestBy - context.earlier, earlier + length);
    const wake = minutesAfter(middleOf(next), length);
    slot += 1;
    const after = predictSleep(context, wake, slot, nextTuning);
    next = skip && after.kind === 'nap' ? napAfterSkipped(after, skip, tuning) : after;
  }
  plan.push(planned(earlierBedtime(next, earlier, context, nextTuning), now, false));
  // Dropped as `nextSleep` drops its window, but the first sleep that isn't skipped decides.
  const upcoming = plan.find((sleep) => !sleep.skipped)!;
  return now.getTime() > upcoming.end.getTime() + nextTuning.dropAfter * MINUTE_MS ? [] : plan;
}

/** The nap after a skipped one opens a while after the skipped window, as wide. */
function napAfterSkipped(nap: Omit<NextSleep, 'state'>, skip: Skip, tuning: DayPlanTuning) {
  const start = minutesAfter(skip.end, tuning.afterSkip);
  return { ...nap, start, end: minutesAfter(start, minutesBetween(skip)) };
}

function minutesBetween({ start, end }: { start: Date; end: Date }): number {
  return (end.getTime() - start.getTime()) / MINUTE_MS;
}

function middleOf({ start, end }: { start: Date; end: Date }): Date {
  return new Date((start.getTime() + end.getTime()) / 2);
}

function planned(sleep: Omit<NextSleep, 'state'>, now: Date, skipped: boolean): PlannedSleep {
  return { ...sleep, state: stateAt(sleep.start, sleep.end, now), skipped };
}

/** The tag of a skip note, and the tag Undo gives it instead (parents can't delete notes). */
export const SKIP_TAG = 'molly-skip';
export const UNDONE_SKIP_TAG = 'molly-skip-undone';

/** The note text stored in Baby Buddy for a skip, with local clock times: `Skipped nap 15:05–15:45`. */
export function skipNote(skip: Skip): string {
  return `Skipped nap ${clockText(skip.start)}–${clockText(skip.end)}`;
}

const CLOCK = '(?:[01]\\d|2[0-3]):[0-5]\\d';
const SKIP_NOTE = new RegExp(`^Skipped nap (${CLOCK})–(${CLOCK})$`);

/** The skip a note stands for: its times on the note's local date, tapped at the note's time. */
export function parseSkip(note: { time: string; note: string }): Skip | null {
  const match = SKIP_NOTE.exec(note.note);
  if (!match) return null;
  const at = new Date(note.time);
  const [start, end] = [atClock(at, 0, match[1]!), atClock(at, 0, match[2]!)];
  return start < end ? { at, start, end } : null;
}
