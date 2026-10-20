import type { EntriesByKind } from './latest';

export type TodaysTotals = { sleepMs: number; feedings: number; changes: number; medications: number };

/**
 * Since the Today card's window start. A feeding counts if it started since then; sleep is clipped
 * there. A sleep timer still running (`runningSleep`) counts up to `now`, so the total rises while
 * the baby sleeps.
 */
export function todaysTotals(
  entries: EntriesByKind,
  since: Date,
  runningSleep: { start: string } | null,
  now: Date,
): TodaysTotals {
  const running = runningSleep
    ? sleptBetween({ start: runningSleep.start, end: now.toISOString() }, since.getTime(), Infinity)
    : 0;
  const totals = totalsBetween(entries, since, LATEST);
  return { ...totals, sleepMs: totals.sleepMs + running };
}

/** The latest time a Date can hold: no end. */
const LATEST = new Date(8.64e15);

/**
 * A past page's totals: only what happened between `from` and `to`. Sleep is clipped at both ends;
 * feedings count by their start, changes and medication by their time, before `to`.
 */
export function totalsBetween(entries: EntriesByKind, from: Date, to: Date): TodaysTotals {
  const [start, end] = [from.getTime(), to.getTime()];
  const inside = (time: string) => Date.parse(time) >= start && Date.parse(time) < end;
  return {
    sleepMs: entries.sleep.reduce((total, entry) => total + sleptBetween(entry, start, end), 0),
    feedings: entries.feeding.filter((entry) => inside(entry.start)).length,
    changes: entries.change.filter((entry) => inside(entry.time)).length,
    medications: entries.medication.filter((entry) => inside(entry.time)).length,
  };
}

/** How much of a sleep falls between two epoch-ms times: the rule for clipping sleep at a window's or day's edge. */
export function sleptBetween({ start, end }: { start: string; end: string }, from: number, to: number): number {
  return Math.max(0, Math.min(Date.parse(end), to) - Math.max(Date.parse(start), from));
}
