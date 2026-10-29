import { describe, expect, it } from 'vitest';

import { entryDay, guessMeasurement, newMeasurement } from './model';

const now = new Date(2026, 8, 28, 12, 5);

describe('the day an entry is for', () => {
  it.each([
    ['today', new Date(2026, 8, 28)],
    ['yesterday', new Date(2026, 8, 27)],
  ] as const)('%s is that local date', (choice, day) => {
    // When
    const result = entryDay(choice, null, now);

    // Then
    expect(result).toEqual(day);
  });

  it('a picked date is that date', () => {
    // When
    const result = entryDay('picked', new Date(2026, 8, 3), now);

    // Then
    expect(result).toEqual(new Date(2026, 8, 3));
  });
});

describe('a new measurement for Baby Buddy', () => {
  it('a weight is grams on its date, with notes', () => {
    // When
    const entry = newMeasurement('weight', { child: 3, value: 7050, day: new Date(2026, 8, 27), clock: '12:05', notes: ' after the bath ' }, now);

    // Then
    expect(entry).toEqual({ child: 3, weight: 7050, date: '2026-09-27', notes: 'after the bath' });
  });

  it("today's head circumference has no date, so Baby Buddy stamps its own today, and no notes when none are typed", () => {
    // When
    const entry = newMeasurement('head', { child: 3, value: 42.3, day: 'today', clock: '12:05', notes: '' }, now);

    // Then
    expect(entry).toEqual({ child: 3, head_circumference: 42.3 });
  });

  it('a temperature is its date at the chosen clock time', () => {
    // When
    const entry = newMeasurement('temperature', { child: 3, value: 36.9, day: new Date(2026, 8, 27), clock: '20:10', notes: '' }, now);

    // Then
    expect(entry).toEqual({ child: 3, temperature: 36.9, time: new Date(2026, 8, 27, 20, 10).toISOString() });
  });

  it('a temperature later today than now is refused, as Baby Buddy would', () => {
    // When
    const entry = newMeasurement('temperature', { child: 3, value: 36.9, day: 'today', clock: '13:00', notes: '' }, now);

    // Then
    expect(entry).toBe('future');
  });
});

describe('the guess shown before Baby Buddy answers', () => {
  it('is the new measurement with a negative id', () => {
    // When
    const guess = guessMeasurement('bmi', { child: 3, bmi: 16.3, date: '2026-09-27' }, now);

    // Then
    expect(guess).toMatchObject({ child: 3, bmi: 16.3, date: '2026-09-27', notes: null, tags: [] });
    expect(guess.id).toBeLessThan(0);
  });

  it("is dated today when Baby Buddy will stamp the date", () => {
    // When
    const guess = guessMeasurement('weight', { child: 3, weight: 7050 }, now);

    // Then
    expect(guess).toMatchObject({ weight: 7050, date: '2026-09-28' });
  });
});
