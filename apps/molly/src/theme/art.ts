// The themes' header patterns (the design's `--art` CSS gradients) as SVG, drawn by expo-image. Plain
// data, no React. `header` is the dashboard's: the pattern fading into `bg` over the lower three quarters,
// as the design's `linear-gradient(transparent 25%, bg)`. `thumb` is the picker's: the pattern alone.
// Android's SVG renderer ignores `stop-opacity`, so no gradient here relies on it: the fade is bands of `bg`
// with rising `fill-opacity`, and see-through colours are mixed with `bg` beforehand (`mix`).

/** The dashboard's pattern area, px: the design's 170 px, status bar included, on a 412 px wide phone. */
export const HEADER_SIZE = { width: 412, height: 170 };
const THUMB = 72;

export type Art = { header: string; thumb: string };

/** A colour stop: `#rrggbb`, an opacity, and where it sits, px from a dot's centre. */
type Stop = { at: number; color: string; opacity?: number };

const svg = (width: number, height: number, defs: string, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${defs}</defs>${body}</svg>`;

/** Bands in the fade: enough that the steps don't show. */
const FADE_BANDS = 32;

/** `color` at `opacity` over `bg`, as one opaque `#rrggbb`. */
function mix(color: string, bg: string, opacity: number): string {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2]
    .map((i) => Math.round(channel(color, i) * opacity + channel(bg, i) * (1 - opacity)).toString(16).padStart(2, '0'))
    .join('')}`;
}

/** Several tiled pattern layers (ids p0, p1…, defined in `defs`) over `base`, fading into `bg`. */
function art(bg: string, defs: string, layers: number, base = bg): Art {
  const fill = (width: number, height: number) =>
    `<rect width="${width}" height="${height}" fill="${base}"/>` +
    Array.from({ length: layers }, (_, i) => `<rect width="${width}" height="${height}" fill="url(#p${i})"/>`).join('');
  const { width, height } = HEADER_SIZE;
  const top = height * 0.25;
  const band = (height - top) / FADE_BANDS;
  const fade = Array.from(
    { length: FADE_BANDS },
    (_, i) =>
      `<rect y="${(top + i * band).toFixed(2)}" width="${width}" height="${(band + 0.5).toFixed(2)}" fill="${bg}" fill-opacity="${((i + 1) / FADE_BANDS).toFixed(3)}"/>`,
  ).join('');
  return {
    header: svg(width, height, defs, fill(width, height) + fade),
    thumb: svg(THUMB, THUMB, defs, fill(THUMB, THUMB)),
  };
}

const tile = (id: number, width: number | string, height: number | string, body: string) =>
  `<pattern id="p${id}" width="${width}" height="${height}" patternUnits="userSpaceOnUse">${body}</pattern>`;

/** A checkerboard of `size` px squares (`repeating-conic-gradient(a 0 25%, b 0 50%) 0 0/16px 16px`). */
export function checker(square: string, bg: string, size = 16): Art {
  const half = size / 2;
  return art(bg, tile(0, size, size, `<rect x="${half}" width="${half}" height="${half}" fill="${square}"/><rect y="${half}" width="${half}" height="${half}" fill="${square}"/>`), 1);
}

/**
 * Tiled dots (`radial-gradient(circle at x% y%, stops…) 0 0/w h`, one per layer): stars, spots, rings,
 * fireflies. Each dot is a circle filled with the stops as a radial gradient.
 */
export function dots(bg: string, layers: { width: number; height: number; x: number; y: number; stops: Stop[] }[]): Art {
  const defs = layers
    .map(({ width, height, x, y, stops }, i) => {
      const r = stops[stops.length - 1]!.at;
      const cx = (width * x) / 100;
      const cy = (height * y) / 100;
      const gradient = `<radialGradient id="g${i}" cx="${cx}" cy="${cy}" r="${r}" gradientUnits="userSpaceOnUse">${stops
        .map((stop) => `<stop offset="${(stop.at / r).toFixed(3)}" stop-color="${mix(stop.color, bg, stop.opacity ?? 1)}"/>`)
        .join('')}</radialGradient>`;
      return gradient + tile(i, width, height, `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#g${i})"/>`);
    })
    .join('');
  return art(bg, defs, layers.length);
}

/** Upright stripes, alternating `colors`, each `width` px (`repeating-linear-gradient(90deg, a 0 w, b w 2w)`). */
export function stripes(bg: string, colors: [string, string], width: number): Art {
  return art(bg, tile(0, width * 2, 1, `<rect x="${width}" width="${width}" height="1" fill="${colors[1]}"/>`), 1, colors[0]);
}

/** Thin lines every `every` px (`repeating-linear-gradient(0deg, line 0 1px, transparent 1px 4px)`). */
export function scanlines(bg: string, line: string, opacity: number, every = 4): Art {
  return art(bg, tile(0, 1, every, `<rect width="1" height="1" fill="${mix(line, bg, opacity)}"/>`), 1);
}

/** A tiled fleck (`radial-gradient(circle at x% y%, color r, transparent …) 0 0/w h`): one soft-edged dot of radius `r`. */
export type Fleck = { width: number; height: number; x: number; y: number; r: number; color: string; opacity: number };

/**
 * Upright stripes `width` px wide every `every` px (`repeating-linear-gradient(90deg, color 0 w, transparent w
 * every)`), with `flecks` over them: Ribbon's pinstripes, and its gold flecks at night. A fleck sits over a
 * stripe or the background alike, so it's a circle at `fill-opacity` (which Android draws) rather than mixed.
 */
export function pinstripes(bg: string, stripe: { color: string; opacity: number; width: number; every: number }, flecks: Fleck[] = []): Art {
  const defs = tile(0, stripe.every, 1, `<rect width="${stripe.width}" height="1" fill="${mix(stripe.color, bg, stripe.opacity)}"/>`) + fleckTiles(flecks, 1);
  return art(bg, defs, 1 + flecks.length);
}

/** The flecks' pattern layers, ids from `first`. */
function fleckTiles(flecks: Fleck[], first: number): string {
  return flecks
    .map(({ width, height, x, y, r, color, opacity }, i) =>
      tile(first + i, width, height, `<circle cx="${+((width * x) / 100).toFixed(2)}" cy="${+((height * y) / 100).toFixed(2)}" r="${r}" fill="${color}" fill-opacity="${opacity}"/>`),
    )
    .join('');
}

const at2 = (value: number) => String(+value.toFixed(2));

/**
 * Lines at 45° and −45°, `width` px across and `every` px apart (two `repeating-linear-gradient(±45deg, color
 * 0 w, transparent w every)`), with `flecks` over them: Life Sim's criss-cross, and its green dots at night.
 * Drawn as bands (polygons) in a square tile `every × √2` wide, as Android's renderer has no `patternTransform`.
 */
export function crisscross(bg: string, line: { color: string; opacity: number; width: number; every: number }, flecks: Fleck[] = []): Art {
  const side = line.every * Math.SQRT2;
  const across = line.width * Math.SQRT2;
  const fill = mix(line.color, bg, line.opacity);
  // A 45° band where x + y runs from `c` to `c + across`, and its mirror image (x → side − x) for −45°.
  const band = (c: number, mirror: boolean) => {
    const x = (value: number) => at2(mirror ? side - value : value);
    const points = [
      [c, 0],
      [c + across, 0],
      [c + across - 2 * side, 2 * side],
      [c - 2 * side, 2 * side],
    ];
    return `<polygon points="${points.map(([px, py]) => `${x(px!)},${at2(py!)}`).join(' ')}" fill="${fill}"/>`;
  };
  const bands = [false, true].flatMap((mirror) => [band(0, mirror), band(side, mirror)]).join('');
  return art(bg, tile(0, at2(side), at2(side), bands) + fleckTiles(flecks, 1), 1 + flecks.length);
}
