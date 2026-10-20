// Ribbon's ornaments (the design "Molly Ribbon App", `Ribbon Bow`, `Teddy Bear`): plain data and
// geometry, no React. The design draws them as CSS boxes with `border-radius`; `roundedBox` turns one into
// an SVG path so `Bow` and `Teddy` can draw the same shapes.

/**
 * A theme's ornaments, as hex: the bow (ring top, sheets, pickers, Settings, the toast's heart) and the teddy
 * in the ring's corner (the stitch along the track is `Look.stitch`). Only Ribbon has them; screens check the
 * slot, never the theme.
 */
export type Ornaments = {
  bow: { color: string; shade: string };
  teddy: { fur: string; muzzle: string; ink: string; cheek: string };
  /**
   * The bow's colour on the toast (its heart and Edit), ≥ 4.5 : 1 on the toast's `ink`: the bow itself by Day,
   * a deeper rose at Night, where the toast is light.
   */
  toast: string;
};

/** The teddy closes its eyes while a sleep runs, whatever the colours. */
export const teddySleepy = (sleeps: { running: boolean }[]): boolean => sleeps.some((sleep) => sleep.running);

type Corner = [rx: number, ry: number];
/** A box's corners: top-left, top-right, bottom-right, bottom-left. */
export type Corners = [Corner, Corner, Corner, Corner];

const n = (value: number) => String(Number(value.toFixed(2)));

/**
 * A `width` × `height` box at (x, y) with elliptical corners (top-left, top-right, bottom-right, bottom-left),
 * scaled down together where two would overlap, as CSS does.
 */
export function roundedBox(x: number, y: number, width: number, height: number, corners: Corners): string {
  const [tl, tr, br, bl] = corners;
  const scale = Math.min(1, width / (tl[0] + tr[0]), width / (bl[0] + br[0]), height / (tl[1] + bl[1]), height / (tr[1] + br[1]));
  const [a, b, c, d] = corners.map(([rx, ry]) => [rx * scale, ry * scale]) as Corners;
  const arc = ([rx, ry]: Corner, toX: number, toY: number) => `A${n(rx)} ${n(ry)} 0 0 1 ${n(toX)} ${n(toY)}`;
  return [
    `M${n(x + a[0])} ${n(y)}`,
    `H${n(x + width - b[0])}`,
    arc(b, x + width, y + b[1]),
    `V${n(y + height - c[1])}`,
    arc(c, x + width - c[0], y + height),
    `H${n(x + d[0])}`,
    arc(d, x, y + height - d[1]),
    `V${n(y + a[1])}`,
    arc(a, x + a[0], y),
    'Z',
  ].join('');
}

/** CSS `border-radius: tl tr br bl / tl tr br bl` in percent of a `width` × `height` box. */
export function percentCorners(width: number, height: number, across: number[], down: number[] = across): Corners {
  return [0, 1, 2, 3].map((i) => [(across[i]! * width) / 100, (down[i]! * height) / 100]) as Corners;
}

type Point = { x: number; y: number };

/**
 * The part of the circle round `a` that a same-sized circle round `b` doesn't cover: the design's moon, a
 * `box-shadow` circle shown only outside its own (transparent) box. `b` must be nearer than `2r`.
 */
export function crescent(a: Point, b: Point, r: number): string {
  const [dx, dy] = [b.x - a.x, b.y - a.y];
  const d = Math.hypot(dx, dy);
  const h = Math.sqrt(r * r - (d / 2) ** 2);
  const [mx, my] = [(a.x + b.x) / 2, (a.y + b.y) / 2];
  const [nx, ny] = [-dy / d, dx / d];
  const [p, q] = [
    { x: mx + h * nx, y: my + h * ny },
    { x: mx - h * nx, y: my - h * ny },
  ];
  // Round `a` the long way, away from `b`, then back along `b`'s edge inside it.
  return `M${n(p.x)} ${n(p.y)}A${n(r)} ${n(r)} 0 1 1 ${n(q.x)} ${n(q.y)}A${n(r)} ${n(r)} 0 0 0 ${n(p.x)} ${n(p.y)}Z`;
}
