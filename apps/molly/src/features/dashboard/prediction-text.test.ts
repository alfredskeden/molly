import type { NextSleep } from '@molly/core';
import { describe, expect, it } from 'vitest';

import {
  disclaimer,
  skipToast,
  spokenPrediction,
  stateLabel,
  whyRows,
} from './prediction-text';

const on = (hours: number, minutes = 0) => new Date(2026, 8, 24, hours, minutes);
const nap: NextSleep = {
  kind: 'nap',
  slot: 'first',
  start: on(8, 55),
  end: on(9, 25),
  state: 'before',
  source: 'blend',
  anchor: on(6, 40),
  guide: { band: '3–5 months', wake: { min: 75, max: 125 } },
  history: { min: 135, max: 175 },
  samples: 6,
};

describe('the window as words', () => {
  it.each([
    ['before', on(8, 30), 'Opens in 25m'],
    ['open', on(9, 14), 'Window open'],
    ['past', on(9, 45), 'Past the window'],
  ] as const)('says how the window stands when it is %s', (state, now, expected) => {
    // Given
    const prediction: NextSleep = { ...nap, state };

    // When
    const label = stateLabel(prediction, now);

    // Then
    expect(label).toBe(expected);
  });

  it('reads the window and its state as one sentence for screen readers', () => {
    // Given
    const prediction = nap;

    // When
    const spoken = spokenPrediction(prediction, on(8, 30));

    // Then
    expect(spoken).toBe('Nap likely between 08:55 and 09:25. Opens in 25 minutes.');
  });
});

describe('the line under the window', () => {
  it('is the general disclaimer with Why when history counts', () => {
    // Given
    const prediction = nap;

    // When
    const line = disclaimer(prediction, 4);

    // Then
    expect(line).toEqual({ text: 'Estimate · not medical advice', link: 'Why ›' });
  });

  it('says the window comes from the age alone when it does', () => {
    // Given
    const prediction: NextSleep = { ...nap, source: 'age', history: null, samples: 0 };

    // When
    const line = disclaimer(prediction, 4);

    // Then
    expect(line).toEqual({ text: 'Based on age (4 months) only · not medical advice', link: '›' });
  });

  it('says month, not months, for one', () => {
    // Given
    const prediction: NextSleep = { ...nap, source: 'age' };

    // When
    const line = disclaimer(prediction, 1);

    // Then
    expect(line.text).toBe('Based on age (1 month) only · not medical advice');
  });
});

describe('the Why sheet', () => {
  it('shows how long since waking, the usual window, the age guide and what counted more', () => {
    // Given
    const prediction = nap;

    // When
    const rows = whyRows(prediction, 4, on(8, 30));

    // Then
    expect(rows).toEqual([
      { label: 'Awake for', value: '1h 50m' },
      { label: 'Usual first wake window', detail: 'last 14 days · 6 days', value: '2h 15m – 2h 55m' },
      { label: 'Age guide', detail: '4 months', value: '1h 15m – 2h 05m' },
      { label: 'Weighted towards', value: 'Your logs and age' },
    ]);
  });

  it('names the window before bed, and says when no days are logged yet', () => {
    // Given
    const prediction: NextSleep = { ...nap, kind: 'bedtime', slot: 'last', source: 'age', history: null, samples: 0 };

    // When
    const rows = whyRows(prediction, 4, on(8, 30));

    // Then
    expect(rows.slice(1)).toEqual([
      { label: 'Usual time up before bed', detail: 'none logged in the last 14 days', value: '–' },
      { label: 'Age guide', detail: '4 months', value: '1h 15m – 2h 05m' },
      { label: 'Weighted towards', value: 'Age guide' },
    ]);
  });
});

describe('a skipped nap in words', () => {
  it('tells in the toast when bedtime is likely now', () => {
    // Given
    const bedtime = { start: on(18, 10) };

    // When
    const toast = skipToast(bedtime);

    // Then
    expect(toast).toBe('Nap skipped · bedtime likely 18:10');
  });

  it('says just the nap is skipped when no bedtime is planned', () => {
    // Given
    const bedtime = null;

    // When
    const toast = skipToast(bedtime);

    // Then
    expect(toast).toBe('Nap skipped');
  });
});
