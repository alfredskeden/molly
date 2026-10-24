/**
 * Replays logged sleeps through `nextSleep` and prints how often the window was right, then plans
 * each day from its morning wake with `dayPlan` and scores every planned sleep by its place.
 * Dev-only: reads a JSON array of Baby Buddy sleep entries fetched separately (never commit it).
 *
 *   pnpm replay:naps <sleeps.json> <birth YYYY-MM-DD> [--nap-window 07:00-19:00] [--set spread=20,napLength=45,band3.awake=60] [--reflag]
 *   pnpm replay:naps <sleeps.json> <birth YYYY-MM-DD> --days [--truth <truth.json>]
 *
 * `--reflag` sets each sleep's `nap` as Molly would have saved it at its end (`isNight`). `--days`
 * prints each day's morning wake and bedtime by the rule before #14 and by the child's rhythm, then
 * the days where they differ; `--truth` scores both against a JSON array of
 * `{ "day": "YYYY-MM-DD", "wake": "HH:MM", "bedtime": "HH:MM" }` from another tracker (a bedtime
 * before noon is after midnight).
 *
 * Runs in the machine's time zone, which should be the family's.
 */
import { readFileSync } from 'node:fs';

import type { Sleep } from '../packages/api/src/types';
import { DAY_PLAN_TUNING, type DayPlanTuning } from '../packages/core/src/day-plan';
import { DAY_TUNING, dayRhythm } from '../packages/core/src/day-rhythm';
import { isNight } from '../packages/core/src/day-window';
import { clockText } from '../packages/core/src/format';
import { atClock, DEFAULT_NAP_WINDOW } from '../packages/core/src/nap';
import { NEXT_SLEEP_TUNING, type NextSleepTuning } from '../packages/core/src/next-sleep';
import {
  knownAt,
  replay,
  replayDays,
  replayPlans,
  scoreDays,
  type DayEdges,
  type EdgeScore,
  type PlanCase,
  type ReplayCase,
  type TruthDay,
} from '../packages/core/src/replay';
import { applyDayKey } from './tuning';

const [file, birthDate, ...flags] = process.argv.slice(2);
if (!file || !birthDate) {
  console.error('usage: pnpm replay:naps <sleeps.json> <birth YYYY-MM-DD> [--nap-window HH:MM-HH:MM] [--set k=v,...]');
  process.exit(1);
}
const flag = (name: string) => {
  const index = flags.indexOf(name);
  return index >= 0 ? flags[index + 1] : undefined;
};
const [napStart, napEnd] = (flag('--nap-window') ?? '').split('-');
const napWindow = napStart && napEnd ? { start: napStart, end: napEnd } : DEFAULT_NAP_WINDOW;
const tuning: NextSleepTuning = { ...NEXT_SLEEP_TUNING };
const planTuning: DayPlanTuning = { ...DAY_PLAN_TUNING };
const dayTuning = structuredClone(DAY_TUNING);
for (const pair of (flag('--set') ?? '').split(',').filter(Boolean)) {
  const [key, value] = pair.split('=') as [string, string];
  if (key in tuning) tuning[key as keyof NextSleepTuning] = Number(value);
  else if (key in planTuning) planTuning[key as keyof DayPlanTuning] = Number(value);
  else if (!applyDayKey(dayTuning, key, Number(value))) throw new Error(`unknown tuning key ${key}`);
}

const logged = JSON.parse(readFileSync(file, 'utf8')) as Sleep[];
// --reflag: set `nap` as Molly saves it when the sleep is stopped: by the child's rhythm, knowing the sleeps until then.
const sleeps = flags.includes('--reflag')
  ? logged.map((entry) => {
      const end = new Date(entry.end);
      const known = knownAt(logged, end);
      const rhythm = dayRhythm(known, birthDate, napWindow, end, dayTuning);
      return { ...entry, nap: !isNight({ start: new Date(entry.start), end }, known, rhythm, end) };
    })
  : logged;
if (flags.includes('--days')) {
  days();
  process.exit(0);
}
const cases = replay(sleeps, birthDate, napWindow, tuning, dayTuning);

const quantile = (values: number[], q: number) => {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]!;
};
const row = (label: string, group: ReplayCase[]) => {
  const scored = group.filter((entry) => entry.score);
  const hits = scored.filter((entry) => entry.score!.hit).length;
  const misses = scored.map((entry) => entry.score!.miss);
  const widths = scored.map((entry) => entry.score!.width);
  const pct = scored.length ? `${Math.round((hits / scored.length) * 100)}%` : '-';
  return [
    label.padEnd(18),
    String(group.length).padStart(5),
    String(group.length - scored.length).padStart(7),
    pct.padStart(5),
    String(Math.round(quantile(misses, 0.5))).padStart(7),
    String(Math.round(quantile(misses, 0.9))).padStart(6),
    String(Math.round(quantile(widths, 0.5))).padStart(7),
  ].join(' ');
};
const by = (test: (entry: ReplayCase) => boolean) => cases.filter(test);

console.log(`tuning ${JSON.stringify(tuning)}  nap window ${napWindow.start}-${napWindow.end}${flags.includes('--reflag') ? '  reflagged' : ''}`);
console.log('group              cases  hidden  hit  miss50 miss90 width50');
console.log(row('all but night', by((entry) => entry.target !== 'night')));
for (const source of ['age', 'blend', 'history'] as const) {
  console.log(row(`source ${source}`, by((entry) => entry.target !== 'night' && entry.prediction?.source === source)));
}
console.log(row('actual nap', by((entry) => entry.target === 'nap')));
console.log(row('actual bedtime', by((entry) => entry.target === 'bedtime')));
console.log(row('night waking', by((entry) => entry.target === 'night')));
console.log(row('said nap', by((entry) => entry.target !== 'night' && entry.prediction?.kind === 'nap')));
console.log(row('said bedtime', by((entry) => entry.target !== 'night' && entry.prediction?.kind === 'bedtime')));
const kinded = cases.filter((entry) => entry.prediction && entry.target !== 'night');
const rightKind = kinded.filter((entry) => entry.prediction!.kind === (entry.target === 'nap' ? 'nap' : 'bedtime')).length;
console.log(`right kind (nap vs bedtime): ${rightKind}/${kinded.length}`);

// Whole-day plans: each day planned once, at its morning wake. Position 1 is the next sleep as the
// hero would show it at the wake; later ones are the chained guesses drawn as outlines.
const plans = replayPlans(sleeps, birthDate, napWindow, tuning, planTuning, dayTuning);
const planRow = (label: string, group: PlanCase[]) => {
  const scored = group.filter((entry) => entry.score);
  const hits = scored.filter((entry) => entry.score!.hit).length;
  const pct = scored.length ? `${Math.round((hits / scored.length) * 100)}%` : '-';
  return [
    label.padEnd(18),
    String(group.length).padStart(5),
    String(group.length - scored.length).padStart(7),
    pct.padStart(5),
    String(Math.round(quantile(scored.map((entry) => entry.score!.miss), 0.5))).padStart(7),
    String(Math.round(quantile(scored.map((entry) => entry.score!.width), 0.5))).padStart(7),
  ].join(' ');
};
console.log('');
console.log(`day plans from the morning wake: ${new Set(plans.map((entry) => entry.day.getTime())).size} days  plan tuning ${JSON.stringify(planTuning)}`);
console.log('planned            cases  no nap  hit  miss50 width50');
const positions = [...new Set(plans.filter((entry) => entry.kind === 'nap').map((entry) => entry.position))].sort((a, b) => a - b);
for (const position of positions) {
  console.log(planRow(`nap ${position}`, plans.filter((entry) => entry.kind === 'nap' && entry.position === position)));
}
console.log(planRow('later naps (2+)', plans.filter((entry) => entry.kind === 'nap' && entry.position > 1)));
console.log(planRow('bedtime', plans.filter((entry) => entry.kind === 'bedtime')));

/** `--days`: each day's wake and bedtime by both rules, where they differ, and scores against `--truth`. */
function days() {
  const cases = replayDays(sleeps, birthDate!, napWindow, dayTuning);
  const time = (value: Date | null) => (value ? clockText(value) : '-').padEnd(6);
  const differs = (old: Date | null, found: Date | null) => old?.getTime() !== found?.getTime();
  const edges = (edge: DayEdges) => `${time(edge.wake)} ${time(edge.bedtime)}`;
  console.log(`day tuning ${JSON.stringify(dayTuning)}  setting ${napWindow.start}-${napWindow.end}`);
  console.log('day         old wake/bed   new wake/bed');
  for (const day of cases) {
    const mark = differs(day.old.wake, day.new.wake) || differs(day.old.bedtime, day.new.bedtime) ? '*' : ' ';
    console.log(`${day.day.toDateString().slice(4)} ${mark} ${edges(day.old)}  ${edges(day.new)}`);
  }
  const mornings = cases.filter((day) => differs(day.old.wake, day.new.wake));
  const evenings = cases.filter((day) => differs(day.old.bedtime, day.new.bedtime));
  console.log(`\nmornings that differ: ${mornings.length} of ${cases.length}: ${mornings.map((day) => day.day.toDateString().slice(4, 10)).join(', ')}`);
  console.log(`evenings that differ: ${evenings.length} of ${cases.length}: ${evenings.map((day) => day.day.toDateString().slice(4, 10)).join(', ')}`);
  const truthFile = flag('--truth');
  if (!truthFile) return;
  const scores = scoreDays(cases, readTruth(truthFile));
  const line = ({ right, wrong, none }: EdgeScore) => `${right} right · ${wrong} wrong · ${none} none`;
  for (const rule of ['old', 'new'] as const) {
    console.log(`${rule} rule: wake ${line(scores[rule].wake)}; bedtime ${line(scores[rule].bedtime)}`);
  }
}

/** The truth file's days, with clock times on their day (a bedtime before noon on the next). */
function readTruth(path: string): TruthDay[] {
  const rows = JSON.parse(readFileSync(path, 'utf8')) as { day: string; wake?: string; bedtime?: string }[];
  return rows.map((row) => {
    const [year, month, date] = row.day.split('-').map(Number) as [number, number, number];
    const day = new Date(year, month - 1, date);
    const bedtime = row.bedtime ? atClock(day, Number(row.bedtime.slice(0, 2)) < 12 ? 1 : 0, row.bedtime) : null;
    return { day, wake: row.wake ? atClock(day, 0, row.wake) : null, bedtime };
  });
}
