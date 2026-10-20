import type { Sleep } from '@molly/api';

import { DAY_PLAN_TUNING, dayPlan, type DayPlanTuning, type Skip } from './day-plan';
import { morningWake, type DayWindow } from './day-window';
import { atClock, isNightSleep, type NapWindow } from './nap';
import { NEXT_SLEEP_TUNING, nextSleep, type NextSleep, type NextSleepTuning } from './next-sleep';

/** The sleeps that had ended by `now`: all a prediction made then could have known. */
export function knownAt(sleeps: Sleep[], now: Date): Sleep[] {
  return sleeps.filter((entry) => Date.parse(entry.end) <= now.getTime());
}

const MINUTE_MS = 60 * 1000;

/** Night sleep or nap by when it happened (`isNightSleep`), as the plan tells them; the saved flag isn't read. */
function isNight(entry: Sleep, napWindow: NapWindow): boolean {
  return isNightSleep(new Date(entry.start), new Date(entry.end), napWindow);
}

/** Whether the sleep started inside the window, how many minutes outside it if not, and its width. */
export function score(window: { start: Date; end: Date }, started: Date) {
  const early = window.start.getTime() - started.getTime();
  const late = started.getTime() - window.end.getTime();
  const miss = Math.max(0, early, late) / MINUTE_MS;
  return { hit: miss === 0, miss, width: (window.end.getTime() - window.start.getTime()) / MINUTE_MS };
}

/** Predict this long before each logged sleep started. */
const LEAD_MS = 30 * MINUTE_MS;

export type ReplayCase = {
  started: Date;
  /** A nap, bedtime (a night sleep after a nap), or back to sleep after a night waking. */
  target: 'nap' | 'bedtime' | 'night';
  now: Date;
  prediction: NextSleep | null;
  score: ReturnType<typeof score> | null;
};

/**
 * What Molly would have said 30 min before each logged sleep (or right at the wake, if the baby was
 * up for less), knowing only the sleeps that had ended by then. Scores sleeps that aren't catnaps
 * and came after at least 15 min awake.
 */
export function replay(
  sleeps: Sleep[],
  birthDate: string,
  napWindow: NapWindow,
  tuning: NextSleepTuning = NEXT_SLEEP_TUNING,
): ReplayCase[] {
  const sorted = [...sleeps].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  return sorted.flatMap((target, index) => {
    if (index === 0) return [];
    const start = Date.parse(target.start);
    const woke = Math.max(...sorted.slice(0, index).map((entry) => Date.parse(entry.end)));
    const long = Date.parse(target.end) - start >= tuning.catnapUnder * MINUTE_MS;
    if (!long || start - woke < 15 * MINUTE_MS) return [];
    const now = new Date(Math.max(start - LEAD_MS, woke));
    const prediction = nextSleep(knownAt(sorted, now), null, birthDate, napWindow, now, tuning);
    const started = new Date(start);
    const kind = !isNight(target, napWindow) ? 'nap' : isNight(sorted[index - 1]!, napWindow) ? 'night' : 'bedtime';
    return [{ started, target: kind, now, prediction, score: prediction && score(prediction, started) }];
  });
}

/**
 * A likely window on a past day: the last one Molly would have shown before a logged sleep started
 * (`started`), or a skipped nap's window (`skipped`, no sleep). `kind` is the logged sleep's: a
 * bedtime Molly showed a nap window for is scored as the bedtime.
 */
export type LikelySleep = { kind: NextSleep['kind']; start: Date; end: Date; skipped: boolean; started: Date | null };

/**
 * What Molly expected on a past day, rebuilt from the logs: for each sleep that started in the day's
 * window, the next sleep it would have shown just before, knowing only the sleeps that had ended and
 * the skips tapped by then. Nothing is stored.
 */
export function likelyFor(
  window: DayWindow,
  sleeps: Sleep[],
  skips: Skip[],
  birthDate: string | null,
  napWindow: NapWindow,
): LikelySleep[] {
  const shown = sleeps
    .filter((entry) => inside(window, new Date(entry.start)))
    .flatMap((entry): LikelySleep[] => {
      const started = new Date(entry.start);
      const tapped = skips.filter((skip) => skip.at <= started);
      const plan = dayPlan(knownAt(sleeps, started), null, birthDate, napWindow, tapped, started);
      const next = plan.find((sleep) => !sleep.skipped);
      return next ? [{ kind: isNight(entry, napWindow) ? 'bedtime' : 'nap', start: next.start, end: next.end, skipped: false, started }] : [];
    });
  const skipped = skips
    .filter((skip) => inside(window, skip.start))
    .map((skip): LikelySleep => ({ kind: 'nap', start: skip.start, end: skip.end, skipped: true, started: null }));
  return [...shown, ...skipped].sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** A sleep planned at a day's morning wake (`position` 1 is the next sleep), scored against the day's sleep in that place. */
export type PlanCase = { day: Date; position: number; kind: NextSleep['kind']; score: ReturnType<typeof score> | null };

/**
 * Plans each logged day from its morning wake, knowing only the sleeps that had ended by then, and
 * scores planned nap N against the day's Nth sleep (null if the day had fewer naps) and planned
 * bedtime against the logged one. Days without a logged bedtime are left out. Catnaps don't count.
 */
export function replayPlans(
  sleeps: Sleep[],
  birthDate: string,
  napWindow: NapWindow,
  tuning: NextSleepTuning = NEXT_SLEEP_TUNING,
  planTuning: DayPlanTuning = DAY_PLAN_TUNING,
): PlanCase[] {
  const long = sleeps
    .filter((entry) => Date.parse(entry.end) - Date.parse(entry.start) >= tuning.catnapUnder * MINUTE_MS)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const wakes = new Map<number, Date>();
  for (const entry of long.filter((sleep) => isNight(sleep, napWindow))) {
    const wake = morningWake(sleeps, napWindow, atClock(new Date(entry.end), 0, napWindow.start));
    if (wake) wakes.set(wake.getTime(), wake);
  }
  return [...wakes.values()].flatMap((day) => {
    const after = long.filter((entry) => new Date(entry.start) > day);
    const bedIndex = after.findIndex((entry) => isNight(entry, napWindow));
    if (bedIndex < 0) return [];
    const naps = after.slice(0, bedIndex);
    const bed = new Date(after[bedIndex]!.start);
    const plan = dayPlan(knownAt(sleeps, day), null, birthDate, napWindow, [], day, planTuning, tuning);
    return plan.map((planned, index): PlanCase => {
      const actual = planned.kind === 'bedtime' ? bed : naps[index] && new Date(naps[index].start);
      return { day, position: index + 1, kind: planned.kind, score: actual ? score(planned, actual) : null };
    });
  });
}

/**
 * One line on how a past day went against its likely windows:
 * `3 of 3 naps started in the likely window · bedtime 5m after`. A part with no window is left out;
 * null when there's none at all.
 */
export function accuracySummary(likely: LikelySleep[]): string | null {
  const shown = likely.filter((sleep) => sleep.started);
  const naps = shown.filter((sleep) => sleep.kind === 'nap');
  const bedtime = shown.find((sleep) => sleep.kind === 'bedtime');
  const parts: string[] = [];
  if (naps.length > 0) {
    const hits = naps.filter((sleep) => score(sleep, sleep.started!).hit).length;
    parts.push(`${hits} of ${naps.length} ${naps.length === 1 ? 'nap' : 'naps'} started in the likely window`);
  }
  if (bedtime) parts.push(`bedtime ${whereIn(bedtime, bedtime.started!)}`);
  if (parts.length === 0) return null;
  const line = parts.join(' · ');
  return line.charAt(0).toUpperCase() + line.slice(1);
}

/** `in the window`, `5m after` or `3m before`. */
function whereIn(window: { start: Date; end: Date }, started: Date): string {
  const { hit, miss } = score(window, started);
  if (hit) return 'in the window';
  return `${Math.round(miss)}m ${started > window.end ? 'after' : 'before'}`;
}

function inside(window: { start: Date; end: Date }, time: Date): boolean {
  return time >= window.start && time <= window.end;
}
