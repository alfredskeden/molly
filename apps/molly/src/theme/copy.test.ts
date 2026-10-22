import { describe, expect, it } from 'vitest';

import { COPY, copyFor, fill } from './copy';
import { THEME_KEYS } from './themes';

// What the app says in the ring redesign, before themes: Classic must keep it word for word.
const TODAY = {
  appName: 'Molly',
  awake: 'Awake',
  feeding: 'Feeding',
  stopAs: 'Stop and save as',
  feedAs: 'Save feed as',
  cancelFeed: 'Cancel feed',
  sleeping: 'Sleeping',
  stopSleep: 'Stop sleep',
  cancelSleep: 'Cancel sleep',
  stopFeed: 'Stop feed',
  sleep: 'Sleep',
  feed: 'Feed',
  feedNoun: 'Feeding',
  diaper: 'Diaper',
  med: 'Medicine',
  startSleep: 'Start sleep',
  startFeed: 'Start feeding',
  wet: 'Wet',
  dirty: 'Dirty',
  both: 'Both',
  solids: 'Solids',
  settings: 'Settings',
  likelyNap: 'Nap {n} likely',
  likelyBedtime: 'Bedtime likely',
  likelyRangeLead: null,
  likelyYesterday: 'Yesterday',
  likelyUsually: 'Usually',
  likelyLengthLead: null,
  likelyLaterHeading: null,
  likelyLaterNap: 'Nap {n}',
  likelyLaterBedtime: 'Bedtime',
  likelyBellOff: null,
  likelyBellOn: null,
  likelySkip: 'Skip',
  likelyWhy: 'Why ›',
  measurements: 'Measurements',
  measureWeight: 'Weight',
  measureHeight: 'Height',
  measureHead: 'Head circumference',
  measureTemperature: 'Temperature',
  measureBmi: 'BMI',
  development: 'Development',
  allAges: 'All ages',
};

/** The likely-sleep panel in the design's Terminal frame (3a), word for word. */
const TERMINAL_PANEL = {
  likelyNap: '$ inspect nap_{n}',
  likelyBedtime: '$ inspect bedtime',
  likelyRangeLead: 'eta',
  likelyYesterday: 'yesterday',
  likelyUsually: 'median',
  likelyLengthLead: 'ran',
  likelyLaterHeading: '> queued for later',
  likelyLaterNap: 'nap_{n}',
  likelyLaterBedtime: 'shutdown (bedtime)',
  likelyBellOff: 'ping {t}',
  likelyBellOn: 'ping set {t}',
  likelySkip: 'skip',
  likelyWhy: 'man nap ›',
};

/** Labels a theme may leave out (null): the leads before a range or length, the Later heading, the bell's words. */
const OPTIONAL = ['likelyRangeLead', 'likelyLengthLead', 'likelyLaterHeading', 'likelyBellOff', 'likelyBellOn'];

describe('theme copy', () => {
  it("is today's wording in Molly Classic", () => {
    // Given
    const look = 'classic';

    // When
    const copy = copyFor(look, true);

    // Then
    expect(copy).toEqual(TODAY);
  });

  it("is today's wording in Molly Classic with playful labels off", () => {
    // Given
    const look = 'classic';

    // When
    const copy = copyFor(look, false);

    // Then
    expect(copy).toEqual(TODAY);
  });

  it.each(THEME_KEYS)('has every label, none empty, in %s', (look) => {
    // Given
    const keys = Object.keys(TODAY);

    // When
    const copy = COPY[look];

    // Then
    expect(Object.keys(copy).sort()).toEqual(keys.sort());
    expect(Object.values(copy).filter((label) => label !== null && label.trim() === '')).toEqual([]);
    expect(Object.entries(copy).filter(([key, label]) => label === null && !OPTIONAL.includes(key))).toEqual([]);
  });

  it("is the design's Terminal panel words in Terminal", () => {
    // Given
    const look = 'term';

    // When
    const copy = copyFor(look, true);

    // Then
    expect(copy).toMatchObject(TERMINAL_PANEL);
  });

  it.each(THEME_KEYS)('names the nap and the bell time wherever %s asks for them, and holds no time of its own', (look) => {
    // Given
    const copy = COPY[look];
    const labels = [copy.likelyNap, copy.likelyLaterNap, copy.likelyBellOff, copy.likelyBellOn];

    // When
    const filled = labels.map((label) => label && fill(label, { n: 2, t: '12:56' }));

    // Then
    expect(filled.filter((label) => label?.includes('{'))).toEqual([]);
    expect([copy.likelyNap, copy.likelyLaterNap].every((label) => label.includes('{n}'))).toBe(true);
    expect([copy.likelyBellOff, copy.likelyBellOn].every((label) => label === null || label.includes('{t}'))).toBe(true);
    expect(Object.values(copy).filter((label) => label !== null && /\d:\d|\d+[hm]\b/.test(label))).toEqual([]);
  });

  it("is Classic's panel words in Terminal with playful labels off", () => {
    // Given
    const look = 'term';

    // When
    const copy = copyFor(look, false);

    // Then
    expect(copy).toEqual(TODAY);
  });

  it("is the design's Arcade labels in Arcade", () => {
    // Given
    const look = 'arcade';

    // When
    const copy = copyFor(look, true);

    // Then
    expect(copy).toMatchObject({ sleeping: 'Game paused', startSleep: 'Pause game', both: 'Combo', settings: 'Options' });
  });

  it.each([
    ['classic', 'Solids'],
    ['arcade', 'Bonus snack'],
    ['space', 'Space food'],
    ['score', 'Half-time snack'],
    ['term', 'solids'],
    ['safari', 'Nibbles'],
    ['ribbon', 'Solids'],
    ['sim', 'Meal'],
  ] as const)('names Solids in %s as %s', (look, words) => {
    // When
    const copy = copyFor(look, true);

    // Then
    expect(copy.solids).toBe(words);
  });

  it("is today's wording in Arcade with playful labels off", () => {
    // Given
    const look = 'arcade';

    // When
    const copy = copyFor(look, false);

    // Then
    expect(copy).toEqual(TODAY);
  });

  it("is the design's Sweet dreams while asleep in Ribbon", () => {
    // Given
    const look = 'ribbon';

    // When
    const copy = copyFor(look, true);

    // Then
    expect(copy.sleeping).toBe('Sweet dreams');
  });

  it("is today's wording in Ribbon with playful labels off", () => {
    // Given
    const look = 'ribbon';

    // When
    const copy = copyFor(look, false);

    // Then
    expect(copy).toEqual(TODAY);
  });

  it("is the design's words in Life Sim", () => {
    // Given
    const look = 'sim';

    // When
    const copy = copyFor(look, true);

    // Then
    expect(copy).toMatchObject({
      awake: 'Up and about',
      feeding: 'Refuelling',
      sleeping: 'Recharging',
      stopSleep: 'Wake up',
      stopAs: 'Stop and save as',
      cancelFeed: 'Cancel feed',
    });
  });

  it("is today's wording in Life Sim with playful labels off", () => {
    // Given
    const look = 'sim';

    // When
    const copy = copyFor(look, false);

    // Then
    expect(copy).toEqual(TODAY);
  });
});
