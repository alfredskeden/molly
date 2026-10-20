import { describe, expect, it } from 'vitest';

import { contrast } from './contrast';
import { crescent, roundedBox, teddySleepy } from './ornaments';
import { THEME_KEYS, THEMES } from './themes';

describe("the teddy's eyes", () => {
  it('are open with no sleeps', () => {
    // When
    const sleepy = teddySleepy([]);

    // Then
    expect(sleepy).toBe(false);
  });

  it('are open while one sleep has ended', () => {
    // When
    const sleepy = teddySleepy([{ running: false }]);

    // Then
    expect(sleepy).toBe(false);
  });

  it('close while a sleep runs', () => {
    // When
    const sleepy = teddySleepy([{ running: false }, { running: true }]);

    // Then
    expect(sleepy).toBe(true);
  });
});

describe('roundedBox', () => {
  it('draws square corners as a plain box', () => {
    // When
    const path = roundedBox(0, 0, 10, 20, [[0, 0], [0, 0], [0, 0], [0, 0]]);

    // Then
    expect(path).toBe('M0 0H10A0 0 0 0 1 10 0V20A0 0 0 0 1 10 20H0A0 0 0 0 1 0 20V0A0 0 0 0 1 0 0Z');
  });

  it('draws one rounded corner where it is asked for', () => {
    // When
    const path = roundedBox(0, 0, 10, 20, [[0, 0], [0, 0], [0, 0], [4, 5]]);

    // Then
    expect(path).toBe('M0 0H10A0 0 0 0 1 10 0V20A0 0 0 0 1 10 20H4A4 5 0 0 1 0 15V0A0 0 0 0 1 0 0Z');
  });

  it('scales every corner down together when two would overlap, as CSS does', () => {
    // When
    const path = roundedBox(0, 0, 10, 10, [[10, 10], [10, 10], [10, 10], [10, 10]]);

    // Then
    expect(path).toBe('M5 0H5A5 5 0 0 1 10 5V5A5 5 0 0 1 5 10H5A5 5 0 0 1 0 5V5A5 5 0 0 1 5 0Z');
  });
});

describe('crescent', () => {
  it('draws the part of one circle the other leaves uncovered, between their two crossings', () => {
    // When
    const path = crescent({ x: 0, y: 0 }, { x: 10, y: 0 }, 10);

    // Then
    expect(path).toBe('M5 8.66A10 10 0 1 1 5 -8.66A10 10 0 0 0 5 8.66Z');
  });
});

describe('the ornaments slot', () => {
  it.each(THEME_KEYS.filter((key) => key !== 'ribbon'))('is empty in %s', (key) => {
    // When
    const slots = [THEMES[key].day.ornaments, THEMES[key].night.ornaments];

    // Then
    expect(slots).toEqual([null, null]);
  });

  it.each(['day', 'night'] as const)('is set in Ribbon by %s', (scheme) => {
    // When
    const ornaments = THEMES.ribbon[scheme].ornaments;

    // Then
    expect(ornaments).toEqual({
      bow: { color: expect.stringMatching(/^#[0-9a-f]{6}$/), shade: expect.stringMatching(/^#[0-9a-f]{6}$/) },
      teddy: {
        fur: expect.stringMatching(/^#[0-9a-f]{6}$/),
        muzzle: expect.stringMatching(/^#[0-9a-f]{6}$/),
        ink: expect.stringMatching(/^#[0-9a-f]{6}$/),
        cheek: expect.stringMatching(/^#[0-9a-f]{6}$/),
      },
      toast: expect.stringMatching(/^#[0-9a-f]{6}$/),
    });
  });

  it.each(['day', 'night'] as const)("draws the toast's Edit in Ribbon by %s as text that passes on the toast", (scheme) => {
    // Given
    const { ornaments, palette } = THEMES.ribbon[scheme];

    // When
    const ratio = contrast(ornaments!.toast, palette.ink);

    // Then
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
