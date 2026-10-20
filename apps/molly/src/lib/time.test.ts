import { describe, expect, it } from 'vitest';

import { formatClock, formatElapsed, formatTimer, spokenDuration } from './time';

const MINUTE = 60_000;

describe('showing times', () => {
  it('a timestamp shows as local 24-hour HH:MM', () => {
    // Given
    const utc = '2026-09-20T12:05:00Z';

    // When
    const clock = formatClock(utc);

    // Then
    expect(clock).toBe('14:05');
  });

  it('an elapsed time under an hour shows minutes', () => {
    // Given
    const elapsed = 45 * MINUTE + 59_000;

    // When
    const text = formatElapsed(elapsed);

    // Then
    expect(text).toBe('45m');
  });

  it("a slightly negative elapsed time, from the phone's clock lagging the server's, shows 0m", () => {
    // Given
    const elapsed = -20_000;

    // When
    const text = formatElapsed(elapsed);

    // Then
    expect(text).toBe('0m');
  });

  it('an elapsed time of an hour or more shows hours and padded minutes', () => {
    // Given
    const elapsed = 65 * MINUTE;

    // When
    const text = formatElapsed(elapsed);

    // Then
    expect(text).toBe('1h 05m');
  });
});

describe('a running timer', () => {
  it.each([
    [0, '0:00'],
    [9_000, '0:09'],
    [12 * 60_000 + 34_000, '12:34'],
  ])('under an hour, %i ms reads as %s', (ms, text) => {
    // Given
    const elapsed = ms;

    // When
    const timer = formatTimer(elapsed);

    // Then
    expect(timer).toBe(text);
  });

  it('from an hour reads as h:mm:ss', () => {
    // Given
    const elapsed = 62 * 60_000 + 3_000;

    // When
    const timer = formatTimer(elapsed);

    // Then
    expect(timer).toBe('1:02:03');
  });

  it('never runs below zero when the phone clock is behind the server', () => {
    // Given
    const elapsed = -4_000;

    // When
    const timer = formatTimer(elapsed);

    // Then
    expect(timer).toBe('0:00');
  });
});

describe('spoken durations', () => {
  it.each([
    [20_000, 'less than a minute'],
    [60_000, '1 minute'],
    [12 * 60_000, '12 minutes'],
    [60 * 60_000, '1 hour'],
    [(2 * 60 + 5) * 60_000, '2 hours 5 minutes'],
  ])('%i ms reads as %s', (ms, spoken) => {
    // Given
    const elapsed = ms;

    // When
    const text = spokenDuration(elapsed);

    // Then
    expect(text).toBe(spoken);
  });
});
