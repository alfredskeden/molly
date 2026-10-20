import { describe, expect, it } from 'vitest';

import { sleep } from '../test/fixtures';
import { DAY_PLAN_TUNING, dayPlan, parseSkip, skipNote, type Skip } from './day-plan';
import { DEFAULT_NAP_WINDOW } from './nap';
import { nextSleep } from './next-sleep';

const napWindow = DEFAULT_NAP_WINDOW;
const noTimer = null;
const noSkips: Skip[] = [];
/** Four months old all through September 2026: the 3–5 month band, 1:15–2:30 awake (first 1:15–2:05, last 1:40–2:30). */
const born = '2026-05-10';
const on = (day: number, hours: number, minutes = 0) => new Date(2026, 8, day, hours, minutes);
const night = (day: number, bed: [number, number], wake: [number, number]) =>
  sleep({ start: on(day, ...bed).toISOString(), end: on(day + 1, ...wake).toISOString(), nap: false });
const nap = (day: number, from: [number, number], to: [number, number]) =>
  sleep({ start: on(day, ...from).toISOString(), end: on(day, ...to).toISOString(), nap: true });
/** The 10 days up to the 19th: woke 06:40, napped 08:40–09:40, bed 19:30. */
const tenPastDays = Array.from({ length: 10 }, (_, index) => [night(18 - index, [19, 30], [6, 40]), nap(19 - index, [8, 40], [9, 40])]).flat();
/** The same 10 days with two more naps, 12:30–13:30 and 15:30–16:15. */
const threeNapDays = [
  ...tenPastDays,
  ...Array.from({ length: 10 }, (_, index) => [nap(19 - index, [12, 30], [13, 30]), nap(19 - index, [15, 30], [16, 15])]).flat(),
];
/** Woke at 06:40 on the 20th. */
const thisMorning = night(19, [19, 30], [6, 40]);
const sleepTimer = (start: Date) => ({ id: 1, child: 1, name: 'molly:sleep', start: start.toISOString(), duration: '', user: 1 });
const windowOf = (sleep: { start: Date; end: Date }) => ({ start: sleep.start, end: sleep.end });

describe('no day plan', () => {
  it.each([
    ['no sleep is logged', [], noTimer, born, on(20, 8)],
    ['the bedtime sleep runs', [thisMorning, nap(20, [15, 45], [17, 15])], sleepTimer(on(20, 19, 30)), born, on(20, 19, 40)],
    ['a sleep runs that started with bedtime next', [thisMorning, nap(20, [15, 45], [17, 15])], sleepTimer(on(20, 18, 30)), born, on(20, 18, 40)],
    ['it is night', [thisMorning, nap(20, [15, 45], [17, 15]), sleep({ start: on(20, 19, 30).toISOString(), end: on(20, 20, 15).toISOString(), nap: false })], noTimer, born, on(20, 20, 30)],
    ['the child has no birth date', [thisMorning], noTimer, null, on(20, 7, 30)],
    ['the child is outside the age guide', [thisMorning], noTimer, '2023-09-01', on(20, 7, 30)],
    ['the last sleep ended over 6 hours ago', [thisMorning], noTimer, '2024-09-01', on(20, 12, 41)],
    ['the next window ended over 45 minutes ago', [thisMorning], noTimer, born, on(20, 9, 31)],
  ])('is made when %s', (_case, sleeps, running, birthDate, now) => {
    // Given
    const inputs = { sleeps, running, birthDate, now };

    // When
    const plan = dayPlan(inputs.sleeps, inputs.running, inputs.birthDate, napWindow, noSkips, inputs.now);

    // Then
    expect(plan).toEqual([]);
  });
});

describe('the day plan with bedtime next', () => {
  it('is bedtime alone, as the next sleep shows it', () => {
    // Given
    const sleeps = [thisMorning, nap(20, [15, 45], [17, 15])];
    const now = on(20, 17, 30);

    // When
    const plan = dayPlan(sleeps, noTimer, born, napWindow, noSkips, now);

    // Then
    expect(plan).toEqual([{ ...nextSleep(sleeps, noTimer, born, napWindow, now), skipped: false }]);
    expect(plan[0]).toMatchObject({ kind: 'bedtime', start: on(20, 18, 55), end: on(20, 19, 45) });
  });
});

describe('the whole day ahead', () => {
  it('chains each nap from the one before, assumed to start mid-window and last 45 minutes, until bedtime', () => {
    // Given
    const sleeps = [thisMorning];
    const now = on(20, 7, 0);

    // When
    const plan = dayPlan(sleeps, noTimer, born, napWindow, noSkips, now);

    // Then
    expect(plan.map(windowOf)).toEqual([
      { start: on(20, 7, 55), end: on(20, 8, 45) },
      { start: on(20, 10, 20), end: on(20, 11, 35) },
      { start: on(20, 12, 58), end: on(20, 14, 13) },
      { start: on(20, 15, 36), end: on(20, 16, 51) },
      { start: on(20, 18, 39), end: on(20, 19, 29) },
    ]);
    expect(plan.map((sleep) => sleep.kind)).toEqual(['nap', 'nap', 'nap', 'nap', 'bedtime']);
  });

  it("assumes a nap lasts that slot's median length on past days", () => {
    // Given
    const sleeps = [...threeNapDays, thisMorning];
    const now = on(20, 7, 0);

    // When
    const plan = dayPlan(sleeps, noTimer, born, napWindow, noSkips, now);

    // Then
    // The first nap is taken to end at 09:40 (08:40 + 60 min), and the second window counts from there.
    expect(plan.slice(0, 2).map(windowOf)).toEqual([
      { start: on(20, 8, 20), end: on(20, 9, 0) },
      { start: on(20, 12, 10), end: on(20, 12, 50) },
    ]);
  });

  it('goes to bedtime once the day has as many naps as it usually does', () => {
    // Given
    // One nap a day for ten days: the age guide alone would plan three more.
    const sleeps = [...tenPastDays, thisMorning];
    const now = on(20, 7, 0);

    // When
    const plan = dayPlan(sleeps, noTimer, born, napWindow, noSkips, now);

    // Then
    // Bedtime counts from the nap's assumed end (09:40), as long as the baby stays up on past evenings (9h 50m ± 20m).
    expect(plan.map((sleep) => ({ ...windowOf(sleep), kind: sleep.kind }))).toEqual([
      { start: on(20, 8, 20), end: on(20, 9, 0), kind: 'nap' },
      { start: on(20, 19, 10), end: on(20, 19, 50), kind: 'bedtime' },
    ]);
  });

  it('never has that bedtime start more than an hour before the usual one', () => {
    // Given
    // Two naps a day (08:40–09:40, 17:30–18:30), bed 19:30. Up at 05:10 today, the chain runs early.
    const twoNapDays = [
      ...tenPastDays,
      ...Array.from({ length: 10 }, (_, index) => nap(19 - index, [17, 30], [18, 30])),
    ];
    const sleeps = [...twoNapDays, night(19, [19, 30], [5, 10])];
    const now = on(20, 5, 30);

    // When
    const plan = dayPlan(sleeps, noTimer, born, napWindow, noSkips, now);

    // Then
    // Without the limit: 17:40, 40 min after the second nap's assumed end. The usual bedtime is 19:30.
    expect(plan.map((sleep) => sleep.kind)).toEqual(['nap', 'nap', 'bedtime']);
    expect(windowOf(plan[2]!)).toEqual({ start: on(20, 18, 30), end: on(20, 19, 10) });
  });

  it('goes to bedtime from the first planned sleep once the day already has its usual naps', () => {
    // Given
    const sleeps = [...tenPastDays, thisMorning, nap(20, [8, 40], [9, 40])];
    const now = on(20, 10, 0);

    // When
    const plan = dayPlan(sleeps, noTimer, born, napWindow, noSkips, now);

    // Then
    expect(plan).toEqual([{ ...nextSleep(sleeps, noTimer, born, napWindow, now), skipped: false }]);
    expect(plan[0]).toMatchObject({ kind: 'bedtime', start: on(20, 19, 10), end: on(20, 19, 50) });
  });

  it('still plans a fourth nap for a child who usually takes four', () => {
    // Given
    const fourNapDays = [
      ...threeNapDays,
      ...Array.from({ length: 10 }, (_, index) => nap(19 - index, [17, 30], [18, 0])),
    ];
    const sleeps = [...fourNapDays, thisMorning, nap(20, [8, 40], [9, 40]), nap(20, [12, 30], [13, 30]), nap(20, [15, 30], [16, 15])];
    const now = on(20, 16, 30);

    // When
    const plan = dayPlan(sleeps, noTimer, born, napWindow, noSkips, now);

    // Then
    expect(plan.map((sleep) => sleep.kind)).toEqual(['nap', 'bedtime']);
  });

  it('never has bedtime start more than an hour after the usual one', () => {
    // Given
    // Three naps a day, the last ending 16:15, bed 19:30: up 3h 15m before bed. Today the last nap ran to 18:30.
    const sleeps = [...threeNapDays, thisMorning, nap(20, [8, 40], [9, 40]), nap(20, [12, 30], [13, 30]), nap(20, [16, 30], [18, 30])];
    const now = on(20, 18, 45);

    // When
    const plan = dayPlan(sleeps, noTimer, born, napWindow, noSkips, now);

    // Then
    // Without the limit: 21:25, 2h 55m after the wake.
    expect(plan.map(windowOf)).toEqual([{ start: on(20, 20, 30), end: on(20, 21, 10) }]);
  });

  it('keeps that limit when some past days logged no bedtime, only a sleep after a night waking', () => {
    // Given
    // On 4 of the 10 days the 19:30 bedtime went unlogged; a sleep 02:20–06:40 was.
    const gaps = threeNapDays.filter((entry) => !(entry.nap === false && new Date(entry.start).getDate() <= 13));
    const wakings = Array.from({ length: 4 }, (_, index) =>
      sleep({ start: on(11 + index, 26, 20).toISOString(), end: on(12 + index, 6, 40).toISOString(), nap: false }),
    );
    const sleeps = [...gaps, ...wakings, thisMorning, nap(20, [8, 40], [9, 40]), nap(20, [12, 30], [13, 30]), nap(20, [16, 30], [18, 30])];
    const now = on(20, 18, 45);

    // When
    const plan = dayPlan(sleeps, noTimer, born, napWindow, noSkips, now);

    // Then
    expect(plan).toMatchObject([{ kind: 'bedtime' }]);
    expect(plan[0]!.start <= on(20, 20, 30)).toBe(true);
  });

  it('plans naps by the age guide while fewer than 3 past days had a logged bedtime', () => {
    // Given
    const sleeps = [...tenPastDays.slice(-4), thisMorning];
    const now = on(20, 7, 0);

    // When
    const plan = dayPlan(sleeps, noTimer, born, napWindow, noSkips, now);

    // Then
    expect(plan.filter((sleep) => sleep.kind === 'nap').length).toBeGreaterThan(1);
  });

  it('moves every later sleep when a nap is logged', () => {
    // Given
    const sleeps = [thisMorning, nap(20, [8, 0], [9, 0])];
    const now = on(20, 9, 30);

    // When
    const plan = dayPlan(sleeps, noTimer, born, napWindow, noSkips, now);

    // Then
    expect(plan.slice(0, 2).map(windowOf)).toEqual([
      { start: on(20, 10, 15), end: on(20, 11, 30) },
      { start: on(20, 12, 53), end: on(20, 14, 8) },
    ]);
  });
});

describe('the day plan while a nap runs', () => {
  it("is the plan for that nap ending at its slot's usual length", () => {
    // Given
    const sleeps = [...threeNapDays, thisMorning, nap(20, [8, 40], [9, 40])];
    const now = on(20, 12, 50);

    // When
    const plan = dayPlan(sleeps, sleepTimer(on(20, 12, 30)), born, napWindow, noSkips, now);

    // Then
    expect(plan).toEqual(dayPlan([...sleeps, nap(20, [12, 30], [13, 30])], noTimer, born, napWindow, noSkips, now));
    expect(plan.length).toBeGreaterThan(1);
  });

  it('is the plan for that nap ending now, once it runs longer than usual', () => {
    // Given
    const sleeps = [thisMorning];
    const now = on(20, 9, 0);

    // When
    const plan = dayPlan(sleeps, sleepTimer(on(20, 8, 0)), born, napWindow, noSkips, now);

    // Then
    expect(plan).toEqual(dayPlan([...sleeps, nap(20, [8, 0], [9, 0])], noTimer, born, napWindow, noSkips, now));
  });

  it('starts with the sleep `nextSleep` shows', () => {
    // Given
    const running = sleepTimer(on(20, 8, 0));
    const now = on(20, 8, 20);

    // When
    const plan = dayPlan([thisMorning], running, born, napWindow, noSkips, now);

    // Then
    expect(plan[0]).toEqual({ ...nextSleep([thisMorning], running, born, napWindow, now), skipped: false });
  });

  it('drops skips tapped before the nap started', () => {
    // Given
    const sleeps = [thisMorning, nap(20, [13, 30], [14, 30])];
    const skips = [{ at: on(20, 15, 30), start: on(20, 15, 45), end: on(20, 17, 0) }];
    const now = on(20, 16, 0);

    // When
    const plan = dayPlan(sleeps, sleepTimer(on(20, 15, 50)), born, napWindow, skips, now);

    // Then
    expect(plan.length).toBeGreaterThan(0);
    expect(plan.every((sleep) => !sleep.skipped)).toBe(true);
  });

  it('follows a nap length tuned for the replay', () => {
    // Given
    const tuning = { ...DAY_PLAN_TUNING, napLength: 30 };
    const now = on(20, 8, 10);

    // When
    const plan = dayPlan([thisMorning], sleepTimer(on(20, 8, 0)), born, napWindow, noSkips, now, tuning);

    // Then
    expect(plan[0]?.anchor).toEqual(on(20, 8, 30));
  });
});

describe('the day plan around a clock change', () => {
  it('counts the night across the change in real time and plans the day on the clock', () => {
    // Given
    const october = (day: number, hours: number, minutes = 0) => new Date(2026, 9, day, hours, minutes);
    const lastNight = sleep({ start: october(24, 19, 30).toISOString(), end: october(25, 6, 40).toISOString(), nap: false });
    // Five months old by then: the 5–7 month band, 2:00–3:00 awake (first 2:00–2:40, last 2:20–3:00).
    const now = october(25, 7, 0);

    // When
    const plan = dayPlan([lastNight], noTimer, born, napWindow, noSkips, now);

    // Then
    expect(windowOf(plan[0]!)).toEqual({ start: october(25, 8, 40), end: october(25, 9, 20) });
    expect(plan.at(-1)).toMatchObject({ kind: 'bedtime', start: october(25, 18, 35), end: october(25, 19, 15) });
  });
});

describe('a skip note', () => {
  it("says which nap window was skipped and reads back as the same skip on the note's day", () => {
    // Given
    const skip = { at: on(26, 14, 55), start: on(26, 15, 5), end: on(26, 15, 45) };

    // When
    const note = skipNote(skip);

    // Then
    expect(note).toBe('Skipped nap 15:05–15:45');
    expect(parseSkip({ time: skip.at.toISOString(), note })).toEqual(skip);
  });

  it.each([
    ['any other note', 'Teething, fussy all afternoon'],
    ['a time that is no clock time', 'Skipped nap 25:10–26:00'],
    ['a window that ends before it starts', 'Skipped nap 15:45–15:05'],
  ])('is ignored for %s', (_case, text) => {
    // Given
    const note = { time: on(26, 14, 55).toISOString(), note: text };

    // When
    const skip = parseSkip(note);

    // Then
    expect(skip).toBeNull();
  });

  it('reads its times as the clock on the day of a clock change', () => {
    // Given
    const october = (hours: number, minutes: number) => new Date(2026, 9, 25, hours, minutes);
    const note = { time: october(14, 55).toISOString(), note: 'Skipped nap 15:05–15:45' };

    // When
    const skip = parseSkip(note);

    // Then
    expect(skip).toEqual({ at: october(14, 55), start: october(15, 5), end: october(15, 45) });
  });
});

describe('a skipped nap', () => {
  /** Napped 13:30–14:30: the plan is a nap 15:45–17:00, then bedtime 18:48–19:38. */
  const afternoon = [thisMorning, nap(20, [13, 30], [14, 30])];
  const lastNapSkipped = { at: on(20, 15, 30), start: on(20, 15, 45), end: on(20, 17, 0) };

  it("stays in the plan, marked skipped, and bedtime moves earlier by the nap's usual length", () => {
    // Given
    const skips = [lastNapSkipped];
    const now = on(20, 15, 30);

    // When
    const plan = dayPlan(afternoon, noTimer, born, napWindow, skips, now);

    // Then
    expect(plan.map((sleep) => ({ ...windowOf(sleep), kind: sleep.kind, skipped: sleep.skipped }))).toEqual([
      { start: on(20, 15, 45), end: on(20, 17, 0), kind: 'nap', skipped: true },
      { start: on(20, 18, 3), end: on(20, 18, 53), kind: 'bedtime', skipped: false },
    ]);
  });

  it('keeps bedtime in the plan once the skipped window is long past', () => {
    // Given
    const skips = [lastNapSkipped];
    const now = on(20, 17, 50);

    // When
    const plan = dayPlan(afternoon, noTimer, born, napWindow, skips, now);

    // Then
    expect(plan.map((sleep) => sleep.skipped)).toEqual([true, false]);
    expect(plan[1]).toMatchObject({ kind: 'bedtime', start: on(20, 18, 3), state: 'before' });
  });

  it('opens the next nap 30 minutes after an earlier skipped window, as wide, and chains the rest from it', () => {
    // Given
    const skips = [{ at: on(20, 7, 30), start: on(20, 7, 55), end: on(20, 8, 45) }];
    const now = on(20, 7, 30);

    // When
    const plan = dayPlan([thisMorning], noTimer, born, napWindow, skips, now);

    // Then
    expect(plan.map((sleep) => ({ ...windowOf(sleep), skipped: sleep.skipped }))).toEqual([
      { start: on(20, 7, 55), end: on(20, 8, 45), skipped: true },
      { start: on(20, 9, 15), end: on(20, 10, 5), skipped: false },
      { start: on(20, 11, 40), end: on(20, 12, 55), skipped: false },
      { start: on(20, 14, 18), end: on(20, 15, 33), skipped: false },
      { start: on(20, 16, 56), end: on(20, 18, 11), skipped: false },
      { start: on(20, 19, 14), end: on(20, 20, 4), skipped: false },
    ]);
  });

  it('takes the next unskipped nap for each skip in turn, and moves bedtime at most 60 minutes earlier', () => {
    // Given
    const skips = [
      { at: on(20, 7, 25), start: on(20, 9, 15), end: on(20, 10, 5) },
      { at: on(20, 7, 20), start: on(20, 7, 55), end: on(20, 8, 45) },
    ];
    const now = on(20, 7, 30);

    // When
    const plan = dayPlan([thisMorning], noTimer, born, napWindow, skips, now);

    // Then
    expect(plan.map((sleep) => ({ ...windowOf(sleep), skipped: sleep.skipped }))).toEqual([
      { start: on(20, 7, 55), end: on(20, 8, 45), skipped: true },
      { start: on(20, 9, 15), end: on(20, 10, 5), skipped: true },
      { start: on(20, 10, 35), end: on(20, 11, 25), skipped: false },
      { start: on(20, 13, 0), end: on(20, 14, 15), skipped: false },
      { start: on(20, 15, 38), end: on(20, 16, 53), skipped: false },
      { start: on(20, 17, 41), end: on(20, 18, 31), skipped: false },
    ]);
  });

  it.each([60, 75])('moves bedtime exactly 60 minutes earlier for a usual nap of %i minutes', (napLength) => {
    // Given
    const tuning = { ...DAY_PLAN_TUNING, napLength };
    const now = on(20, 15, 30);
    const unskipped = dayPlan(afternoon, noTimer, born, napWindow, noSkips, now, tuning);

    // When
    const plan = dayPlan(afternoon, noTimer, born, napWindow, [lastNapSkipped], now, tuning);

    // Then
    expect(plan[1]!.start.getTime()).toBe(unskipped[1]!.start.getTime() - 60 * 60 * 1000);
  });

  it('never moves bedtime before the last wake plus the shortest last window of the age guide', () => {
    // Given
    // Each day: a long nap to 17:40, a nap 18:00–19:00 and bed at 20:00, so the plan runs close to the wake.
    const pastDays = Array.from({ length: 10 }, (_, index) => [
      night(18 - index, [20, 0], [6, 40]),
      nap(19 - index, [9, 0], [17, 40]),
      nap(19 - index, [18, 0], [19, 0]),
    ]).flat();
    const sleeps = [...pastDays, night(19, [20, 0], [6, 40]), nap(20, [9, 0], [17, 40])];
    const skips = [{ at: on(20, 17, 45), start: on(20, 17, 40), end: on(20, 18, 20) }];
    const now = on(20, 17, 45);
    const unskipped = dayPlan(sleeps, noTimer, born, napWindow, noSkips, now);

    // When
    const plan = dayPlan(sleeps, noTimer, born, napWindow, skips, now);

    // Then
    expect(unskipped[1]).toMatchObject({ kind: 'bedtime', start: on(20, 19, 40), end: on(20, 20, 20) });
    expect(plan[1]).toMatchObject({ kind: 'bedtime', start: on(20, 19, 20), end: on(20, 20, 0) });
  });

  describe('after a sleep since the skip', () => {
    const firstNapSkipped = { at: on(20, 7, 30), start: on(20, 7, 55), end: on(20, 8, 45) };

    it('still applies after a catnap under 15 minutes', () => {
      // Given
      const sleeps = [thisMorning, nap(20, [9, 0], [9, 14])];
      const now = on(20, 9, 20);

      // When
      const plan = dayPlan(sleeps, noTimer, born, napWindow, [firstNapSkipped], now);

      // Then
      expect(plan.slice(0, 2).map((sleep) => ({ ...windowOf(sleep), skipped: sleep.skipped }))).toEqual([
        { start: on(20, 7, 55), end: on(20, 8, 45), skipped: true },
        { start: on(20, 9, 15), end: on(20, 10, 5), skipped: false },
      ]);
    });

    it('is over once a sleep of exactly 15 minutes has ended', () => {
      // Given
      const sleeps = [thisMorning, nap(20, [9, 0], [9, 15])];
      const now = on(20, 9, 20);

      // When
      const plan = dayPlan(sleeps, noTimer, born, napWindow, [firstNapSkipped], now);

      // Then
      expect(plan.every((sleep) => !sleep.skipped)).toBe(true);
      expect(windowOf(plan[0]!)).toEqual({ start: on(20, 10, 30), end: on(20, 11, 45) });
    });

    it('is over when the baby slept inside the skipped window after all: that was the nap', () => {
      // Given
      const sleeps = [thisMorning, nap(20, [8, 0], [8, 40])];
      const now = on(20, 8, 50);

      // When
      const plan = dayPlan(sleeps, noTimer, born, napWindow, [firstNapSkipped], now);

      // Then
      expect(plan.every((sleep) => !sleep.skipped)).toBe(true);
      expect(windowOf(plan[0]!)).toEqual({ start: on(20, 9, 55), end: on(20, 11, 10) });
    });
  });

  it('changes nothing when bedtime is next: bedtime is never skipped', () => {
    // Given
    const sleeps = [thisMorning, nap(20, [15, 45], [17, 15])];
    const skips = [{ at: on(20, 17, 20), start: on(20, 17, 30), end: on(20, 18, 0) }];
    const now = on(20, 17, 30);

    // When
    const plan = dayPlan(sleeps, noTimer, born, napWindow, skips, now);

    // Then
    expect(plan).toEqual(dayPlan(sleeps, noTimer, born, napWindow, noSkips, now));
    expect(plan).toMatchObject([{ kind: 'bedtime', start: on(20, 18, 55), skipped: false }]);
  });
});

describe('bedtime found by when sleeps happened, not by their saved flag', () => {
  /** Five months old in October 2026: the 5–7 month band. */
  const fiveMonths = '2026-04-27';
  const oct = (day: number, hours: number, minutes = 0) => new Date(2026, 9, day, hours, minutes);
  const logged = (start: Date, end: Date, flag: boolean) =>
    sleep({ start: start.toISOString(), end: end.toISOString(), nap: flag });
  /**
   * Two weeks to Oct 3: naps 09:30–10:30, 12:30–13:30, 15:30–16:15, bed at 18:45 (two days in three)
   * or 19:15 until 02:00, back to sleep 02:20–07:30. An 18:45 bedtime starts inside the nap window,
   * so it was saved as a nap.
   */
  const twoWeeks = Array.from({ length: 14 }, (_, index) => {
    const day = 3 - index;
    const bed: [number, number] = index % 3 === 2 ? [19, 15] : [18, 45];
    return [
      logged(oct(day, 9, 30), oct(day, 10, 30), true),
      logged(oct(day, 12, 30), oct(day, 13, 30), true),
      logged(oct(day, 15, 30), oct(day, 16, 15), true),
      logged(oct(day, ...bed), oct(day + 1, 2, 0), bed[0] < 19),
      logged(oct(day + 1, 2, 20), oct(day + 1, 7, 30), false),
    ];
  }).flat();
  /** Today, Oct 4: woke 08:30 (last night ran on), napped 10:13–10:53 and 12:49–13:24, a nap running since 15:26. */
  const today = [
    ...twoWeeks.filter((entry) => Date.parse(entry.start) < oct(4, 2, 0).getTime()),
    logged(oct(4, 2, 20), oct(4, 8, 30), false),
    logged(oct(4, 10, 13), oct(4, 10, 53), true),
    logged(oct(4, 12, 49), oct(4, 13, 24), true),
  ];
  const napRunning = sleepTimer(oct(4, 15, 26));
  const now = oct(4, 16, 4);

  it('plans an evening bedtime next, no fourth nap and nothing after midnight', () => {
    // Given
    const sleeps = today;

    // When
    const plan = dayPlan(sleeps, napRunning, fiveMonths, napWindow, noSkips, now);

    // Then
    // Bedtime next (3 naps usual), within an hour of the usual 18:45 – 19:15.
    expect(plan).toMatchObject([{ kind: 'bedtime' }]);
    expect(plan[0]!.start >= oct(4, 17, 45) && plan[0]!.start <= oct(4, 20, 15)).toBe(true);
  });

  it('plans bedtime after the third nap with clean logs too, not a fourth nap', () => {
    // Given
    const clean = today.map((entry) =>
      Date.parse(entry.start) < oct(4, 0, 0).getTime() && new Date(entry.start).getHours() === 18
        ? { ...entry, start: new Date(Date.parse(entry.start) + 30 * 60 * 1000).toISOString(), nap: false }
        : entry,
    );

    // When
    const plan = dayPlan(clean, napRunning, fiveMonths, napWindow, noSkips, now);

    // Then
    expect(plan).toMatchObject([{ kind: 'bedtime' }]);
    expect(plan[0]!.start >= oct(4, 18, 15) && plan[0]!.start <= oct(4, 20, 15)).toBe(true);
  });

  it('starts with the sleep `nextSleep` shows', () => {
    // Given
    const sleeps = today;

    // When
    const plan = dayPlan(sleeps, napRunning, fiveMonths, napWindow, noSkips, now);

    // Then
    expect(plan[0]).toEqual({ ...nextSleep(sleeps, napRunning, fiveMonths, napWindow, now), skipped: false });
  });

  it('gives the same plan with every saved flag flipped', () => {
    // Given
    const flipped = today.map((entry) => ({ ...entry, nap: !entry.nap }));

    // When
    const plan = dayPlan(flipped, napRunning, fiveMonths, napWindow, noSkips, now);

    // Then
    expect(plan).toEqual(dayPlan(today, napRunning, fiveMonths, napWindow, noSkips, now));
  });
});

describe('short naps', () => {
  /** Three naps usual (60, 60 and 45 min), bed 19:30. */
  const usualLengths = { ...DAY_PLAN_TUNING, shortNapShare: 0 };
  const now = on(20, 16, 30);
  const bedtimeOf = (plan: { start: Date }[]) => plan.at(-1)!.start.getTime();
  const minutes = (count: number) => count * 60 * 1000;

  it('move bedtime earlier by half of how much shorter they were than usual for their slots', () => {
    // Given
    // 40 and 40 min where 60 and 60 is usual: 40 min short.
    const sleeps = [...threeNapDays, thisMorning, nap(20, [8, 40], [9, 20]), nap(20, [12, 30], [13, 10]), nap(20, [15, 30], [16, 15])];
    const unmoved = dayPlan(sleeps, noTimer, born, napWindow, noSkips, now, usualLengths);

    // When
    const plan = dayPlan(sleeps, noTimer, born, napWindow, noSkips, now);

    // Then
    expect(bedtimeOf(plan)).toBe(bedtimeOf(unmoved) - minutes(20));
  });

  it('move the bedtime `nextSleep` shows as well', () => {
    // Given
    const sleeps = [...threeNapDays, thisMorning, nap(20, [8, 40], [9, 20]), nap(20, [12, 30], [13, 10]), nap(20, [15, 30], [16, 15])];

    // When
    const plan = dayPlan(sleeps, noTimer, born, napWindow, noSkips, now);

    // Then
    expect(plan).toEqual([{ ...nextSleep(sleeps, noTimer, born, napWindow, now), skipped: false }]);
  });

  it('move nothing when the naps were at least as long as usual in all', () => {
    // Given
    // 20 min short, then 20 min long.
    const sleeps = [...threeNapDays, thisMorning, nap(20, [8, 40], [9, 20]), nap(20, [12, 30], [13, 50]), nap(20, [15, 30], [16, 15])];
    const unmoved = dayPlan(sleeps, noTimer, born, napWindow, noSkips, now, usualLengths);

    // When
    const plan = dayPlan(sleeps, noTimer, born, napWindow, noSkips, now);

    // Then
    expect(bedtimeOf(plan)).toBe(bedtimeOf(unmoved));
  });

  it('count nothing for a slot without naps on past days', () => {
    // Given
    // One nap a day usual; today a second, short one at 12:00.
    const sleeps = [...tenPastDays, thisMorning, nap(20, [8, 40], [9, 40]), nap(20, [12, 0], [12, 20])];
    const at = on(20, 12, 30);
    const unmoved = dayPlan(sleeps, noTimer, born, napWindow, noSkips, at, usualLengths);

    // When
    const plan = dayPlan(sleeps, noTimer, born, napWindow, noSkips, at);

    // Then
    expect(bedtimeOf(plan)).toBe(bedtimeOf(unmoved));
  });

  it('count while a nap runs, the running one at its usual length', () => {
    // Given
    // 40 and 40 min, the third running since 15:30.
    const sleeps = [...threeNapDays, thisMorning, nap(20, [8, 40], [9, 20]), nap(20, [12, 30], [13, 10])];
    const running = sleepTimer(on(20, 15, 30));
    const at = on(20, 15, 50);
    const unmoved = dayPlan(sleeps, running, born, napWindow, noSkips, at, usualLengths);

    // When
    const plan = dayPlan(sleeps, running, born, napWindow, noSkips, at);

    // Then
    expect(bedtimeOf(plan)).toBe(bedtimeOf(unmoved) - minutes(20));
  });

  it('and a skipped nap together move bedtime at most 60 minutes earlier', () => {
    // Given
    // 20 and 20 min where 60 and 60 is usual (40 min earlier), then the third nap (45 min) skipped.
    const sleeps = [...threeNapDays, thisMorning, nap(20, [8, 40], [9, 0]), nap(20, [12, 30], [12, 50])];
    const at = on(20, 13, 0);
    const unmoved = dayPlan(sleeps, noTimer, born, napWindow, noSkips, at, usualLengths);
    const skips = [{ at, start: unmoved[0]!.start, end: unmoved[0]!.end }];

    // When
    const plan = dayPlan(sleeps, noTimer, born, napWindow, skips, at);

    // Then
    expect(bedtimeOf(plan)).toBe(bedtimeOf(unmoved) - minutes(60));
  });
});
