import { describe, expect, it } from 'vitest';

import { THEME_KEYS, THEMES, type ThemeKey } from './themes';

// The themes from before Ribbon: their new tokens repeat what they already used, so they look the same.
const EARLIER: ThemeKey[] = ['classic', 'arcade', 'space', 'score', 'term', 'safari'];
const EARLIER_LOOKS = EARLIER.flatMap((key) => (['day', 'night'] as const).map((scheme) => [`${key} ${scheme}`, THEMES[key][scheme]] as const));

describe.each(EARLIER_LOOKS)('the accent and track tokens in %s', (_, look) => {
  it('fill primary buttons in ink, with bg on them', () => {
    // Given
    const p = look.palette;

    // When
    const button = { fill: p.accent, text: p['on-accent'] };

    // Then
    expect(button).toEqual({ fill: p.ink, text: p.bg });
  });

  it("draw the ring's track in line", () => {
    // Given
    const p = look.palette;

    // When
    const track = p.track;

    // Then
    expect(track).toBe(p.line);
  });

  it('keep the switches on in diaper ink', () => {
    // Given
    const p = look.palette;

    // When
    const on = p.toggle;

    // Then
    expect(on).toBe(p['diaper-ink']);
  });
});

describe('Ribbon in the theme list', () => {
  it('comes second, after Classic', () => {
    // When
    const order = THEME_KEYS.slice(0, 2);

    // Then
    expect(order).toEqual(['classic', 'ribbon']);
  });

});

describe('Life Sim in the theme list', () => {
  it('comes third, after Ribbon', () => {
    // When
    const order = THEME_KEYS.slice(0, 3);

    // Then
    expect(order).toEqual(['classic', 'ribbon', 'sim']);
  });

  it('is the only theme marked new', () => {
    // When
    const marked = THEME_KEYS.filter((key) => THEMES[key].isNew);

    // Then
    expect(marked).toEqual(['sim']);
  });
});

const LOOKS = THEME_KEYS.flatMap((key) => (['day', 'night'] as const).map((scheme) => [key, scheme, THEMES[key][scheme]] as const));

describe('the needs and stitch slots', () => {
  it('give needs to Life Sim alone', () => {
    // When
    const withNeeds = LOOKS.filter(([, , look]) => look.needs !== null).map(([key, scheme]) => `${key} ${scheme}`);

    // Then
    expect(withNeeds).toEqual(['sim day', 'sim night']);
  });

  it('give the stitch to Ribbon and Life Sim alone', () => {
    // When
    const withStitch = LOOKS.filter(([, , look]) => look.stitch !== null).map(([key, scheme]) => `${key} ${scheme}`);

    // Then
    expect(withStitch).toEqual(['ribbon day', 'ribbon night', 'sim day', 'sim night']);
  });

  it("keep Ribbon's stitch colours", () => {
    // When
    const stitches = [THEMES.ribbon.day.stitch, THEMES.ribbon.night.stitch];

    // Then
    expect(stitches).toEqual(['#fffcfd', '#764d5c']);
  });

  it.each(['day', 'night'] as const)('hold a colour and a label ink for every tenth of a need in Life Sim by %s', (scheme) => {
    // Given
    const needs = THEMES.sim[scheme].needs!;

    // When
    const lengths = [needs.colors.length, needs.inks.length];

    // Then
    expect(lengths).toEqual([11, 11]);
  });
});
