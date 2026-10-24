import { describe, expect, it } from 'vitest';

import { sleep } from '../test/fixtures';
import { ageBand, dayRhythm } from './day-rhythm';
import { DEFAULT_NAP_WINDOW } from './nap';

const napWindow = DEFAULT_NAP_WINDOW;
/** Four months old all through September 2026: the 3–6 month band. */
const born = '2026-05-10';
const on = (day: number, hours: number, minutes = 0) => new Date(2026, 8, day, hours, minutes);
const clock = (hours: number, minutes = 0) => hours * 60 + minutes;
const night = (day: number, bed: [number, number], wake: [number, number]) =>
  sleep({ start: on(day, ...bed).toISOString(), end: on(day + 1, ...wake).toISOString() });
const nap = (day: number, from: [number, number], to: [number, number]) =>
  sleep({ start: on(day, ...from).toISOString(), end: on(day, ...to).toISOString() });
/** Day `day`: woke at `wake` (from a night starting at 21:00 the evening before), first napped 90 min later for an hour. */
const dayFrom = (day: number, wake: [number, number]) => [
  night(day - 1, [21, 0], wake),
  nap(day, [wake[0] + 1, wake[1] + 30], [wake[0] + 2, wake[1] + 30]),
];

describe("the child's rhythm with nothing logged", () => {
  it("is the setting's day: wake at its start, bedtime at its end, no first wake window", () => {
    // Given
    const now = on(20, 12);

    // When
    const rhythm = dayRhythm([], born, napWindow, now);

    // Then
    expect(rhythm).toMatchObject({ wake: clock(7), bedtime: clock(19), firstWindow: null, wakeLearned: false, bedtimeLearned: false });
  });
});

describe("the child's usual wake", () => {
  it('is the median clock time of the past morning wakes', () => {
    // Given
    const sleeps = [...dayFrom(17, [6, 30]), ...dayFrom(18, [7, 0]), ...dayFrom(19, [8, 0]), night(19, [21, 0], [6, 50])];

    // When
    const rhythm = dayRhythm(sleeps, born, napWindow, on(20, 12));

    // Then
    expect(rhythm).toMatchObject({ wake: clock(7), wakeLearned: true });
  });

  it("is the setting's start with fewer than 3 past wakes", () => {
    // Given
    const sleeps = [...dayFrom(18, [6, 30]), ...dayFrom(19, [6, 30])];

    // When
    const rhythm = dayRhythm(sleeps, born, napWindow, on(19, 12));

    // Then
    expect(rhythm).toMatchObject({ wake: clock(7), wakeLearned: false });
  });

  it("isn't learned from an early waking the baby was back asleep from within the age's threshold", () => {
    // Given
    const days = [15, 16, 17, 18].flatMap((day) => [
      night(day - 1, [21, 0], [5, 10]),
      nap(day, [5, 30], [7, 30]),
      nap(day, [9, 0], [10, 0]),
    ]);

    // When
    const rhythm = dayRhythm(days, born, napWindow, on(19, 12));

    // Then
    expect(rhythm.wake).toBe(clock(7, 30));
  });

  it('never comes from a wake after 11:00', () => {
    // Given
    const late = [17, 18, 19].flatMap((day) => [night(day - 1, [21, 0], [11, 30]), nap(day, [13, 0], [14, 0])]);

    // When
    const rhythm = dayRhythm(late, born, napWindow, on(19, 16));

    // Then
    expect(rhythm).toMatchObject({ wake: clock(7), wakeLearned: false });
  });

  it("stays the setting's start under 3 months, when there's no stable wake to learn", () => {
    // Given
    const sleeps = [16, 17, 18, 19].flatMap((day) => dayFrom(day, [6, 0]));

    // When
    const rhythm = dayRhythm(sleeps, '2026-08-01', napWindow, on(19, 12));

    // Then
    expect(rhythm).toMatchObject({ wake: clock(7), wakeLearned: false });
  });

  it("doesn't drift with three weeks of early wakings just inside the morning range", () => {
    // Given
    const days = Array.from({ length: 21 }, (_, index) => index + 1).flatMap((day) => [
      sleep({ start: new Date(2026, 8, day - 1, 21, 0).toISOString(), end: new Date(2026, 8, day, 6, 15).toISOString() }),
      sleep({ start: new Date(2026, 8, day, 6, 45).toISOString(), end: new Date(2026, 8, day, 8, 0).toISOString() }),
      sleep({ start: new Date(2026, 8, day, 9, 30).toISOString(), end: new Date(2026, 8, day, 10, 30).toISOString() }),
    ]);

    // When
    const wakes = Array.from({ length: 21 }, (_, index) => dayRhythm(days, born, napWindow, new Date(2026, 8, index + 2, 12)));

    // Then
    expect(wakes.filter((rhythm) => rhythm.wakeLearned).every((rhythm) => Math.abs(rhythm.wake - clock(8)) <= 30)).toBe(true);
  });
});

describe("the child's usual bedtime", () => {
  it('is the median clock time of past bedtimes', () => {
    // Given
    const sleeps = [
      night(15, [21, 50], [7, 0]),
      night(16, [21, 0], [7, 0]),
      night(17, [21, 30], [7, 0]),
      night(18, [22, 0], [7, 0]),
      night(19, [21, 45], [7, 0]),
    ];

    // When
    const rhythm = dayRhythm(sleeps, born, napWindow, on(20, 12));

    // Then
    expect(rhythm).toMatchObject({ bedtime: clock(21, 45), bedtimeLearned: true });
  });

  it('counts a bedtime after midnight as late, not early', () => {
    // Given
    const sleeps = [
      sleep({ start: on(18, 0, 15).toISOString(), end: on(18, 8, 0).toISOString() }),
      sleep({ start: on(19, 0, 20).toISOString(), end: on(19, 8, 0).toISOString() }),
      night(19, [23, 50], [8, 0]),
    ];

    // When
    const rhythm = dayRhythm(sleeps, born, napWindow, on(20, 12));

    // Then
    expect(rhythm.bedtime).toBe(clock(24, 15));
  });

  it('keeps a waking an hour after bedtime from moving the bedtime', () => {
    // Given
    const sleeps = [16, 17, 18].flatMap((day) => [
      sleep({ start: on(day, 20, 0).toISOString(), end: on(day, 20, 50).toISOString() }),
      night(day, [21, 10], [7, 0]),
    ]);

    // When
    const rhythm = dayRhythm(sleeps, born, napWindow, on(19, 12));

    // Then
    expect(rhythm.bedtime).toBe(clock(20));
  });

  it("isn't an evening catnap", () => {
    // Given
    const sleeps = [16, 17, 18].flatMap((day) => [nap(day, [18, 30], [18, 55]), night(day, [21, 30], [7, 0])]);

    // When
    const rhythm = dayRhythm(sleeps, born, napWindow, on(19, 12));

    // Then
    expect(rhythm.bedtime).toBe(clock(21, 30));
  });

  it("is the setting's end with fewer than 3 past bedtimes", () => {
    // Given
    const sleeps = [night(17, [21, 0], [7, 0]), night(18, [21, 0], [7, 0])];

    // When
    const rhythm = dayRhythm(sleeps, born, napWindow, on(19, 12));

    // Then
    expect(rhythm).toMatchObject({ bedtime: clock(19), bedtimeLearned: false });
  });

  it('is never learned from a sleep before 18:00', () => {
    // Given
    const sleeps = [16, 17, 18].map((day) => night(day, [17, 30], [6, 0]));

    // When
    const rhythm = dayRhythm(sleeps, born, napWindow, on(19, 12));

    // Then
    expect(rhythm.bedtimeLearned).toBe(false);
  });
});

describe("the child's usual first wake window", () => {
  it('is the median from the morning wake to the first nap', () => {
    // Given
    const sleeps = [
      night(16, [21, 0], [7, 0]),
      nap(17, [8, 0], [9, 0]),
      night(17, [21, 0], [7, 0]),
      nap(18, [8, 30], [9, 30]),
      night(18, [21, 0], [7, 0]),
      nap(19, [9, 0], [10, 0]),
    ];

    // When
    const rhythm = dayRhythm(sleeps, born, napWindow, on(20, 12));

    // Then
    expect(rhythm.firstWindow).toBe(90);
  });

  it('caps the awake threshold at two thirds of it', () => {
    // Given
    const sleeps = [16, 17, 18].flatMap((day) => [night(day - 1, [21, 0], [7, 0]), nap(day, [8, 0], [9, 0])]);

    // When
    const rhythm = dayRhythm(sleeps, born, napWindow, on(19, 12));

    // Then
    expect(rhythm.band.awake).toBe(40);
  });
});

describe('the age band', () => {
  it.each([
    ['2 months', '2026-07-10', 75, 180],
    ['4 months', '2026-05-10', 60, 120],
    ['8 months', '2026-01-10', 45, 120],
    ['18 months', '2025-03-10', 40, 120],
    ['no birth date', null, 60, 120],
  ])('at %s needs %i min awake and calls an evening sleep of %i min long', (_, birthDate, awake, long) => {
    // When
    const band = ageBand(birthDate, on(20, 12));

    // Then
    expect(band).toMatchObject({ awake, long, before: 120, after: 180 });
  });
});
