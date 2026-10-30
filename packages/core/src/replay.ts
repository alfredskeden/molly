import type { Sleep } from '@molly/api';

import { DAY_PLAN_TUNING, dayPlan, type DayPlanTuning, type Skip } from './day-plan';
import { DAY_TUNING, dayRhythm, isOnTime, onTimeOn, type DayRhythm, type DayTuning } from './day-rhythm';
import { isNight as isNightIn, pastDays, wakeAndBedtime, type DayWindow } from './day-window';
import { atClock, isNightSleep, type NapWindow } from './nap';
import { NEXT_SLEEP_TUNING, nextSleep, type NextSleep, type NextSleepTuning } from './next-sleep';

/** The sleeps that had ended by `now`: all a prediction made then could have known. */
export function knownAt(sleeps: Sleep[], now: Date): Sleep[] {
  return sleeps.filter((entry) => Date.parse(entry.end) <= now.getTime());
}

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** Night sleep or nap by the child's rhythm (`isNight`), knowing every sleep; the saved flag isn't read. */
function isNight(entry: Sleep, sleeps: Sleep[], rhythm: DayRhythm): boolean {
  return isNightIn({ start: new Date(entry.start), end: new Date(entry.end) }, sleeps, rhythm, afterAll(sleeps));
}

/** A moment after every sleep has ended: all of them are known. */
function afterAll(sleeps: Sleep[]): Date {
  return new Date(Math.max(0, ...sleeps.map((entry) => Date.parse(entry.end))) + DAY_MS);
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
  dayTuning: DayTuning = DAY_TUNING,
): ReplayCase[] {
  const sorted = [...sleeps].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const known = dayRhythm(sorted, birthDate, napWindow, afterAll(sorted), dayTuning);
  return sorted.flatMap((target, index) => {
    if (index === 0) return [];
    const start = Date.parse(target.start);
    const woke = Math.max(...sorted.slice(0, index).map((entry) => Date.parse(entry.end)));
    const long = Date.parse(target.end) - start >= tuning.catnapUnder * MINUTE_MS;
    if (!long || start - woke < 15 * MINUTE_MS) return [];
    const now = new Date(Math.max(start - LEAD_MS, woke));
    const before = knownAt(sorted, now);
    const prediction = nextSleep(before, null, birthDate, dayRhythm(before, birthDate, napWindow, now, dayTuning), now, tuning);
    const started = new Date(start);
    const night = (entry: Sleep) => isNight(entry, sorted, known);
    const kind = !night(target) ? 'nap' : night(sorted[index - 1]!) ? 'night' : 'bedtime';
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
  rhythm: DayRhythm,
): LikelySleep[] {
  const shown = sleeps
    .filter((entry) => inside(window, new Date(entry.start)))
    .flatMap((entry): LikelySleep[] => {
      const started = new Date(entry.start);
      const tapped = skips.filter((skip) => skip.at <= started);
      const plan = dayPlan(knownAt(sleeps, started), null, birthDate, rhythm, tapped, started);
      const next = plan.find((sleep) => !sleep.skipped);
      return next ? [{ kind: isNight(entry, sleeps, rhythm) ? 'bedtime' : 'nap', start: next.start, end: next.end, skipped: false, started }] : [];
    });
  const skipped = skips
    .filter((skip) => inside(window, skip.start))
    .map((skip): LikelySleep => ({ kind: 'nap', start: skip.start, end: skip.end, skipped: true, started: null }));
  return [...shown, ...skipped].sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** A sleep planned at a day's morning wake (`position` 1 is the next sleep), scored against the day's sleep in that place. */
export type PlanCase = { day: Date; position: number; kind: NextSleep['kind']; score: ReturnType<typeof score> | null };

/**
 * Plans each logged day from its morning wake, as soon as it was known (right after a wake at the
 * usual time as Molly knew it then, else the age's threshold after it), knowing only the sleeps that
 * had ended by then, and scores planned nap N against the day's Nth sleep (null if the day had fewer naps) and planned
 * bedtime against the logged one. Days without a logged bedtime are left out. Catnaps don't count.
 */
export function replayPlans(
  sleeps: Sleep[],
  birthDate: string,
  napWindow: NapWindow,
  tuning: NextSleepTuning = NEXT_SLEEP_TUNING,
  planTuning: DayPlanTuning = DAY_PLAN_TUNING,
  dayTuning: DayTuning = DAY_TUNING,
): PlanCase[] {
  const isLong = (entry: Sleep) => Date.parse(entry.end) - Date.parse(entry.start) >= tuning.catnapUnder * MINUTE_MS;
  const end = afterAll(sleeps);
  const first = Math.min(...sleeps.map((entry) => Date.parse(entry.start)));
  const days = Math.ceil((end.getTime() - first) / DAY_MS) + 1;
  const rhythm = dayRhythm(sleeps, birthDate, napWindow, end, dayTuning);
  return pastDays(sleeps, rhythm, end, days)
    .reverse()
    .flatMap(({ wake, naps, bedtime }) => {
      if (!bedtime) return [];
      const long = naps.filter(isLong);
      // A wake at the usual time is known a minute after it (at the wake itself, the sleep still runs),
      // any other once the baby has been up the age's threshold.
      const onTime = isOnTime(wake, onTimeOn(dayRhythm(knownAt(sleeps, wake), birthDate, napWindow, wake, dayTuning), wake));
      const known = new Date(wake.getTime() + (onTime ? 1 : rhythm.band.awake) * MINUTE_MS);
      const before = knownAt(sleeps, known);
      const plan = dayPlan(before, null, birthDate, dayRhythm(before, birthDate, napWindow, known, dayTuning), [], known, planTuning, tuning);
      return plan.map((planned, index): PlanCase => {
        const actual = planned.kind === 'bedtime' ? new Date(bedtime.start) : long[index] && new Date(long[index].start);
        return { day: wake, position: index + 1, kind: planned.kind, score: actual ? score(planned, actual) : null };
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

/** Where a day started and its night began, by one rule; null where the rule found none. */
export type DayEdges = { wake: Date | null; bedtime: Date | null };

/** A calendar day (its midnight) by the rule before #14 (`old`) and by the child's rhythm (`new`). */
export type DayCase = { day: Date; old: DayEdges; new: DayEdges };

/**
 * Each calendar day from the first logged sleep's to the last's, with its morning wake and bedtime by
 * both rules, knowing every sleep. The new rule's rhythm is learned as on that day (from the days
 * before it), so a day never teaches itself.
 */
export function replayDays(sleeps: Sleep[], birthDate: string | null, napWindow: NapWindow, dayTuning: DayTuning = DAY_TUNING): DayCase[] {
  if (sleeps.length === 0) return [];
  const end = afterAll(sleeps);
  const first = new Date(Math.min(...sleeps.map((entry) => Date.parse(entry.start))));
  const last = new Date(Math.max(...sleeps.map((entry) => Date.parse(entry.end))));
  const days: DayCase[] = [];
  for (let day = atClock(first, 0, '00:00'); day <= last; day = atClock(day, 1, '00:00')) {
    const rhythm = dayRhythm(sleeps, birthDate, napWindow, atClock(day, 0, '12:00'), dayTuning);
    days.push({ day, old: oldEdges(sleeps, napWindow, day), new: wakeAndBedtime(sleeps, rhythm, day, end) });
  }
  return days;
}

/**
 * The rule before #14, for comparison: the end of a night sleep by the clock (`isNightSleep`) closest
 * to the setting's start and within 2 h of it, then the first night sleep after it from the setting's
 * start on, before the next morning.
 */
function oldEdges(sleeps: Sleep[], napWindow: NapWindow, day: Date): DayEdges {
  const night = (entry: Sleep) => isNightSleep(new Date(entry.start), new Date(entry.end), napWindow);
  const start = atClock(day, 0, napWindow.start).getTime();
  const distance = (time: number) => Math.abs(time - start);
  const ends = sleeps
    .filter(night)
    .map((entry) => Date.parse(entry.end))
    .filter((end) => distance(end) <= 2 * 60 * MINUTE_MS)
    .sort((a, b) => distance(a) - distance(b));
  if (ends.length === 0) return { wake: null, bedtime: null };
  const wake = ends[0]!;
  const nextMorning = atClock(day, 1, napWindow.start).getTime();
  const starts = sleeps
    .filter((entry) => night(entry) && Date.parse(entry.start) > wake && Date.parse(entry.start) >= start && Date.parse(entry.start) < nextMorning)
    .map((entry) => Date.parse(entry.start))
    .sort((a, b) => a - b);
  return { wake: new Date(wake), bedtime: starts.length > 0 ? new Date(starts[0]!) : null };
}

/** A day's real morning wake and bedtime, from another tracker; null where it has none. */
export type TruthDay = { day: Date; wake: Date | null; bedtime: Date | null };

export type EdgeScore = { right: number; wrong: number; none: number };
export type DayScores = Record<'old' | 'new', { wake: EdgeScore; bedtime: EdgeScore }>;

/** How far off a found time may be and still be right. */
const RIGHT_WITHIN_MS = 5 * MINUTE_MS;

/**
 * Each rule's wakes and bedtimes against the truth, on the days it has: right (within 5 min), wrong,
 * or none (the rule found nothing). A truth with no time for a day isn't scored.
 */
export function scoreDays(days: DayCase[], truth: TruthDay[]): DayScores {
  const empty = (): EdgeScore => ({ right: 0, wrong: 0, none: 0 });
  const scores: DayScores = { old: { wake: empty(), bedtime: empty() }, new: { wake: empty(), bedtime: empty() } };
  for (const real of truth) {
    const found = days.find((day) => day.day.getTime() === atClock(real.day, 0, '00:00').getTime());
    for (const rule of ['old', 'new'] as const) {
      for (const edge of ['wake', 'bedtime'] as const) {
        const expected = real[edge];
        if (!expected) continue;
        const time = found?.[rule][edge] ?? null;
        const score = scores[rule][edge];
        if (!time) score.none += 1;
        else if (Math.abs(time.getTime() - expected.getTime()) <= RIGHT_WITHIN_MS) score.right += 1;
        else score.wrong += 1;
      }
    }
  }
  return scores;
}
