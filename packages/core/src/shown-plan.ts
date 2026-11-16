import type { Sleep } from '@molly/api';

import { dayPlan, type PlannedSleep, type Skip } from './day-plan';
import { minutesPast, withoutPlan, type DayRhythm, type Shown } from './day-rhythm';
import { NEXT_SLEEP_TUNING } from './next-sleep';

const MINUTE_MS = 60 * 1000;

/**
 * The rhythm with the day plan: each sleep after the morning wake is judged by what the plan showed
 * next at its start (`dayPlan` from the sleeps that started before it, with the skips tapped by then).
 * The plan itself runs on the plain rhythm (`withoutPlan`), so only the day being decided consults
 * it and a judgement never recurses into history. Lives apart from `day-window.ts`, which can't
 * import the planner (`day-plan` → `next-sleep` → `day-window`).
 *
 * The same sleep is judged many times in one render (every day window, past page and night check
 * walks its day again), so answers are remembered for as long as this rhythm lives, by the start and
 * the exact sleeps before it.
 */
export function withPlan(rhythm: DayRhythm, birthDate: string | null, skips: Skip[]): DayRhythm {
  const plain = withoutPlan(rhythm);
  const known = new Map<number, { before: Sleep[]; shown: Shown }[]>();
  const shown = (before: Sleep[], at: Date, onlySkip: boolean): Shown => {
    // The plan counts skips tapped after its wake, and has none more than `staleAfter` after it.
    const tapped = skips.filter((skip) => skip.at <= at && at.getTime() - skip.at.getTime() < NEXT_SLEEP_TUNING.staleAfter * MINUTE_MS);
    if (onlySkip && tapped.length === 0) return null;
    // The plan reads `historyDays` back, each day from the night before it: older sleeps can't matter.
    const from = minutesPast(at, -(NEXT_SLEEP_TUNING.historyDays + 2), 0).getTime();
    const recent = before.filter((sleep) => Date.parse(sleep.start) >= from);
    const answers = known.get(at.getTime()) ?? [];
    const hit = answers.find((answer) => sameSleeps(answer.before, recent));
    if (hit) return hit.shown;
    const answer = { before: recent, shown: shownBy(dayPlan(recent, null, birthDate, plain, tapped, at)) };
    known.set(at.getTime(), [...answers, answer]);
    return answer.shown;
  };
  return { ...plain, shown };
}

/** The plan's first unskipped sleep: a nap, bedtime after a skipped nap, or neither. */
function shownBy(plan: PlannedSleep[]): Shown {
  const next = plan.findIndex((sleep) => !sleep.skipped);
  if (next < 0) return null;
  if (plan[next]!.kind === 'nap') return 'nap';
  return next > 0 ? 'skipped' : null;
}

/** Whether two lists hold the same sleeps (start and end) in the same order. */
function sameSleeps(a: Sleep[], b: Sleep[]): boolean {
  return a.length === b.length && a.every((sleep, index) => sleep.start === b[index]!.start && sleep.end === b[index]!.end);
}
