import { describe, expect, it } from 'vitest';

import { medication, sleep } from '../test/fixtures';
import { dayWindow } from './day-window';
import { DEFAULT_NAP_WINDOW } from './nap';
import { isVitaminD, vitaminDCycle, vitaminDStatus } from './vitamin-d';

const none = { sleep: [], feeding: [], change: [], medication: [] };
const napWindow = DEFAULT_NAP_WINDOW;
const on = (day: number, hours: number, minutes = 0) => new Date(2026, 8, day, hours, minutes);
const at = (day: number, hours: number, minutes = 0) => on(day, hours, minutes).toISOString();
const cycleAt = (sleeps: ReturnType<typeof sleep>[], now: Date) =>
  vitaminDCycle(dayWindow({ ...none, sleep: sleeps }, null, napWindow, now), napWindow, now);

describe("the Vitamin D cycle", () => {
  it('runs 24 hours from the logged morning wake', () => {
    // Given
    const night = sleep({ start: at(19, 19, 30), end: at(20, 6, 40) });
    const nap = sleep({ start: at(20, 9), end: at(20, 10, 30) });

    // When
    const cycle = cycleAt([night, nap], on(20, 10, 30));

    // Then
    expect(cycle).toEqual({ start: on(20, 6, 40), end: on(21, 6, 40) });
  });

  it("holds a night waking at 03:00 in the cycle the previous morning's wake opened", () => {
    // Given
    const lastNight = sleep({ start: at(18, 19, 30), end: at(19, 6, 50) });
    const bedtime = sleep({ start: at(19, 19, 15), end: at(20, 3) });

    // When
    const cycle = cycleAt([lastNight, bedtime], on(20, 3));

    // Then
    expect(cycle).toEqual({ start: on(19, 6, 50), end: on(20, 6, 50) });
  });

  it('opens a new cycle at the morning wake just logged', () => {
    // Given
    const lastNight = sleep({ start: at(18, 19, 30), end: at(19, 6, 50) });
    const night = sleep({ start: at(19, 19, 15), end: at(20, 6, 30) });

    // When
    const cycle = cycleAt([lastNight, night], on(20, 6, 30));

    // Then
    expect(cycle).toEqual({ start: on(20, 6, 30), end: on(21, 6, 30) });
  });

  it('starts at the nap-window start in the day when no wake is logged', () => {
    // When
    const cycle = cycleAt([], on(20, 12));

    // Then
    expect(cycle).toEqual({ start: on(20, 7), end: on(21, 7) });
  });

  it("starts at the day's nap-window start in the evening when no wake is logged", () => {
    // When
    const cycle = cycleAt([], on(20, 21));

    // Then
    expect(cycle).toEqual({ start: on(20, 7), end: on(21, 7) });
  });

  it("starts at yesterday's nap-window start in the small hours when no wake is logged", () => {
    // When
    const cycle = cycleAt([], on(20, 3));

    // Then
    expect(cycle).toEqual({ start: on(19, 7), end: on(20, 7) });
  });
});

describe('a Vitamin D name', () => {
  it.each(['Vitamin D', 'vitamin d', 'Vitamin D3', ' Vitamin D 10 µg '])('counts "%s"', (name) => {
    // When
    const counts = isVitaminD(name);

    // Then
    expect(counts).toBe(true);
  });

  it.each(['Vitamin drops', 'Paracetamol', 'Vitamin', ''])('does not count "%s"', (name) => {
    // When
    const counts = isVitaminD(name);

    // Then
    expect(counts).toBe(false);
  });
});

describe('whether Vitamin D is due', () => {
  const cycle = { start: on(20, 6, 40), end: on(21, 6, 40) };

  it('is due with no last dose when nothing was given', () => {
    // When
    const status = vitaminDStatus(cycle, []);

    // Then
    expect(status).toEqual({ due: true, last: null });
  });

  it('is not due after a Vitamin D in the cycle', () => {
    // Given
    const dose = medication({ name: 'Vitamin D', time: at(20, 8, 10) });

    // When
    const status = vitaminDStatus(cycle, [dose]);

    // Then
    expect(status.due).toBe(false);
  });

  it('is due when only other medicines were given in the cycle', () => {
    // Given
    const other = medication({ name: 'Paracetamol 2.5 ml', time: at(20, 8, 10) });

    // When
    const status = vitaminDStatus(cycle, [other]);

    // Then
    expect(status).toEqual({ due: true, last: null });
  });

  it('is due after a Vitamin D just before the cycle, which is the last dose', () => {
    // Given
    const older = medication({ name: 'Vitamin D', time: at(19, 8, 10) });
    const yesterday = medication({ name: 'Vitamin D3', time: at(20, 6, 39) });

    // When
    const status = vitaminDStatus(cycle, [older, yesterday]);

    // Then
    expect(status).toEqual({ due: true, last: yesterday });
  });

  it('counts a dose exactly at the cycle start', () => {
    // Given
    const dose = medication({ name: 'Vitamin D', time: cycle.start.toISOString() });

    // When
    const status = vitaminDStatus(cycle, [dose]);

    // Then
    expect(status.due).toBe(false);
  });

  it('does not count a dose exactly at the cycle end', () => {
    // Given
    const dose = medication({ name: 'Vitamin D', time: cycle.end.toISOString() });

    // When
    const status = vitaminDStatus(cycle, [dose]);

    // Then
    expect(status.due).toBe(true);
  });
});
