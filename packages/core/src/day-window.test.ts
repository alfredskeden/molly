import { describe, expect, it } from 'vitest';

import { change, feeding, sleep } from '../test/fixtures';
import { dayPlan } from './day-plan';
import { dayRhythm } from './day-rhythm';
import { dayWindow, isNight, nightFrom, previousWindow, windowsBefore } from './day-window';
import { DEFAULT_NAP_WINDOW, isNightSleep } from './nap';
import { nextSleep } from './next-sleep';
import { windowStats } from './ring';

const none = { sleep: [], feeding: [], change: [], medication: [] };
const noTimer = null;
const sleepTimer = (start: string) => ({ id: 1, child: 1, name: 'molly:sleep', start, duration: '', user: 1 });
const napWindow = DEFAULT_NAP_WINDOW;
/** Nothing learned yet: the setting's 07:00–19:00 stands in, and no birth date gives the 3–6 month band. */
const setting = dayRhythm([], null, napWindow, new Date(2026, 8, 20));
const on = (day: number, hours: number, minutes = 0) => new Date(2026, 8, day, hours, minutes);
const at = (day: number, hours: number, minutes = 0) => on(day, hours, minutes).toISOString();

describe('the day window with nothing logged', () => {
  it('is Today from the nap-window start during the nap window', () => {
    // Given
    const now = on(20, 12);

    // When
    const window = dayWindow(none, noTimer, setting, now);

    // Then
    expect(window).toEqual({ kind: 'day', start: on(20, 7), end: on(20, 19), wake: on(20, 7), clock: true });
  });

  it('is Tonight from the last nap-window end in the evening', () => {
    // Given
    const now = on(20, 21);

    // When
    const window = dayWindow(none, noTimer, setting, now);

    // Then
    expect(window).toEqual({ kind: 'night', start: on(20, 19), end: on(21, 7), wake: on(20, 19), clock: true });
  });

  it("is Tonight from yesterday's nap-window end in the small hours", () => {
    // Given
    const now = on(20, 3);

    // When
    const window = dayWindow(none, noTimer, setting, now);

    // Then
    expect(window).toEqual({ kind: 'night', start: on(19, 19), end: on(20, 7), wake: on(19, 19), clock: true });
  });
});

describe('the day window after a night sleep', () => {
  it('is Today from the morning wake', () => {
    // Given
    const night = sleep({ start: at(19, 19, 30), end: at(20, 6, 40) });

    // When
    const window = dayWindow({ ...none, sleep: [night] }, noTimer, setting, on(20, 12));

    // Then
    expect(window).toEqual({ kind: 'day', start: on(20, 6, 40), end: on(20, 19), wake: on(20, 6, 40), clock: false });
  });
});

describe('the day window at bedtime', () => {
  const lastNight = sleep({ start: at(19, 19, 30), end: at(20, 6, 40) });

  it('is Tonight from a sleep that started after the nap-window end', () => {
    // Given
    const bedtime = sleep({ start: at(20, 19, 25), end: at(20, 21) });

    // When
    const window = dayWindow({ ...none, sleep: [lastNight, bedtime] }, noTimer, setting, on(20, 21, 30));

    // Then
    expect(window).toEqual({ kind: 'night', start: on(20, 19, 25), end: on(21, 7), wake: on(20, 6, 40), clock: false });
  });

  it('is Tonight from the running sleep timer once it started after the nap-window end', () => {
    // Given
    const running = sleepTimer(at(20, 19, 25));

    // When
    const window = dayWindow({ ...none, sleep: [lastNight] }, running, setting, on(20, 19, 26));

    // Then
    expect(window).toMatchObject({ kind: 'night', start: on(20, 19, 25) });
  });

  it('is Tonight from a sleep that started within 90 minutes of the usual bedtime', () => {
    // Given
    const lateNap = sleep({ start: at(20, 18, 30), end: at(20, 19, 40) });

    // When
    const window = dayWindow({ ...none, sleep: [lastNight, lateNap] }, noTimer, setting, on(20, 20));

    // Then
    expect(window).toMatchObject({ kind: 'night', start: on(20, 18, 30) });
  });

  it('is Tonight from a running afternoon nap once it has run 2 hours', () => {
    // Given
    const running = sleepTimer(at(20, 16, 30));

    // When
    const window = dayWindow({ ...none, sleep: [lastNight] }, running, setting, on(20, 18, 30));

    // Then
    expect(window).toMatchObject({ kind: 'night', start: on(20, 16, 30) });
  });

  it('stays Today while an afternoon nap runs, until it has run 2 hours', () => {
    // Given
    const running = sleepTimer(at(20, 16, 30));

    // When
    const window = dayWindow({ ...none, sleep: [lastNight] }, running, setting, on(20, 18, 29));

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 6, 40) });
  });

  it('stays Today after an afternoon nap that started before the bedtime cut', () => {
    // Given
    const lateNap = sleep({ start: at(20, 16, 50), end: at(20, 17, 40) });

    // When
    const window = dayWindow({ ...none, sleep: [lastNight, lateNap] }, noTimer, setting, on(20, 19, 20));

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 6, 40) });
  });
});

describe('the day window through the night', () => {
  const lastNight = sleep({ start: at(19, 19, 30), end: at(20, 6, 40) });
  const bedtime = sleep({ start: at(20, 19, 25), end: at(20, 23, 0) });

  it("keeps last night's Tonight after midnight, through a night feed and a short wake", () => {
    // Given
    const backToSleep = sleepTimer(at(20, 23, 40));

    // When
    const window = dayWindow({ ...none, sleep: [lastNight, bedtime] }, backToSleep, setting, on(21, 2));

    // Then
    expect(window).toEqual({ kind: 'night', start: on(20, 19, 25), end: on(21, 7), wake: on(20, 6, 40), clock: false });
  });
});

describe('the morning wake among several sleeps', () => {
  it('is the end of a sleep the baby went back to within the threshold, not the waking before it', () => {
    // Given
    const night = sleep({ start: at(19, 19, 30), end: at(20, 6, 30) });
    const dozedOff = sleep({ start: at(20, 6, 50), end: at(20, 8, 10) });

    // When
    const window = dayWindow({ ...none, sleep: [night, dozedOff] }, noTimer, setting, on(20, 12));

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 8, 10) });
  });

  it('ends a night that started inside the nap window, an 18:45 bedtime', () => {
    // Given
    const night = sleep({ start: at(19, 18, 45), end: at(20, 6, 30), nap: true });

    // When
    const window = dayWindow({ ...none, sleep: [night] }, noTimer, setting, on(20, 12));

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 6, 30), clock: false });
  });

  it('is never a morning nap, even one ending closer to the nap-window start', () => {
    // Given
    const night = sleep({ start: at(19, 19, 30), end: at(20, 5, 20) });
    const morningNap = sleep({ start: at(20, 7, 0), end: at(20, 7, 30) });

    // When
    const window = dayWindow({ ...none, sleep: [night, morningNap] }, noTimer, setting, on(20, 12));

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 5, 20) });
  });

  it('stays the night while the baby is back to sleep after an early waking', () => {
    // Given
    const yesterday = sleep({ start: at(18, 19, 30), end: at(19, 6, 40) });
    const night = sleep({ start: at(19, 19, 30), end: at(20, 5, 30) });
    const backToSleep = sleepTimer(at(20, 6, 0));

    // When
    const window = dayWindow({ ...none, sleep: [yesterday, night] }, backToSleep, setting, on(20, 6, 20));

    // Then
    expect(window).toMatchObject({ kind: 'night', start: on(19, 19, 30) });
  });

  it('is the end of the back-to-sleep once the baby has been up for the threshold', () => {
    // Given
    const night = sleep({ start: at(19, 19, 30), end: at(20, 5, 30) });
    const backToSleep = sleep({ start: at(20, 6, 0), end: at(20, 6, 40) });

    // When
    const window = dayWindow({ ...none, sleep: [night, backToSleep] }, noTimer, setting, on(20, 7, 40));

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 6, 40), wake: on(20, 6, 40) });
  });
});

describe('the day window range', () => {
  const lastNight = sleep({ start: at(19, 19, 30), end: at(20, 6, 40) });

  it('stays Today, stretched to half an hour from now, when still awake after the nap-window end', () => {
    // Given
    const now = on(20, 19, 20);

    // When
    const window = dayWindow({ ...none, sleep: [lastNight] }, noTimer, setting, now);

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 6, 40), end: on(20, 19, 50) });
  });

  it('stretches Tonight to half an hour from now when the baby sleeps in', () => {
    // Given
    const yesterdaysWake = sleep({ start: at(18, 19, 30), end: at(19, 6, 50) });
    const stillAsleep = sleepTimer(at(19, 19, 25));

    // When
    const window = dayWindow({ ...none, sleep: [yesterdaysWake] }, stillAsleep, setting, on(20, 6, 50));

    // Then
    expect(window).toMatchObject({ kind: 'night', start: on(19, 19, 25), end: on(20, 7, 20) });
  });
});

describe('the day window with a day plan', () => {
  const lastNight = sleep({ start: at(19, 19, 30), end: at(20, 6, 40) });

  it.each([
    ['after the nap-window end', on(20, 19, 40)],
    ['before the nap-window end', on(20, 18, 40)],
  ])("ends at the end of the plan's bedtime window, %s", (_when, bedtimeEnd) => {
    // Given
    const bedtime = { end: bedtimeEnd };

    // When
    const window = dayWindow({ ...none, sleep: [lastNight] }, noTimer, setting, on(20, 12), bedtime);

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 6, 40), end: bedtimeEnd });
  });

  it('still runs half an hour past now when the bedtime window ends sooner', () => {
    // Given
    const bedtime = { end: on(20, 18, 40) };

    // When
    const window = dayWindow({ ...none, sleep: [lastNight] }, noTimer, setting, on(20, 18, 30), bedtime);

    // Then
    expect(window.end).toEqual(on(20, 19, 0));
  });

  it('leaves a night as it is', () => {
    // Given
    const bedtimeSleep = sleep({ start: at(20, 19, 30), end: at(20, 22, 0) });

    // When
    const window = dayWindow({ ...none, sleep: [lastNight, bedtimeSleep] }, noTimer, setting, on(20, 22, 30), { end: on(20, 19, 40) });

    // Then
    expect(window).toMatchObject({ kind: 'night', end: on(21, 7) });
  });
});

describe('the day window at its boundaries', () => {
  it('takes a wake exactly two hours before the nap-window start', () => {
    // Given
    const night = sleep({ start: at(19, 19, 30), end: at(20, 5, 0) });

    // When
    const window = dayWindow({ ...none, sleep: [night] }, noTimer, setting, on(20, 12));

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 5, 0), clock: false });
  });

  it('ignores a wake just over two hours before the nap-window start', () => {
    // Given
    const night = sleep({ start: at(19, 19, 30), end: at(20, 4, 59) });

    // When
    const window = dayWindow({ ...none, sleep: [night] }, noTimer, setting, on(20, 12));

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 7), clock: true });
  });

  it('takes a wake exactly three hours after the nap-window start', () => {
    // Given
    const night = sleep({ start: at(19, 19, 30), end: at(20, 10, 0) });

    // When
    const window = dayWindow({ ...none, sleep: [night] }, noTimer, setting, on(20, 12));

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 10, 0), clock: false });
  });

  it('ignores a wake just over three hours after the nap-window start', () => {
    // Given
    const night = sleep({ start: at(19, 19, 30), end: at(20, 10, 1) });

    // When
    const window = dayWindow({ ...none, sleep: [night] }, noTimer, setting, on(20, 12));

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 7), clock: true });
  });

  it('goes by the clock once the wake range has closed with no wake', () => {
    // Given
    const yesterdaysWake = sleep({ start: at(18, 19, 30), end: at(19, 6, 40) });
    const stillAsleep = sleepTimer(at(19, 19, 25));

    // When
    const window = dayWindow({ ...none, sleep: [yesterdaysWake] }, stillAsleep, setting, on(20, 10, 1));

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 7), clock: true });
  });

  it("goes by the clock before the wake range has closed when yesterday's wake has no bedtime", () => {
    // Given
    const yesterdaysWake = sleep({ start: at(18, 19, 30), end: at(19, 6, 40) });

    // When
    const window = dayWindow({ ...none, sleep: [yesterdaysWake] }, noTimer, setting, on(20, 3));

    // Then
    expect(window).toMatchObject({ kind: 'night', start: on(19, 19), end: on(20, 7), clock: true });
  });

  it('runs a bedtime after midnight to that morning', () => {
    // Given
    const yesterdaysWake = sleep({ start: at(18, 19, 30), end: at(19, 6, 40) });
    const lateBedtime = sleepTimer(at(20, 0, 30));

    // When
    const window = dayWindow({ ...none, sleep: [yesterdaysWake] }, lateBedtime, setting, on(20, 2));

    // Then
    expect(window).toMatchObject({ kind: 'night', start: on(20, 0, 30), end: on(20, 7), wake: on(19, 6, 40) });
  });

  it('is Tonight from a sleep that started exactly at the nap-window end and went on past it', () => {
    // Given
    const lastNight = sleep({ start: at(19, 19, 30), end: at(20, 6, 40) });
    const bedtime = sleepTimer(at(20, 19, 0));

    // When
    const window = dayWindow({ ...none, sleep: [lastNight] }, bedtime, setting, on(20, 19, 1));

    // Then
    expect(window).toMatchObject({ kind: 'night', start: on(20, 19, 0) });
  });

  it('is Tonight by the clock from exactly the nap-window end', () => {
    // Given
    const now = on(20, 19, 0);

    // When
    const window = dayWindow(none, noTimer, setting, now);

    // Then
    expect(window).toMatchObject({ kind: 'night', start: on(20, 19), clock: true });
  });
});

describe('the day window around a clock change', () => {
  // Europe/Stockholm falls back from 03:00 to 02:00 on 25 October 2026.
  const october = (day: number, hours: number, minutes = 0) => new Date(2026, 9, day, hours, minutes);

  it('runs the night before the change to 07:00 local, not an hour off', () => {
    // Given
    const wake = sleep({ start: october(23, 19, 30).toISOString(), end: october(24, 6, 40).toISOString() });
    const bedtime = sleepTimer(october(24, 19, 30).toISOString());

    // When
    const window = dayWindow({ ...none, sleep: [wake] }, bedtime, setting, october(25, 4));

    // Then
    expect(window).toMatchObject({ kind: 'night', start: october(24, 19, 30), end: october(25, 7) });
  });

  it('goes by the local clock on the evening before the change', () => {
    // Given
    const now = october(24, 21);

    // When
    const window = dayWindow(none, noTimer, setting, now);

    // Then
    expect(window).toMatchObject({ kind: 'night', start: october(24, 19), end: october(25, 7) });
  });
});

describe('the day window with a custom nap window', () => {
  const earlySetting = dayRhythm([], null, { start: '06:00', end: '18:30' }, new Date(2026, 8, 20));

  it('takes a wake up to two hours before its start', () => {
    // Given
    const night = sleep({ start: at(19, 18, 45), end: at(20, 4, 10) });

    // When
    const window = dayWindow({ ...none, sleep: [night] }, noTimer, earlySetting, on(20, 12));

    // Then
    expect(window).toEqual({ kind: 'day', start: on(20, 4, 10), end: on(20, 18, 30), wake: on(20, 4, 10), clock: false });
  });

  it('flips to Tonight at a bedtime after its end', () => {
    // Given
    const night = sleep({ start: at(19, 18, 45), end: at(20, 5, 50) });
    const bedtime = sleepTimer(at(20, 18, 40));

    // When
    const window = dayWindow({ ...none, sleep: [night] }, bedtime, earlySetting, on(20, 20));

    // Then
    expect(window).toEqual({ kind: 'night', start: on(20, 18, 40), end: on(21, 6), wake: on(20, 5, 50), clock: false });
  });

  it('goes by its times when nothing is logged', () => {
    // Given
    const now = on(20, 18, 45);

    // When
    const window = dayWindow(none, noTimer, earlySetting, now);

    // Then
    expect(window).toMatchObject({ kind: 'night', start: on(20, 18, 30), end: on(21, 6), clock: true });
  });
});

describe('the past pages of the Today card', () => {
  /** Each day from the 12th to the 20th: woke 06:40 after a night from 19:30, napped 09:00–10:00. */
  const week = Array.from({ length: 9 }, (_, index) => 12 + index).flatMap((day) => [
    sleep({ start: at(day - 1, 19, 30), end: at(day, 6, 40), nap: false }),
    sleep({ start: at(day, 9, 0), end: at(day, 10, 0), nap: true }),
  ]);
  const tonight = sleep({ start: at(20, 19, 25), end: at(20, 22, 50), nap: false });
  const span = (window: { kind: string; start: Date; end: Date }) => ({ kind: window.kind, start: window.start, end: window.end });

  it("start with the day that just ended when it's Tonight, then the night and day before, newest first", () => {
    // Given
    const entries = { ...none, sleep: [...week, tonight] };

    // When
    const pages = windowsBefore(entries, setting, on(20, 23, 10));

    // Then
    expect(pages.slice(0, 3).map(span)).toEqual([
      { kind: 'day', start: on(20, 6, 40), end: on(20, 19, 25) },
      { kind: 'night', start: on(19, 19, 30), end: on(20, 6, 40) },
      { kind: 'day', start: on(19, 6, 40), end: on(19, 19, 30) },
    ]);
  });

  it('start with last night during the day', () => {
    // Given
    const entries = { ...none, sleep: week };

    // When
    const pages = windowsBefore(entries, setting, on(20, 12, 0));

    // Then
    expect(span(pages[0]!)).toEqual({ kind: 'night', start: on(19, 19, 30), end: on(20, 6, 40) });
  });

  it('go back 7 days and no further', () => {
    // Given
    const entries = { ...none, sleep: [...week, tonight] };

    // When
    const pages = windowsBefore(entries, setting, on(20, 23, 10));

    // Then
    expect(pages).toHaveLength(15);
    expect(span(pages.at(-1)!)).toEqual({ kind: 'day', start: on(13, 6, 40), end: on(13, 19, 30) });
  });

  it('go by the nap window on a day with no logged wake', () => {
    // Given
    // On the 18th the night ran to 10:30, too far from the nap-window start to be the morning wake.
    const lateMorning = week
      .filter((entry) => entry.start !== at(18, 9, 0))
      .map((entry) => (entry.end === at(18, 6, 40) ? { ...entry, end: at(18, 10, 30) } : entry));

    // When
    const pages = windowsBefore({ ...none, sleep: lateMorning }, setting, on(20, 12, 0));

    // Then
    expect(pages.slice(2, 5)).toMatchObject([
      { kind: 'night', start: on(18, 19, 0), end: on(19, 6, 40), clock: true },
      { kind: 'day', start: on(18, 7, 0), end: on(18, 19, 0), clock: true },
      { kind: 'night', start: on(17, 19, 30), end: on(18, 7, 0), clock: false },
    ]);
  });
  it("end a day with no logged bedtime at the usual bedtime, not at a later day's bedtime", () => {
    // Given
    // The night from the 17th wasn't logged: after the 17th's wake, the next sleep that isn't a nap is the 18th's bedtime.
    const unlogged = week.filter((entry) => entry.start !== at(17, 19, 30));

    // When
    const pages = windowsBefore({ ...none, sleep: unlogged }, setting, on(20, 12, 0));

    // Then
    expect(pages.slice(2, 6).map(span)).toEqual([
      { kind: 'night', start: on(18, 19, 0), end: on(19, 6, 40) },
      { kind: 'day', start: on(18, 7, 0), end: on(18, 19, 0) },
      { kind: 'night', start: on(17, 19, 0), end: on(18, 7, 0) },
      { kind: 'day', start: on(17, 6, 40), end: on(17, 19, 0) },
    ]);
  });
});

describe("the Today card's previous page", () => {
  /** Each day from the 18th to the 21st: woke 06:40 after a night from 19:30, napped 09:00–10:00. */
  const days = [18, 19, 20, 21].flatMap((day) => [
    sleep({ start: at(day - 1, 19, 30), end: at(day, 6, 40), nap: false }),
    sleep({ start: at(day, 9, 0), end: at(day, 10, 0), nap: true }),
  ]);
  const span = (window: { kind: string; start: Date; end: Date }) => ({ kind: window.kind, start: window.start, end: window.end });

  it('is last night during the day', () => {
    // Given
    const entries = { ...none, sleep: days };

    // When
    const previous = previousWindow(entries, setting, on(21, 12, 0));

    // Then
    expect(span(previous)).toEqual({ kind: 'night', start: on(20, 19, 30), end: on(21, 6, 40) });
  });

  it("is today's day, just ended, on Tonight in the evening", () => {
    // Given
    const bedtime = sleep({ start: at(21, 19, 25), end: at(21, 22, 50), nap: false });
    const entries = { ...none, sleep: [...days, bedtime] };

    // When
    const previous = previousWindow(entries, setting, on(21, 23, 10));

    // Then
    expect(span(previous)).toEqual({ kind: 'day', start: on(21, 6, 40), end: on(21, 19, 25) });
  });

  it("is today's day, ended at bedtime, while the bedtime sleep is running", () => {
    // Given
    const running = sleepTimer(at(21, 19, 25));
    const entries = { ...none, sleep: days };

    // When
    const previous = previousWindow(entries, setting, on(21, 19, 40), running);

    // Then
    expect(span(previous)).toEqual({ kind: 'day', start: on(21, 6, 40), end: on(21, 19, 25) });
  });

  it("is yesterday's day on Tonight after midnight", () => {
    // Given
    const bedtime = sleep({ start: at(21, 19, 25), end: at(21, 23, 0), nap: false });
    const entries = { ...none, sleep: [...days, bedtime] };

    // When
    const previous = previousWindow(entries, setting, on(22, 2, 0));

    // Then
    expect(span(previous)).toEqual({ kind: 'day', start: on(21, 6, 40), end: on(21, 19, 25) });
  });

  it('goes by the nap window on a day with no logged wake', () => {
    // Given
    // On the 21st the night ran to 10:30, too far from the nap-window start to be the morning wake.
    const lateMorning = days
      .filter((entry) => entry.start !== at(21, 9, 0))
      .map((entry) => (entry.end === at(21, 6, 40) ? { ...entry, end: at(21, 10, 30) } : entry));
    const bedtime = sleep({ start: at(21, 19, 25), end: at(21, 22, 50), nap: false });

    // When
    const previous = previousWindow({ ...none, sleep: [...lateMorning, bedtime] }, setting, on(21, 23, 10));

    // Then
    expect(previous).toMatchObject({ kind: 'day', start: on(21, 7, 0), end: on(21, 19, 0), clock: true });
  });

  it.each([
    ['in the small hours', on(21, 3, 0)],
    ['just after the morning wake', on(21, 6, 45)],
    ['at midday', on(21, 12, 0)],
    ['after the usual bedtime, still awake', on(21, 19, 20)],
    ['at bedtime', on(21, 19, 25)],
    ['late in the evening', on(21, 23, 10)],
  ])('is the newest of the past pages %s', (_, now) => {
    // Given
    const bedtime = sleep({ start: at(21, 19, 25), end: at(21, 22, 50), nap: false });
    const entries = { ...none, sleep: [...days, bedtime].filter((entry) => Date.parse(entry.end) <= now.getTime()) };

    // When
    const previous = previousWindow(entries, setting, now);

    // Then
    expect(previous).toEqual(windowsBefore(entries, setting, now)[0]);
  });
});

/** Days before the 20th, each from a night starting at `bed` to a wake at `wake`, with naps at the given times. */
const usualDays = (bed: [number, number], wake: [number, number], naps: [[number, number], [number, number]][], from = 10) =>
  Array.from({ length: 20 - from }, (_, index) => from + index).flatMap((day) => [
    sleep({ start: at(day - 1, ...bed), end: at(day, ...wake) }),
    ...naps.map(([start, end]) => sleep({ start: at(day, ...start), end: at(day, ...end) })),
  ]);
/** Five months old through September 2026: the 3–6 month band (60 min awake, 2 h long). */
const fiveMonths = '2026-04-20';

describe('the morning wake by the child’s rhythm', () => {
  // Usually up at 08:10 after a night from 21:00, first nap 90 min later.
  const usual = usualDays([21, 0], [8, 10], [[[9, 40], [10, 40]], [[13, 30], [14, 30]]]);
  const rhythmAt = (sleeps: ReturnType<typeof sleep>[], now: Date) => dayRhythm(sleeps, fiveMonths, napWindow, now);

  it('is a 06:31 wake before an 08:15–10:26 sleep: the back-to-sleep is a nap', () => {
    // Given
    const night = sleep({ start: at(19, 20, 58), end: at(20, 6, 31) });
    const backToSleep = sleep({ start: at(20, 8, 15), end: at(20, 10, 26) });
    const sleeps = [...usual, night, backToSleep];
    const now = on(20, 12);

    // When
    const window = dayWindow({ ...none, sleep: sleeps }, noTimer, rhythmAt(sleeps, now), now);

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 6, 31), wake: on(20, 6, 31), clock: false });
    expect(isNight({ start: on(20, 8, 15), end: on(20, 10, 26) }, sleeps, rhythmAt(sleeps, now), now)).toBe(false);
  });

  it('is still the night 30 min after a 06:31 wake, and a day from 06:31 once 60 min have passed', () => {
    // Given
    const night = sleep({ start: at(19, 20, 58), end: at(20, 6, 31) });
    const sleeps = [...usual, night];
    const [early, later] = [on(20, 7, 1), on(20, 7, 31)];

    // When
    const windows = [early, later].map((now) => dayWindow({ ...none, sleep: sleeps }, noTimer, rhythmAt(sleeps, now), now));

    // Then
    expect(windows).toMatchObject([
      { kind: 'night', start: on(19, 20, 58) },
      { kind: 'day', start: on(20, 6, 31) },
    ]);
  });

  it('skips an early waking the baby was back asleep from within the threshold', () => {
    // Given
    const night = sleep({ start: at(19, 21, 0), end: at(20, 6, 20) });
    const backToSleep = sleep({ start: at(20, 6, 40), end: at(20, 8, 0) });
    const sleeps = [...usual, night, backToSleep];
    const now = on(20, 12);

    // When
    const window = dayWindow({ ...none, sleep: sleeps }, noTimer, rhythmAt(sleeps, now), now);

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 8, 0) });
  });

  it('skips a long waking more than two hours before the usual wake', () => {
    // Given
    const night = sleep({ start: at(19, 21, 0), end: at(20, 4, 30) });
    const backToSleep = sleep({ start: at(20, 6, 0), end: at(20, 8, 0) });
    const sleeps = [...usual, night, backToSleep];
    const now = on(20, 12);

    // When
    const window = dayWindow({ ...none, sleep: sleeps }, noTimer, rhythmAt(sleeps, now), now);

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 8, 0) });
  });

  it('takes a late wake after a bad night, up to three hours after the usual wake', () => {
    // Given
    const night = sleep({ start: at(19, 21, 0), end: at(20, 11, 10) });
    const sleeps = [...usual, night];
    const now = on(20, 13);

    // When
    const window = dayWindow({ ...none, sleep: sleeps }, noTimer, rhythmAt(sleeps, now), now);

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 11, 10), clock: false });
  });

  it('needs at most two thirds of the usual first wake window awake', () => {
    // Given
    const shortWindows = usualDays([21, 0], [7, 0], [[[8, 0], [9, 0]]]);
    const night = sleep({ start: at(19, 21, 0), end: at(20, 6, 31) });
    const nap = sleep({ start: at(20, 7, 15), end: at(20, 8, 15) });
    const sleeps = [...shortWindows, night, nap];
    const now = on(20, 12);

    // When
    const window = dayWindow({ ...none, sleep: sleeps }, noTimer, rhythmAt(sleeps, now), now);

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 6, 31) });
  });

  it("goes by the setting's start under 3 months, with 75 min awake", () => {
    // Given
    const early = usualDays([20, 0], [5, 0], [[[7, 0], [8, 0]]]);
    const night = sleep({ start: at(19, 20, 0), end: at(20, 5, 30) });
    const nap = sleep({ start: at(20, 6, 40), end: at(20, 7, 40) });
    const sleeps = [...early, night, nap];
    const now = on(20, 12);

    // When
    const window = dayWindow({ ...none, sleep: sleeps }, noTimer, dayRhythm(sleeps, '2026-07-20', napWindow, now), now);

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 7, 40) });
  });
});

describe('bedtime by the child’s rhythm', () => {
  // Usually up at 07:00 and asleep for the night at 21:45.
  const usual = usualDays([21, 45], [7, 0], [[[9, 0], [10, 0]], [[13, 0], [14, 30]], [[17, 0], [17, 30]]]);
  const thisMorning = sleep({ start: at(19, 21, 45), end: at(20, 7, 0) });
  const rhythmAt = (sleeps: ReturnType<typeof sleep>[], now: Date) => dayRhythm(sleeps, fiveMonths, napWindow, now);

  it('is not a 25 min catnap at 19:30: the card stays Today and it is a nap', () => {
    // Given
    const catnap = sleep({ start: at(20, 19, 30), end: at(20, 19, 55) });
    const sleeps = [...usual, thisMorning, catnap];
    const now = on(20, 20, 0);

    // When
    const window = dayWindow({ ...none, sleep: sleeps }, noTimer, rhythmAt(sleeps, now), now);

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 7, 0) });
    expect(isNight({ start: on(20, 19, 30), end: on(20, 19, 55) }, sleeps, rhythmAt(sleeps, now), now)).toBe(false);
  });

  it('stays Today while the catnap runs', () => {
    // Given
    const sleeps = [...usual, thisMorning];
    const now = on(20, 19, 45);

    // When
    const window = dayWindow({ ...none, sleep: sleeps }, sleepTimer(at(20, 19, 30)), rhythmAt(sleeps, now), now);

    // Then
    expect(window).toMatchObject({ kind: 'day' });
  });

  it('is a sleep starting within 90 min of the usual bedtime, even after a waking 50 min in', () => {
    // Given
    const bedtime = sleep({ start: at(20, 21, 0), end: at(20, 21, 50) });
    const backToSleep = sleep({ start: at(20, 22, 10), end: at(21, 7, 0) });
    const sleeps = [...usual, thisMorning, bedtime, backToSleep];
    const now = on(21, 2);

    // When
    const window = dayWindow({ ...none, sleep: sleeps }, noTimer, rhythmAt(sleeps, now), now);

    // Then
    expect(window).toMatchObject({ kind: 'night', start: on(20, 21, 0) });
    expect(isNight({ start: on(20, 22, 10), end: on(21, 7, 0) }, sleeps, rhythmAt(sleeps, now), now)).toBe(true);
  });

  it('is an early evening sleep once it has run 2 hours, from its start', () => {
    // Given
    const sleeps = [...usual, thisMorning];
    const running = sleepTimer(at(20, 19, 0));
    const [before, after] = [on(20, 20, 59), on(20, 21, 0)];

    // When
    const windows = [before, after].map((now) => dayWindow({ ...none, sleep: sleeps }, running, rhythmAt(sleeps, now), now));

    // Then
    expect(windows).toMatchObject([
      { kind: 'day', start: on(20, 7, 0) },
      { kind: 'night', start: on(20, 19, 0) },
    ]);
  });

  it('is a 2 h evening sleep starting 2½ h before the usual bedtime', () => {
    // Given
    const sleeps = [...usual, thisMorning];
    const now = on(20, 21, 30);

    // When
    const night = isNight({ start: on(20, 19, 15), end: on(20, 21, 15) }, sleeps, rhythmAt(sleeps, now), now);

    // Then
    expect(night).toBe(true);
  });

  it('is never a 2½ h lunch nap', () => {
    // Given
    const lunch = sleep({ start: at(20, 12, 0), end: at(20, 14, 30) });
    const sleeps = [...usual, thisMorning, lunch];
    const now = on(20, 15);

    // When
    const window = dayWindow({ ...none, sleep: sleeps }, noTimer, rhythmAt(sleeps, now), now);

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 7, 0) });
    expect(isNight({ start: on(20, 12, 0), end: on(20, 14, 30) }, sleeps, rhythmAt(sleeps, now), now)).toBe(false);
  });

  it('is what stopping a running sleep would save', () => {
    // Given
    const sleeps = [...usual, thisMorning];
    const start = on(20, 19, 0);
    const [early, late] = [on(20, 20, 0), on(20, 21, 1)];

    // When
    const verdicts = [early, late].map((now) => isNight({ start, end: now }, sleeps, rhythmAt(sleeps, now), now));

    // Then
    expect(verdicts).toEqual([false, true]);
  });
});

describe('a bedtime after midnight', () => {
  // Usually up at 09:00 and asleep at 23:50.
  const usual = usualDays([23, 50], [9, 0], [[[11, 0], [12, 0]], [[15, 0], [16, 0]], [[19, 0], [19, 45]]]);
  const thisMorning = sleep({ start: at(19, 23, 50), end: at(20, 9, 0) });
  const late = sleep({ start: at(21, 0, 20), end: at(21, 9, 0) });
  const sleeps = [...usual, thisMorning, late];
  const rhythm = dayRhythm(sleeps, fiveMonths, napWindow, on(21, 12));

  it('belongs to the day before: that day runs to 00:20', () => {
    // When
    const pages = windowsBefore({ ...none, sleep: sleeps }, rhythm, on(21, 12));

    // Then
    expect(pages.slice(0, 2)).toMatchObject([
      { kind: 'night', start: on(21, 0, 20), end: on(21, 9, 0) },
      { kind: 'day', start: on(20, 9, 0), end: on(21, 0, 20) },
    ]);
  });

  it('keeps the day going past midnight while the baby is still up', () => {
    // When
    const window = dayWindow({ ...none, sleep: [...usual, thisMorning] }, noTimer, rhythm, on(21, 0, 10));

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 9, 0) });
  });

  it('is the night', () => {
    // When
    const night = isNight({ start: on(21, 0, 20), end: on(21, 9, 0) }, sleeps, rhythm, on(21, 12));

    // Then
    expect(night).toBe(true);
  });
});

describe('the nap-or-night verdict with no history', () => {
  it.each([
    ['a morning nap', on(20, 9, 0), on(20, 10, 0)],
    ['a nap running past the setting’s end', on(20, 18, 0), on(20, 19, 30)],
    ['a sleep starting after the setting’s end', on(20, 19, 30), on(20, 22, 0)],
    ['a sleep in the small hours', on(20, 3, 0), on(20, 4, 0)],
  ])('is the by-clock rule for %s', (_, start, end) => {
    // When
    const night = isNight({ start, end }, [], setting, end);

    // Then
    expect(night).toBe(isNightSleep(start, end, napWindow));
  });
});

describe('the night across the clock change', () => {
  // Europe/Stockholm falls back from 03:00 to 02:00 on 25 October 2026: up at 07:00, asleep at 20:00 local.
  const october = (day: number, hours: number, minutes = 0) => new Date(2026, 9, day, hours, minutes);
  const days = Array.from({ length: 14 }, (_, index) => 13 + index).flatMap((day) => [
    sleep({ start: october(day - 1, 20, 0).toISOString(), end: october(day, 7, 0).toISOString() }),
    sleep({ start: october(day, 9, 0).toISOString(), end: october(day, 10, 0).toISOString() }),
  ]);

  it('keeps the usual wake and bedtime as clock times on both sides', () => {
    // When
    const rhythms = [october(24, 12), october(26, 12)].map((now) => dayRhythm(days, fiveMonths, napWindow, now));

    // Then
    expect(rhythms).toMatchObject([
      { wake: 7 * 60, bedtime: 20 * 60 },
      { wake: 7 * 60, bedtime: 20 * 60 },
    ]);
  });

  it('has one bedtime and one wake for the night spanning the change', () => {
    // Given
    const now = october(26, 12);

    // When
    const pages = windowsBefore({ ...none, sleep: days }, dayRhythm(days, fiveMonths, napWindow, now), now, 2);

    // Then
    expect(pages.slice(0, 4).map((page) => [page.kind, page.start, page.end])).toEqual([
      ['night', october(25, 20, 0), october(26, 7, 0)],
      ['day', october(25, 7, 0), october(25, 20, 0)],
      ['night', october(24, 20, 0), october(25, 7, 0)],
      ['day', october(24, 7, 0), october(24, 20, 0)],
    ]);
  });
});

describe('when stopping a running sleep starts to save the night', () => {
  // Usually up at 07:00 and asleep for the night at 21:45.
  const usual = usualDays([21, 45], [7, 0], [[[9, 0], [10, 0]], [[13, 0], [14, 30]]]);
  const thisMorning = sleep({ start: at(19, 21, 45), end: at(20, 7, 0) });
  const sleeps = [...usual, thisMorning];
  const rhythmAt = (now: Date) => dayRhythm(sleeps, fiveMonths, napWindow, now);

  it('is its start for a sleep near the usual bedtime', () => {
    // When
    const from = nightFrom(on(20, 21, 0), sleeps, rhythmAt(on(20, 21, 5)), on(20, 21, 5));

    // Then
    expect(from).toEqual(on(20, 21, 0));
  });

  it('is once it has run 2 hours for an early evening sleep', () => {
    // When
    const from = nightFrom(on(20, 19, 0), sleeps, rhythmAt(on(20, 19, 10)), on(20, 19, 10));

    // Then
    expect(from).toEqual(on(20, 21, 0));
  });

  it('is never for a midday nap', () => {
    // When
    const from = nightFrom(on(20, 12, 0), sleeps, rhythmAt(on(20, 12, 10)), on(20, 12, 10));

    // Then
    expect(from).toBeNull();
  });
});

describe('an early morning wake near "Day starts"', () => {
  // "Day starts" 08:00, a learned usual wake of 08:30, the 3–6 month band (60 min threshold).
  const eight = { start: '08:00', end: '19:00' };
  const learned = (wake: number) => ({ ...dayRhythm([], null, eight, on(20, 12)), wake, wakeLearned: true });
  const lateWake = learned(8 * 60 + 30);
  const lastNight = (end: [number, number]) => sleep({ start: at(19, 22, 42), end: at(20, ...end) });

  it('starts the day at a 06:03 wake once the baby has been up past the threshold', () => {
    // Given
    const sleeps = [lastNight([6, 3])];

    // When
    const window = dayWindow({ ...none, sleep: sleeps }, noTimer, lateWake, on(20, 7, 5));

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 6, 3), wake: on(20, 6, 3), clock: false });
  });

  it('is still the night 37 min after a 06:03 wake', () => {
    // Given
    const sleeps = [lastNight([6, 3])];

    // When
    const window = dayWindow({ ...none, sleep: sleeps }, noTimer, lateWake, on(20, 6, 40));

    // Then
    expect(window).toMatchObject({ kind: 'night' });
  });

  it('makes the 08:38 sleep after a 06:03 wake the day’s first nap', () => {
    // Given
    const nap = sleep({ start: at(20, 8, 38), end: at(20, 9, 0) });
    const sleeps = [lastNight([6, 3]), nap];

    // When
    const night = isNight({ start: on(20, 8, 38), end: on(20, 9, 0) }, sleeps, lateWake, on(20, 9, 0));
    const window = dayWindow({ ...none, sleep: sleeps }, noTimer, lateWake, on(20, 9, 0));

    // Then
    expect(night).toBe(false);
    expect(window).toMatchObject({ kind: 'day', start: on(20, 6, 3) });
  });

  it('never saves a sleep from 08:38 after a 06:03 wake as the night', () => {
    // Given
    const sleeps = [lastNight([6, 3])];

    // When
    const from = nightFrom(on(20, 8, 38), sleeps, lateWake, on(20, 8, 40));

    // Then
    expect(from).toBeNull();
  });

  it('keeps a 07:45 wake inside both ranges as the morning', () => {
    // Given
    const sleeps = [lastNight([7, 45])];

    // When
    const window = dayWindow({ ...none, sleep: sleeps }, noTimer, lateWake, on(20, 12));

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 7, 45) });
  });

  it('takes a 10:30 wake after a bad night when the learned wake is earlier than "Day starts"', () => {
    // Given
    const sleeps = [lastNight([10, 30])];

    // When
    const window = dayWindow({ ...none, sleep: sleeps }, noTimer, learned(7 * 60), on(20, 12));

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 10, 30) });
  });

  it('does not take an 11:01 wake when the later of the two is 08:00', () => {
    // Given
    const sleeps = [lastNight([11, 1])];

    // When
    const window = dayWindow({ ...none, sleep: sleeps }, noTimer, learned(7 * 60), on(20, 12, 30));

    // Then
    expect(window).toMatchObject({ clock: true });
  });

  it('takes a wake exactly two hours before "Day starts"', () => {
    // Given
    const sleeps = [lastNight([6, 0])];

    // When
    const window = dayWindow({ ...none, sleep: sleeps }, noTimer, lateWake, on(20, 12));

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 6, 0) });
  });

  it('does not take a wake one minute earlier than that', () => {
    // Given
    const sleeps = [lastNight([5, 59])];

    // When
    const window = dayWindow({ ...none, sleep: sleeps }, noTimer, lateWake, on(20, 12));

    // Then
    expect(window).toMatchObject({ clock: true });
  });

  it('keeps a 06:03 waking the baby was back asleep from at 06:30 in the night', () => {
    // Given
    const backToSleep = sleep({ start: at(20, 6, 30), end: at(20, 8, 10) });
    const sleeps = [lastNight([6, 3]), backToSleep];

    // When
    const night = isNight({ start: on(20, 6, 30), end: on(20, 8, 10) }, sleeps, lateWake, on(20, 12));

    // Then
    expect(night).toBe(true);
  });

  it('keeps an hour awake at 03:00 in the night', () => {
    // Given
    const backToSleep = sleep({ start: at(20, 4, 0), end: at(20, 8, 20) });
    const sleeps = [lastNight([3, 0]), backToSleep];

    // When
    const window = dayWindow({ ...none, sleep: sleeps }, noTimer, lateWake, on(20, 12));

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 8, 20) });
  });

  it('gives the issue’s morning a day from 06:03 with the 08:38 sleep as a nap', () => {
    // Given
    const nap = sleep({ start: at(20, 8, 38), end: at(20, 9, 50) });
    const sleeps = [lastNight([6, 3]), nap];
    const moments = [on(20, 6, 40), on(20, 7, 5), on(20, 10)];

    // When
    const windows = moments.map((now) => dayWindow({ ...none, sleep: sleeps.filter((s) => Date.parse(s.start) < now.getTime()) }, noTimer, lateWake, now));
    const savedNight = isNight({ start: on(20, 8, 38), end: on(20, 9, 50) }, sleeps, lateWake, on(20, 9, 50));

    // Then
    expect(windows.map((window) => window.kind)).toEqual(['night', 'day', 'day']);
    expect(windows.slice(1).map((window) => window.start)).toEqual([on(20, 6, 3), on(20, 6, 3)]);
    expect(savedNight).toBe(false);
  });
});

describe('a past night ends where the next day starts', () => {
  // Usually asleep at 22:40 and up at 07:30, napping 09:30–10:30 and 14:00–15:00.
  const usual = usualDays([22, 40], [7, 30], [[[9, 30], [10, 30]], [[14, 0], [15, 0]]]);
  const rhythm = dayRhythm(usual, fiveMonths, napWindow, on(20, 12));
  const lastNight = (wake: [number, number]) => sleep({ start: at(19, 22, 40), end: at(20, ...wake) });
  const span = (window: { kind: string; start: Date; end: Date }) => ({ kind: window.kind, start: window.start, end: window.end });

  it('ends last night at a 06:00 wake, earlier than the usual one, where Today starts', () => {
    // Given
    const entries = { ...none, sleep: [...usual, lastNight([6, 0])] };

    // When
    const previous = previousWindow(entries, rhythm, on(20, 12));
    const today = dayWindow(entries, noTimer, rhythm, on(20, 12));

    // Then
    expect(span(previous)).toEqual({ kind: 'night', start: on(19, 22, 40), end: on(20, 6, 0) });
    expect(today.start).toEqual(on(20, 6, 0));
  });

  it('ends last night at an 08:15 wake, later than the usual one, where Today starts', () => {
    // Given
    const entries = { ...none, sleep: [...usual, lastNight([8, 15])] };

    // When
    const previous = previousWindow(entries, rhythm, on(20, 12));
    const today = dayWindow(entries, noTimer, rhythm, on(20, 12));

    // Then
    expect(span(previous)).toEqual({ kind: 'night', start: on(19, 22, 40), end: on(20, 8, 15) });
    expect(today.start).toEqual(on(20, 8, 15));
  });

  it('tiles a week of past days and nights with no overlap and no gap', () => {
    // Given
    // Up at 06:00 on the 14th and 17th, at 08:15 on the 16th and 19th.
    const wakes = new Map([
      [at(14, 7, 30), at(14, 6, 0)],
      [at(16, 7, 30), at(16, 8, 15)],
      [at(17, 7, 30), at(17, 6, 0)],
      [at(19, 7, 30), at(19, 8, 15)],
    ]);
    const varied = usual.map((entry) => ({ ...entry, end: wakes.get(entry.end) ?? entry.end }));
    const entries = { ...none, sleep: [...varied, lastNight([6, 0])] };

    // When
    const live = dayWindow(entries, noTimer, rhythm, on(20, 12));
    const pages = windowsBefore(entries, rhythm, on(20, 12));

    // Then
    expect(pages[0]!.end).toEqual(live.start);
    expect(pages.slice(1).map((page) => page.end)).toEqual(pages.slice(0, -1).map((page) => page.start));
    expect(pages.slice(0, 9).map((page) => page.end)).toEqual([
      on(20, 6, 0),
      on(19, 22, 40),
      on(19, 8, 15),
      on(18, 22, 40),
      on(18, 7, 30),
      on(17, 22, 40),
      on(17, 6, 0),
      on(16, 22, 40),
      on(16, 8, 15),
    ]);
  });

  it('ends a night at "Day starts" when the next morning has no wake', () => {
    // Given
    // The night ran to 11:00, past the wake range.
    const entries = { ...none, sleep: [...usual, lastNight([11, 0])] };

    // When
    const previous = previousWindow(entries, rhythm, on(20, 12));

    // Then
    expect(previous).toMatchObject({ kind: 'night', start: on(19, 22, 40), end: on(20, 7, 0), clock: false });
  });

  it('keeps the live night running to the usual wake', () => {
    // Given
    const tonight = sleep({ start: at(20, 22, 40), end: at(20, 23, 30) });
    const entries = { ...none, sleep: [...usual, lastNight([6, 0]), tonight] };

    // When
    const window = dayWindow(entries, noTimer, rhythm, on(21, 2));

    // Then
    expect(span(window)).toEqual({ kind: 'night', start: on(20, 22, 40), end: on(21, 7, 30) });
  });

  it("counts a morning's feed, diaper and nap after a 06:00 wake on Today, not on last night", () => {
    // Given
    const nap = sleep({ start: at(20, 7, 10), end: at(20, 7, 25) });
    const entries = {
      ...none,
      sleep: [...usual, lastNight([6, 0]), nap],
      feeding: [feeding({ start: at(20, 6, 20), end: at(20, 6, 35) })],
      change: [change({ time: at(20, 6, 30) })],
    };

    // When
    const night = windowStats(previousWindow(entries, rhythm, on(20, 12)), entries);
    const today = windowStats(dayWindow(entries, noTimer, rhythm, on(20, 12)), entries);

    // Then
    expect(night).toMatchObject({ sleptMs: (7 * 60 + 20) * 60 * 1000, feeds: 0, diapers: 0 });
    expect(today).toMatchObject({ feeds: 1, diapers: 1, naps: 1 });
  });
});

describe('a night with no bedtime logged', () => {
  /** Usually up at 07:00 and asleep at `bed`, with no bedtime logged on the 19th (so the 20th has no wake). */
  const unlogged = (bed: [number, number]) =>
    usualDays(bed, [7, 0], [[[9, 30], [10, 30]], [[14, 0], [15, 0]]]).filter((entry) => entry.start !== at(19, ...bed));
  const span = (window: { kind: string; start: Date; end: Date }) => ({ kind: window.kind, start: window.start, end: window.end });

  it('starts at the usual bedtime its day ended at, 21:00 after "Day ends" at 19:00', () => {
    // Given
    const sleeps = unlogged([21, 0]);
    const rhythm = dayRhythm(sleeps, fiveMonths, napWindow, on(20, 12));

    // When
    const pages = windowsBefore({ ...none, sleep: sleeps }, rhythm, on(20, 12));

    // Then
    expect(pages.slice(0, 3).map(span)).toEqual([
      { kind: 'night', start: on(19, 21, 0), end: on(20, 7, 0) },
      { kind: 'day', start: on(19, 7, 0), end: on(19, 21, 0) },
      { kind: 'night', start: on(18, 21, 0), end: on(19, 7, 0) },
    ]);
  });

  it('starts Tonight at 21:00 after midnight, listed once', () => {
    // Given
    const sleeps = unlogged([21, 0]);
    const rhythm = dayRhythm(sleeps, fiveMonths, napWindow, on(20, 2));

    // When
    const live = dayWindow({ ...none, sleep: sleeps }, noTimer, rhythm, on(20, 2));
    const pages = windowsBefore({ ...none, sleep: sleeps }, rhythm, on(20, 2));

    // Then
    expect(live).toMatchObject({ kind: 'night', start: on(19, 21, 0), end: on(20, 7, 0), clock: true });
    expect(pages.slice(0, 2).map(span)).toEqual([
      { kind: 'day', start: on(19, 7, 0), end: on(19, 21, 0) },
      { kind: 'night', start: on(18, 21, 0), end: on(19, 7, 0) },
    ]);
  });

  it('starts at an 18:30 usual bedtime, earlier than "Day ends", with no gap', () => {
    // Given
    const sleeps = unlogged([18, 30]);
    const rhythm = dayRhythm(sleeps, fiveMonths, napWindow, on(20, 12));

    // When
    const pages = windowsBefore({ ...none, sleep: sleeps }, rhythm, on(20, 12));

    // Then
    expect(pages.slice(0, 2).map(span)).toEqual([
      { kind: 'night', start: on(19, 18, 30), end: on(20, 7, 0) },
      { kind: 'day', start: on(19, 7, 0), end: on(19, 18, 30) },
    ]);
  });
});

describe('a wake at the usual time', () => {
  // Usually up at 08:08 after a night from 21:00, first nap 90 min later: the 3–6 month band, 60 min awake.
  const usual = usualDays([21, 0], [8, 8], [[[9, 38], [10, 38]], [[13, 30], [14, 30]]]);
  const rhythmAt = (sleeps: ReturnType<typeof sleep>[], now: Date) => dayRhythm(sleeps, fiveMonths, napWindow, now);
  const windowAt = (sleeps: ReturnType<typeof sleep>[], now: Date, running: string | null = null) =>
    dayWindow({ ...none, sleep: sleeps }, running === null ? noTimer : sleepTimer(running), rhythmAt(sleeps, now), now);

  it('starts the day at once at an 08:05 wake', () => {
    // Given
    const sleeps = [...usual, sleep({ start: at(19, 21, 0), end: at(20, 8, 5) })];

    // When
    const window = windowAt(sleeps, on(20, 8, 8));

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 8, 5), wake: on(20, 8, 5), clock: false });
  });

  it('is still the night 10 min after an early waking at 05:10', () => {
    // Given
    const sleeps = [...usual, sleep({ start: at(19, 21, 0), end: at(20, 5, 10) })];

    // When
    const window = windowAt(sleeps, on(20, 5, 20));

    // Then
    expect(window).toMatchObject({ kind: 'night', start: on(19, 21, 0) });
  });

  it('starts the day at once at a wake 30 min before or after the usual wake', () => {
    // Given
    const before = [...usual, sleep({ start: at(19, 21, 0), end: at(20, 7, 38) })];
    const after = [...usual, sleep({ start: at(19, 21, 0), end: at(20, 8, 38) })];

    // When
    const windows = [windowAt(before, on(20, 7, 40)), windowAt(after, on(20, 8, 40))];

    // Then
    expect(windows).toMatchObject([
      { kind: 'day', start: on(20, 7, 38) },
      { kind: 'day', start: on(20, 8, 38) },
    ]);
  });

  it('waits the threshold after a wake 31 min before or after the usual wake', () => {
    // Given
    const before = [...usual, sleep({ start: at(19, 21, 0), end: at(20, 7, 37) })];
    const after = [...usual, sleep({ start: at(19, 21, 0), end: at(20, 8, 39) })];

    // When
    const windows = [windowAt(before, on(20, 7, 40)), windowAt(after, on(20, 8, 41))];

    // Then
    expect(windows).toMatchObject([
      { kind: 'night', start: on(19, 21, 0) },
      { kind: 'night', start: on(19, 21, 0) },
    ]);
  });

  it('finds no wake at the usual time without a night before it', () => {
    // Given
    const noNight = usual.filter((entry) => Date.parse(entry.start) < on(19, 11).getTime());
    const sleeps = [...noNight, sleep({ start: at(20, 6, 0), end: at(20, 8, 5) })];

    // When
    const window = windowAt(sleeps, on(20, 8, 8));

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 7, 0), clock: true });
  });

  it('measures on time from "Day starts" under 3 months', () => {
    // Given
    const young = usualDays([20, 0], [6, 0], [[[7, 0], [8, 0]]]);
    const onTime = [...young, sleep({ start: at(19, 20, 0), end: at(20, 7, 20) })];
    const late = [...young, sleep({ start: at(19, 20, 0), end: at(20, 7, 31) })];
    const rhythm = (sleeps: ReturnType<typeof sleep>[], now: Date) => dayRhythm(sleeps, '2026-07-20', napWindow, now);

    // When
    const windows = [
      dayWindow({ ...none, sleep: onTime }, noTimer, rhythm(onTime, on(20, 7, 22)), on(20, 7, 22)),
      dayWindow({ ...none, sleep: late }, noTimer, rhythm(late, on(20, 7, 35)), on(20, 7, 35)),
    ];

    // Then
    expect(windows).toMatchObject([
      { kind: 'day', start: on(20, 7, 20) },
      { kind: 'night', start: on(19, 20, 0) },
    ]);
  });

  it('measures on time from "Day starts" with fewer than 3 learned days', () => {
    // Given
    const sleeps = [...usualDays([21, 0], [8, 8], [[[9, 38], [10, 38]]], 18), sleep({ start: at(19, 21, 0), end: at(20, 6, 50) })];

    // When
    const window = windowAt(sleeps, on(20, 6, 55));

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 6, 50) });
  });

  it('measures on time from the learned wake, not "Day starts", once a wake is learned', () => {
    // Given
    const eight = { start: '08:00', end: '19:00' };
    const rhythm = { ...dayRhythm([], fiveMonths, eight, on(20, 12)), wake: 8 * 60 + 30, wakeLearned: true };
    const early = [sleep({ start: at(19, 21, 0), end: at(20, 7, 40) })];
    const near = [sleep({ start: at(19, 21, 0), end: at(20, 8, 5) })];

    // When
    const windows = [
      dayWindow({ ...none, sleep: early }, noTimer, rhythm, on(20, 7, 45)),
      dayWindow({ ...none, sleep: near }, noTimer, rhythm, on(20, 8, 10)),
    ];

    // Then
    expect(windows).toMatchObject([{ kind: 'night' }, { kind: 'day', start: on(20, 8, 5) }]);
  });

  it('is the night again once the baby is back asleep 10 min after an 08:05 wake', () => {
    // Given
    const sleeps = [...usual, sleep({ start: at(19, 21, 0), end: at(20, 8, 5) })];

    // When
    const window = windowAt(sleeps, on(20, 8, 20), at(20, 8, 15));

    // Then
    expect(window).toMatchObject({ kind: 'night', start: on(19, 21, 0) });
  });

  it('saves a sleep from 08:15, 10 min after an 08:05 wake, as the night', () => {
    // Given
    const morning = [...usual, sleep({ start: at(19, 21, 0), end: at(20, 8, 5) })];
    const backToSleep = sleep({ start: at(20, 8, 15), end: at(20, 9, 30) });
    const sleeps = [...morning, backToSleep];

    // When
    const night = isNight({ start: on(20, 8, 15), end: on(20, 9, 30) }, sleeps, rhythmAt(sleeps, on(20, 9, 30)), on(20, 9, 30));
    const from = nightFrom(on(20, 8, 15), morning, rhythmAt(morning, on(20, 8, 20)), on(20, 8, 20));

    // Then
    expect(night).toBe(true);
    expect(from).toEqual(on(20, 8, 15));
  });

  it('starts the day at once when that sleep ends on time, at 08:35', () => {
    // Given
    const sleeps = [...usual, sleep({ start: at(19, 21, 0), end: at(20, 8, 5) }), sleep({ start: at(20, 8, 15), end: at(20, 8, 35) })];

    // When
    const window = windowAt(sleeps, on(20, 8, 36));

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 8, 35) });
  });

  it('waits the threshold when that sleep ends late, at 09:30', () => {
    // Given
    const sleeps = [...usual, sleep({ start: at(19, 21, 0), end: at(20, 8, 5) }), sleep({ start: at(20, 8, 15), end: at(20, 9, 30) })];

    // When
    const windows = [windowAt(sleeps, on(20, 10, 29)), windowAt(sleeps, on(20, 10, 30))];

    // Then
    expect(windows).toMatchObject([
      { kind: 'night', start: on(19, 21, 0) },
      { kind: 'day', start: on(20, 9, 30) },
    ]);
  });

  it('makes a sleep from 09:20, past the threshold after an 08:05 wake, a nap', () => {
    // Given
    const morning = [...usual, sleep({ start: at(19, 21, 0), end: at(20, 8, 5) })];
    const sleeps = [...morning, sleep({ start: at(20, 9, 20), end: at(20, 10, 0) })];

    // When
    const night = isNight({ start: on(20, 9, 20), end: on(20, 10, 0) }, sleeps, rhythmAt(sleeps, on(20, 10, 0)), on(20, 10, 0));
    const window = windowAt(morning, on(20, 9, 30), at(20, 9, 20));

    // Then
    expect(night).toBe(false);
    expect(window).toMatchObject({ kind: 'day', start: on(20, 8, 5) });
  });

  it('plans a first nap 5 min after an 08:05 wake, and none once the baby is back asleep', () => {
    // Given
    const sleeps = [...usual, sleep({ start: at(19, 21, 0), end: at(20, 8, 5) })];
    const [awake, asleep] = [on(20, 8, 10), on(20, 8, 20)];
    const running = sleepTimer(at(20, 8, 15));

    // When
    const next = nextSleep(sleeps, noTimer, fiveMonths, rhythmAt(sleeps, awake), awake);
    const plan = dayPlan(sleeps, noTimer, fiveMonths, rhythmAt(sleeps, awake), [], awake);
    const undone = [nextSleep(sleeps, running, fiveMonths, rhythmAt(sleeps, asleep), asleep), dayPlan(sleeps, running, fiveMonths, rhythmAt(sleeps, asleep), [], asleep)];

    // Then
    expect(next).toMatchObject({ kind: 'nap' });
    expect(plan[0]).toMatchObject({ kind: 'nap' });
    expect(undone).toEqual([null, []]);
  });
});
