import type { Medication } from '@molly/api';

import { minutesPast, type DayRhythm } from './day-rhythm';
import type { DayWindow } from './day-window';
import { newest } from './latest';

const CYCLE_MS = 24 * 60 * 60 * 1000;

/** The baby's 24 hours for one daily dose: from the morning wake to the same time the next day. */
export type VitaminDCycle = { start: Date; end: Date };

/**
 * The cycle `now` is in. Without a logged wake the latest usual wake stands in: `byClock`'s own
 * `wake` is the evening at night, which would start the cycle at bedtime.
 */
export function vitaminDCycle(window: DayWindow, rhythm: DayRhythm, now: Date): VitaminDCycle {
  return vitaminDCycleFrom(window.clock ? latestUsualWake(rhythm, now) : window.wake);
}

/** The cycle that starts at `start`. */
export function vitaminDCycleFrom(start: Date): VitaminDCycle {
  return { start, end: new Date(start.getTime() + CYCLE_MS) };
}

function latestUsualWake(rhythm: DayRhythm, now: Date): Date {
  const today = minutesPast(now, 0, rhythm.wake);
  return today <= now ? today : minutesPast(now, -1, rhythm.wake);
}

/** `Vitamin D` followed by nothing, a space or a digit (`Vitamin D3`, `vitamin d 10 µg`), case ignored. */
export function isVitaminD(name: string): boolean {
  return /^vitamin d(?:$|[\s\d])/i.test(name.trim());
}

/** Due while no Vitamin D was given in the cycle; `last` is the newest dose before its end, for "Last given". */
export function vitaminDStatus(cycle: VitaminDCycle, medication: Medication[]): { due: boolean; last: Medication | null } {
  const doses = medication.filter((entry) => isVitaminD(entry.name) && Date.parse(entry.time) < cycle.end.getTime());
  const due = !doses.some((entry) => Date.parse(entry.time) >= cycle.start.getTime());
  return { due, last: due ? newest(doses) : null };
}
