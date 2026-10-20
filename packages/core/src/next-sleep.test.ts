import { describe, expect, it } from 'vitest';

import { sleep } from '../test/fixtures';
import { DEFAULT_NAP_WINDOW } from './nap';
import { nextSleep } from './next-sleep';

const napWindow = DEFAULT_NAP_WINDOW;
const noTimer = null;
/** Four months old all through September 2026: the 3–5 month band, 1:15–2:30 awake. */
const born = '2026-05-10';
const on = (day: number, hours: number, minutes = 0) => new Date(2026, 8, day, hours, minutes);
const night = (day: number, bed: [number, number], wake: [number, number]) =>
  sleep({ start: on(day, ...bed).toISOString(), end: on(day + 1, ...wake).toISOString(), nap: false });
const nap = (day: number, from: [number, number], to: [number, number]) =>
  sleep({ start: on(day, ...from).toISOString(), end: on(day, ...to).toISOString(), nap: true });
/** A past day: woke at 06:40 and first napped an hour from `firstNap`. */
const pastDay = (day: number, firstNap: [number, number]) => [
  night(day - 1, [19, 30], [6, 40]),
  nap(day, firstNap, [firstNap[0] + 1, firstNap[1]]),
];
const thisMorning = night(19, [19, 30], [6, 40]);
/** The last `count` days up to yesterday, each first napping at `firstNap`. */
const pastDays = (count: number, firstNap: [number, number]) =>
  Array.from({ length: count }, (_, index) => pastDay(19 - index, firstNap)).flat();
const sleepTimer = (start: Date) => ({ id: 1, child: 1, name: 'molly:sleep', start: start.toISOString(), duration: '', user: 1 });

describe('no next-sleep prediction', () => {
  it('is made when no sleep is logged', () => {
    // Given
    const now = on(20, 8);

    // When
    const prediction = nextSleep([], noTimer, born, napWindow, now);

    // Then
    expect(prediction).toBeNull();
  });

  it.each([
    ['no sleep is logged before it', [], born, on(20, 8)],
    ['the child has no birth date', [thisMorning], null, on(20, 8)],
    ['the child is outside the age guide', [thisMorning], '2023-09-01', on(20, 8)],
    ['it started more than 6 hours after the last sleep ended', [thisMorning], '2024-09-01', on(20, 12, 41)],
  ])('is made while a nap runs when %s', (_case, sleeps, birthDate, start) => {
    // Given
    const now = new Date(start.getTime() + 10 * 60 * 1000);

    // When
    const prediction = nextSleep(sleeps, sleepTimer(start), birthDate, napWindow, now);

    // Then
    expect(prediction).toBeNull();
  });

  it('is made at night, once bedtime has been logged', () => {
    // Given
    const bedtimeWaking = sleep({ start: on(20, 19, 30).toISOString(), end: on(20, 20, 15).toISOString(), nap: false });
    const sleeps = [thisMorning, nap(20, [15, 45], [17, 15]), bedtimeWaking];
    const now = on(20, 20, 30);

    // When
    const prediction = nextSleep(sleeps, noTimer, born, napWindow, now);

    // Then
    expect(prediction).toBeNull();
  });

  it('is made for a child without a birth date', () => {
    // Given
    const sleeps = [night(19, [19, 30], [6, 40])];
    const now = on(20, 7, 30);

    // When
    const prediction = nextSleep(sleeps, noTimer, null, napWindow, now);

    // Then
    expect(prediction).toBeNull();
  });

  it('is made more than 6 hours after the last sleep ended', () => {
    // Given
    const toddler = '2024-09-01';
    const sleeps = [night(19, [19, 30], [6, 40])];
    const now = on(20, 12, 41);

    // When
    const prediction = nextSleep(sleeps, noTimer, toddler, napWindow, now);

    // Then
    expect(prediction).toBeNull();
  });

  it('is still made exactly 6 hours after the last sleep ended', () => {
    // Given
    const toddler = '2024-09-01';
    const sleeps = [night(19, [19, 30], [6, 40])];
    const now = on(20, 12, 40);

    // When
    const prediction = nextSleep(sleeps, noTimer, toddler, napWindow, now);

    // Then
    expect(prediction?.state).toBe('past');
  });

  it.each([
    ['under 6 weeks', '2026-08-15'],
    ['36 months or older', '2023-09-01'],
  ])('is made for a child %s, outside the age guide', (_age, birthDate) => {
    // Given
    const sleeps = [night(19, [19, 30], [6, 40])];
    const now = on(20, 7, 30);

    // When
    const prediction = nextSleep(sleeps, noTimer, birthDate, napWindow, now);

    // Then
    expect(prediction).toBeNull();
  });
});

describe('the next sleep from the age guide alone', () => {
  it("is the first window's range from this morning's wake", () => {
    // Given
    const sleeps = [night(19, [19, 30], [6, 40])];
    const now = on(20, 7, 30);

    // When
    const prediction = nextSleep(sleeps, noTimer, born, napWindow, now);

    // Then
    expect(prediction).toEqual({
      kind: 'nap',
      slot: 'first',
      start: on(20, 7, 55),
      end: on(20, 8, 45),
      state: 'before',
      source: 'age',
      anchor: on(20, 6, 40),
      guide: { band: '3–5 months', wake: { min: 75, max: 125 } },
      history: null,
      samples: 0,
    });
  });

  it('is open from the start of the window', () => {
    // Given
    const sleeps = [night(19, [19, 30], [6, 40])];
    const now = on(20, 7, 55);

    // When
    const prediction = nextSleep(sleeps, noTimer, born, napWindow, now);

    // Then
    expect(prediction?.state).toBe('open');
  });

  it('is past from the end of the window', () => {
    // Given
    const sleeps = [night(19, [19, 30], [6, 40])];
    const now = on(20, 8, 45);

    // When
    const prediction = nextSleep(sleeps, noTimer, born, napWindow, now);

    // Then
    expect(prediction?.state).toBe('past');
  });

  it('is still past exactly 45 minutes after the end', () => {
    // Given
    const sleeps = [night(19, [19, 30], [6, 40])];
    const now = on(20, 9, 30);

    // When
    const prediction = nextSleep(sleeps, noTimer, born, napWindow, now);

    // Then
    expect(prediction?.state).toBe('past');
  });

  it('is dropped more than 45 minutes after the end', () => {
    // Given
    const sleeps = [night(19, [19, 30], [6, 40])];
    const now = on(20, 9, 31);

    // When
    const prediction = nextSleep(sleeps, noTimer, born, napWindow, now);

    // Then
    expect(prediction).toBeNull();
  });
});

describe('the next sleep later in the day', () => {
  it('stays on a skipped nap, past its window, instead of predicting the one after', () => {
    // Given
    const sleeps = [thisMorning, nap(20, [8, 0], [9, 0])];
    const now = on(20, 12, 0);

    // When
    const prediction = nextSleep(sleeps, noTimer, born, napWindow, now);

    // Then
    expect(prediction).toMatchObject({ start: on(20, 10, 15), end: on(20, 11, 30), state: 'past' });
  });

  it("is a middle window's range from the end of the last nap", () => {
    // Given
    const sleeps = [night(19, [19, 30], [6, 40]), nap(20, [8, 0], [9, 0])];
    const now = on(20, 9, 30);

    // When
    const prediction = nextSleep(sleeps, noTimer, born, napWindow, now);

    // Then
    expect(prediction).toMatchObject({
      slot: 'middle',
      start: on(20, 10, 15),
      end: on(20, 11, 30),
      anchor: on(20, 9, 0),
      guide: { band: '3–5 months', wake: { min: 75, max: 150 } },
    });
  });

  it('ignores a catnap under 15 minutes: the window still runs from the wake before it', () => {
    // Given
    const sleeps = [night(19, [19, 30], [6, 40]), nap(20, [7, 30], [7, 44])];
    const now = on(20, 7, 50);

    // When
    const prediction = nextSleep(sleeps, noTimer, born, napWindow, now);

    // Then
    expect(prediction).toMatchObject({ start: on(20, 7, 55), end: on(20, 8, 45), anchor: on(20, 6, 40) });
  });

  it('counts a nap of exactly 15 minutes: the next window runs from its end', () => {
    // Given
    const sleeps = [night(19, [19, 30], [6, 40]), nap(20, [7, 30], [7, 45])];
    const now = on(20, 8, 0);

    // When
    const prediction = nextSleep(sleeps, noTimer, born, napWindow, now);

    // Then
    expect(prediction).toMatchObject({ start: on(20, 9, 0), end: on(20, 10, 15), anchor: on(20, 7, 45) });
  });
});

describe("the next sleep from the baby's own history", () => {
  it('stays on the age guide with only 2 days of the same window, but reports them', () => {
    // Given
    const sleeps = [...pastDay(17, [8, 40]), ...pastDay(18, [8, 40]), thisMorning];
    const now = on(20, 7, 30);

    // When
    const prediction = nextSleep(sleeps, noTimer, born, napWindow, now);

    // Then
    expect(prediction).toMatchObject({
      start: on(20, 7, 55),
      end: on(20, 8, 45),
      source: 'age',
      history: { min: 100, max: 140 },
      samples: 2,
    });
  });

  it('leans an eighth of the way to the history with 3 days, to the minute', () => {
    // Given
    const sleeps = [...pastDay(16, [8, 40]), ...pastDay(17, [8, 40]), ...pastDay(18, [8, 40]), thisMorning];
    const now = on(20, 7, 30);

    // When
    const prediction = nextSleep(sleeps, noTimer, born, napWindow, now);

    // Then
    expect(prediction).toMatchObject({ start: on(20, 7, 58), end: on(20, 8, 47), source: 'blend', samples: 3 });
  });

  it('sits halfway between the age guide and the history with 6 days', () => {
    // Given
    const sleeps = [...pastDays(6, [8, 40]), thisMorning];
    const now = on(20, 7, 30);

    // When
    const prediction = nextSleep(sleeps, noTimer, born, napWindow, now);

    // Then
    expect(prediction).toMatchObject({ start: on(20, 8, 8), end: on(20, 8, 53), source: 'blend', samples: 6 });
  });

  it('follows the history alone from 10 days', () => {
    // Given
    const sleeps = [...pastDays(10, [8, 40]), thisMorning];
    const now = on(20, 7, 30);

    // When
    const prediction = nextSleep(sleeps, noTimer, born, napWindow, now);

    // Then
    expect(prediction).toMatchObject({ start: on(20, 8, 20), end: on(20, 9, 0), source: 'history', samples: 10 });
  });

  it('takes the median day, so one odd day does not drag the window', () => {
    // Given
    const sleeps = [...pastDay(16, [8, 40]), ...pastDay(17, [10, 40]), ...pastDay(18, [8, 40]), thisMorning];
    const now = on(20, 7, 30);

    // When
    const prediction = nextSleep(sleeps, noTimer, born, napWindow, now);

    // Then
    expect(prediction?.history).toEqual({ min: 100, max: 140 });
  });

  it('looks back 14 days, no further', () => {
    // Given
    const sleeps = [...pastDay(5, [9, 40]), ...pastDays(14, [8, 40]), thisMorning];
    const now = on(20, 7, 30);

    // When
    const prediction = nextSleep(sleeps, noTimer, born, napWindow, now);

    // Then
    expect(prediction).toMatchObject({ samples: 14, history: { min: 100, max: 140 } });
  });

  it("does not take the next day's nap as a later window of a day whose bedtime was not logged", () => {
    // Given
    const dayWithoutBedtime = [night(17, [19, 30], [6, 40]), nap(18, [8, 40], [9, 40])];
    const nextDayNap = nap(19, [8, 40], [9, 40]);
    const sleeps = [...dayWithoutBedtime, nextDayNap, thisMorning, nap(20, [8, 0], [9, 0])];
    const now = on(20, 9, 30);

    // When
    const prediction = nextSleep(sleeps, noTimer, born, napWindow, now);

    // Then
    expect(prediction).toMatchObject({ samples: 0, history: null });
  });
});

describe('bedtime as the next sleep', () => {
  it("is next when the window would start within an hour of the nap window's end, and uses the last window's range", () => {
    // Given
    const sleeps = [thisMorning, nap(20, [15, 45], [17, 15])];
    const now = on(20, 17, 30);

    // When
    const prediction = nextSleep(sleeps, noTimer, born, napWindow, now);

    // Then
    expect(prediction).toMatchObject({
      kind: 'bedtime',
      slot: 'last',
      start: on(20, 18, 55),
      end: on(20, 19, 45),
      guide: { band: '3–5 months', wake: { min: 100, max: 150 } },
    });
  });

  it('is not next yet when the usual bedtime from 3 logged evenings is later', () => {
    // Given
    const lateEvenings = [night(16, [20, 30], [6, 40]), night(17, [20, 30], [6, 40]), night(18, [20, 30], [6, 40])];
    const sleeps = [...lateEvenings, thisMorning, nap(20, [15, 45], [17, 15])];
    const now = on(20, 17, 30);

    // When
    const prediction = nextSleep(sleeps, noTimer, born, napWindow, now);

    // Then
    expect(prediction?.kind).toBe('nap');
  });

  it('follows how long the baby stayed up before bed on past evenings, not the nap history', () => {
    // Given
    const sleeps = [...pastDays(10, [15, 30]), thisMorning, nap(20, [15, 45], [17, 15])];
    const now = on(20, 17, 30);

    // When
    const prediction = nextSleep(sleeps, noTimer, born, napWindow, now);

    // Then
    expect(prediction).toMatchObject({
      kind: 'bedtime',
      start: on(20, 19, 55),
      end: on(20, 20, 35),
      source: 'history',
      history: { min: 160, max: 200 },
      samples: 10,
    });
  });

  it('waits for a later nap-window end when the device has one and no bedtimes are logged', () => {
    // Given
    const lateNapWindow = { start: '07:00', end: '20:30' };
    const sleeps = [thisMorning, nap(20, [15, 45], [17, 15])];
    const now = on(20, 17, 30);

    // When
    const prediction = nextSleep(sleeps, noTimer, born, lateNapWindow, now);

    // Then
    expect(prediction?.kind).toBe('nap');
  });
});

describe('the next sleep while a nap runs', () => {
  it('is predicted as if the nap ends after 45 minutes, without past naps in its slot', () => {
    // Given
    const now = on(20, 8, 30);

    // When
    const prediction = nextSleep([thisMorning], sleepTimer(on(20, 8, 0)), born, napWindow, now);

    // Then
    expect(prediction).toEqual(nextSleep([thisMorning, nap(20, [8, 0], [8, 45])], noTimer, born, napWindow, now));
    expect(prediction).toMatchObject({ anchor: on(20, 8, 45), slot: 'middle', start: on(20, 10, 0) });
  });

  it("is predicted as if the nap lasts its slot's median length on past days", () => {
    // Given
    const sleeps = [...pastDays(10, [8, 40]), thisMorning];
    const now = on(20, 8, 30);

    // When
    const prediction = nextSleep(sleeps, sleepTimer(on(20, 8, 0)), born, napWindow, now);

    // Then
    expect(prediction).toEqual(nextSleep([...sleeps, nap(20, [8, 0], [9, 0])], noTimer, born, napWindow, now));
  });

  it('stays put while the nap runs no longer than usual', () => {
    // Given
    const running = sleepTimer(on(20, 8, 0));

    // When
    const early = nextSleep([thisMorning], running, born, napWindow, on(20, 8, 5));
    const later = nextSleep([thisMorning], running, born, napWindow, on(20, 8, 45));

    // Then
    expect(early).not.toBeNull();
    expect(later).toEqual(early);
  });

  it('counts from now once the nap runs longer than usual', () => {
    // Given
    const now = on(20, 9, 10);

    // When
    const prediction = nextSleep([thisMorning], sleepTimer(on(20, 8, 0)), born, napWindow, now);

    // Then
    expect(prediction).toEqual(nextSleep([thisMorning, nap(20, [8, 0], [9, 10])], noTimer, born, napWindow, now));
    expect(prediction?.anchor).toEqual(now);
  });

  it('takes the nap as the next slot from its first minute, catnap or not', () => {
    // Given
    const now = on(20, 7, 35);

    // When
    const prediction = nextSleep([thisMorning], sleepTimer(on(20, 7, 30)), born, napWindow, now);

    // Then
    expect(prediction).toMatchObject({ slot: 'middle', anchor: on(20, 8, 15) });
  });

  it('is not made while the bedtime sleep runs into the night', () => {
    // Given
    const sleeps = [thisMorning, nap(20, [15, 45], [17, 15])];
    const now = on(20, 19, 40);

    // When
    const prediction = nextSleep(sleeps, sleepTimer(on(20, 19, 30)), born, napWindow, now);

    // Then
    expect(prediction).toBeNull();
  });

  it('is not made for a sleep that started when bedtime was next, even before the nap window ends', () => {
    // Given
    const sleeps = [thisMorning, nap(20, [15, 45], [17, 15])];
    const now = on(20, 18, 40);

    // When
    const prediction = nextSleep(sleeps, sleepTimer(on(20, 18, 30)), born, napWindow, now);

    // Then
    expect(prediction).toBeNull();
  });

  it('is never dropped for being late while the nap runs long', () => {
    // Given
    const now = on(20, 15, 0);

    // When
    const prediction = nextSleep([thisMorning], sleepTimer(on(20, 8, 0)), born, napWindow, now);

    // Then
    expect(prediction).toMatchObject({ anchor: now, state: 'before' });
  });
});

describe('the next sleep around a clock change', () => {
  it('measures past days across the change in real minutes awake', () => {
    // Given
    const october = (day: number, hours: number, minutes = 0) => new Date(2026, 9, day, hours, minutes);
    const octoberDay = (day: number) => [
      sleep({ start: october(day - 1, 19, 30).toISOString(), end: october(day, 6, 40).toISOString(), nap: false }),
      sleep({ start: october(day, 8, 40).toISOString(), end: october(day, 9, 40).toISOString(), nap: true }),
    ];
    const lastNight = sleep({ start: october(25, 19, 30).toISOString(), end: october(26, 6, 40).toISOString() });
    const sleeps = [...octoberDay(24), ...octoberDay(25), lastNight];
    const now = october(26, 7, 30);

    // When
    const prediction = nextSleep(sleeps, noTimer, born, napWindow, now);

    // Then
    expect(prediction).toMatchObject({ samples: 2, history: { min: 100, max: 140 } });
  });
});
