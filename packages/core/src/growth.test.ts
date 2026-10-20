import { describe, expect, it } from 'vitest';

import { bmi, head, height, weight } from '../test/fixtures';
import { bmiBars, bmiFormula, headRings, heightView, sinceLine } from './growth';

const ellaBorn = '2026-04-20';
const ellaNow = new Date(2026, 8, 28, 12, 5);
const ellaHeights = [
  height('2026-04-20', 50),
  height('2026-05-21', 54),
  height('2026-06-21', 57.5),
  height('2026-07-22', 60.5),
  height('2026-08-22', 63),
  height('2026-09-23', 65.5),
];

const ottoBorn = '2024-05-12';
const ottoNow = new Date(2026, 8, 12, 12, 5);
const ottoHeights = [
  height('2025-03-12', 72),
  height('2025-05-12', 76),
  height('2025-08-12', 79.5),
  height('2025-11-12', 82.5),
  height('2026-02-12', 85),
  height('2026-05-12', 86.4),
  height('2026-09-12', 89),
];

describe('the height doorframe', () => {
  it('marks every height since birth under 1 year, dated, the older fainter', () => {
    // When
    const view = heightView(ellaHeights, ellaBorn, ellaNow);

    // Then
    expect(view.marks.map((mark) => [mark.value, mark.label])).toEqual([
      ['50.0 cm', 'Birth'],
      ['54.0 cm', '21 May'],
      ['57.5 cm', '21 Jun'],
      ['60.5 cm', '22 Jul'],
      ['63.0 cm', '22 Aug'],
      ['65.5 cm', '23 Sep'],
    ]);
    expect(view.marks.map((mark) => mark.fade)).toEqual([0.45, 0.56, 0.67, 0.78, 0.89, 1]);
  });

  it('marks the last year by age over 1 year', () => {
    // When
    const view = heightView(ottoHeights, ottoBorn, ottoNow);

    // Then
    expect(view.marks.map((mark) => mark.label)).toEqual([
      '18 months',
      '21 months',
      '2 years',
      '28 months',
    ]);
  });

  it('labels a mark at exactly a year 1 year', () => {
    // When
    const view = heightView([height('2025-05-12', 76), height('2025-09-12', 80)], ottoBorn, new Date(2026, 4, 12));

    // Then
    expect(view.marks.map((mark) => mark.label)).toEqual(['1 year', '16 months']);
  });

  it('fits the ruler around the marks, a long tick and label every 5 cm', () => {
    // When
    const { ruler } = heightView(ellaHeights, ellaBorn, ellaNow);

    // Then
    expect([ruler.min, ruler.max]).toEqual([47, 68]);
    expect(ruler.ticks.at(0)).toEqual({ cm: 48, long: false, label: '' });
    expect(ruler.ticks.find((tick) => tick.cm === 50)).toEqual({ cm: 50, long: true, label: '50' });
    expect(ruler.ticks.at(-1)?.cm).toBe(67);
  });

  it('says how much taller than at birth under 1 year', () => {
    // When
    const { line } = heightView(ellaHeights, ellaBorn, ellaNow);

    // Then
    expect(line).toBe('23 Sep · 15.5 cm taller than at birth');
  });

  it('says the change since the height before over 1 year', () => {
    // When
    const { line } = heightView(ottoHeights, ottoBorn, ottoNow);

    // Then
    expect(line).toBe('12 Sep · +2.6 cm since May');
  });

  it('has no marks and no line without a height', () => {
    // When
    const view = heightView([], ellaBorn, ellaNow);

    // Then
    expect(view).toMatchObject({ marks: [], line: null });
  });
});

describe('the change since the entry before', () => {
  it('names the month of the entry before', () => {
    // When
    const line = sinceLine('head', [head('2026-08-22', 41.6), head('2026-09-23', 42.3)], ellaNow);

    // Then
    expect(line).toBe('23 Sep · +0.7 cm since August');
  });

  it('names the day when the entry before is in the same month', () => {
    // When
    const line = sinceLine('head', [head('2026-09-02', 41.9), head('2026-09-23', 42.3)], ellaNow);

    // Then
    expect(line).toBe('23 Sep · +0.4 cm since 2 Sep');
  });

  it("adds the year when it isn't this one", () => {
    // When
    const line = sinceLine('head', [head('2025-12-02', 41.9), head('2026-01-23', 42.3)], ellaNow);

    // Then
    expect(line).toBe('23 Jan · +0.4 cm since December 2025');
  });

  it('is only the date with one entry', () => {
    // When
    const line = sinceLine('head', [head('2026-09-23', 42.3)], ellaNow);

    // Then
    expect(line).toBe('23 Sep');
  });
});

describe('the head rings', () => {
  const heads = [
    head('2026-04-20', 34.5),
    head('2026-05-21', 37),
    head('2026-06-21', 39),
    head('2026-08-22', 41.6),
    head('2026-09-23', 42.3),
  ];

  it('has one ring per entry, smallest first, sized by value, the latest thicker', () => {
    // When
    const { rings } = headRings(heads, ellaBorn, ellaNow);

    // Then
    expect(rings.map((ring) => ring.latest)).toEqual([false, false, false, false, true]);
    const sizes = rings.map((ring) => ring.size);
    expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
    expect(sizes.at(-1)).toBe(1);
    expect(rings.map((ring) => ring.fade)).toEqual([0.25, 0.44, 0.63, 0.81, 1]);
  });

  it('puts the birth value in the centre', () => {
    // When
    const { centre } = headRings(heads, ellaBorn, ellaNow);

    // Then
    expect(centre).toEqual({ label: 'Birth', value: '34.5 cm' });
  });

  it('puts the oldest value in the centre, dated, without one from birth', () => {
    // When
    const { centre } = headRings(heads.slice(1), ellaBorn, ellaNow);

    // Then
    expect(centre).toEqual({ label: '21 May', value: '37.0 cm' });
  });
});

describe('the BMI bars', () => {
  it('are the newest six, oldest first, labelled by age, the latest marked', () => {
    // Given
    const bmis = ['04-20', '05-20', '06-21', '07-22', '08-22', '09-23', '09-27'].map((day, i) => bmi(`2026-${day}`, 13.6 + i * 0.5));

    // When
    const bars = bmiBars(bmis, ellaBorn);

    // Then
    expect(bars.map((bar) => [bar.value, bar.label, bar.latest])).toEqual([
      ['14.1', '1m', false],
      ['14.6', '2m', false],
      ['15.1', '3m', false],
      ['15.6', '4m', false],
      ['16.1', '5m', false],
      ['16.6', '5m', true],
    ]);
  });

  it('are as tall as their value within a range that fits them', () => {
    // When
    const bars = bmiBars([bmi('2026-04-20', 13.5), bmi('2026-09-23', 16.3)], ellaBorn);

    // Then
    expect(bars.map((bar) => bar.label)).toEqual(['Birth', '5m']);
    expect(bars[0]!.height).toBeGreaterThan(0);
    expect(bars[0]!.height).toBeLessThan(bars[1]!.height);
    expect(bars[1]!.height).toBeLessThanOrEqual(1);
  });
});

describe('the BMI formula', () => {
  it("shows the weight and height of the latest BMI's date", () => {
    // Given
    const lists = {
      bmi: [bmi('2026-09-23', 16.3)],
      weight: [weight('2026-09-23', 7000)],
      height: [height('2026-09-23', 65.5)],
    };

    // When
    const formula = bmiFormula(lists);

    // Then
    expect(formula).toEqual({ weight: '7.00 kg', height: '0.655 m' });
  });

  it('is nothing without a height on that date', () => {
    // Given
    const lists = {
      bmi: [bmi('2026-09-23', 16.3)],
      weight: [weight('2026-09-23', 7000)],
      height: [height('2026-09-22', 65.5)],
    };

    // When
    const formula = bmiFormula(lists);

    // Then
    expect(formula).toBeNull();
  });
});
