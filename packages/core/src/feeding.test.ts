import { describe, expect, it } from 'vitest';

import type { Feeding } from '@molly/api';

import { feedingForStop, isSolidFeed, lastBottle } from './feeding';

const bottleDefaults = { type: 'formula', amount: 120 } as const;

describe('feeding stop buttons', () => {
  it('Left logs breast milk from the left breast', () => {
    // Given
    const button = 'left';

    // When
    const feeding = feedingForStop(button, bottleDefaults);

    // Then
    expect(feeding).toEqual({ type: 'breast milk', method: 'left breast' });
  });

  it('Right logs breast milk from the right breast', () => {
    // Given
    const button = 'right';

    // When
    const feeding = feedingForStop(button, bottleDefaults);

    // Then
    expect(feeding).toEqual({ type: 'breast milk', method: 'right breast' });
  });

  it('Both logs breast milk from both breasts', () => {
    // Given
    const button = 'both';

    // When
    const feeding = feedingForStop(button, bottleDefaults);

    // Then
    expect(feeding).toEqual({ type: 'breast milk', method: 'both breasts' });
  });

  it('Bottle logs the device default type and amount', () => {
    // Given
    const button = 'bottle';

    // When
    const feeding = feedingForStop(button, bottleDefaults);

    // Then
    expect(feeding).toEqual({ type: 'formula', method: 'bottle', amount: 120 });
  });

  it('Bottle without a default amount logs no amount', () => {
    // Given
    const noAmount = { type: 'breast milk' } as const;

    // When
    const feeding = feedingForStop('bottle', noAmount);

    // Then
    expect(feeding).toStrictEqual({ type: 'breast milk', method: 'bottle' });
  });
});

function feed(id: number, start: string, changes: Partial<Feeding> = {}): Feeding {
  return {
    id,
    child: 1,
    start: `2026-10-14T${start}:00Z`,
    end: `2026-10-14T${start}:00Z`,
    duration: '00:00:00',
    type: 'breast milk',
    method: 'left breast',
    amount: null,
    notes: null,
    tags: [],
    ...changes,
  };
}

const bottle = (id: number, start: string, type: Feeding['type'], amount: number | null) =>
  feed(id, start, { method: 'bottle', type, amount });

describe('last bottle', () => {
  it("is the child's bottle with no feeds", () => {
    // Given
    const feedings: Feeding[] = [];

    // When
    const last = lastBottle(feedings, bottleDefaults);

    // Then
    expect(last).toEqual(bottleDefaults);
  });

  it("is one earlier bottle's type and amount", () => {
    // Given
    const feedings = [bottle(1, '07:00', 'breast milk', 90)];

    // When
    const last = lastBottle(feedings, bottleDefaults);

    // Then
    expect(last).toEqual({ type: 'breast milk', amount: 90 });
  });

  it('is the newest of many bottles, whatever their order', () => {
    // Given
    const feedings = [bottle(1, '07:00', 'formula', 120), bottle(3, '11:00', 'formula', 135), bottle(2, '09:00', 'formula', 130)];

    // When
    const last = lastBottle(feedings, bottleDefaults);

    // Then
    expect(last).toEqual({ type: 'formula', amount: 135 });
  });

  it('skips breastfeeds and bottles without an amount', () => {
    // Given
    const feedings = [bottle(1, '07:00', 'formula', 125), bottle(2, '09:00', 'breast milk', null), feed(3, '11:00')];

    // When
    const last = lastBottle(feedings, bottleDefaults);

    // Then
    expect(last).toEqual({ type: 'formula', amount: 125 });
  });

  it("is the child's bottle when no bottle has an amount", () => {
    // Given
    const feedings = [bottle(1, '07:00', 'breast milk', null), feed(2, '09:00')];

    // When
    const last = lastBottle(feedings, bottleDefaults);

    // Then
    expect(last).toEqual(bottleDefaults);
  });
});

describe('solid or milk', () => {
  it.each(['parent fed', 'self fed'] as const)('a "%s" feeding is solid', (method) => {
    // Given
    const meal = { method };

    // When
    const solid = isSolidFeed(meal);

    // Then
    expect(solid).toBe(true);
  });

  it.each(['left breast', 'right breast', 'both breasts', 'bottle'] as const)('a "%s" feeding is milk', (method) => {
    // Given
    const milk = { method };

    // When
    const solid = isSolidFeed(milk);

    // Then
    expect(solid).toBe(false);
  });
});
