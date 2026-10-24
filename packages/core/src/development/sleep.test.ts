import type { Sleep } from '@molly/api';
import { describe, expect, it } from 'vitest';

import { dayRhythm } from '../day-rhythm';
import type { NapWindow } from '../nap';
import { sleepComparison as compareWith, typicalSleep } from './sleep';

const NAP_WINDOW = { start: '07:00', end: '19:00' };
/** `sleepComparison` with the rhythm learned from the same sleeps, as the app calls it. */
const sleepComparison = (sleeps: Sleep[], setting: NapWindow, now: Date) => compareWith(sleeps, dayRhythm(sleeps, null, setting, now), now);
const NOW = new Date(2026, 9, 12, 12, 0);

let nextId = 1;
const sleep = (start: Date, end: Date): Sleep => ({
  id: nextId++,
  child: 1,
  start: start.toISOString(),
  end: end.toISOString(),
  duration: '',
  nap: false,
  notes: null,
  tags: [],
});

const at = (day: number, hours: number, minutes = 0) => new Date(2026, 9, day, hours, minutes);

/** Naps 09:00–10:00 and 13:00–14:00, then the night from 19:30 to 06:30. */
const loggedDay = (day: number): Sleep[] => [
  sleep(at(day, 9), at(day, 10)),
  sleep(at(day, 13), at(day, 14)),
  sleep(at(day, 19, 30), at(day + 1, 6, 30)),
];

const loggedDays = (first: number, last: number) =>
  Array.from({ length: last - first + 1 }, (_, index) => loggedDay(first + index)).flat();

describe("the child's own sleep", () => {
  it('is nothing with no sleeps logged', () => {
    // When
    const comparison = sleepComparison([], NAP_WINDOW, NOW);

    // Then
    expect(comparison).toBeNull();
  });

  it('is nothing with only 2 full days logged', () => {
    // Given
    const sleeps = loggedDays(9, 11);

    // When
    const comparison = sleepComparison(sleeps, NAP_WINDOW, NOW);

    // Then
    expect(comparison).toBeNull();
  });

  it('averages the sleep per day and the naps over 3 full days, the night split at midnight', () => {
    // Given
    const sleeps = loggedDays(8, 11);

    // When
    const comparison = sleepComparison(sleeps, NAP_WINDOW, NOW);

    // Then
    expect(comparison).toEqual({ days: 3, perDayMs: 13 * 3_600_000, naps: 2, text: 'last 3 days: 13h 0m a day, 2 naps' });
  });

  it("doesn't count today, so a nap today or a sleep still running changes nothing", () => {
    // Given
    const sleeps = [...loggedDays(8, 11), sleep(at(12, 9), at(12, 10))];

    // When
    const comparison = sleepComparison(sleeps, NAP_WINDOW, NOW);

    // Then
    expect(comparison).toMatchObject({ days: 3, perDayMs: 13 * 3_600_000, naps: 2 });
  });

  it('counts only the last 7 full days', () => {
    // Given
    const sleeps = loggedDays(1, 11);

    // When
    const comparison = sleepComparison(sleeps, NAP_WINDOW, NOW);

    // Then
    expect(comparison).toMatchObject({ days: 7, text: 'last 7 days: 13h 0m a day, 2 naps' });
  });

  it('leaves out a day with nothing logged', () => {
    // Given
    const sleeps = [...loggedDays(4, 7), ...loggedDays(9, 11)].filter((entry) => entry.start !== at(7, 19, 30).toISOString());

    // When
    const comparison = sleepComparison(sleeps, NAP_WINDOW, NOW);

    // Then
    expect(comparison?.days).toBe(6);
  });

  it('counts a sleep in the nap window that runs past its end as the night, not a nap', () => {
    // Given
    const sleeps = loggedDays(8, 11).map((entry) =>
      entry.start === at(11, 19, 30).toISOString() ? sleep(at(11, 18, 30), at(12, 6, 30)) : entry,
    );

    // When
    const comparison = sleepComparison(sleeps, NAP_WINDOW, NOW);

    // Then
    expect(comparison?.naps).toBe(2);
  });

  it.each([
    [[sleep(at(9, 9), at(9, 10))], '1 nap'],
    [[], 'no naps'],
  ])('rounds the naps to whole ones and says %#', (extra, words) => {
    // Given
    const nights = loggedDays(8, 11).filter((entry) => new Date(entry.start).getHours() === 19);
    const sleeps = [...nights, ...extra, sleep(at(10, 9), at(10, 10))];

    // When
    const comparison = sleepComparison(sleeps, NAP_WINDOW, NOW);

    // Then
    expect(comparison?.text).toMatch(new RegExp(`, ${words}$`));
  });

  it('only states the numbers, never a verdict', () => {
    // Given
    const sleeps = loggedDays(1, 11);

    // When
    const comparison = sleepComparison(sleeps, NAP_WINDOW, NOW);

    // Then
    expect(comparison?.text).toMatch(/^last \d+ days: \d+h \d+m a day, (\d+ naps?|no naps)$/);
  });
});

describe('the typical sleep for a page', () => {
  it.each([
    [0, 'sweden', 14, 18, '1177-sleep'],
    [3, 'sweden', 14, 18, '1177-sleep'],
    [4, 'sweden', 12, 16, '1177-sleep'],
    [11, 'sweden', 12, 16, '1177-sleep'],
    [12, 'sweden', 10, 16, '1177-sleep'],
    [30, 'sweden', 10, 16, '1177-sleep'],
    [36, 'sweden', 10, 14, '1177-sleep'],
    [0, 'international', 14, 17, 'nsf-sleep'],
    [3, 'international', 14, 17, 'nsf-sleep'],
    [4, 'international', 12, 16, 'aasm-sleep'],
    [11, 'international', 12, 16, 'aasm-sleep'],
    [12, 'international', 11, 14, 'aasm-sleep'],
    [30, 'international', 11, 14, 'aasm-sleep'],
    [36, 'international', 10, 13, 'aasm-sleep'],
  ] as const)("is the region's source's range on page %s in %s", (page, region, min, max, source) => {
    // When
    const range = typicalSleep(page, region);

    // Then
    expect(range).toMatchObject({ min, max, source });
  });
});

describe('the words for the typical sleep', () => {
  it("describe 1177's range for Sweden", () => {
    // When
    const range = typicalSleep(5, 'sweden');

    // Then
    expect(range.text).toBe('Many children this age sleep 12–16 hours in 24 hours, naps included.');
  });

  it("give the sleep experts' recommendation for International", () => {
    // When
    const range = typicalSleep(5, 'international');

    // Then
    expect(range.text).toBe('Sleep experts recommend 12–16 hours in 24 hours at this age, naps included.');
  });

  it('say sleep varies a lot under 4 months', () => {
    // When
    const texts = [typicalSleep(2, 'sweden').text, typicalSleep(2, 'international').text];

    // Then
    expect(texts).toEqual([
      'Many children this age sleep 14–18 hours in 24 hours, naps included. Sleep varies a lot at this age.',
      'Sleep experts suggest 14–17 hours in 24 hours at this age, naps included. Sleep varies a lot at this age.',
    ]);
  });
});

describe("the child's own naps by their rhythm", () => {
  it('counts an evening catnap well before the usual bedtime as a nap, not a night', () => {
    // Given
    // Bedtime 21:45 every day, with a 25 min catnap at 19:30 after the setting's 19:00.
    const days = Array.from({ length: 6 }, (_, index) => 5 + index).flatMap((day) => [
      sleep(at(day, 9), at(day, 10)),
      sleep(at(day, 19, 30), at(day, 19, 55)),
      sleep(at(day, 21, 45), at(day + 1, 7)),
    ]);

    // When
    const comparison = sleepComparison(days, NAP_WINDOW, NOW);

    // Then
    expect(comparison?.naps).toBe(2);
  });
});
