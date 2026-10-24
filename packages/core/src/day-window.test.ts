import { describe, expect, it } from 'vitest';

import { sleep } from '../test/fixtures';
import { dayRhythm } from './day-rhythm';
import { dayWindow, isNight, previousWindow, windowsBefore } from './day-window';
import { DEFAULT_NAP_WINDOW, isNightSleep } from './nap';

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
      { kind: 'night', start: on(19, 19, 30), end: on(20, 7, 0) },
      { kind: 'day', start: on(19, 6, 40), end: on(19, 19, 30) },
    ]);
  });

  it('start with last night during the day', () => {
    // Given
    const entries = { ...none, sleep: week };

    // When
    const pages = windowsBefore(entries, setting, on(20, 12, 0));

    // Then
    expect(span(pages[0]!)).toEqual({ kind: 'night', start: on(19, 19, 30), end: on(20, 7, 0) });
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
      { kind: 'night', start: on(18, 19, 0), end: on(19, 7, 0), clock: true },
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
      { kind: 'night', start: on(18, 19, 0), end: on(19, 7, 0) },
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
    expect(span(previous)).toEqual({ kind: 'night', start: on(20, 19, 30), end: on(21, 7, 0) });
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
