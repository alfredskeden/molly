import { describe, expect, it } from 'vitest';

import { DEFAULT_NAP_WINDOW, isNap, isNightSleep } from './nap';

describe('the nap rule', () => {
  it('the default window is 07:00 to 19:00', () => {
    // Given
    const expected = { start: '07:00', end: '19:00' };

    // When
    const window = DEFAULT_NAP_WINDOW;

    // Then
    expect(window).toEqual(expected);
  });

  it('a sleep starting midday is a nap', () => {
    // Given
    const start = new Date(2026, 8, 20, 13, 0);

    // When
    const nap = isNap(start);

    // Then
    expect(nap).toBe(true);
  });

  it('a sleep starting at night is not a nap', () => {
    // Given
    const start = new Date(2026, 8, 20, 21, 30);

    // When
    const nap = isNap(start);

    // Then
    expect(nap).toBe(false);
  });

  it('a sleep starting exactly at the window start is a nap', () => {
    // Given
    const start = new Date(2026, 8, 20, 7, 0);

    // When
    const nap = isNap(start);

    // Then
    expect(nap).toBe(true);
  });

  it('a sleep starting exactly at the window end is a nap', () => {
    // Given
    const start = new Date(2026, 8, 20, 19, 0);

    // When
    const nap = isNap(start);

    // Then
    expect(nap).toBe(true);
  });

  it.each([
    [6, 59],
    [19, 1],
  ])('a sleep starting at %i:%i, just outside the window, is not a nap', (hours, minutes) => {
    // Given
    const start = new Date(2026, 8, 20, hours, minutes);

    // When
    const nap = isNap(start);

    // Then
    expect(nap).toBe(false);
  });

  it('a custom window is applied', () => {
    // Given
    const window = { start: '09:30', end: '16:00' };
    const start = new Date(2026, 8, 20, 8, 0);

    // When
    const nap = isNap(start, window);

    // Then
    expect(nap).toBe(false);
  });
});

describe('night sleep or nap, by when it happened', () => {
  const at = (day: number, hours: number, minutes = 0) => new Date(2026, 8, day, hours, minutes);

  it.each([
    ['started after the window end', at(20, 19, 30), at(20, 20, 0)],
    ['started before the window start', at(20, 6, 30), at(20, 7, 30)],
    ['started after midnight', at(21, 0, 30), at(21, 1, 30)],
    ['started inside and was still going at the window end', at(20, 18, 45), at(21, 2, 0)],
    ['started exactly at the window end and went on', at(20, 19, 0), at(20, 19, 30)],
  ])('a sleep that %s is night sleep', (_case, start, end) => {
    // Given
    const sleep = { start, end };

    // When
    const night = isNightSleep(sleep.start, sleep.end);

    // Then
    expect(night).toBe(true);
  });

  it.each([
    ['ended before the window end', at(20, 18, 0), at(20, 18, 40)],
    ['ended exactly at the window end', at(20, 18, 0), at(20, 19, 0)],
    ['started exactly at the window start', at(20, 7, 0), at(20, 8, 0)],
  ])('a sleep that started inside the window and %s is a nap', (_case, start, end) => {
    // Given
    const sleep = { start, end };

    // When
    const night = isNightSleep(sleep.start, sleep.end);

    // Then
    expect(night).toBe(false);
  });

  it('the window on the sleep\'s start day is used, with a custom window', () => {
    // Given
    const window = { start: '08:00', end: '17:30' };
    const sleep = { start: at(20, 17, 0), end: at(20, 17, 45) };

    // When
    const night = isNightSleep(sleep.start, sleep.end, window);

    // Then
    expect(night).toBe(true);
  });
});
