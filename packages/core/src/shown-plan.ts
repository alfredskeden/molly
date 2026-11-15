import { dayPlan, type PlannedSleep, type Skip } from './day-plan';
import { withoutPlan, type DayRhythm, type Shown } from './day-rhythm';

/**
 * The rhythm with the day plan: each sleep after the morning wake is judged by what the plan showed
 * next at its start (`dayPlan` from the sleeps that started before it, with the skips tapped by then).
 * The plan itself runs on the plain rhythm (`withoutPlan`), so only the day being decided consults
 * it and a judgement never recurses into history. Lives apart from `day-window.ts`, which can't
 * import the planner (`day-plan` → `next-sleep` → `day-window`).
 */
export function withPlan(rhythm: DayRhythm, birthDate: string | null, skips: Skip[]): DayRhythm {
  const plain = withoutPlan(rhythm);
  const tappedBy = (at: Date) => skips.filter((skip) => skip.at <= at);
  return { ...plain, shown: (before, at) => shownBy(dayPlan(before, null, birthDate, plain, tappedBy(at), at)) };
}

/** The plan's first unskipped sleep: a nap, bedtime after a skipped nap, or neither. */
function shownBy(plan: PlannedSleep[]): Shown {
  const next = plan.findIndex((sleep) => !sleep.skipped);
  if (next < 0) return null;
  if (plan[next]!.kind === 'nap') return 'nap';
  return next > 0 ? 'skipped' : null;
}
