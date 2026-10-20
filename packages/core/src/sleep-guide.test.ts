import { describe, expect, it } from 'vitest';

import { ageInMonths, sleepGuide, wakeForSlot } from './sleep-guide';

const on = (year: number, month: number, day: number, hours = 12) => new Date(year, month - 1, day, hours);

describe('age in months', () => {
  it('is zero on the day of birth', () => {
    // Given
    const now = on(2026, 5, 10);

    // When
    const age = ageInMonths('2026-05-10', now);

    // Then
    expect(age).toBe(0);
  });

  it('counts a month on each monthly birthday', () => {
    // Given
    const now = on(2026, 9, 10);

    // When
    const age = ageInMonths('2026-05-10', now);

    // Then
    expect(age).toBe(4);
  });

  it('has not counted the month on the day before the monthly birthday', () => {
    // Given
    const now = on(2026, 9, 9);

    // When
    const age = ageInMonths('2026-05-10', now);

    // Then
    expect(age).toBe(3);
  });

  it('counts the month on the last day of a shorter month for a month-end birthday', () => {
    // Given
    const now = on(2026, 2, 28);

    // When
    const age = ageInMonths('2026-01-31', now);

    // Then
    expect(age).toBe(1);
  });
});

describe('the age guide', () => {
  it('has nothing on the day before the baby turns 6 weeks', () => {
    // Given
    const now = on(2026, 6, 20);

    // When
    const guide = sleepGuide('2026-05-10', now);

    // Then
    expect(guide).toBeNull();
  });

  it('gives the wake window of the band the age falls in, in minutes', () => {
    // Given
    const now = on(2026, 9, 10);

    // When
    const guide = sleepGuide('2026-05-10', now);

    // Then
    expect(guide).toEqual({ band: '3–5 months', wake: { min: 75, max: 150 } });
  });

  it.each([
    ['2026-02-21', '6 weeks–3 months', { min: 60, max: 105 }],
    ['2026-04-10', '3–5 months', { min: 75, max: 150 }],
    ['2026-06-10', '5–7 months', { min: 120, max: 180 }],
    ['2026-08-10', '7–10 months', { min: 150, max: 210 }],
    ['2026-11-10', '10–12 months', { min: 180, max: 240 }],
    ['2027-01-10', '12–18 months', { min: 180, max: 270 }],
    ['2027-07-10', '18–36 months', { min: 300, max: 360 }],
  ])('on %s, a baby born 2026-01-10 is in the %s band from its first day', (day, band, wake) => {
    // Given
    const [year = 0, month = 0, date = 0] = day.split('-').map(Number);
    const now = on(year, month, date);

    // When
    const guide = sleepGuide('2026-01-10', now);

    // Then
    expect(guide).toEqual({ band, wake });
  });

  it('has nothing from the day the baby turns 36 months', () => {
    // Given
    const now = on(2029, 1, 10);

    // When
    const guide = sleepGuide('2026-01-10', now);

    // Then
    expect(guide).toBeNull();
  });

  it('still has the oldest band on the day before 36 months', () => {
    // Given
    const now = on(2029, 1, 9);

    // When
    const guide = sleepGuide('2026-01-10', now);

    // Then
    expect(guide?.band).toBe('18–36 months');
  });
});

describe('the age guide for a window of the day', () => {
  const band = { min: 75, max: 150 };

  it('is the whole range for a window in the middle of the day', () => {
    // Given
    const slot = 'middle';

    // When
    const wake = wakeForSlot(band, slot);

    // Then
    expect(wake).toEqual({ min: 75, max: 150 });
  });

  it('is the lower two-thirds of the range for the first window of the day', () => {
    // Given
    const slot = 'first';

    // When
    const wake = wakeForSlot(band, slot);

    // Then
    expect(wake).toEqual({ min: 75, max: 125 });
  });

  it('is the upper two-thirds of the range for the last window before bedtime', () => {
    // Given
    const slot = 'last';

    // When
    const wake = wakeForSlot(band, slot);

    // Then
    expect(wake).toEqual({ min: 100, max: 150 });
  });
});
