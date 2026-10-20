import { describe, expect, it } from 'vitest';

import { bmi, head, height, temperature, weight } from '../test/fixtures';
import {
  bmiFrom,
  lastMeasurementText,
  measurementParts,
  measurementRows,
  measurementText,
  measurementWhen,
  newestMeasurements,
  sheetStart,
  stepHint,
  stepMeasurement,
  typedMeasurement,
} from './measurements';

const now = new Date(2026, 8, 28, 12, 5);
const local = (day: number, hours: number, minutes = 0) => new Date(2026, 8, day, hours, minutes).toISOString();

describe('a measurement value', () => {
  it.each([
    ['weight', 7050, '7 050 g'],
    ['weight', 980, '980 g'],
    ['weight', 12840, '12 840 g'],
    ['height', 65.5, '65.5 cm'],
    ['height', 89, '89.0 cm'],
    ['head', 42.3, '42.3 cm'],
    ['temperature', 36.9, '36.9 °C'],
    ['bmi', 16.3, '16.3'],
  ] as const)('of %s %d reads %s', (kind, value, text) => {
    // When
    const result = measurementText(kind, value);

    // Then
    expect(result).toBe(text);
  });

  it('splits into the number and its unit for the big value', () => {
    // When
    const parts = [measurementParts('weight', 5120), measurementParts('bmi', 16.3)];

    // Then
    expect(parts).toEqual([
      { number: '5 120', unit: 'g' },
      { number: '16.3', unit: '' },
    ]);
  });
});

describe('when a measurement was taken, on its row', () => {
  it('is None yet without any entry', () => {
    // When
    const when = measurementWhen('weight', null, now);

    // Then
    expect(when).toBe('None yet');
  });

  it('is the date and how many days ago', () => {
    // When
    const when = measurementWhen('weight', weight('2026-09-23', 7000), now);

    // Then
    expect(when).toBe('23 Sep · 5 days ago');
  });

  it.each([
    ['2026-09-28', 'Today'],
    ['2026-09-27', '27 Sep · yesterday'],
    ['2026-09-07', '7 Sep · 3 weeks ago'],
    ['2026-06-20', '20 Jun · 3 months ago'],
    ['2025-09-20', '20 Sep 2025 · 1 year ago'],
  ])('taken %s reads %s', (date, text) => {
    // When
    const when = measurementWhen('height', height(date, 65.5), now);

    // Then
    expect(when).toBe(text);
  });

  it('is the clock time today for a temperature', () => {
    // When
    const when = measurementWhen('temperature', temperature(local(28, 7, 40), 36.9), now);

    // Then
    expect(when).toBe('Today 07:40');
  });

  it('is the date and clock time for an earlier temperature', () => {
    // When
    const when = measurementWhen('temperature', temperature(local(27, 20, 10), 37.2), now);

    // Then
    expect(when).toBe('27 Sep 20:10');
  });
});

describe('the order of measurements', () => {
  it('is newest date first, the later logged first on the same date', () => {
    // Given
    const first = weight('2026-09-23', 7000);
    const second = weight('2026-09-23', 7050);
    const older = weight('2026-09-07', 6580);

    // When
    const ordered = newestMeasurements('weight', [first, older, second]);

    // Then
    expect(ordered).toEqual([second, first, older]);
  });

  it('is newest time first for temperatures', () => {
    // Given
    const morning = temperature(local(28, 7, 40), 36.9);
    const evening = temperature(local(27, 20, 10), 37.2);

    // When
    const ordered = newestMeasurements('temperature', [evening, morning]);

    // Then
    expect(ordered).toEqual([morning, evening]);
  });
});

describe('BMI from weight and height', () => {
  it('is kilograms over metres squared, to one decimal', () => {
    // When
    const value = bmiFrom(7000, 65.5);

    // Then
    expect(value).toBe(16.3);
  });
});

describe("the add sheet's starting value", () => {
  it('is the last value logged', () => {
    // When
    const start = sheetStart('weight', { weight: [weight('2026-09-23', 7000), weight('2026-09-07', 6580)] }, now);

    // Then
    expect(start).toBe(7000);
  });

  it.each([
    ['weight', 3500],
    ['height', 50],
    ['head', 35],
    ['temperature', 36.8],
    ['bmi', 14],
  ] as const)('of %s with nothing logged is %d', (kind, value) => {
    // When
    const start = sheetStart(kind, {}, now);

    // Then
    expect(start).toBe(value);
  });

  it("of BMI is today's weight over today's height squared", () => {
    // Given
    const lists = {
      weight: [weight('2026-09-28', 7000)],
      height: [height('2026-09-28', 65.5)],
      bmi: [bmi('2026-09-23', 15.9)],
    };

    // When
    const start = sheetStart('bmi', lists, now);

    // Then
    expect(start).toBe(16.3);
  });

  it('of BMI is the last BMI when the height was not measured today', () => {
    // Given
    const lists = {
      weight: [weight('2026-09-28', 7000)],
      height: [height('2026-09-23', 65.5)],
      bmi: [bmi('2026-09-23', 15.9)],
    };

    // When
    const start = sheetStart('bmi', lists, now);

    // Then
    expect(start).toBe(15.9);
  });
});

describe('stepping the value in the add sheet', () => {
  it.each([
    ['weight', 7000, 1, 7010],
    ['height', 65.5, 1, 66],
    ['head', 42.3, -1, 41.8],
    ['temperature', 36.9, 1, 37],
    ['bmi', 16.3, -1, 16.2],
  ] as const)('moves %s %d by one step (%d) to %d', (kind, value, direction, next) => {
    // When
    const stepped = stepMeasurement(kind, value, direction);

    // Then
    expect(stepped).toBe(next);
  });

  it('stays within the range Molly accepts', () => {
    // When
    const stepped = [stepMeasurement('temperature', 43, 1), stepMeasurement('weight', 500, -1)];

    // Then
    expect(stepped).toEqual([43, 500]);
  });
});

describe('a typed value in the add sheet', () => {
  it.each([
    ['weight', '7050', 7050],
    ['weight', '7 050', 7050],
    ['temperature', '36,9', 36.9],
    ['height', '65.54', 65.5],
  ] as const)('of %s %j is %d', (kind, text, value) => {
    // When
    const typed = typedMeasurement(kind, text);

    // Then
    expect(typed).toBe(value);
  });

  it.each([
    ['weight', '7.05'],
    ['temperature', '369'],
    ['height', '0'],
  ] as const)('of %s %j is out of range', (kind, text) => {
    // When
    const typed = typedMeasurement(kind, text);

    // Then
    expect(typed).toBe('outOfRange');
  });

  it.each(['', 'abc', '36.9.1'])('%j is no value', (text) => {
    // When
    const typed = typedMeasurement('temperature', text);

    // Then
    expect(typed).toBeNull();
  });
});

describe("the add sheet's words", () => {
  it('show the last entry', () => {
    // When
    const text = lastMeasurementText('weight', weight('2026-09-23', 7000), now);

    // Then
    expect(text).toBe('Last 7 000 g · 23 Sep');
  });

  it('show the last temperature with its time', () => {
    // When
    const text = lastMeasurementText('temperature', temperature(local(28, 7, 40), 36.9), now);

    // Then
    expect(text).toBe('Last 36.9 °C · Today 07:40');
  });

  it('show the change from the starting value and the step', () => {
    // When
    const hints = [stepHint('weight', 7000, 7050), stepHint('height', 65.5, 65), stepHint('temperature', 36.9, 36.9)];

    // Then
    expect(hints).toEqual([
      '+50 g · steps of 10 g · tap to type',
      '−0.5 cm · steps of 0.5 cm · tap to type',
      'Steps of 0.1 °C · tap to type',
    ]);
  });
});

describe('the list under a measurement', () => {
  it('gives the newest four weights with the change and gap since the one before', () => {
    // When
    const rows = measurementRows('weight', [weight('2026-04-20', 3400), weight('2026-04-23', 3160), weight('2026-05-02', 3420), weight('2026-05-18', 4150), weight('2026-06-01', 4650), weight('2026-06-17', 5120)], now, { count: 4, gap: true });

    // Then
    expect(rows).toEqual([
      { date: '17 Jun', value: '5 120 g', change: '+470 g · 16d' },
      { date: '1 Jun', value: '4 650 g', change: '+500 g · 14d' },
      { date: '18 May', value: '4 150 g', change: '+730 g · 16d' },
      { date: '2 May', value: '3 420 g', change: '+260 g · 9d' },
    ]);
  });

  it('gives the gap in months from 60 days', () => {
    // When
    const rows = measurementRows('weight', [weight('2026-07-12', 12480), weight('2026-09-12', 12840)], now, { count: 1, gap: true });

    // Then
    expect(rows).toEqual([{ date: '12 Sep', value: '12 840 g', change: '+360 g · 2m' }]);
  });

  it('has no change on the oldest entry', () => {
    // When
    const rows = measurementRows('head', [], now, { count: 3, gap: false });

    // Then
    expect(rows).toEqual([]);
  });
});
