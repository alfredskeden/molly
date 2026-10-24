import { DAY_TUNING, type DayTuning } from '../packages/core/src/day-rhythm';

/**
 * The day tuning with `--set` overrides: a top-level number (`bedtimeCut=60`), a range end
 * (`wakeRange.from=300`) or an age band's field by its first month (`band3.awake=50`).
 */
export function dayTuningFrom(set: string): DayTuning {
  const tuning: DayTuning = structuredClone(DAY_TUNING);
  for (const pair of set.split(',').filter(Boolean)) {
    const [key, value] = pair.split('=') as [string, string];
    if (!applyDayKey(tuning, key, Number(value))) throw new Error(`unknown tuning key ${key}`);
  }
  return tuning;
}

/** Sets one day-tuning key; false if it isn't one. */
export function applyDayKey(tuning: DayTuning, key: string, value: number): boolean {
  const band = /^band(\d+)\.(\w+)$/.exec(key);
  if (band) {
    const found = tuning.bands.find((entry) => entry.fromMonths === Number(band[1]));
    if (!found || !(band[2]! in found)) return false;
    (found as Record<string, unknown>)[band[2]!] = value;
    return true;
  }
  const [top, sub] = key.split('.') as [keyof DayTuning, string | undefined];
  if (!(top in tuning)) return false;
  if (sub === undefined) {
    if (typeof tuning[top] !== 'number') return false;
    (tuning as Record<string, unknown>)[top] = value;
    return true;
  }
  const range = tuning[top] as Record<string, unknown>;
  if (typeof range !== 'object' || !(sub in range)) return false;
  range[sub] = value;
  return true;
}
