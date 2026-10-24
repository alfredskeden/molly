/**
 * Replays the made-up children in `packages/core/test/day-fixtures.ts` through the day and night rule
 * and prints each one's wake and bedtime scores, old rule against new: what step 5 of
 * plans/implan-day-night tuned on.
 *
 *   pnpm replay:fixtures [--nap-window 07:00-19:00] [--set bedtimeCut=90,band3.awake=60]
 */
import { DEFAULT_NAP_WINDOW } from '../packages/core/src/nap';
import { replayDays, scoreDays } from '../packages/core/src/replay';
import { PROFILES, profileDays } from '../packages/core/test/day-fixtures';
import { dayTuningFrom } from './tuning';

const flags = process.argv.slice(2);
const flag = (name: string) => {
  const index = flags.indexOf(name);
  return index >= 0 ? flags[index + 1] : undefined;
};
const dayTuning = dayTuningFrom(flag('--set') ?? '');
const [napStart, napEnd] = (flag('--nap-window') ?? '').split('-');
const napWindow = napStart && napEnd ? { start: napStart, end: napEnd } : DEFAULT_NAP_WINDOW;
const score = ({ right, wrong, none }: { right: number; wrong: number; none: number }) => `${right} · ${wrong} · ${none}`.padEnd(12);

console.log(`right · wrong · none per profile, 3 seeds of 28 days, setting ${napWindow.start}-${napWindow.end}`);
console.log('profile        old wake     new wake     old bedtime  new bedtime');
for (const profile of PROFILES) {
  const totals = { old: { wake: [0, 0, 0], bedtime: [0, 0, 0] }, new: { wake: [0, 0, 0], bedtime: [0, 0, 0] } };
  for (const seed of [1, 2, 3]) {
    const { sleeps, truth } = profileDays(profile, 28, seed);
    // The first 3 days teach the rhythm; they aren't scored.
    const scores = scoreDays(replayDays(sleeps, profile.birthDate, napWindow, dayTuning), truth.slice(3));
    for (const rule of ['old', 'new'] as const) {
      for (const edge of ['wake', 'bedtime'] as const) {
        const { right, wrong, none } = scores[rule][edge];
        totals[rule][edge] = [totals[rule][edge][0]! + right, totals[rule][edge][1]! + wrong, totals[rule][edge][2]! + none];
      }
    }
  }
  const of = ([right, wrong, none]: number[]) => score({ right: right!, wrong: wrong!, none: none! });
  console.log(`${profile.name.padEnd(14)} ${of(totals.old.wake)} ${of(totals.new.wake)} ${of(totals.old.bedtime)} ${of(totals.new.bedtime)}`);
}
