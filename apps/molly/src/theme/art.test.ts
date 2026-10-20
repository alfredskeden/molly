import { describe, expect, it } from 'vitest';

import { crisscross, pinstripes } from './art';
import { THEME_KEYS, THEMES } from './themes';

const ARTS = THEME_KEYS.flatMap((key) =>
  (['day', 'night'] as const).flatMap((scheme) => {
    const art = THEMES[key][scheme].header;
    return art ? [[`${key} ${scheme}`, art] as const] : [];
  }),
);

describe('header patterns', () => {
  it.each(ARTS)("%s draws without stop-opacity, which Android's SVG renderer ignores", (_, art) => {
    // Given
    const svgs = [art.header, art.thumb];

    // When
    const translucentStops = svgs.filter((svg) => svg.includes('stop-opacity'));

    // Then
    expect(translucentStops).toEqual([]);
  });

  it.each(ARTS)('%s fades into the background at the foot of the header', (_, art) => {
    // Given
    const svg = art.header;

    // When
    const lastBand = [...svg.matchAll(/<rect [^>]*fill-opacity="([\d.]+)"/g)].at(-1);

    // Then
    expect(Number(lastBand?.[1])).toBe(1);
  });
});

describe('pinstripes', () => {
  const BG = '#ffffff';
  const STRIPE = { color: '#000000', opacity: 0.5, width: 10, every: 22 };
  const FLECK = { width: 43, height: 37, x: 30, y: 40, r: 1.35, color: '#ff0000', opacity: 0.8 };

  it('draws only the stripes when there are no flecks', () => {
    // When
    const art = pinstripes(BG, STRIPE);

    // Then
    expect(art.header.match(/<pattern /g)).toHaveLength(1);
  });

  it('draws the stripe, see-through colours mixed with the background, its width in every pitch', () => {
    // When
    const art = pinstripes(BG, STRIPE);

    // Then
    expect(art.header).toContain('<pattern id="p0" width="22" height="1" patternUnits="userSpaceOnUse"><rect width="10" height="1" fill="#808080"/></pattern>');
  });

  it('draws one fleck over the stripes', () => {
    // When
    const art = pinstripes(BG, STRIPE, [FLECK]);

    // Then
    expect(art.header).toContain('<pattern id="p1" width="43" height="37" patternUnits="userSpaceOnUse"><circle cx="12.9" cy="14.8" r="1.35" fill="#ff0000" fill-opacity="0.8"/></pattern>');
    expect(art.header.indexOf('fill="url(#p0)"')).toBeLessThan(art.header.indexOf('fill="url(#p1)"'));
  });

  it('draws several fleck layers over the stripes in order', () => {
    // When
    const art = pinstripes(BG, STRIPE, [FLECK, { ...FLECK, width: 29, height: 31, opacity: 0.5 }]);

    // Then
    expect([...art.header.matchAll(/fill="url\(#(p\d)\)"/g)].map((match) => match[1])).toEqual(['p0', 'p1', 'p2']);
  });
});

describe('crisscross', () => {
  const BG = '#ffffff';
  const LINE = { color: '#000000', opacity: 0.5, width: 2, every: 16 };
  const FLECK = { width: 43, height: 37, x: 30, y: 40, r: 1.35, color: '#00ff00', opacity: 0.7 };

  it('draws only the lines when there are no flecks', () => {
    // When
    const art = crisscross(BG, LINE);

    // Then
    expect(art.header.match(/<pattern /g)).toHaveLength(1);
  });

  it('tiles a square whose diagonal lines are `every` px apart, see-through colours mixed with the background', () => {
    // When
    const art = crisscross(BG, LINE);

    // Then
    expect(art.header).toContain('<pattern id="p0" width="22.63" height="22.63" patternUnits="userSpaceOnUse">');
    expect(art.header.match(/<polygon [^>]*fill="#808080"\/>/g)).toHaveLength(4);
  });

  it('draws a line at 45° and one at −45° through the tile, each `width` px across', () => {
    // When
    const art = crisscross(BG, LINE);

    // Then
    expect(art.header).toContain('<polygon points="0,0 2.83,0 -42.43,45.25 -45.25,45.25" fill="#808080"/>');
    expect(art.header).toContain('<polygon points="22.63,0 19.8,0 65.05,45.25 67.88,45.25" fill="#808080"/>');
  });

  it('draws the flecks over the lines', () => {
    // When
    const art = crisscross(BG, LINE, [FLECK]);

    // Then
    expect(art.header).toContain('<pattern id="p1" width="43" height="37" patternUnits="userSpaceOnUse"><circle cx="12.9" cy="14.8" r="1.35" fill="#00ff00" fill-opacity="0.7"/></pattern>');
    expect(art.header.indexOf('fill="url(#p0)"')).toBeLessThan(art.header.indexOf('fill="url(#p1)"'));
  });
});
