import type { Sleep } from '@molly/api';
import { describe, expect, it } from 'vitest';

import { sleep } from '../test/fixtures';
import { dayRhythm } from './day-rhythm';
import type { DayWindow } from './day-window';
import { DEFAULT_NAP_WINDOW, type NapWindow } from './nap';
import { accuracySummary, knownAt, likelyFor as likelyWith, replay, replayPlans, score, type LikelySleep } from './replay';
import type { Skip } from './day-plan';

/** `likelyFor` with the rhythm learned from every sleep, as the app calls it for a past day. */
const likelyFor = (window: DayWindow, sleeps: Sleep[], skips: Skip[], birthDate: string, setting: NapWindow) =>
  likelyWith(window, sleeps, skips, birthDate, dayRhythm(sleeps, birthDate, setting, new Date(window.end.getTime() + 24 * 60 * 60 * 1000)));

const on = (day: number, hours: number, minutes = 0) => new Date(2026, 8, day, hours, minutes);
const logged = (from: Date, to: Date, nap = true) => sleep({ start: from.toISOString(), end: to.toISOString(), nap });

describe('what the replay knew at a moment', () => {
  it('is only the sleeps that had ended by then, so a later sleep cannot leak in', () => {
    // Given
    const ended = logged(on(19, 19, 30), on(20, 6, 40), false);
    const stillGoing = logged(on(20, 8, 50), on(20, 9, 30));
    const later = logged(on(20, 12, 0), on(20, 13, 0));

    // When
    const known = knownAt([later, ended, stillGoing], on(20, 9, 0));

    // Then
    expect(known).toEqual([ended]);
  });
});

describe('scoring a window against when the sleep really started', () => {
  const window = { start: on(20, 8, 55), end: on(20, 9, 25) };

  it.each([
    ['inside the window', on(20, 9, 10), { hit: true, miss: 0, width: 30 }],
    ['at its start', on(20, 8, 55), { hit: true, miss: 0, width: 30 }],
    ['before it', on(20, 8, 40), { hit: false, miss: 15, width: 30 }],
    ['after it', on(20, 9, 45), { hit: false, miss: 20, width: 30 }],
  ])('a sleep starting %s', (_when, actual, expected) => {
    // Given
    const started = actual;

    // When
    const result = score(window, started);

    // Then
    expect(result).toEqual(expected);
  });
});

describe('replaying logged sleeps', () => {
  it('predicts each sleep from 30 minutes before it started, knowing only what came before', () => {
    // Given
    const sleeps = [logged(on(19, 19, 30), on(20, 6, 40), false), logged(on(20, 8, 40), on(20, 9, 40))];

    // When
    const cases = replay(sleeps, '2026-05-10', DEFAULT_NAP_WINDOW);

    // Then
    expect(cases).toMatchObject([
      {
        started: on(20, 8, 40),
        target: 'nap',
        now: on(20, 8, 10),
        prediction: { kind: 'nap', start: on(20, 7, 55), end: on(20, 8, 45), source: 'age' },
        score: { hit: true, miss: 0, width: 50 },
      },
    ]);
  });

  it('tells bedtimes, which follow a nap, from going back to sleep after a night waking', () => {
    // Given
    const sleeps = [
      logged(on(20, 8, 40), on(20, 9, 40)),
      logged(on(20, 21, 30), on(20, 23, 50), false),
      logged(on(21, 0, 30), on(21, 7, 0), false),
    ];

    // When
    const cases = replay(sleeps, '2026-05-10', DEFAULT_NAP_WINDOW);

    // Then
    expect(cases.map((entry) => entry.target)).toEqual(['bedtime', 'night']);
  });

  it('tells them by when they happened, not by the saved flag: an 18:45 bedtime saved as a nap is the bedtime', () => {
    // Given
    const sleeps = [
      logged(on(20, 8, 40), on(20, 9, 40), false),
      logged(on(20, 18, 45), on(21, 2, 0)),
      logged(on(21, 2, 20), on(21, 7, 0)),
    ];

    // When
    const cases = replay(sleeps, '2026-05-10', DEFAULT_NAP_WINDOW);

    // Then
    expect(cases.map((entry) => entry.target)).toEqual(['bedtime', 'night']);
  });
});

describe("a past day's likely windows", () => {
  /** Saturday the 19th: woke 06:40, four naps, bed at 19:25. Four months old, age guide only. */
  const saturday = { kind: 'day' as const, start: on(19, 6, 40), end: on(19, 19, 25), wake: on(19, 6, 40), clock: false };
  const saturdaySleeps = [
    logged(on(18, 19, 30), on(19, 6, 40), false),
    logged(on(19, 8, 40), on(19, 9, 40)),
    logged(on(19, 11, 30), on(19, 12, 30)),
    logged(on(19, 14, 0), on(19, 15, 0)),
    logged(on(19, 16, 30), on(19, 17, 15)),
    logged(on(19, 19, 25), on(20, 6, 40), false),
  ];

  it('are, for each sleep, the window shown just before it started, from the sleeps that had ended by then', () => {
    // Given
    const sleeps = saturdaySleeps;

    // When
    const likely = likelyFor(saturday, sleeps, [], '2026-05-10', DEFAULT_NAP_WINDOW);

    // Then
    expect(likely).toEqual([
      { kind: 'nap', start: on(19, 7, 55), end: on(19, 8, 45), skipped: false, started: on(19, 8, 40) },
      { kind: 'nap', start: on(19, 10, 55), end: on(19, 12, 10), skipped: false, started: on(19, 11, 30) },
      { kind: 'nap', start: on(19, 13, 45), end: on(19, 15, 0), skipped: false, started: on(19, 14, 0) },
      { kind: 'nap', start: on(19, 16, 15), end: on(19, 17, 30), skipped: false, started: on(19, 16, 30) },
      { kind: 'bedtime', start: on(19, 18, 55), end: on(19, 19, 45), skipped: false, started: on(19, 19, 25) },
    ]);
  });

  it('are named by the sleep that followed: a bedtime shown a nap window is still the bedtime', () => {
    // Given
    const window = { ...saturday, end: on(19, 18, 0) };
    const sleeps = [...saturdaySleeps.slice(0, 4), logged(on(19, 18, 0), on(20, 6, 40), false)];

    // When
    const likely = likelyFor(window, sleeps, [], '2026-05-10', DEFAULT_NAP_WINDOW);

    // Then
    expect(likely.at(-1)).toEqual({
      kind: 'bedtime',
      start: on(19, 16, 15),
      end: on(19, 17, 30),
      skipped: false,
      started: on(19, 18, 0),
    });
  });

  it('name a bedtime saved as a nap the bedtime', () => {
    // Given
    const window = { ...saturday, end: on(19, 18, 45) };
    const sleeps = [...saturdaySleeps.slice(0, 5), logged(on(19, 18, 45), on(20, 6, 40))];

    // When
    const likely = likelyFor(window, sleeps, [], '2026-05-10', DEFAULT_NAP_WINDOW);

    // Then
    expect(likely.at(-1)).toMatchObject({ kind: 'bedtime', started: on(19, 18, 45) });
  });

  it("come back with the day's skipped naps, and a skip only counts from when it was tapped", () => {
    // Given
    const window = { ...saturday, end: on(19, 18, 30) };
    const sleeps = [...saturdaySleeps.slice(0, 4), logged(on(19, 18, 30), on(20, 6, 40), false)];
    const skips = [{ at: on(19, 15, 10), start: on(19, 16, 15), end: on(19, 17, 30) }];

    // When
    const likely = likelyFor(window, sleeps, skips, '2026-05-10', DEFAULT_NAP_WINDOW);

    // Then
    expect(likely).toEqual([
      { kind: 'nap', start: on(19, 7, 55), end: on(19, 8, 45), skipped: false, started: on(19, 8, 40) },
      { kind: 'nap', start: on(19, 10, 55), end: on(19, 12, 10), skipped: false, started: on(19, 11, 30) },
      { kind: 'nap', start: on(19, 13, 45), end: on(19, 15, 0), skipped: false, started: on(19, 14, 0) },
      { kind: 'nap', start: on(19, 16, 15), end: on(19, 17, 30), skipped: true, started: null },
      { kind: 'bedtime', start: on(19, 18, 33), end: on(19, 19, 23), skipped: false, started: on(19, 18, 30) },
    ]);
  });
});

describe('replaying whole-day plans', () => {
  it("plans each day from its morning wake and scores each planned sleep against the day's sleep in that place", () => {
    // Given
    const sleeps = [
      logged(on(18, 19, 30), on(19, 6, 40), false),
      logged(on(19, 8, 40), on(19, 9, 40)),
      logged(on(19, 11, 30), on(19, 12, 30)),
      logged(on(19, 14, 0), on(19, 15, 0)),
      logged(on(19, 17, 0), on(19, 17, 45)),
      logged(on(19, 19, 25), on(20, 6, 40), false),
    ];

    // When
    const cases = replayPlans(sleeps, '2026-05-10', DEFAULT_NAP_WINDOW);

    // Then
    expect(cases).toEqual([
      { day: on(19, 6, 40), position: 1, kind: 'nap', score: { hit: true, miss: 0, width: 50 } },
      { day: on(19, 6, 40), position: 2, kind: 'nap', score: { hit: true, miss: 0, width: 75 } },
      { day: on(19, 6, 40), position: 3, kind: 'nap', score: { hit: true, miss: 0, width: 75 } },
      { day: on(19, 6, 40), position: 4, kind: 'nap', score: { hit: false, miss: 9, width: 75 } },
      { day: on(19, 6, 40), position: 5, kind: 'bedtime', score: { hit: true, miss: 0, width: 50 } },
    ]);
  });
});

describe("a past day's accuracy line", () => {
  const nap = (start: Date, end: Date, started: Date | null, skipped = false): LikelySleep => ({
    kind: 'nap',
    start,
    end,
    skipped,
    started,
  });
  const bedtime = (started: Date): LikelySleep => ({
    kind: 'bedtime',
    start: on(19, 18, 55),
    end: on(19, 19, 45),
    skipped: false,
    started,
  });
  const hitNap = nap(on(19, 8, 0), on(19, 8, 45), on(19, 8, 20));
  const missedNap = nap(on(19, 11, 0), on(19, 11, 45), on(19, 12, 10));

  it('is empty without a window', () => {
    // Given
    const likely: LikelySleep[] = [];

    // When
    const line = accuracySummary(likely);

    // Then
    expect(line).toBeNull();
  });

  it.each([
    ['in the window', [hitNap, bedtime(on(19, 19, 20))], '1 of 1 nap started in the likely window · bedtime in the window'],
    ['after it', [hitNap, missedNap, bedtime(on(19, 19, 50))], '1 of 2 naps started in the likely window · bedtime 5m after'],
    ['before it', [hitNap, missedNap, bedtime(on(19, 18, 52))], '1 of 2 naps started in the likely window · bedtime 3m before'],
  ])('counts naps started in their window and says where bedtime fell: %s', (_case, likely, expected) => {
    // Given
    const windows = likely;

    // When
    const line = accuracySummary(windows);

    // Then
    expect(line).toBe(expected);
  });

  it('leaves out a part with no window, and skipped naps', () => {
    // Given
    const likely = [nap(on(19, 15, 5), on(19, 15, 45), null, true), bedtime(on(19, 19, 20))];

    // When
    const line = accuracySummary(likely);

    // Then
    expect(line).toBe('Bedtime in the window');
  });
});

describe('replaying whole-day plans by when sleeps happened', () => {
  it('scores a bedtime saved as a nap as the bedtime', () => {
    // Given
    const sleeps = [
      logged(on(18, 18, 45), on(19, 6, 40)),
      logged(on(19, 8, 40), on(19, 9, 40), false),
      logged(on(19, 11, 30), on(19, 12, 30)),
      logged(on(19, 14, 0), on(19, 15, 0)),
      logged(on(19, 17, 0), on(19, 17, 45)),
      logged(on(19, 18, 45), on(20, 6, 40)),
    ];

    // When
    const cases = replayPlans(sleeps, '2026-05-10', DEFAULT_NAP_WINDOW);

    // Then
    expect(cases.map((entry) => entry.kind)).toEqual(['nap', 'nap', 'nap', 'nap', 'bedtime']);
    expect(cases.every((entry) => entry.score !== null)).toBe(true);
  });
});
