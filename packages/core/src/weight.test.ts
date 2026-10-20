import { describe, expect, it } from 'vitest';

import { weight } from '../test/fixtures';
import {
  birthDipText,
  centileChip,
  gainLine,
  weightAxis,
  weightChart,
  weightFooter,
  whoBands,
} from './weight';

/** Ella, born 20 Apr, at 2 months (design 2a). */
const ellaBorn = '2026-04-20';
const ella = [
  weight('2026-04-20', 3400),
  weight('2026-04-23', 3160),
  weight('2026-05-02', 3420),
  weight('2026-05-18', 4150),
  weight('2026-06-01', 4650),
  weight('2026-06-17', 5120),
];
const ellaNow = new Date(2026, 5, 19, 12, 5);

/** Otto, born 12 May 2024, at 2 years 4 months (design 2b). */
const ottoBorn = '2024-05-12';
const otto = [
  weight('2025-09-12', 10650),
  weight('2025-11-12', 10980),
  weight('2026-02-12', 11520),
  weight('2026-05-12', 12150),
  weight('2026-07-12', 12480),
  weight('2026-09-12', 12840),
];
const ottoNow = new Date(2026, 8, 12, 12, 5);

describe('the WHO weight bands at an age', () => {
  it.each([
    ['girl', 0, [2440, 2779, 3232, 3729, 4166]],
    ['girl', 61, [4007, 4481, 5132, 5866, 6534]],
    ['girl', 365, [7140, 7891, 8946, 10176, 11331]],
    ['girl', 730, [9159, 10115, 11474, 13079, 14607]],
    ['boy', 0, [2507, 2865, 3346, 3878, 4350]],
    ['boy', 61, [4390, 4892, 5571, 6324, 6996]],
    ['boy', 365, [7844, 8610, 9646, 10798, 11830]],
    ['boy', 730, [9802, 10793, 12148, 13677, 15065]],
  ] as const)("match WHO's published 3rd, 15th, 50th, 85th and 97th centiles for a %s on day %d", (sex, day, published) => {
    // When
    const bands = whoBands(sex, day);

    // Then
    const values = [bands.p3, bands.p15, bands.p50, bands.p85, bands.p97];
    values.forEach((grams, i) => expect(Math.abs(grams - published[i]!)).toBeLessThanOrEqual(10));
  });
});

describe('the centile chip', () => {
  it('is nothing without the sex', () => {
    // When
    const chip = centileChip(ella, null, ellaBorn, ellaNow);

    // Then
    expect(chip).toBeNull();
  });

  it('is nothing without a weight', () => {
    // When
    const chip = centileChip([], 'girl', ellaBorn, ellaNow);

    // Then
    expect(chip).toBeNull();
  });

  it('places a single weight without comparing', () => {
    // When
    const chip = centileChip([weight('2026-06-17', 5120)], 'girl', ellaBorn, ellaNow);

    // Then
    expect(chip).toBe('Just above the 50th centile');
  });

  it('says when the latest weight is near the same centile as at birth', () => {
    // When
    const chip = centileChip(ella, 'girl', ellaBorn, ellaNow);

    // Then
    expect(chip).toBe('Just above the 50th centile, as at birth');
  });

  it('says when the weight has moved up since birth', () => {
    // Given
    const weights = [weight('2026-04-20', 2800), weight('2026-06-17', 5120)];

    // When
    const chip = centileChip(weights, 'girl', ellaBorn, ellaNow);

    // Then
    expect(chip).toBe('Just above the 50th centile, up from the 15th at birth');
  });

  it('says when the weight has moved down since birth', () => {
    // Given
    const weights = [weight('2026-04-20', 3750), weight('2026-06-17', 5120)];

    // When
    const chip = centileChip(weights, 'girl', ellaBorn, ellaNow);

    // Then
    expect(chip).toBe('Just above the 50th centile, down from the 85th at birth');
  });

  it('is close to a centile within a small margin of it', () => {
    // When
    const chip = centileChip([weight('2026-06-17', 5050)], 'girl', ellaBorn, ellaNow);

    // Then
    expect(chip).toBe('Close to the 50th centile');
  });

  it.each([
    [7000, 'Above the 97th centile'],
    [3700, 'Below the 3rd centile'],
    [4350, 'Just below the 15th centile'],
  ])('places %d g on day 58 as %s', (grams, text) => {
    // When
    const chip = centileChip([weight('2026-06-17', grams)], 'girl', ellaBorn, ellaNow);

    // Then
    expect(chip).toBe(text);
  });

  it('after the first year, says when every weight of the past year was near the same centile', () => {
    // When
    const chip = centileChip(otto, 'boy', ottoBorn, ottoNow);

    // Then
    expect(chip).toBe('Close to the 50th centile all year');
  });

  it('after the first year, compares with the oldest weight of the past year when it moved', () => {
    // Given
    const weights = [weight('2025-09-12', 9200), weight('2026-09-12', 12840)];

    // When
    const chip = centileChip(weights, 'boy', ottoBorn, ottoNow);

    // Then
    expect(chip).toBe('Just below the 50th centile, up from the 15th a year ago');
  });
});

describe('the gain line under the weight', () => {
  it('is only the date with one weight', () => {
    // When
    const line = gainLine([weight('2026-06-17', 5120)], ellaBorn, ellaNow);

    // Then
    expect(line).toBe('17 Jun');
  });

  it('is nothing without a weight', () => {
    // When
    const line = gainLine([], ellaBorn, ellaNow);

    // Then
    expect(line).toBeNull();
  });

  it('gives the gain per day under 3 months', () => {
    // When
    const line = gainLine(ella, ellaBorn, ellaNow);

    // Then
    expect(line).toBe('17 Jun · +470 g in 16 days · about 29 g a day');
  });

  it('gives the gain per week from 3 to 12 months', () => {
    // Given
    const weights = [weight('2026-08-22', 6500), weight('2026-09-23', 7000)];

    // When
    const line = gainLine(weights, ellaBorn, new Date(2026, 8, 28));

    // Then
    expect(line).toBe('23 Sep · +500 g in 32 days · about 110 g a week');
  });

  it('gives the gain per month after the first year, over months past 60 days', () => {
    // When
    const line = gainLine(otto, ottoBorn, ottoNow);

    // Then
    expect(line).toBe('12 Sep · +360 g in 2 months · about 180 g a month');
  });

  it('shows a loss with a minus sign', () => {
    // Given
    const weights = [weight('2026-06-01', 4650), weight('2026-06-06', 4530)];

    // When
    const line = gainLine(weights, ellaBorn, ellaNow);

    // Then
    expect(line).toBe('6 Jun · −120 g in 5 days · about −24 g a day');
  });

  it('compares with the last weight of an earlier date', () => {
    // Given
    const weights = [weight('2026-06-01', 4650), weight('2026-06-17', 5100), weight('2026-06-17', 5120)];

    // When
    const line = gainLine(weights, ellaBorn, ellaNow);

    // Then
    expect(line).toBe('17 Jun · +470 g in 16 days · about 29 g a day');
  });
});

describe('the birth dip', () => {
  it('gives the lowest weight, its day, how far under birth weight and the day back', () => {
    // When
    const text = birthDipText(ella, ellaBorn, ellaNow);

    // Then
    expect(text).toBe('Lowest 3 160 g on day 3, 7% under birth weight. Back to birth weight on day 12.');
  });

  it('says when the baby is not back to birth weight yet', () => {
    // Given
    const weights = [weight('2026-04-20', 3400), weight('2026-04-23', 3160), weight('2026-04-27', 3300)];

    // When
    const text = birthDipText(weights, ellaBorn, new Date(2026, 3, 28));

    // Then
    expect(text).toBe('Lowest 3 160 g on day 3, 7% under birth weight. Not back to birth weight yet.');
  });

  it('is nothing without a weight on the birth date', () => {
    // When
    const text = birthDipText(ella.slice(1), ellaBorn, ellaNow);

    // Then
    expect(text).toBeNull();
  });

  it('is nothing without a lower weight in the first two weeks', () => {
    // Given
    const weights = [weight('2026-04-20', 3400), weight('2026-05-05', 3300), weight('2026-05-18', 4150)];

    // When
    const text = birthDipText(weights, ellaBorn, ellaNow);

    // Then
    expect(text).toBeNull();
  });

  it('is nothing from 3 months', () => {
    // When
    const text = birthDipText(ella, ellaBorn, new Date(2026, 6, 20));

    // Then
    expect(text).toBeNull();
  });
});

describe('the weight axis', () => {
  it('runs from birth to 12 weeks, every 4 weeks, under 3 months', () => {
    // When
    const axis = weightAxis(ellaBorn, ellaNow, 'lastYear');

    // Then
    expect(axis).toEqual({
      from: 0,
      to: 84,
      ticks: [
        { day: 0, label: 'Birth' },
        { day: 28, label: '4w' },
        { day: 56, label: '8w' },
        { day: 84, label: '12w' },
      ],
      switchable: false,
    });
  });

  it('runs from birth to now with month ticks from 3 to 12 months', () => {
    // When
    const axis = weightAxis(ellaBorn, new Date(2026, 8, 28), 'lastYear');

    // Then
    expect(axis).toEqual({
      from: 0,
      to: 161,
      ticks: [
        { day: 0, label: 'Birth' },
        { day: 30, label: '1m' },
        { day: 61, label: '2m' },
        { day: 91, label: '3m' },
        { day: 122, label: '4m' },
        { day: 153, label: '5m' },
      ],
      switchable: false,
    });
  });

  it('shows the last year, ticked every 4 months, over 12 months', () => {
    // When
    const axis = weightAxis(ottoBorn, ottoNow, 'lastYear');

    // Then
    expect(axis).toMatchObject({ from: 488, to: 853, switchable: true });
    expect(axis.ticks.map((tick) => tick.label)).toEqual(['16m', '20m', '2y', '28m']);
  });

  it('shows every 6 months since birth when asked, over 12 months', () => {
    // When
    const axis = weightAxis(ottoBorn, ottoNow, 'sinceBirth');

    // Then
    expect(axis).toMatchObject({ from: 0, to: 853, switchable: true });
    expect(axis.ticks.map((tick) => tick.label)).toEqual(['Birth', '6m', '1y', '18m', '2y']);
  });
});

describe('the weight chart', () => {
  it('has bands for the sex along the axis and fits them and the points', () => {
    // When
    const chart = weightChart(ella, 'girl', ellaBorn, ellaNow, 'lastYear');

    // Then
    expect(chart.points.map((point) => point.day)).toEqual([0, 3, 12, 28, 42, 58]);
    expect(chart.bands?.at(0)).toMatchObject({ day: 0, p50: 3232 });
    expect(chart.bands?.at(-1)?.day).toBe(84);
    expect(chart.min).toBeLessThanOrEqual(chart.bands![0]!.p3);
    expect(chart.max).toBeGreaterThanOrEqual(chart.bands!.at(-1)!.p97);
  });

  it('has no bands without the sex, and fits the points alone', () => {
    // When
    const chart = weightChart(ella, null, ellaBorn, ellaNow, 'lastYear');

    // Then
    expect(chart.bands).toBeNull();
    expect(chart.min).toBeLessThanOrEqual(3160);
    expect(chart.max).toBeGreaterThanOrEqual(5120);
    expect(chart.max - chart.min).toBeLessThan(3000);
  });

  it('keeps only the points on the axis', () => {
    // When
    const chart = weightChart([weight('2025-06-12', 8000), ...otto], 'boy', ottoBorn, ottoNow, 'lastYear');

    // Then
    expect(chart.points).toHaveLength(6);
  });
});

describe('the footer under the weight', () => {
  it.each([
    ['girl', ellaBorn, ellaNow, 'WHO girls'],
    ['boy', ottoBorn, ottoNow, 'WHO boys · gain shown per month after the first year'],
    [null, ellaBorn, ellaNow, 'Set girl or boy on the child screen to see the WHO ranges'],
  ] as const)('for %s reads %s', (sex, born, now, text) => {
    // When
    const footer = weightFooter(sex, born, now);

    // Then
    expect(footer).toBe(text);
  });
});
