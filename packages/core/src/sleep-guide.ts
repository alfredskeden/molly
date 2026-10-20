/**
 * Whole months since a `YYYY-MM-DD` birth date. A month counts on the monthly birthday, or on the
 * last day of a month too short to have it (born the 31st: the 30th, or the 28th in February).
 */
export function ageInMonths(birthDate: string, now: Date): number {
  const birth = parseDate(birthDate);
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return now.getDate() < Math.min(birth.getDate(), daysInMonth) ? months - 1 : months;
}

/** Minutes awake between sleeps. */
export type WakeRange = { min: number; max: number };
export type SleepGuide = { band: string; wake: WakeRange };

/**
 * A general range of awake time by age, for a baby with too little history of their own. No study
 * measures wake windows by age: the ranges are pediatrician-reviewed guides (CC = Cleveland Clinic,
 * HB = Huckleberry), checked against measured naps and day sleep (Galland 2012, Iglowstein 2003):
 * (24 h − night − day sleep) ÷ (naps + 1) lands inside or at the top of each range where they give
 * data. Details in plans/implan-next-nap/NOTES.md. Oldest first, so the first match wins.
 */
const BANDS: (SleepGuide & { fromMonths: number })[] = [
  // Common tables as quoted by Canapari; cross-check ≈ 5:10 at 18 mo, 5:20 at 24 mo.
  { fromMonths: 18, band: '18–36 months', wake: { min: 300, max: 360 } },
  // The 2 → 1 nap transition (Iglowstein: the big shift is around 18 mo).
  { fromMonths: 12, band: '12–18 months', wake: { min: 180, max: 270 } },
  // HB 3–4 h, CC 3–6 h; cross-check ≈ 3:20–4:00 at 12 mo.
  { fromMonths: 10, band: '10–12 months', wake: { min: 180, max: 240 } },
  // HB 2:30–3:30, CC 2:30–4:30; cross-check ≈ 3:20 at 9 mo.
  { fromMonths: 7, band: '7–10 months', wake: { min: 150, max: 210 } },
  // HB 2–3 h, CC 2–4 h; cross-check ≈ 3:00 at 6 mo.
  { fromMonths: 5, band: '5–7 months', wake: { min: 120, max: 180 } },
  // CC 1:15–2:30, HB 1:30–2:30; cross-check ≈ 2:30.
  { fromMonths: 3, band: '3–5 months', wake: { min: 75, max: 150 } },
  // CC 1–2 h, HB 0:30–1:30 rising to 1–2 h. Under 6 weeks sleep isn't organised enough to guess.
  { fromMonths: 0, band: '6 weeks–3 months', wake: { min: 60, max: 105 } },
];

const GUIDE_FROM_DAYS = 6 * 7;
/** Half of 3-year-olds no longer nap (Iglowstein 2003). */
const GUIDE_UNTIL_MONTHS = 36;

/** The age band a baby is in, or null outside the ages the guide covers. */
export function sleepGuide(birthDate: string, now: Date): SleepGuide | null {
  const birth = parseDate(birthDate);
  const guideStarts = new Date(birth.getFullYear(), birth.getMonth(), birth.getDate() + GUIDE_FROM_DAYS);
  if (now < guideStarts) return null;
  const months = ageInMonths(birthDate, now);
  if (months >= GUIDE_UNTIL_MONTHS) return null;
  const { band, wake } = BANDS.find((entry) => months >= entry.fromMonths)!;
  return { band, wake };
}

/** Local midnight of a `YYYY-MM-DD` date. */
function parseDate(date: string): Date {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Which wake window of the day: after the morning wake, before bedtime, or one between. */
export type Slot = 'first' | 'middle' | 'last';

/** How much of a band's range the first and last windows of the day use. */
const SLOT_SHARE = 2 / 3;

/**
 * The guides agree the first window of the day is the shortest and the one before bed the longest
 * (no data behind it): the first uses the low part of the band's range, the last the high part.
 */
export function wakeForSlot(wake: WakeRange, slot: Slot, slotShare = SLOT_SHARE): WakeRange {
  const share = (wake.max - wake.min) * slotShare;
  if (slot === 'first') return { min: wake.min, max: wake.min + share };
  if (slot === 'last') return { min: wake.max - share, max: wake.max };
  return wake;
}
