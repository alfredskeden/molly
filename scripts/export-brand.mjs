// Renders every icon and splash PNG that app.json points at from assets/brand/mark.svg, coloured
// with the tokens in src/theme/tokens.ts. Run after changing either: `pnpm brand:export`.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { Resvg } from '@resvg/resvg-js';

const app = 'apps/molly';
const mark = readFileSync(join(app, 'assets/brand/mark.svg'), 'utf8');
const tokens = readFileSync(join(app, 'src/theme/tokens.ts'), 'utf8');

/** `day` / `night` → token name → hex, read from tokens.ts so the icons follow a colour change. */
function palette(scheme) {
  const block = tokens.slice(tokens.indexOf(`${scheme}: {`), tokens.indexOf('}', tokens.indexOf(`${scheme}: {`)));
  return Object.fromEntries([...block.matchAll(/'?([a-z-]+)'?: '(#[0-9a-f]{6})/g)].map(([, name, hex]) => [name, hex]));
}
const day = palette('day');
const night = palette('night');

// The mark's own box (its viewBox), in the design's launcher coordinates.
const BOX = { x: 36, y: 34, width: 120, height: 124 };
const shapes = mark.slice(mark.indexOf('<rect'), mark.lastIndexOf('</svg>'));

/**
 * The mark scaled to `width` px and centred on (cx, cy). `colors` recolours each row by id; `now: null`
 * leaves the now line out (the monochrome icon).
 */
function placed({ cx, cy, width, colors }) {
  const scale = width / BOX.width;
  const recoloured = shapes
    .split('\n')
    .filter((line) => !(colors.now === null && line.includes('id="now"')))
    .map((line) => {
      const id = /id="([a-z]+)"/.exec(line)?.[1];
      return id && colors[id] ? line.replace(/fill="#[0-9a-f]+"/, `fill="${colors[id]}"`) : line;
    })
    .join('\n');
  const [x, y] = [cx - (BOX.width * scale) / 2, cy - (BOX.height * scale) / 2];
  return `<g transform="translate(${x} ${y}) scale(${scale}) translate(${-BOX.x} ${-BOX.y})">${recoloured}</g>`;
}

const DAY_MARK = { sleep: day['sleep-mid'], feed: day['feed-mid'], diaper: day['diaper-mid'], med: day['med-mid'], now: day.bg };
const NIGHT_MARK = { sleep: night['sleep-mid'], feed: night['feed-mid'], diaper: night['diaper-mid'], med: night['med-mid'], now: night.ink };
const WHITE = { sleep: '#ffffff', feed: '#ffffff', diaper: '#ffffff', med: '#ffffff', now: null };

const svg = (size, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${body}</svg>`;

// Adaptive icons: a 108 dp layer; any launcher mask shows at least the 66 dp safe zone around the centre.
// The mark's corners sit 31 dp from the centre, just inside it. On the Pixel launcher that makes the mark
// about half the circle's width, as in the design's circle-mask board.
const ADAPTIVE = 1024;
const DP = ADAPTIVE / 108;
const CORNER_DP = 31;
const adaptiveMark = (colors) =>
  placed({ cx: ADAPTIVE / 2, cy: ADAPTIVE / 2, width: ((CORNER_DP * DP) / Math.hypot(BOX.width / 2, BOX.height / 2)) * BOX.width, colors });

// Android 12+ splash: the icon sits on a 288 dp canvas masked to a 192 dp circle. A 140 dp tile with the
// design's 27 % corners stays whole inside it; the mark fills 68 of the tile's 112 px, as in the design.
const SPLASH = 1152;
const TILE = (SPLASH * 140) / 288;
const splash = (tile, colors) =>
  svg(
    SPLASH,
    `<rect x="${(SPLASH - TILE) / 2}" y="${(SPLASH - TILE) / 2}" width="${TILE}" height="${TILE}" rx="${TILE * 0.268}" fill="${tile}"/>` +
      placed({ cx: SPLASH / 2, cy: SPLASH / 2, width: (TILE * 68) / 112, colors }),
  );

const OUTPUTS = {
  // Full-bleed: launchers apply their own mask.
  'icon.png': svg(1024, `<rect width="1024" height="1024" fill="${day.ink}"/>` + placed({ cx: 512, cy: 512, width: 640, colors: DAY_MARK })),
  'android-icon-foreground.png': svg(ADAPTIVE, adaptiveMark(DAY_MARK)),
  'android-icon-background.png': svg(ADAPTIVE, `<rect width="${ADAPTIVE}" height="${ADAPTIVE}" fill="${day.ink}"/>`),
  // Android tints this one for themed icons; only its shape counts. The design leaves out the now line.
  'android-icon-monochrome.png': svg(ADAPTIVE, adaptiveMark(WHITE)),
  'splash-icon.png': splash(day.ink, DAY_MARK),
  'splash-icon-dark.png': splash(night.surface, NIGHT_MARK),
  'favicon.png': svg(48, `<rect width="48" height="48" rx="12" fill="${day.ink}"/>` + placed({ cx: 24, cy: 24, width: 30, colors: DAY_MARK })),
};

for (const [name, source] of Object.entries(OUTPUTS)) {
  writeFileSync(join(app, 'assets/images', name), new Resvg(source).render().asPng());
  console.log(`assets/images/${name}`);
}
