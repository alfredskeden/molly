import type { Sleep, Timer } from '@molly/api';
import { describe, expect, it } from 'vitest';

import { change, feeding, sleep } from '../test/fixtures';
import { dayRhythm } from './day-rhythm';
import { dayWindow as windowWith, windowsBefore as windowsWith } from './day-window';
import type { EntriesByKind } from './latest';
import { DEFAULT_NAP_WINDOW, type NapWindow } from './nap';
import { needs, rhythm, sleepingSpan as spanWith } from './needs';

// A seeded two weeks of a five-month-old who sleeps 21:30 – 06:30 without a night feed, three naps,
// six feeds and five changes a day: what the needs should make of a real rhythm, without real logs.
const napWindow = DEFAULT_NAP_WINDOW;
const on = (day: number, hours: number, minutes = 0) => new Date(2026, 9, day, hours, minutes);
const at = (day: number, hours: number, minutes = 0) => on(day, hours, minutes).toISOString();
const BIRTH = '2026-05-10';
/** The day functions with the rhythm learned from the same sleeps, as the app calls them. */
const learned = (sleeps: Sleep[], setting: NapWindow, now: Date, birthDate: string | null = BIRTH) => dayRhythm(sleeps, birthDate, setting, now);
const dayWindow = (entries: EntriesByKind, running: Timer | null, setting: NapWindow, now: Date) =>
  windowWith(entries, running, learned(entries.sleep, setting, now), now);
const windowsBefore = (entries: EntriesByKind, setting: NapWindow, now: Date, days?: number, running?: Timer | null) =>
  windowsWith(entries, learned(entries.sleep, setting, now), now, days, running);
const sleepingSpan = (sleeps: Sleep[], running: Timer, birthDate: string | null, setting: NapWindow, now: Date) =>
  spanWith(sleeps, running, birthDate, learned(sleeps, setting, now, birthDate), now);
const HOUR = 60 * 60 * 1000;

type Clock = [hours: number, minutes: number];
const NAPS: [Clock, Clock][] = [
  [[8, 45], [9, 45]],
  [[12, 15], [13, 30]],
  [[16, 0], [16, 40]],
];
const FEEDS: [Clock, Clock][] = [
  [[6, 45], [7, 5]],
  [[9, 50], [10, 10]],
  [[13, 35], [13, 55]],
  [[16, 45], [17, 5]],
  [[19, 0], [19, 20]],
  [[21, 0], [21, 20]],
];
const CHANGES: Clock[] = [
  [6, 40],
  [10, 15],
  [13, 40],
  [17, 10],
  [21, 5],
];

/** Days 1 to `last` of October, each ending in the night that runs into the next morning. */
function seeded(last: number) {
  const days = Array.from({ length: last }, (_, i) => i + 1);
  return {
    sleep: days.flatMap((day) => [
      ...NAPS.map(([[sh, sm], [eh, em]]) => sleep({ start: at(day, sh, sm), end: at(day, eh, em), nap: true })),
      sleep({ start: at(day, 21, 30), end: at(day + 1, 6, 30) }),
    ]),
    feeding: days.flatMap((day) => FEEDS.map(([[sh, sm], [eh, em]]) => feeding({ start: at(day, sh, sm), end: at(day, eh, em) }))),
    change: days.flatMap((day) => CHANGES.map(([h, m]) => change({ time: at(day, h, m) }))),
    medication: [],
  };
}

const timer = (start: Date): Timer => ({ id: 1, child: 1, name: 'molly:sleep', start: start.toISOString(), duration: '', user: 1 });

describe('the needs over a seeded two weeks', () => {
  it('measure a gap that runs through the night against the nights, not the days', () => {
    // Given
    const entries = seeded(14);
    const night = timer(on(14, 21, 30));
    const entriesBefore = { ...entries, sleep: entries.sleep.filter((entry) => entry.start < night.start) };
    const now = on(15, 0, 2);
    const live = dayWindow(entriesBefore, night, napWindow, now);
    const windows = [live, ...windowsBefore(entriesBefore, napWindow, now, 14, night)];

    // When
    const found = rhythm(entriesBefore, windows, live.kind);

    // Then
    expect(found).toEqual({ feed: 9 * HOUR + 25 * 60_000, diaper: 9 * HOUR + 35 * 60_000 });
  });

  it("measure the days' gaps without the night's", () => {
    // Given
    const entries = seeded(14);
    const now = on(15, 11, 0);
    const morning = { ...entries, sleep: [...entries.sleep, sleep({ start: at(15, 8, 45), end: at(15, 9, 45) })] };
    const live = dayWindow(morning, null, napWindow, now);
    const windows = [live, ...windowsBefore(morning, napWindow, now, 14)];

    // When
    const found = rhythm(morning, windows, live.kind);

    // Then
    expect(found.feed).toBe(2 * HOUR + 45 * 60_000);
  });

  it('keep a baby fed at 21:20 and asleep for the night far from hungry at midnight', () => {
    // Given
    const entries = seeded(14);
    const now = on(15, 0, 2);
    const night = timer(on(14, 21, 30));
    const entriesBefore = { ...entries, sleep: entries.sleep.filter((entry) => entry.start < night.start) };
    const live = dayWindow(entriesBefore, night, napWindow, now);
    const usual = rhythm(entriesBefore, [live, ...windowsBefore(entriesBefore, napWindow, now, 14, night)], live.kind);
    const sleeping = sleepingSpan(entriesBefore.sleep, night, BIRTH, napWindow, now);

    // When
    const found = needs({ entries: entriesBefore, running: { sleep: sleeping, feeding: false }, next: null, rhythm: usual, vitaminD: false }, now);

    // Then
    expect(found.feed?.level).toBe(1);
    expect(found.diaper?.level).toBe(1);
    expect(Math.round(found.sleep!.value)).toBe(28);
  });
});

describe('when a running sleep likely ends', () => {
  it("is the usual morning wake for a night's sleep", () => {
    // Given
    const entries = seeded(14);
    const night = timer(on(14, 21, 30));
    const before = entries.sleep.filter((entry) => entry.start < night.start);

    // When
    const span = sleepingSpan(before, night, BIRTH, napWindow, on(15, 0, 2));

    // Then
    expect(span).toEqual({ start: on(14, 21, 30), wake: on(15, 6, 30) });
  });

  it('is the usual morning wake for the sleep after a night waking', () => {
    // Given
    const entries = seeded(14);
    const before = [...entries.sleep.filter((entry) => entry.start < at(14, 21, 30)), sleep({ start: at(14, 21, 30), end: at(15, 2, 0) })];
    const back = timer(on(15, 2, 20));

    // When
    const span = sleepingSpan(before, back, BIRTH, napWindow, on(15, 3, 0));

    // Then
    expect(span.wake).toEqual(on(15, 6, 30));
  });

  it('is the nap-window start the next morning without logged mornings', () => {
    // Given
    const night = timer(on(14, 21, 30));

    // When
    const span = sleepingSpan([], night, BIRTH, napWindow, on(15, 0, 2));

    // Then
    expect(span.wake).toEqual(on(15, 7, 0));
  });

  it('is now once a night runs past the usual morning wake', () => {
    // Given
    const entries = seeded(14);
    const night = timer(on(14, 21, 30));
    const before = entries.sleep.filter((entry) => entry.start < night.start);

    // When
    const span = sleepingSpan(before, night, BIRTH, napWindow, on(15, 7, 10));

    // Then
    expect(span.wake).toEqual(on(15, 7, 10));
  });

  it("is the nap's usual length for its place in the day", () => {
    // Given
    const entries = seeded(14);
    const today = [...entries.sleep, sleep({ start: at(15, 8, 45), end: at(15, 9, 45) })];
    const nap = timer(on(15, 12, 15));

    // When
    const span = sleepingSpan(today, nap, BIRTH, napWindow, on(15, 12, 40));

    // Then
    expect(span).toEqual({ start: on(15, 12, 15), wake: on(15, 13, 30) });
  });

  it('is 45 minutes into a nap without a birth date to predict from', () => {
    // Given
    const nap = timer(on(15, 12, 15));

    // When
    const span = sleepingSpan([], nap, null, napWindow, on(15, 12, 40));

    // Then
    expect(span.wake).toEqual(on(15, 13, 0));
  });
});
