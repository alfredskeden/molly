import { describe, expect, it } from 'vitest';

import { change, feeding, medication, sleep } from '../test/fixtures';
import { todaysTotals, totalsBetween } from './totals';

/** The window's start: the morning wake. */
const since = new Date(2026, 8, 20, 6, 0);
/** Late in the day, after every entry below. */
const now = new Date(2026, 8, 20, 18, 0);
const none = { sleep: [], feeding: [], change: [], medication: [] };
const HOUR = 60 * 60 * 1000;
const at = (day: number, hours: number, minutes = 0) => new Date(2026, 8, day, hours, minutes).toISOString();

describe("the Today card's totals", () => {
  it('are zero with no entries', () => {
    // Given
    const entries = none;

    // When
    const totals = todaysTotals(entries, since, null, now);

    // Then
    expect(totals).toEqual({ sleepMs: 0, feedings: 0, changes: 0, medications: 0 });
  });

  it('count a sleep inside the window in full', () => {
    // Given
    const nap = sleep({ start: at(20, 13), end: at(20, 14, 30) });

    // When
    const totals = todaysTotals({ ...none, sleep: [nap] }, since, null, now);

    // Then
    expect(totals.sleepMs).toBe(1.5 * HOUR);
  });

  it('clip a sleep that began before the window to the part after its start', () => {
    // Given
    const night = sleep({ start: at(19, 22), end: at(20, 7, 30) });

    // When
    const totals = todaysTotals({ ...none, sleep: [night] }, since, null, now);

    // Then
    expect(totals.sleepMs).toBe(1.5 * HOUR);
  });

  it('leave out entries from before the window', () => {
    // Given
    const yesterday = {
      sleep: [sleep({ start: at(19, 13), end: at(19, 14) })],
      feeding: [feeding({ start: at(20, 2, 30), end: at(20, 2, 50) })],
      change: [change({ time: at(20, 5, 59) })],
      medication: [medication({ time: at(19, 20) })],
    };

    // When
    const totals = todaysTotals(yesterday, since, null, now);

    // Then
    expect(totals).toEqual({ sleepMs: 0, feedings: 0, changes: 0, medications: 0 });
  });

  it('count feedings that started and diaper changes since the window start', () => {
    // Given
    const entries = {
      sleep: [],
      feeding: [
        feeding({ start: at(20, 5, 50), end: at(20, 6, 10) }),
        feeding({ start: at(20, 6, 0), end: at(20, 6, 20) }),
        feeding({ start: at(20, 9), end: at(20, 9, 15) }),
      ],
      change: [change({ time: at(20, 5, 59) }), change({ time: at(20, 6, 0) }), change({ time: at(20, 8) })],
      medication: [],
    };

    // When
    const totals = todaysTotals(entries, since, null, now);

    // Then
    expect(totals).toEqual({ sleepMs: 0, feedings: 2, changes: 2, medications: 0 });
  });

  it('count medication since the window start, not before it', () => {
    // Given
    const entries = {
      ...none,
      medication: [
        medication({ time: at(20, 5, 59) }),
        medication({ time: at(20, 6, 0) }),
        medication({ name: 'Paracetamol 2.5 ml', time: at(20, 14) }),
      ],
    };

    // When
    const totals = todaysTotals(entries, since, null, now);

    // Then
    expect(totals.medications).toBe(2);
  });

  it('count a sleep still running since inside the window up to now', () => {
    // Given
    const running = { start: at(20, 16, 30) };

    // When
    const totals = todaysTotals(none, since, running, now);

    // Then
    expect(totals.sleepMs).toBe(1.5 * HOUR);
  });

  it('count a sleep still running since before the window from the window start', () => {
    // Given
    const bedtime = new Date(2026, 8, 20, 19, 30);
    const running = { start: at(20, 19, 0) };

    // When
    const totals = todaysTotals(none, bedtime, running, new Date(2026, 8, 20, 22, 43));

    // Then
    expect(totals.sleepMs).toBe(3 * HOUR + 13 * 60 * 1000);
  });

  it('add a running sleep to the finished ones', () => {
    // Given
    const nap = sleep({ start: at(20, 9), end: at(20, 10) });
    const running = { start: at(20, 17) };

    // When
    const totals = todaysTotals({ ...none, sleep: [nap] }, since, running, now);

    // Then
    expect(totals.sleepMs).toBe(2 * HOUR);
  });
});

describe("a past page's totals", () => {
  it('count only what happened inside the window, clipping sleep at both ends', () => {
    // Given
    const until = new Date(2026, 8, 20, 19, 25);
    const entries = {
      sleep: [sleep({ start: at(20, 13), end: at(20, 14) }), sleep({ start: at(20, 19, 25), end: at(21, 6, 40), nap: false })],
      feeding: [feeding({ start: at(20, 9), end: at(20, 9, 15) }), feeding({ start: at(20, 20), end: at(20, 20, 15) })],
      change: [change({ time: at(20, 12) }), change({ time: at(20, 19, 30) })],
      medication: [medication({ time: at(20, 19, 24) }), medication({ time: at(20, 19, 26) })],
    };

    // When
    const totals = totalsBetween(entries, since, until);

    // Then
    expect(totals).toEqual({ sleepMs: HOUR, feedings: 1, changes: 1, medications: 1 });
  });
});
