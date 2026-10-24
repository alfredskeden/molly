import type { Sleep } from '@molly/api';

import type { TruthDay } from '../src/replay';
import { sleep } from './fixtures';

/** Minutes, `[min, max]`. Clock times are minutes past midnight. */
type Range = [number, number];

/**
 * A made-up child for replaying the day and night rule: when they usually wake and go to bed, how
 * their nights and days run, and how often the hard shapes come up (shares of days, 0–1).
 */
export type Profile = {
  name: string;
  birthDate: string;
  wake: Range;
  bedtime: Range;
  /** Night wakings a night, and minutes awake in each. */
  wakings: Range;
  wakingAwake: Range;
  windows: Range;
  napLength: Range;
  /** A waking 1–2½ h before the morning wake, up for `earlyAwake`, then back asleep until the wake. */
  earlyWaking: number;
  earlyAwake: Range;
  /** Up early for the day (40–100 min before the usual wake), then a long first nap: the back-to-sleep morning. */
  backToSleep: number;
  /** A 20–30 min catnap 1½–2½ h before bedtime. */
  catnap: number;
};

/** Ages as of September 2026. */
export const PROFILES: Profile[] = [
  {
    name: '2 months',
    birthDate: '2026-07-10',
    wake: [6 * 60 + 30, 8 * 60],
    bedtime: [21 * 60, 22 * 60 + 15],
    wakings: [2, 3],
    wakingAwake: [20, 50],
    windows: [60, 90],
    napLength: [30, 100],
    earlyWaking: 0.2,
    earlyAwake: [30, 50],
    backToSleep: 0,
    catnap: 0.3,
  },
  {
    name: '4–5 months',
    birthDate: '2026-04-20',
    wake: [6 * 60 + 30, 7 * 60 + 40],
    bedtime: [20 * 60 + 15, 21 * 60 + 15],
    wakings: [1, 2],
    wakingAwake: [15, 40],
    windows: [80, 130],
    napLength: [40, 110],
    earlyWaking: 0.2,
    earlyAwake: [20, 45],
    backToSleep: 0.2,
    catnap: 0.25,
  },
  {
    name: '10 months',
    birthDate: '2025-11-20',
    wake: [6 * 60, 7 * 60],
    bedtime: [18 * 60 + 50, 19 * 60 + 40],
    wakings: [0, 1],
    wakingAwake: [10, 30],
    windows: [150, 210],
    napLength: [50, 100],
    earlyWaking: 0.15,
    earlyAwake: [15, 35],
    backToSleep: 0.1,
    catnap: 0.1,
  },
  {
    name: '18 months',
    birthDate: '2025-03-15',
    wake: [6 * 60 + 20, 7 * 60 + 10],
    bedtime: [19 * 60 + 10, 19 * 60 + 50],
    wakings: [0, 1],
    wakingAwake: [10, 25],
    windows: [300, 330],
    napLength: [120, 150],
    earlyWaking: 0.1,
    earlyAwake: [15, 30],
    backToSleep: 0,
    catnap: 0,
  },
];

/** A seeded pseudo-random number in [0, 1) (mulberry32), so a fixture is the same on every run. */
function random(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * `days` made-up days of a profile from 1 September 2026, with each day's real wake and bedtime. Every
 * sleep is logged; nothing about them comes from a real child.
 */
export function profileDays(profile: Profile, days = 28, seed = 1): { sleeps: Sleep[]; truth: TruthDay[] } {
  const roll = random(seed);
  const between = ([min, max]: Range) => Math.round(min + roll() * (max - min));
  const at = (day: number, minutes: number) => new Date(2026, 8, day, 0, minutes);
  const usualWake = (profile.wake[0] + profile.wake[1]) / 2;
  const mornings = Array.from({ length: days + 1 }, (_, index) => {
    const early = roll() < profile.backToSleep;
    return { early, wake: at(index + 1, early ? usualWake - between([40, 100]) : between(profile.wake)) };
  });
  const sleeps: Sleep[] = [];
  const add = (start: Date, end: Date) => sleeps.push(sleep({ start: start.toISOString(), end: end.toISOString() }));
  const truth: TruthDay[] = [];
  for (let index = 0; index < days; index++) {
    const { early, wake } = mornings[index]!;
    const bedtime = at(index + 1, between(profile.bedtime));
    let awakeFrom = wake;
    let first = true;
    for (;;) {
      const window = first && early ? between([95, 115]) : between(profile.windows);
      const start = new Date(awakeFrom.getTime() + window * 60_000);
      const length = first && early ? between([100, 140]) : between(profile.napLength);
      const end = new Date(start.getTime() + length * 60_000);
      if (end.getTime() + profile.windows[0] * 60_000 > bedtime.getTime()) break;
      add(start, end);
      awakeFrom = end;
      first = false;
    }
    const catnapStart = new Date(bedtime.getTime() - between([90, 150]) * 60_000);
    if (roll() < profile.catnap && catnapStart.getTime() - awakeFrom.getTime() >= 45 * 60_000) {
      add(catnapStart, new Date(catnapStart.getTime() + between([20, 30]) * 60_000));
    }
    const nextWake = mornings[index + 1]!.wake;
    const gaps = nightGaps(profile, bedtime, nextWake, between, roll);
    let from = bedtime;
    for (const [wakes, sleepsAgain] of gaps) {
      add(from, wakes);
      from = sleepsAgain;
    }
    add(from, nextWake);
    truth.push({ day: at(index + 1, 0), wake, bedtime });
  }
  return { sleeps, truth };
}

/** The night's wakings, in order, as [woke, asleep again]. */
function nightGaps(profile: Profile, bedtime: Date, wake: Date, between: (range: Range) => number, roll: () => number): [Date, Date][] {
  const night = wake.getTime() - bedtime.getTime();
  const count = between(profile.wakings);
  const gaps: [Date, Date][] = Array.from({ length: count }, (_, index) => {
    const woke = bedtime.getTime() + (night * (index + 1)) / (count + 2);
    return [new Date(woke), new Date(woke + between(profile.wakingAwake) * 60_000)];
  });
  if (roll() < profile.earlyWaking) {
    const woke = wake.getTime() - between([60, 150]) * 60_000;
    const last = gaps.at(-1);
    if (!last || last[1].getTime() < woke - 30 * 60_000) gaps.push([new Date(woke), new Date(woke + between(profile.earlyAwake) * 60_000)]);
  }
  return gaps;
}
