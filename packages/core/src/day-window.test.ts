import { describe, expect, it } from 'vitest';

import { sleep } from '../test/fixtures';
import { dayWindow, previousWindow, windowsBefore } from './day-window';
import { DEFAULT_NAP_WINDOW } from './nap';

const none = { sleep: [], feeding: [], change: [], medication: [] };
const noTimer = null;
const sleepTimer = (start: string) => ({ id: 1, child: 1, name: 'molly:sleep', start, duration: '', user: 1 });
const napWindow = DEFAULT_NAP_WINDOW;
const on = (day: number, hours: number, minutes = 0) => new Date(2026, 8, day, hours, minutes);
const at = (day: number, hours: number, minutes = 0) => on(day, hours, minutes).toISOString();

describe('the day window with nothing logged', () => {
  it('is Today from the nap-window start during the nap window', () => {
    // Given
    const now = on(20, 12);

    // When
    const window = dayWindow(none, noTimer, napWindow, now);

    // Then
    expect(window).toEqual({ kind: 'day', start: on(20, 7), end: on(20, 19), wake: on(20, 7), clock: true });
  });

  it('is Tonight from the last nap-window end in the evening', () => {
    // Given
    const now = on(20, 21);

    // When
    const window = dayWindow(none, noTimer, napWindow, now);

    // Then
    expect(window).toEqual({ kind: 'night', start: on(20, 19), end: on(21, 7), wake: on(20, 19), clock: true });
  });

  it("is Tonight from yesterday's nap-window end in the small hours", () => {
    // Given
    const now = on(20, 3);

    // When
    const window = dayWindow(none, noTimer, napWindow, now);

    // Then
    expect(window).toEqual({ kind: 'night', start: on(19, 19), end: on(20, 7), wake: on(19, 19), clock: true });
  });
});

describe('the day window after a night sleep', () => {
  it('is Today from the morning wake', () => {
    // Given
    const night = sleep({ start: at(19, 19, 30), end: at(20, 6, 40) });

    // When
    const window = dayWindow({ ...none, sleep: [night] }, noTimer, napWindow, on(20, 12));

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
    const window = dayWindow({ ...none, sleep: [lastNight, bedtime] }, noTimer, napWindow, on(20, 21, 30));

    // Then
    expect(window).toEqual({ kind: 'night', start: on(20, 19, 25), end: on(21, 7), wake: on(20, 6, 40), clock: false });
  });

  it('is Tonight from the running sleep timer once it started after the nap-window end', () => {
    // Given
    const running = sleepTimer(at(20, 19, 25));

    // When
    const window = dayWindow({ ...none, sleep: [lastNight] }, running, napWindow, on(20, 19, 26));

    // Then
    expect(window).toMatchObject({ kind: 'night', start: on(20, 19, 25) });
  });

  it('is Tonight from a nap that ended after the nap-window end', () => {
    // Given
    const lateNap = sleep({ start: at(20, 18, 30), end: at(20, 19, 40) });

    // When
    const window = dayWindow({ ...none, sleep: [lastNight, lateNap] }, noTimer, napWindow, on(20, 20));

    // Then
    expect(window).toMatchObject({ kind: 'night', start: on(20, 18, 30) });
  });

  it('is Tonight from a running nap once it is still going after the nap-window end', () => {
    // Given
    const running = sleepTimer(at(20, 18, 30));

    // When
    const window = dayWindow({ ...none, sleep: [lastNight] }, running, napWindow, on(20, 19, 5));

    // Then
    expect(window).toMatchObject({ kind: 'night', start: on(20, 18, 30) });
  });

  it('stays Today while a late nap is running before the nap-window end', () => {
    // Given
    const running = sleepTimer(at(20, 18, 30));

    // When
    const window = dayWindow({ ...none, sleep: [lastNight] }, running, napWindow, on(20, 18, 55));

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 6, 40) });
  });

  it('stays Today after a late nap that ended before the nap-window end', () => {
    // Given
    const lateNap = sleep({ start: at(20, 18, 0), end: at(20, 18, 50) });

    // When
    const window = dayWindow({ ...none, sleep: [lastNight, lateNap] }, noTimer, napWindow, on(20, 19, 20));

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
    const window = dayWindow({ ...none, sleep: [lastNight, bedtime] }, backToSleep, napWindow, on(21, 2));

    // Then
    expect(window).toEqual({ kind: 'night', start: on(20, 19, 25), end: on(21, 7), wake: on(20, 6, 40), clock: false });
  });
});

describe('the morning wake among several sleeps', () => {
  it('is the end closest to the nap-window start', () => {
    // Given
    const night = sleep({ start: at(19, 19, 30), end: at(20, 6, 30) });
    const dozedOff = sleep({ start: at(20, 6, 50), end: at(20, 8, 10) });

    // When
    const window = dayWindow({ ...none, sleep: [night, dozedOff] }, noTimer, napWindow, on(20, 12));

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 6, 30) });
  });

  it('ends a night that started inside the nap window, an 18:45 bedtime', () => {
    // Given
    const night = sleep({ start: at(19, 18, 45), end: at(20, 6, 30), nap: true });

    // When
    const window = dayWindow({ ...none, sleep: [night] }, noTimer, napWindow, on(20, 12));

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 6, 30), clock: false });
  });

  it('is never a morning nap, even one ending closer to the nap-window start', () => {
    // Given
    const night = sleep({ start: at(19, 19, 30), end: at(20, 5, 20) });
    const morningNap = sleep({ start: at(20, 7, 0), end: at(20, 7, 30) });

    // When
    const window = dayWindow({ ...none, sleep: [night, morningNap] }, noTimer, napWindow, on(20, 12));

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 5, 20) });
  });

  it('stays the early wake while the baby is back to sleep before the nap window', () => {
    // Given
    const night = sleep({ start: at(19, 19, 30), end: at(20, 5, 30) });
    const backToSleep = sleepTimer(at(20, 6, 0));

    // When
    const window = dayWindow({ ...none, sleep: [night] }, backToSleep, napWindow, on(20, 6, 20));

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 5, 30) });
  });

  it('moves to the end of the back-to-sleep once it is over', () => {
    // Given
    const night = sleep({ start: at(19, 19, 30), end: at(20, 5, 30) });
    const backToSleep = sleep({ start: at(20, 6, 0), end: at(20, 6, 40) });

    // When
    const window = dayWindow({ ...none, sleep: [night, backToSleep] }, noTimer, napWindow, on(20, 6, 45));

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
    const window = dayWindow({ ...none, sleep: [lastNight] }, noTimer, napWindow, now);

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 6, 40), end: on(20, 19, 50) });
  });

  it('stretches Tonight to half an hour from now when the baby sleeps in', () => {
    // Given
    const yesterdaysWake = sleep({ start: at(18, 19, 30), end: at(19, 6, 50) });
    const stillAsleep = sleepTimer(at(19, 19, 25));

    // When
    const window = dayWindow({ ...none, sleep: [yesterdaysWake] }, stillAsleep, napWindow, on(20, 6, 50));

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
    const window = dayWindow({ ...none, sleep: [lastNight] }, noTimer, napWindow, on(20, 12), bedtime);

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 6, 40), end: bedtimeEnd });
  });

  it('still runs half an hour past now when the bedtime window ends sooner', () => {
    // Given
    const bedtime = { end: on(20, 18, 40) };

    // When
    const window = dayWindow({ ...none, sleep: [lastNight] }, noTimer, napWindow, on(20, 18, 30), bedtime);

    // Then
    expect(window.end).toEqual(on(20, 19, 0));
  });

  it('leaves a night as it is', () => {
    // Given
    const bedtimeSleep = sleep({ start: at(20, 19, 30), end: at(20, 22, 0) });

    // When
    const window = dayWindow({ ...none, sleep: [lastNight, bedtimeSleep] }, noTimer, napWindow, on(20, 22, 30), { end: on(20, 19, 40) });

    // Then
    expect(window).toMatchObject({ kind: 'night', end: on(21, 7) });
  });
});

describe('the day window at its boundaries', () => {
  it('takes a wake exactly two hours before the nap-window start', () => {
    // Given
    const night = sleep({ start: at(19, 19, 30), end: at(20, 5, 0) });

    // When
    const window = dayWindow({ ...none, sleep: [night] }, noTimer, napWindow, on(20, 12));

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 5, 0), clock: false });
  });

  it('ignores a wake just over two hours before the nap-window start', () => {
    // Given
    const night = sleep({ start: at(19, 19, 30), end: at(20, 4, 59) });

    // When
    const window = dayWindow({ ...none, sleep: [night] }, noTimer, napWindow, on(20, 12));

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 7), clock: true });
  });

  it('takes a wake exactly two hours after the nap-window start', () => {
    // Given
    const night = sleep({ start: at(19, 19, 30), end: at(20, 9, 0) });

    // When
    const window = dayWindow({ ...none, sleep: [night] }, noTimer, napWindow, on(20, 12));

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 9, 0), clock: false });
  });

  it('goes by the clock once the wake range has closed with no wake', () => {
    // Given
    const yesterdaysWake = sleep({ start: at(18, 19, 30), end: at(19, 6, 40) });
    const stillAsleep = sleepTimer(at(19, 19, 25));

    // When
    const window = dayWindow({ ...none, sleep: [yesterdaysWake] }, stillAsleep, napWindow, on(20, 9, 1));

    // Then
    expect(window).toMatchObject({ kind: 'day', start: on(20, 7), clock: true });
  });

  it("goes by the clock before the wake range has closed when yesterday's wake has no bedtime", () => {
    // Given
    const yesterdaysWake = sleep({ start: at(18, 19, 30), end: at(19, 6, 40) });

    // When
    const window = dayWindow({ ...none, sleep: [yesterdaysWake] }, noTimer, napWindow, on(20, 3));

    // Then
    expect(window).toMatchObject({ kind: 'night', start: on(19, 19), end: on(20, 7), clock: true });
  });

  it('runs a bedtime after midnight to that morning', () => {
    // Given
    const yesterdaysWake = sleep({ start: at(18, 19, 30), end: at(19, 6, 40) });
    const lateBedtime = sleepTimer(at(20, 0, 30));

    // When
    const window = dayWindow({ ...none, sleep: [yesterdaysWake] }, lateBedtime, napWindow, on(20, 2));

    // Then
    expect(window).toMatchObject({ kind: 'night', start: on(20, 0, 30), end: on(20, 7), wake: on(19, 6, 40) });
  });

  it('is Tonight from a sleep that started exactly at the nap-window end and went on past it', () => {
    // Given
    const lastNight = sleep({ start: at(19, 19, 30), end: at(20, 6, 40) });
    const bedtime = sleepTimer(at(20, 19, 0));

    // When
    const window = dayWindow({ ...none, sleep: [lastNight] }, bedtime, napWindow, on(20, 19, 1));

    // Then
    expect(window).toMatchObject({ kind: 'night', start: on(20, 19, 0) });
  });

  it('is Tonight by the clock from exactly the nap-window end', () => {
    // Given
    const now = on(20, 19, 0);

    // When
    const window = dayWindow(none, noTimer, napWindow, now);

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
    const window = dayWindow({ ...none, sleep: [wake] }, bedtime, napWindow, october(25, 4));

    // Then
    expect(window).toMatchObject({ kind: 'night', start: october(24, 19, 30), end: october(25, 7) });
  });

  it('goes by the local clock on the evening before the change', () => {
    // Given
    const now = october(24, 21);

    // When
    const window = dayWindow(none, noTimer, napWindow, now);

    // Then
    expect(window).toMatchObject({ kind: 'night', start: october(24, 19), end: october(25, 7) });
  });
});

describe('the day window with a custom nap window', () => {
  const early = { start: '06:00', end: '18:30' };

  it('takes a wake within two hours of its start', () => {
    // Given
    const night = sleep({ start: at(19, 18, 45), end: at(20, 4, 10) });

    // When
    const window = dayWindow({ ...none, sleep: [night] }, noTimer, early, on(20, 12));

    // Then
    expect(window).toEqual({ kind: 'day', start: on(20, 4, 10), end: on(20, 18, 30), wake: on(20, 4, 10), clock: false });
  });

  it('flips to Tonight at a bedtime after its end', () => {
    // Given
    const night = sleep({ start: at(19, 18, 45), end: at(20, 5, 50) });
    const bedtime = sleepTimer(at(20, 18, 40));

    // When
    const window = dayWindow({ ...none, sleep: [night] }, bedtime, early, on(20, 20));

    // Then
    expect(window).toEqual({ kind: 'night', start: on(20, 18, 40), end: on(21, 6), wake: on(20, 5, 50), clock: false });
  });

  it('goes by its times when nothing is logged', () => {
    // Given
    const now = on(20, 18, 45);

    // When
    const window = dayWindow(none, noTimer, early, now);

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
    const pages = windowsBefore(entries, napWindow, on(20, 23, 10));

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
    const pages = windowsBefore(entries, napWindow, on(20, 12, 0));

    // Then
    expect(span(pages[0]!)).toEqual({ kind: 'night', start: on(19, 19, 30), end: on(20, 7, 0) });
  });

  it('go back 7 days and no further', () => {
    // Given
    const entries = { ...none, sleep: [...week, tonight] };

    // When
    const pages = windowsBefore(entries, napWindow, on(20, 23, 10));

    // Then
    expect(pages).toHaveLength(15);
    expect(span(pages.at(-1)!)).toEqual({ kind: 'day', start: on(13, 6, 40), end: on(13, 19, 30) });
  });

  it('go by the nap window on a day with no logged wake', () => {
    // Given
    // On the 18th the night ran to 10:00, too far from the nap-window start to be the morning wake.
    const lateMorning = week.map((entry) => (entry.end === at(18, 6, 40) ? { ...entry, end: at(18, 10, 0) } : entry));

    // When
    const pages = windowsBefore({ ...none, sleep: lateMorning }, napWindow, on(20, 12, 0));

    // Then
    expect(pages.slice(2, 5)).toMatchObject([
      { kind: 'night', start: on(18, 19, 0), end: on(19, 7, 0), clock: true },
      { kind: 'day', start: on(18, 7, 0), end: on(18, 19, 0), clock: true },
      { kind: 'night', start: on(17, 19, 30), end: on(18, 7, 0), clock: false },
    ]);
  });
  it("end a day with no logged bedtime at the nap-window end, not at a later day's bedtime", () => {
    // Given
    // The night from the 17th wasn't logged: after the 17th's wake, the next sleep that isn't a nap is the 18th's bedtime.
    const unlogged = week.filter((entry) => entry.start !== at(17, 19, 30));

    // When
    const pages = windowsBefore({ ...none, sleep: unlogged }, napWindow, on(20, 12, 0));

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
    const previous = previousWindow(entries, napWindow, on(21, 12, 0));

    // Then
    expect(span(previous)).toEqual({ kind: 'night', start: on(20, 19, 30), end: on(21, 7, 0) });
  });

  it("is today's day, just ended, on Tonight in the evening", () => {
    // Given
    const bedtime = sleep({ start: at(21, 19, 25), end: at(21, 22, 50), nap: false });
    const entries = { ...none, sleep: [...days, bedtime] };

    // When
    const previous = previousWindow(entries, napWindow, on(21, 23, 10));

    // Then
    expect(span(previous)).toEqual({ kind: 'day', start: on(21, 6, 40), end: on(21, 19, 25) });
  });

  it("is today's day, ended at bedtime, while the bedtime sleep is running", () => {
    // Given
    const running = sleepTimer(at(21, 19, 25));
    const entries = { ...none, sleep: days };

    // When
    const previous = previousWindow(entries, napWindow, on(21, 19, 40), running);

    // Then
    expect(span(previous)).toEqual({ kind: 'day', start: on(21, 6, 40), end: on(21, 19, 25) });
  });

  it("is yesterday's day on Tonight after midnight", () => {
    // Given
    const bedtime = sleep({ start: at(21, 19, 25), end: at(21, 23, 0), nap: false });
    const entries = { ...none, sleep: [...days, bedtime] };

    // When
    const previous = previousWindow(entries, napWindow, on(22, 2, 0));

    // Then
    expect(span(previous)).toEqual({ kind: 'day', start: on(21, 6, 40), end: on(21, 19, 25) });
  });

  it('goes by the nap window on a day with no logged wake', () => {
    // Given
    // On the 21st the night ran to 10:00, too far from the nap-window start to be the morning wake.
    const lateMorning = days.map((entry) => (entry.end === at(21, 6, 40) ? { ...entry, end: at(21, 10, 0) } : entry));
    const bedtime = sleep({ start: at(21, 19, 25), end: at(21, 22, 50), nap: false });

    // When
    const previous = previousWindow({ ...none, sleep: [...lateMorning, bedtime] }, napWindow, on(21, 23, 10));

    // Then
    expect(previous).toMatchObject({ kind: 'day', start: on(21, 7, 0), end: on(21, 19, 0), clock: true });
  });

  it.each([
    ['in the small hours', on(21, 3, 0)],
    ['just after the morning wake', on(21, 6, 45)],
    ['at midday', on(21, 12, 0)],
    ['after the nap-window end, still awake', on(21, 19, 20)],
    ['at bedtime', on(21, 19, 25)],
    ['late in the evening', on(21, 23, 10)],
  ])('is the newest of the past pages %s', (_, now) => {
    // Given
    const bedtime = sleep({ start: at(21, 19, 25), end: at(21, 22, 50), nap: false });
    const entries = { ...none, sleep: [...days, bedtime].filter((entry) => Date.parse(entry.end) <= now.getTime()) };

    // When
    const previous = previousWindow(entries, napWindow, now);

    // Then
    expect(previous).toEqual(windowsBefore(entries, napWindow, now)[0]);
  });
});
