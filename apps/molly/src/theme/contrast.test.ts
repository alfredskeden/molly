import { describe, expect, it } from 'vitest';

import { contrast, over } from './contrast';
import { THEME_KEYS, THEMES } from './themes';

const LOOKS = THEME_KEYS.flatMap((key) => (['day', 'night'] as const).map((scheme) => [`${key} ${scheme}`, THEMES[key][scheme]] as const));
const TRACKERS = ['sleep', 'feed', 'diaper', 'med'] as const;

// WCAG 2.2 AA: 4.5 : 1 for text, 3 : 1 for graphics that carry meaning.
const TEXT = 4.5;
const GRAPHIC = 3;

describe.each(LOOKS)('contrast in %s', (_, look) => {
  const p = look.palette;

  it.each([
    ['body text · ink on bg', p.ink, p.bg],
    ['body text · ink on surface', p.ink, p.surface],
    ['muted text on bg', p.muted, p.bg],
    ['muted text on surface', p.muted, p.surface],
    ['danger text on surface', p.danger, p.surface],
    ['toast text · bg on ink', p.bg, p.ink],
    ['primary button text · on-accent on accent', p['on-accent'], p.accent],
  ])('%s passes for text', (_, text, background) => {
    // Given
    const pair = [text, background] as const;

    // When
    const ratio = contrast(...pair);

    // Then
    expect(ratio).toBeGreaterThanOrEqual(TEXT);
  });

  it.each(TRACKERS)('%s tile text, buttons, hero sub-lines at 85%% and Cancel links pass for text', (tracker) => {
    // Given
    const ink = p[`${tracker}-ink`];
    const bg = p[`${tracker}-bg`];

    // When
    const ratios = [contrast(ink, bg), contrast(bg, ink), contrast(over(ink, bg, 0.85), bg)];

    // Then
    expect(Math.min(...ratios)).toBeGreaterThanOrEqual(TEXT);
  });

  it.each(TRACKERS)('%s marks in the Today strip stand out from their lane', (tracker) => {
    // Given
    const mark = p[`${tracker}-mark`];

    // When
    const ratio = contrast(mark, p.bg);

    // Then
    expect(ratio).toBeGreaterThanOrEqual(GRAPHIC);
  });

  it.each(TRACKERS)('the toast\'s %s "Adjust time" and "Edit" text passes on its mid colour', (tracker) => {
    // Given
    const mid = p[`${tracker}-mid`];

    // When
    const ratio = contrast(p['on-mid'], mid);

    // Then
    expect(ratio).toBeGreaterThanOrEqual(TEXT);
  });

  it.each([
    ['the centile chip and + buttons · grow-ink on grow-bg', p['grow-ink'], p['grow-bg']],
    ['the fever card · hot-ink on hot-bg', p['hot-ink'], p['hot-bg']],
    ['the Raised chip · ink on warm-bg', p.ink, p['warm-bg']],
    ['the Low chip · ink on cool-bg', p.ink, p['cool-bg']],
  ])('%s passes for text', (_, text, background) => {
    // When
    const ratio = contrast(text, background);

    // Then
    expect(ratio).toBeGreaterThanOrEqual(TEXT);
  });

  it.each([
    ['a primary button · accent on bg', p.accent, p.bg],
    ['a primary button · accent on surface', p.accent, p.surface],
    ['a switch that is on · toggle on surface', p.toggle, p.surface],
  ])('%s stands out', (_, shape, background) => {
    // When
    const ratio = contrast(shape, background);

    // Then
    expect(ratio).toBeGreaterThanOrEqual(GRAPHIC);
  });

  it('the weight line stands out from its card', () => {
    // When
    const ratio = contrast(p['grow-ink'], p.surface);

    // Then
    expect(ratio).toBeGreaterThanOrEqual(GRAPHIC);
  });

  it.each(['movement', 'talking', 'sleep', 'feeding', 'play', 'feelings', 'health', 'parents'] as const)(
    "the guide's %s bar and dots stand out from their card",
    (topic) => {
      // When
      const ratio = contrast(p[`topic-${topic}`], p.surface);

      // Then
      expect(ratio).toBeGreaterThanOrEqual(GRAPHIC);
    },
  );

  it.each([
    ["the Development card's label · feed-ink on warm-bg", p['feed-ink'], p['warm-bg']],
    ['the Coming up card · grow-ink on grow-bg', p['grow-ink'], p['grow-bg']],
    ["the guide's Change link · grow-ink on bg", p['grow-ink'], p.bg],
  ])('%s passes for text', (_, text, background) => {
    // When
    const ratio = contrast(text, background);

    // Then
    expect(ratio).toBeGreaterThanOrEqual(TEXT);
  });
});

const NEED_LOOKS = LOOKS.filter(([, look]) => look.needs !== null);
const TENTHS = Array.from({ length: 11 }, (_, i) => i);

describe.each(NEED_LOOKS)('contrast of the needs in %s', (_, look) => {
  const p = look.palette;
  const needs = look.needs!;

  it.each(TENTHS)('the level label at %i0 passes for text on its tile', (tenth) => {
    // When
    const ratio = contrast(needs.inks[tenth]!, p.surface);

    // Then
    expect(ratio).toBeGreaterThanOrEqual(TEXT);
  });

  it.each(TENTHS)("the tile's icon, the mood face and chip text at %i0 pass on the need colour", (tenth) => {
    // When
    const ratio = contrast(needs.face, needs.colors[tenth]!);

    // Then
    expect(ratio).toBeGreaterThanOrEqual(TEXT);
  });

  it("the toast's face and Edit pass for text on the toast", () => {
    // When
    const ratio = contrast(needs.toast, p.ink);

    // Then
    expect(ratio).toBeGreaterThanOrEqual(TEXT);
  });
});
