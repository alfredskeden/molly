import { describe, expect, it } from 'vitest';

import { sleep } from '../test/fixtures';
import { dayPlan, type Skip } from './day-plan';
import { dayRhythm, type DayRhythm } from './day-rhythm';
import { dayWindow, isNight } from './day-window';
import { DEFAULT_NAP_WINDOW } from './nap';
import { nextSleep, sleepContext } from './next-sleep';
import { withPlan } from './shown-plan';

const none = { sleep: [], feeding: [], change: [], medication: [] };
const on = (day: number, hours: number, minutes = 0) => new Date(2026, 8, day, hours, minutes);
const at = (day: number, hours: number, minutes = 0) => on(day, hours, minutes).toISOString();
const sleepTimer = (start: string) => ({ id: 1, child: 1, name: 'molly:sleep', start, duration: '', user: 1 });
/** Five months old through September 2026: the 3–6 month band (60 min awake, 2 h long). */
const fiveMonths = '2026-04-20';
type Sleeps = ReturnType<typeof sleep>[];

// Usually up at 07:00, three naps (09:00, 13:00, 17:00) and asleep for the night at 21:45.
const usual = Array.from({ length: 10 }, (_, index) => 10 + index).flatMap((day) => [
  sleep({ start: at(day - 1, 21, 45), end: at(day, 7, 0) }),
  sleep({ start: at(day, 9, 0), end: at(day, 10, 0) }),
  sleep({ start: at(day, 13, 0), end: at(day, 14, 30) }),
  sleep({ start: at(day, 17, 0), end: at(day, 17, 30) }),
]);
// Today runs late: nap 2 ended at 17:45, so the plan shows nap 3 at 19:55–20:35.
const today = [
  sleep({ start: at(19, 21, 45), end: at(20, 7, 0) }),
  sleep({ start: at(20, 10, 0), end: at(20, 11, 0) }),
  sleep({ start: at(20, 15, 30), end: at(20, 17, 45) }),
];
const plainAt = (sleeps: Sleeps, now: Date, birthDate: string | null = fiveMonths) => dayRhythm(sleeps, birthDate, DEFAULT_NAP_WINDOW, now);
const plannedAt = (sleeps: Sleeps, now: Date, skips: Skip[] = []) => withPlan(plainAt(sleeps, now), fiveMonths, skips);
const windowAt = (rhythm: DayRhythm, sleeps: Sleeps, now: Date, running: string | null = null) =>
  dayWindow({ ...none, sleep: sleeps }, running ? sleepTimer(running) : null, rhythm, now);

describe('the fixture', () => {
  it('shows nap 3 next at 20:30, its window starting less than 90 min before the usual bedtime', () => {
    // Given
    const sleeps = [...usual, ...today];

    // When
    const plan = dayPlan(sleeps, null, fiveMonths, plainAt(sleeps, on(20, 20, 30)), [], on(20, 20, 30));

    // Then
    expect(plan[0]).toMatchObject({ kind: 'nap', start: on(20, 19, 55) });
  });
});

describe('a late nap the plan showed, judged with the real plan', () => {
  it('keeps the day while it runs', () => {
    // Given
    const sleeps = [...usual, ...today];
    const now = on(20, 21, 0);

    // When
    const window = windowAt(plannedAt(sleeps, now), sleeps, now, at(20, 20, 30));

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 7, 0) });
    expect(isNight({ start: on(20, 20, 30), end: now }, sleeps, plannedAt(sleeps, now), now)).toBe(false);
  });

  it('keeps the day after it, where the plain rule would call it the night', () => {
    // Given
    const sleeps = [...usual, ...today, sleep({ start: at(20, 20, 30), end: at(20, 21, 5) })];
    const now = on(20, 21, 30);

    // When
    const windows = [plannedAt(sleeps, now), plainAt(sleeps, now)].map((rhythm) => windowAt(rhythm, sleeps, now));

    // Then
    expect(windows).toMatchObject([
      { kind: 'day', start: on(20, 7, 0) },
      { kind: 'night', start: on(20, 20, 30) },
    ]);
  });

  it('starts the night at the real bedtime after it', () => {
    // Given
    const sleeps = [...usual, ...today, sleep({ start: at(20, 20, 30), end: at(20, 21, 5) }), sleep({ start: at(20, 23, 20), end: at(21, 7, 0) })];
    const now = on(21, 2);

    // When
    const window = windowAt(plannedAt(sleeps, now), sleeps, now);

    // Then
    expect(window).toMatchObject({ kind: 'night', start: on(20, 23, 20) });
  });
});

describe('what the plan showed', () => {
  const sleeps = [...usual, ...today];

  it('is a nap for the plan’s next nap', () => {
    // When
    const shown = plannedAt(sleeps, on(20, 21)).shown!(sleeps, on(20, 20, 30), false);

    // Then
    expect(shown).toBe('nap');
  });

  it('is a skip once nap 3 was skipped before the sleep: the sleep is the night', () => {
    // Given
    const skip = { at: on(20, 18, 0), start: on(20, 19, 55), end: on(20, 20, 35) };
    const now = on(20, 18, 45);
    const rhythm = plannedAt(sleeps, now, [skip]);

    // When
    const shown = rhythm.shown!(sleeps, on(20, 18, 30), false);
    const window = windowAt(rhythm, sleeps, now, at(20, 18, 30));

    // Then
    expect(shown).toBe('skipped');
    expect(window).toMatchObject({ kind: 'night', start: on(20, 18, 30) });
  });

  it('leaves out a skip tapped after the sleep started', () => {
    // Given
    const skip = { at: on(20, 18, 40), start: on(20, 19, 55), end: on(20, 20, 35) };

    // When
    const shown = plannedAt(sleeps, on(20, 19), [skip]).shown!(sleeps, on(20, 18, 30), false);

    // Then
    expect(shown).toBe('nap');
  });

  it('is nothing when the plan shows bedtime without a skip', () => {
    // Given
    const third = [...sleeps, sleep({ start: at(20, 19, 0), end: at(20, 19, 40) })];

    // When
    const shown = plannedAt(third, on(20, 21, 30)).shown!(third, on(20, 21, 0), false);

    // Then
    expect(shown).toBeNull();
  });

  it.each([
    ['no birth date', null, on(20, 20, 30)],
    ['a 3-week-old', '2026-08-30', on(20, 20, 30)],
    ['a 4-year-old', '2022-09-01', on(20, 20, 30)],
    ['more than 6 h awake', fiveMonths, on(21, 0, 0)],
    ['45 min after the window', fiveMonths, on(20, 21, 21)],
  ])('is nothing without a plan: %s', (_, birthDate, start) => {
    // Given
    const rhythm = withPlan(plainAt(sleeps, start, birthDate), birthDate, []);

    // When
    const shown = rhythm.shown!(sleeps, start, false);

    // Then
    expect(shown).toBeNull();
  });

  it('is still the nap after a catnap: the catnap doesn’t move the wake', () => {
    // Given
    const withCatnap = [...sleeps, sleep({ start: at(20, 19, 50), end: at(20, 20, 0) })];

    // When
    const shown = plannedAt(withCatnap, on(20, 21)).shown!(withCatnap, on(20, 20, 30), false);

    // Then
    expect(shown).toBe('nap');
  });

  it('answers nothing without planning when only a skip could matter and none was tapped', () => {
    // When
    const shown = plannedAt(sleeps, on(20, 21)).shown!(sleeps, on(20, 20, 30), true);

    // Then
    expect(shown).toBeNull();
  });

  it('still finds a skip when only a skip could matter', () => {
    // Given
    const skip = { at: on(20, 18, 0), start: on(20, 19, 55), end: on(20, 20, 35) };

    // When
    const shown = plannedAt(sleeps, on(20, 19), [skip]).shown!(sleeps, on(20, 18, 30), true);

    // Then
    expect(shown).toBe('skipped');
  });

  it('never asks the rhythm’s own plan inside a judgement', () => {
    // Given
    let asked = 0;
    const counting: DayRhythm = {
      ...plainAt(sleeps, on(20, 21)),
      shown: () => {
        asked += 1;
        return null;
      },
    };

    // When
    withPlan(counting, fiveMonths, []).shown!(sleeps, on(20, 20, 30), false);

    // Then
    expect(asked).toBe(0);
  });
});

describe('the plan with the rhythm that carries it', () => {
  it('stays after a late nap it showed: bedtime is next', () => {
    // Given
    const sleeps = [...usual, ...today, sleep({ start: at(20, 20, 30), end: at(20, 21, 5) })];
    const now = on(20, 21, 30);
    const rhythm = plannedAt(sleeps, now);

    // When
    const next = nextSleep(sleeps, null, fiveMonths, rhythm, now);
    const plan = dayPlan(sleeps, null, fiveMonths, rhythm, [], now);

    // Then
    expect(next).toMatchObject({ kind: 'bedtime' });
    expect(plan).not.toEqual([]);
  });

  it('shows the sleeps after a late nap while it runs', () => {
    // Given
    const sleeps = [...usual, ...today];
    const now = on(20, 21, 0);

    // When
    const plan = dayPlan(sleeps, sleepTimer(at(20, 20, 30)), fiveMonths, plannedAt(sleeps, now), [], now);

    // Then
    expect(plan[0]).toMatchObject({ kind: 'bedtime' });
  });

  it('learns from past days split by the plain rule', () => {
    // Given
    // Yesterday ran late too: a nap the plan showed at 20:30, back asleep 25 min after it for the night.
    const yesterday = [
      sleep({ start: at(18, 21, 45), end: at(19, 7, 0) }),
      sleep({ start: at(19, 10, 0), end: at(19, 11, 0) }),
      sleep({ start: at(19, 15, 30), end: at(19, 17, 45) }),
      sleep({ start: at(19, 20, 30), end: at(19, 21, 5) }),
      sleep({ start: at(19, 21, 30), end: at(20, 7, 0) }),
    ];
    const history = usual.filter((entry) => Date.parse(entry.start) < on(18, 21, 45).getTime());
    const sleeps = [...history, ...yesterday, ...today.slice(1)];
    const now = on(20, 18, 0);
    const planned = plannedAt(sleeps, now);
    const plain = plainAt(sleeps, now);
    const verdicts = (rhythm: DayRhythm) => sleepContext(sleeps, null, fiveMonths, rhythm, now)!.pastDays[0]!.bedtime?.start;

    // When
    const [withPlan, without] = [verdicts(planned), verdicts(plain)];
    const judgedNow = isNight({ start: on(19, 20, 30), end: on(19, 21, 5) }, sleeps, planned, now);

    // Then
    expect(judgedNow).toBe(false);
    expect(without).toBe(at(19, 20, 30));
    expect(withPlan).toBe(without);
  });
});
