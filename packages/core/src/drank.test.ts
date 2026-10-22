import type { Feeding } from '@molly/api';
import { describe, expect, it } from 'vitest';

import { feeding } from '../test/fixtures';
import { drank, drankText } from './drank';

/** The card's span: the night that ended this morning, then the day after. */
const from = new Date(2026, 9, 12, 19, 0);
const to = new Date(2026, 9, 13, 19, 0);
const at = (day: number, hours: number, minutes = 0) => new Date(2026, 9, day, hours, minutes).toISOString();
const bottle = (start: string, amount: number | null) =>
  feeding({ start, end: start, type: 'formula', method: 'bottle', amount });

describe('how much the baby drank over a span', () => {
  it('is nothing with no feeds', () => {
    // Given
    const feeds: Feeding[] = [];

    // When
    const result = drank(feeds, from, to, 150);

    // Then
    expect(result).toEqual({ ml: 0, estimated: false, unmeasured: 0, unmeasuredBreast: 0 });
  });

  it("counts a bottle's saved amount, not as an estimate", () => {
    // Given
    const feeds = [bottle(at(13, 8), 120)];

    // When
    const result = drank(feeds, from, to, 150);

    // Then
    expect(result).toEqual({ ml: 120, estimated: false, unmeasured: 0, unmeasuredBreast: 0 });
  });

  it('adds up many bottles', () => {
    // Given
    const feeds = [bottle(at(12, 23), 90), bottle(at(13, 8), 120), bottle(at(13, 12), 140)];

    // When
    const result = drank(feeds, from, to, 150);

    // Then
    expect(result.ml).toBe(350);
  });

  it.each(['left breast', 'right breast'] as const)(
    'counts a %s feed as half the default bottle, as an estimate',
    (method) => {
      // Given
      const feeds = [feeding({ start: at(13, 8), end: at(13, 8, 20), method })];

      // When
      const result = drank(feeds, from, to, 150);

      // Then
      expect(result).toEqual({ ml: 75, estimated: true, unmeasured: 0, unmeasuredBreast: 0 });
    },
  );

  it('counts a feed from both breasts as the default bottle, as an estimate', () => {
    // Given
    const feeds = [feeding({ start: at(13, 8), end: at(13, 8, 20), method: 'both breasts' })];

    // When
    const result = drank(feeds, from, to, 150);

    // Then
    expect(result).toEqual({ ml: 150, estimated: true, unmeasured: 0, unmeasuredBreast: 0 });
  });

  it('counts left then right as two feeds the same as one from both breasts', () => {
    // Given
    const feeds = [
      feeding({ start: at(13, 8), end: at(13, 8, 10), method: 'left breast' }),
      feeding({ start: at(13, 8, 10), end: at(13, 8, 20), method: 'right breast' }),
    ];

    // When
    const result = drank(feeds, from, to, 150);

    // Then
    expect(result.ml).toBe(150);
  });

  it('rounds the total once, not each half', () => {
    // Given
    const feeds = [
      feeding({ start: at(13, 8), end: at(13, 8, 20), method: 'left breast' }),
      feeding({ start: at(13, 11), end: at(13, 11, 20), method: 'left breast' }),
      feeding({ start: at(13, 14), end: at(13, 14, 20), method: 'left breast' }),
    ];

    // When
    const result = drank(feeds, from, to, 125);

    // Then
    expect(result.ml).toBe(188);
  });

  it('counts a bottle saved without ml as the default bottle, as an estimate', () => {
    // Given
    const feeds = [bottle(at(13, 8), null)];

    // When
    const result = drank(feeds, from, to, 150);

    // Then
    expect(result).toEqual({ ml: 150, estimated: true, unmeasured: 0, unmeasuredBreast: 0 });
  });

  it('adds bottles and the estimated breastfeeds together', () => {
    // Given
    const feeds = [
      bottle(at(13, 8), 120),
      feeding({ start: at(13, 11), end: at(13, 11, 20), method: 'both breasts' }),
      bottle(at(13, 14), 100),
      feeding({ start: at(13, 17), end: at(13, 17, 15), method: 'right breast' }),
    ];

    // When
    const result = drank(feeds, from, to, 150);

    // Then
    expect(result).toEqual({ ml: 445, estimated: true, unmeasured: 0, unmeasuredBreast: 0 });
  });

  it('leaves out parent fed and self fed', () => {
    // Given
    const feeds = [
      feeding({ start: at(13, 12), end: at(13, 12, 20), type: 'solid food', method: 'parent fed', amount: 80 }),
      feeding({ start: at(13, 16), end: at(13, 16, 20), type: 'solid food', method: 'self fed', amount: null }),
    ];

    // When
    const result = drank(feeds, from, to, 150);

    // Then
    expect(result).toEqual({ ml: 0, estimated: false, unmeasured: 0, unmeasuredBreast: 0 });
  });

  it('counts a feed starting exactly at the start of the span', () => {
    // Given
    const feeds = [bottle(from.toISOString(), 120)];

    // When
    const result = drank(feeds, from, to, 150);

    // Then
    expect(result.ml).toBe(120);
  });

  it('leaves out a feed starting exactly at the end of the span', () => {
    // Given
    const feeds = [bottle(to.toISOString(), 120)];

    // When
    const result = drank(feeds, from, to, 150);

    // Then
    expect(result.ml).toBe(0);
  });

  it('leaves out a feed that started before the span and ran into it', () => {
    // Given
    const feeds = [feeding({ start: at(12, 18, 45), end: at(12, 19, 10), method: 'left breast' })];

    // When
    const result = drank(feeds, from, to, 150);

    // Then
    expect(result).toEqual({ ml: 0, estimated: false, unmeasured: 0, unmeasuredBreast: 0 });
  });

  it('with no default bottle, counts breastfeeds by number instead of guessing', () => {
    // Given
    const feeds = [
      bottle(at(13, 8), 120),
      feeding({ start: at(13, 11), end: at(13, 11, 20), method: 'left breast' }),
      feeding({ start: at(13, 15), end: at(13, 15, 20), method: 'both breasts' }),
    ];

    // When
    const result = drank(feeds, from, to, undefined);

    // Then
    expect(result).toEqual({ ml: 120, estimated: false, unmeasured: 2, unmeasuredBreast: 2 });
  });

  it('with no default bottle, counts a bottle without ml as unmeasured but not as a breastfeed', () => {
    // Given
    const feeds = [bottle(at(13, 8), null), feeding({ start: at(13, 11), end: at(13, 11, 20), method: 'left breast' })];

    // When
    const result = drank(feeds, from, to, undefined);

    // Then
    expect(result).toEqual({ ml: 0, estimated: false, unmeasured: 2, unmeasuredBreast: 1 });
  });
});

describe('the words for how much the baby drank', () => {
  it('are none when no feed was counted', () => {
    // Given
    const result = { ml: 0, estimated: false, unmeasured: 0, unmeasuredBreast: 0 };

    // When
    const words = drankText(result);

    // Then
    expect(words).toBeNull();
  });

  it('give the measured ml', () => {
    // Given
    const result = { ml: 640, estimated: false, unmeasured: 0, unmeasuredBreast: 0 };

    // When
    const words = drankText(result);

    // Then
    expect(words).toEqual({ text: '640 ml', spoken: '640 millilitres' });
  });

  it('mark an estimate as about', () => {
    // Given
    const result = { ml: 840, estimated: true, unmeasured: 0, unmeasuredBreast: 0 };

    // When
    const words = drankText(result);

    // Then
    expect(words).toEqual({ text: '≈ 840 ml', spoken: 'about 840 millilitres' });
  });

  it('name the breastfeeds left unmeasured', () => {
    // Given
    const result = { ml: 360, estimated: false, unmeasured: 3, unmeasuredBreast: 3 };

    // When
    const words = drankText(result);

    // Then
    expect(words).toEqual({ text: '360 ml + 3 breastfeeds', spoken: '360 millilitres plus 3 breastfeeds' });
  });

  it('name one breastfeed left unmeasured in the singular', () => {
    // Given
    const result = { ml: 360, estimated: false, unmeasured: 1, unmeasuredBreast: 1 };

    // When
    const words = drankText(result);

    // Then
    expect(words?.text).toBe('360 ml + 1 breastfeed');
  });

  it('call them feeds without ml once a bottle without ml is among them', () => {
    // Given
    const result = { ml: 360, estimated: false, unmeasured: 4, unmeasuredBreast: 3 };

    // When
    const words = drankText(result);

    // Then
    expect(words).toEqual({
      text: '360 ml + 4 feeds without ml',
      spoken: '360 millilitres plus 4 feeds without millilitres',
    });
  });

  it('name only the feeds when none was measured', () => {
    // Given
    const result = { ml: 0, estimated: false, unmeasured: 3, unmeasuredBreast: 3 };

    // When
    const words = drankText(result);

    // Then
    expect(words).toEqual({ text: '3 breastfeeds', spoken: '3 breastfeeds' });
  });
});
