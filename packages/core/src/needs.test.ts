import { describe, expect, it } from 'vitest';

import { change, feeding, medication, sleep } from '../test/fixtures';
import type { DayWindow } from './day-window';
import { mood, moodlets, needLevel, needs, needValue, rhythm, usualGap, wants, type Need, type Needs, type NeedsInput } from './needs';

const on = (day: number, hours: number, minutes = 0) => new Date(2026, 9, day, hours, minutes);
const at = (day: number, hours: number, minutes = 0) => on(day, hours, minutes).toISOString();
const HOUR = 60 * 60 * 1000;
const windowOf = (kind: DayWindow['kind'], start: Date, end: Date): DayWindow => ({ kind, start, end, wake: start, clock: false });
/** 11 Oct: day 07:00–19:00, night 19:00–07:00 on the 12th. */
const days = [windowOf('day', on(11, 7), on(11, 19)), windowOf('night', on(11, 19), on(12, 7))];
/** Entries as spans that each last no time, `hours` after 07:00 on 11 Oct. */
const spansAt = (...hours: number[]) =>
  hours.map((hour) => new Date(on(11, 7).getTime() + hour * HOUR)).map((time) => ({ start: time, end: time }));

describe('a need', () => {
  it('is full right after its entry', () => {
    // When
    const value = needValue(on(12, 9), on(12, 12), on(12, 9));

    // Then
    expect(value).toBe(100);
  });

  it('drains in a straight line towards its due time', () => {
    // When
    const value = needValue(on(12, 9), on(12, 12), on(12, 10, 30));

    // Then
    expect(value).toBe(50);
  });

  it('is empty at its due time', () => {
    // When
    const value = needValue(on(12, 9), on(12, 12), on(12, 12));

    // Then
    expect(value).toBe(0);
  });

  it('stays empty past its due time', () => {
    // When
    const value = needValue(on(12, 9), on(12, 12), on(12, 15));

    // Then
    expect(value).toBe(0);
  });

  it('stays full for an entry logged ahead of the clock', () => {
    // When
    const value = needValue(on(12, 9), on(12, 12), on(12, 8));

    // Then
    expect(value).toBe(100);
  });

  it('is empty when it was due by the time of its entry', () => {
    // When
    const value = needValue(on(12, 9), on(12, 9), on(12, 9));

    // Then
    expect(value).toBe(0);
  });
});

describe('the level of a need', () => {
  it.each([
    [100, 0],
    [76, 0],
    [75, 1],
    [51, 1],
    [50, 2],
    [26, 2],
    [25, 3],
    [0, 3],
  ] as const)('at %i is %i', (value, level) => {
    // When
    const found = needLevel(value);

    // Then
    expect(found).toBe(level);
  });
});

describe('the usual gap', () => {
  it('is unknown without entries', () => {
    // When
    const gap = usualGap([], days, 'day');

    // Then
    expect(gap).toBeNull();
  });

  it('is unknown with fewer than five gaps', () => {
    // Given
    const spans = spansAt(0, 2, 4, 6, 8);

    // When
    const gap = usualGap(spans, days, 'day');

    // Then
    expect(gap).toBeNull();
  });

  it('is the median of five gaps in the day', () => {
    // Given
    const spans = spansAt(0, 2, 5, 7, 9, 12);

    // When
    const gap = usualGap(spans, days, 'day');

    // Then
    expect(gap).toBe(2 * HOUR);
  });

  it('runs from the end of one entry to the start of the next', () => {
    // Given
    const spans = [0, 3, 6, 9, 12, 15].map((hour) => ({ start: on(11, 1 + hour), end: on(11, 1 + hour, 30) }));
    const wide = [windowOf('day', on(11, 0), on(12, 0))];

    // When
    const gap = usualGap(spans, wide, 'day');

    // Then
    expect(gap).toBe(2.5 * HOUR);
  });

  it("counts a gap in the window its start falls in, leaving out the other window kind's", () => {
    // Given
    const spans = spansAt(0, 2, 4, 6, 8, 10, 12, 14.5, 17, 19.5, 22, 24.5);

    // When
    const day = usualGap(spans, days, 'day');
    const night = usualGap(spans, days, 'night');

    // Then
    expect([day, night]).toEqual([2 * HOUR, 2.5 * HOUR]);
  });

  it('leaves out gaps over 12 hours', () => {
    // Given
    const spans = [0, 13, 15, 17, 19, 21].map((hour) => ({ start: on(10, 7 + hour), end: on(10, 7 + hour) }));
    const wide = [windowOf('day', on(10, 0), on(12, 0))];

    // When
    const gap = usualGap(spans, wide, 'day');

    // Then
    expect(gap).toBeNull();
  });

  it('leaves out a gap whose start is in no window', () => {
    // Given
    const spans = [-4, -2, 0, 2, 4, 6].map((hour) => ({ start: on(11, 7 + hour), end: on(11, 7 + hour) }));
    const dayOnly = [windowOf('day', on(11, 7), on(11, 19))];

    // When
    const gap = usualGap(spans, dayOnly, 'day');

    // Then
    expect(gap).toBeNull();
  });

  it('takes entries in any order', () => {
    // Given
    const spans = spansAt(12, 0, 9, 2, 7, 5);

    // When
    const gap = usualGap(spans, days, 'day');

    // Then
    expect(gap).toBe(2 * HOUR);
  });
});

describe('the rhythm', () => {
  it('holds the usual gap between feeds and between changes for the window kind', () => {
    // Given
    const feedings = [0, 3, 6, 9, 12, 15].map((hour) => feeding({ start: at(11, 1 + hour), end: at(11, 1 + hour, 30) }));
    const changes = [0, 4, 8, 12, 16, 20].map((hour) => change({ time: at(11, 1 + hour) }));
    const wide = [windowOf('day', on(11, 0), on(12, 0))];

    // When
    const found = rhythm({ feeding: feedings, change: changes }, wide, 'day');

    // Then
    expect(found).toEqual({ feed: 2.5 * HOUR, diaper: 4 * HOUR });
  });

  it('is unknown per kind without enough entries', () => {
    // When
    const found = rhythm({ feeding: [], change: [] }, days, 'night');

    // Then
    expect(found).toEqual({ feed: null, diaper: null });
  });

  it('leaves meals out of the usual gap between feeds', () => {
    // Given
    const feedings = [0, 3, 6, 9, 12, 15].map((hour) => feeding({ start: at(11, 1 + hour), end: at(11, 1 + hour, 30) }));
    const meals = [2, 5, 8, 11, 14].map((hour) =>
      feeding({ start: at(11, 1 + hour), end: at(11, 1 + hour, 1), type: 'solid food', method: 'parent fed' }),
    );
    const wide = [windowOf('day', on(11, 0), on(12, 0))];

    // When
    const found = rhythm({ feeding: [...feedings, ...meals], change: [] }, wide, 'day');

    // Then
    expect(found.feed).toBe(2.5 * HOUR);
  });
});

const none = { sleep: [], feeding: [], change: [], medication: [] };
const input = (fields: Partial<NeedsInput> = {}): NeedsInput => ({
  entries: none,
  running: { sleep: null, feeding: false },
  next: null,
  rhythm: { feed: null, diaper: null },
  vitaminD: false,
  ...fields,
});

describe('the sleep need', () => {
  it('is unknown with no sleep logged', () => {
    // When
    const found = needs(input(), on(12, 10));

    // Then
    expect(found.sleep).toBeNull();
  });

  it('drains from the last wake to the start of the next likely sleep', () => {
    // Given
    const nap = sleep({ start: at(12, 8), end: at(12, 9) });

    // When
    const found = needs(input({ entries: { ...none, sleep: [nap] }, next: { start: on(12, 11) } }), on(12, 10, 30));

    // Then
    expect(found.sleep).toEqual({ value: 25, level: 3, running: false });
  });

  it('drains over 2.5 hours from the last wake without a likely sleep', () => {
    // Given
    const nap = sleep({ start: at(12, 8), end: at(12, 9) });

    // When
    const found = needs(input({ entries: { ...none, sleep: [nap] } }), on(12, 9, 30));

    // Then
    expect(found.sleep).toEqual({ value: 80, level: 0, running: false });
  });

  it('counts from the newest wake', () => {
    // Given
    const sleeps = [sleep({ start: at(12, 11), end: at(12, 12) }), sleep({ start: at(12, 8), end: at(12, 9) })];

    // When
    const found = needs(input({ entries: { ...none, sleep: sleeps } }), on(12, 12));

    // Then
    expect(found.sleep?.value).toBe(100);
  });

  it('fills while a sleep runs, from its start to when the child likely wakes', () => {
    // Given
    const sleeping = { start: on(12, 9), wake: on(12, 13) };

    // When
    const found = needs(input({ running: { sleep: sleeping, feeding: false } }), on(12, 10));

    // Then
    expect(found.sleep).toEqual({ value: 25, level: 3, running: true });
  });

  it('is full once a sleep runs past its likely wake', () => {
    // Given
    const sleeping = { start: on(12, 9), wake: on(12, 10) };

    // When
    const found = needs(input({ running: { sleep: sleeping, feeding: false } }), on(12, 11));

    // Then
    expect(found.sleep?.value).toBe(100);
  });
});

describe('the feed need', () => {
  it('is unknown with no feed logged', () => {
    // When
    const found = needs(input(), on(12, 10));

    // Then
    expect(found.feed).toBeNull();
  });

  it("drains from the last feed's end over the usual gap", () => {
    // Given
    const feed = feeding({ start: at(12, 8, 30), end: at(12, 9) });

    // When
    const found = needs(input({ entries: { ...none, feeding: [feed] }, rhythm: { feed: 2 * HOUR, diaper: null } }), on(12, 10));

    // Then
    expect(found.feed).toEqual({ value: 50, level: 2, running: false });
  });

  it('drains over 3 hours without a usual gap', () => {
    // Given
    const feed = feeding({ start: at(12, 8, 30), end: at(12, 9) });

    // When
    const found = needs(input({ entries: { ...none, feeding: [feed] } }), on(12, 10, 30));

    // Then
    expect(found.feed?.value).toBe(50);
  });

  it("isn't refilled by a meal after the last milk feed", () => {
    // Given
    const feed = feeding({ start: at(12, 8, 30), end: at(12, 9) });
    const meal = feeding({ start: at(12, 9, 59), end: at(12, 10), type: 'solid food', method: 'parent fed' });

    // When
    const found = needs(input({ entries: { ...none, feeding: [feed, meal] }, rhythm: { feed: 2 * HOUR, diaper: null } }), on(12, 10));

    // Then
    expect(found.feed?.value).toBe(50);
  });

  it('is refuelling while a feed runs', () => {
    // When
    const found = needs(input({ running: { sleep: null, feeding: true } }), on(12, 10));

    // Then
    expect(found.feed).toEqual({ value: 82, level: 0, running: true });
  });
});

describe('the feed and diaper needs while asleep', () => {
  const sleeping = { start: on(11, 21, 25), wake: on(12, 6, 30) };

  it("aren't due before the likely wake without a usual gap for the night", () => {
    // Given
    const fed = feeding({ start: at(11, 20, 10), end: at(11, 20, 30) });
    const changed = change({ time: at(11, 20, 30) });

    // When
    const found = needs(input({ entries: { ...none, feeding: [fed], change: [changed] }, running: { sleep: sleeping, feeding: false } }), on(12, 1, 30));

    // Then
    expect([found.feed?.value, found.diaper?.value]).toEqual([50, 50]);
  });

  it('keep the usual gap for the night when there is one', () => {
    // Given
    const fed = feeding({ start: at(11, 20, 10), end: at(11, 20, 30) });

    // When
    const found = needs(
      input({ entries: { ...none, feeding: [fed] }, running: { sleep: sleeping, feeding: false }, rhythm: { feed: 4 * HOUR, diaper: null } }),
      on(12, 0, 30),
    );

    // Then
    expect(found.feed?.value).toBe(0);
  });
});

describe('the diaper need', () => {
  it('is unknown with no change logged', () => {
    // When
    const found = needs(input(), on(12, 10));

    // Then
    expect(found.diaper).toBeNull();
  });

  it('drains from the last change over the usual gap', () => {
    // Given
    const changes = [change({ time: at(12, 6) }), change({ time: at(12, 9) })];

    // When
    const found = needs(input({ entries: { ...none, change: changes }, rhythm: { feed: null, diaper: 4 * HOUR } }), on(12, 10));

    // Then
    expect(found.diaper?.value).toBe(75);
  });

  it('drains over 3.5 hours without a usual gap', () => {
    // Given
    const changed = change({ time: at(12, 9) });

    // When
    const found = needs(input({ entries: { ...none, change: [changed] } }), on(12, 12, 30));

    // Then
    expect(found.diaper?.value).toBe(0);
  });
});

describe('the medicine need', () => {
  it('is not shown without the Vitamin D reminder', () => {
    // Given
    const dose = medication({ time: at(12, 8) });

    // When
    const found = needs(input({ entries: { ...none, medication: [dose] } }), on(12, 10));

    // Then
    expect(found.medicine).toBeNull();
  });

  it('drains over 24 hours from the last Vitamin D with the reminder on', () => {
    // Given
    const dose = medication({ time: at(12, 8) });

    // When
    const found = needs(input({ entries: { ...none, medication: [dose] }, vitaminD: true }), on(12, 14));

    // Then
    expect(found.medicine).toEqual({ value: 75, level: 1, running: false });
  });

  it('leaves out other medicines', () => {
    // Given
    const doses = [medication({ time: at(12, 8) }), medication({ time: at(12, 13), name: 'Paracetamol' })];

    // When
    const found = needs(input({ entries: { ...none, medication: doses }, vitaminD: true }), on(12, 14));

    // Then
    expect(found.medicine?.value).toBe(75);
  });

  it('is empty with the reminder on and no Vitamin D logged', () => {
    // When
    const found = needs(input({ vitaminD: true }), on(12, 14));

    // Then
    expect(found.medicine).toEqual({ value: 0, level: 3, running: false });
  });
});

const level = (value: number): Need => ({ value, level: needLevel(value), running: false });
const running: Need = { value: 82, level: 0, running: true };
const shown = (fields: Partial<Needs>): Needs => ({ sleep: null, feed: null, diaper: null, medicine: null, ...fields });

describe('the mood', () => {
  it('is unknown without any need', () => {
    // When
    const found = mood(shown({}));

    // Then
    expect(found).toBeNull();
  });

  it('follows the one need there is', () => {
    // When
    const found = mood(shown({ feed: level(80) }));

    // Then
    expect(found).toEqual({ mood: 'giggly', value: 80 });
  });

  it('is the average of sleep, feed and diaper', () => {
    // When
    const found = mood(shown({ sleep: level(30), feed: level(60), diaper: level(60) }));

    // Then
    expect(found).toEqual({ mood: 'content', value: 50 });
  });

  it('leaves medicine out', () => {
    // When
    const found = mood(shown({ feed: level(90), medicine: level(0) }));

    // Then
    expect(found?.value).toBe(90);
  });

  it.each([
    [70, 'giggly'],
    [69, 'content'],
    [45, 'content'],
    [44, 'fussy'],
    [25, 'fussy'],
    [24, 'wailing'],
    [0, 'wailing'],
  ] as const)('at %i is %s', (value, name) => {
    // When
    const found = mood(shown({ diaper: level(value) }));

    // Then
    expect(found?.mood).toBe(name);
  });

  it('counts a running feed as filling up', () => {
    // When
    const found = mood(shown({ feed: running, diaper: level(42) }));

    // Then
    expect(found).toEqual({ mood: 'content', value: 62 });
  });

  it('is dreaming while a sleep runs', () => {
    // When
    const found = mood(shown({ sleep: running, feed: level(0), diaper: level(0) }));

    // Then
    expect(found).toEqual({ mood: 'dreaming', value: 82 });
  });
});

describe('what the baby wants', () => {
  it('is nothing without any need', () => {
    // When
    const found = wants(shown({}));

    // Then
    expect(found).toBeNull();
  });

  it('is nothing while every need is at 60 or more', () => {
    // When
    const found = wants(shown({ sleep: level(60), feed: level(90), diaper: level(75) }));

    // Then
    expect(found).toBeNull();
  });

  it('is the lowest need under 60', () => {
    // When
    const found = wants(shown({ sleep: level(50), feed: level(20), diaper: level(59) }));

    // Then
    expect(found).toBe('feed');
  });

  it('never is medicine', () => {
    // When
    const found = wants(shown({ feed: level(70), medicine: level(0) }));

    // Then
    expect(found).toBeNull();
  });

  it.each([
    [{ sleep: level(30), feed: level(30), diaper: level(30) }, 'sleep'],
    [{ sleep: level(50), feed: level(30), diaper: level(30) }, 'feed'],
  ] as const)('breaks a tie in the order sleep, feed, diaper', (fields, kind) => {
    // When
    const found = wants(shown(fields));

    // Then
    expect(found).toBe(kind);
  });

  it('is sleep while a sleep runs', () => {
    // When
    const found = wants(shown({ sleep: running, feed: level(0) }));

    // Then
    expect(found).toBe('sleep');
  });
});

describe('the moodlets', () => {
  it('are none with nothing logged', () => {
    // When
    const found = moodlets(input(), on(12, 10));

    // Then
    expect(found).toEqual([]);
  });

  it('give a positive one for each kind logged in the last 30 minutes', () => {
    // Given
    const entries = {
      sleep: [sleep({ start: at(12, 8), end: at(12, 9, 40) })],
      feeding: [feeding({ start: at(12, 9, 30), end: at(12, 9, 45) })],
      change: [change({ time: at(12, 9, 50) })],
      medication: [medication({ time: at(12, 9, 55), name: 'Paracetamol' })],
    };

    // When
    const found = moodlets(input({ entries }), on(12, 10, 10));

    // Then
    expect(found).toEqual([
      { key: 'well-rested', points: 2 },
      { key: 'milk-drunk', points: 2 },
      { key: 'fresh-bum', points: 1 },
      { key: 'soothed-gums', points: 1 },
    ]);
  });

  it("give no milk-drunk one for a meal", () => {
    // Given
    const meal = feeding({ start: at(12, 9, 50), end: at(12, 9, 51), type: 'solid food', method: 'parent fed' });

    // When
    const found = moodlets(input({ entries: { ...none, feeding: [meal] } }), on(12, 10));

    // Then
    expect(found).toEqual([]);
  });

  it('give none for something logged over 30 minutes ago', () => {
    // Given
    const changed = change({ time: at(12, 9, 29) });

    // When
    const found = moodlets(input({ entries: { ...none, change: [changed] } }), on(12, 10));

    // Then
    expect(found).toEqual([]);
  });

  it('give a negative one for each need under 25, medicine left out', () => {
    // Given
    const entries = {
      sleep: [sleep({ start: at(12, 6), end: at(12, 7) })],
      feeding: [feeding({ start: at(12, 6), end: at(12, 7) })],
      change: [change({ time: at(12, 7) })],
      medication: [],
    };

    // When
    const found = moodlets(input({ entries, vitaminD: true }), on(12, 12));

    // Then
    expect(found).toEqual([
      { key: 'sleepy', points: -2 },
      { key: 'hangry', points: -3 },
      { key: 'soggy', points: -2 },
    ]);
  });

  it('give none for a need at 25', () => {
    // Given
    const fed = feeding({ start: at(12, 6), end: at(12, 7) });

    // When
    const found = moodlets(input({ entries: { ...none, feeding: [fed] }, rhythm: { feed: 4 * HOUR, diaper: null } }), on(12, 10));

    // Then
    expect(found).toEqual([]);
  });

  it('are the sleeping pair while a sleep runs', () => {
    // Given
    const changed = change({ time: at(12, 1) });
    const sleeping = { start: on(12, 9), wake: on(12, 11) };

    // When
    const found = moodlets(input({ entries: { ...none, change: [changed] }, running: { sleep: sleeping, feeding: false } }), on(12, 10));

    // Then
    expect(found).toEqual([
      { key: 'recharging', points: 3 },
      { key: 'snug', points: 1 },
    ]);
  });
});
