import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { BowParts } from './Bow';
import { over } from './contrast';
import { crescent, roundedBox, type Corners } from './ornaments';

/**
 * Ribbon's tracker pictures (design `Ribbon Icon`): a sleepy moon, a mother nursing, a bottle with a bow, a diaper
 * (plain, wet, dirty or both) and a capsule with a sparkle.
 */
export type RibbonKind = 'sleep' | 'feed' | 'bottle' | 'diaper' | 'diaper-wet' | 'diaper-dirty' | 'diaper-both' | 'med';

// The design's fixed picture colours, the same by day and night.
const SKIN = '#efccb6'; // oklch(0.87 0.05 55)
const HAIR = '#b8765f'; // oklch(0.63 0.09 40)
const WATER = '#5eb6e6'; // oklch(0.74 0.11 235)
const BROWN = '#a67351'; // oklch(0.60 0.08 55)

// The design's CSS boxes in `em` of the icon's size, drawn here in a 100 × 100 viewBox (1 em = 100).
const box = (x: number, y: number, width: number, height: number, corners: Corners) => roundedBox(x * 100, y * 100, width * 100, height * 100, corners);
/** The same corner on all four sides, in em. */
const round = (rx: number, ry = rx): Corners => [
  [rx * 100, ry * 100],
  [rx * 100, ry * 100],
  [rx * 100, ry * 100],
  [rx * 100, ry * 100],
];
/** A CSS `border-bottom` under a box rounded `0 0 50% 50%`: a smile, as one stroked arc. */
const smile = (x: number, y: number, width: number, height: number, thickness: number) => {
  const ry = Math.max(0.01, height - thickness / 2) * 100;
  return { d: `M${x * 100} ${y * 100}A${(width * 100) / 2} ${ry} 0 0 0 ${(x + width) * 100} ${y * 100}`, width: thickness * 100 };
};

/**
 * One of Ribbon's tracker pictures, `size` px square. `ink`: the shape; `light`: what it sits on (its cut-outs:
 * eyes, marks, the capsule's lower half); `accent`: cheeks, teats, sparkles and the little bows (the theme's bow).
 */
export function RibbonIcon({ kind, size, ink, light, accent }: { kind: RibbonKind; size: number; ink: string; light: string; accent: string }) {
  // The design's little bows: at least 8 px, 30 % of the icon, shaded 18 % darker than the accent.
  const bowSize = Math.max(8, Math.round(size * 0.3));
  const bow = (x: number, y: number) => (
    <G transform={`translate(${x * 100} ${y * 100}) scale(${bowSize / size})`}>
      <BowParts color={accent} shade={over('#000000', accent, 0.18)} />
    </G>
  );
  return (
    <View aria-hidden pointerEvents="none" style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
        {kind === 'sleep' && <Sleep ink={ink} light={light} accent={accent} />}
        {kind === 'feed' && <Feed ink={ink} light={light} accent={accent} />}
        {kind === 'bottle' && (
          <>
            <Path d={box(0.415, -0.01, 0.17, 0.19, [[8.5, 8.5], [8.5, 8.5], [3, 3], [3, 3]])} fill={accent} />
            <Path d={box(0.3, 0.16, 0.4, 0.13, round(0.05))} fill={ink} />
            <Path d={box(0.27, 0.31, 0.46, 0.63, [[14, 14], [14, 14], [16, 16], [16, 16]])} fill={ink} />
            <Path d={box(0.35, 0.4, 0.12, 0.045, round(0.03))} fill={light} />
            <Path d={box(0.35, 0.49, 0.08, 0.045, round(0.03))} fill={light} />
            {bow(0.35, 0.6)}
          </>
        )}
        {(kind === 'diaper' || kind === 'diaper-wet' || kind === 'diaper-dirty' || kind === 'diaper-both') && (
          <Diaper kind={kind} ink={ink} light={light} accent={accent} />
        )}
        {kind === 'med' && <Med ink={ink} light={light} accent={accent} />}
      </Svg>
    </View>
  );
}

type Colours = { ink: string; light: string; accent: string };

/** A moon (a circle's shadow cast down-left of itself), a closed eye, a cheek and a sparkle. */
function Sleep({ ink, light, accent }: Colours) {
  const eye = smile(0.25, 0.5, 0.11, 0.055, 0.05);
  return (
    <>
      <Path d={crescent({ x: 41, y: 50 }, { x: 63, y: 35 }, 29)} fill={ink} />
      <Path d={eye.d} stroke={light} strokeWidth={eye.width} strokeLinecap="round" fill="none" />
      <Ellipse cx={27.5} cy={64.25} rx={6} ry={3.75} fill={accent} />
      <Path d={box(0.755, 0.53, 0.055, 0.22, round(0.03))} fill={ink} />
      <Path d={box(0.672, 0.612, 0.22, 0.055, round(0.03))} fill={ink} />
      <Circle cx={86} cy={30} r={4} fill={ink} />
    </>
  );
}

/** The design's line pictures are paths in a 48 × 48 box, outlined in `ink`; drawn here in the 100 × 100 one. */
function Lines({ ink, children }: { ink: string; children: React.ReactNode }) {
  return (
    <G transform={`scale(${100 / 48})`} stroke={ink} strokeWidth={2.3} strokeLinejoin="round" strokeLinecap="round">
      {children}
    </G>
  );
}

/** A mother with her hair down, a baby in a blanket at her breast. */
function Feed({ ink, light, accent }: Colours) {
  return (
    <Lines ink={ink}>
      <Path d="M11 46 C10 32 14 23 22 22 L29 22 C35 23 38 28 38 34 L38 46 Z" fill={SKIN} />
      <Path d="M17 14 C16 6 21 3 25.5 3 C31 3 34 7 34 12 L34 36 L28 36 L28 16 Z" fill={HAIR} />
      <Path d="M21 17 H26 V23 H21 Z" fill={SKIN} stroke="none" />
      <Path d="M18.5 13.5 C19 9 21.5 7 23 6.5 C24 9.5 26 12 28 13 L28 17 C26 20.5 20 20.5 18.5 16 Z" fill={SKIN} />
      <Path d="M16 32 C22 29 32 29 38 31 L38 39 C31 41 22 41 16 39 Z" fill={light} />
      <Circle cx={15} cy={34} r={6.5} fill={SKIN} />
      <Path d="M8.6 33 C9 29 12 27.5 15 27.5 C13.2 29.5 12.6 31.5 13 33.5 Z" fill={HAIR} strokeWidth={1.4} />
      <Circle cx={13} cy={36.6} r={1.4} fill={accent} stroke="none" />
      <Path d="M8.5 38.5 C12 44 24 45.5 38 41 L38 45.5 C24 49.5 11 47.5 7 41.5 Z" fill={SKIN} />
    </Lines>
  );
}

/** A drop of water, `h` tall from `top`, with a highlight. */
function Drop({ cx, top, h }: { cx: number; top: number; h: number }) {
  const r = h * 0.42;
  const y = top + h * 0.62;
  return (
    <>
      <Path
        d={`M${cx} ${top} C${cx} ${top} ${cx - r} ${top + h * 0.42} ${cx - r} ${y} A${r} ${r} 0 0 0 ${cx + r} ${y} C${cx + r} ${top + h * 0.42} ${cx} ${top} ${cx} ${top} Z`}
        fill={WATER}
        strokeWidth={1.8}
      />
      <Circle cx={cx - r * 0.4} cy={y} r={h * 0.08} fill="#ffffff" stroke="none" opacity={0.8} />
    </>
  );
}

/** A smiling swirl standing on (cx, bottom), `scale` of the design's size. */
function Poop({ cx, bottom, scale, ink }: { cx: number; bottom: number; scale: number; ink: string }) {
  return (
    <G transform={`translate(${cx} ${bottom}) scale(${scale})`} strokeWidth={1.7}>
      <Ellipse cx={0} cy={0} rx={6.2} ry={2.8} fill={BROWN} />
      <Ellipse cx={0} cy={-3.6} rx={4.6} ry={2.4} fill={BROWN} />
      <Path d="M-2.8 -5.4 C-3 -8.6 .6 -9.4 .8 -11.2 C3.2 -9.4 3.4 -6.4 2.8 -5.4 Z" fill={BROWN} />
      <Circle cx={-1.7} cy={-3.7} r={0.75} fill={ink} stroke="none" />
      <Circle cx={1.7} cy={-3.7} r={0.75} fill={ink} stroke="none" />
    </G>
  );
}

/** A diaper laid open (waistband, cuffs and tabs a tint of the ink), with a drop, a poop or both in it. */
function Diaper({ kind, ink, light }: Colours & { kind: 'diaper' | 'diaper-wet' | 'diaper-dirty' | 'diaper-both' }) {
  const tint = over(ink, light, 0.28);
  return (
    <Lines ink={ink}>
      <Rect x={7} y={9} width={34} height={7} rx={3} fill={tint} />
      <Path d="M8 16 H40 V24 C40 34 33 41 24 41 C15 41 8 34 8 24 Z" fill={light} />
      <Path d="M8.5 25 C14.5 25 19.5 31 20.5 40 C13 39 8.5 33 8.5 25 Z" fill={tint} />
      <Path d="M39.5 25 C33.5 25 28.5 31 27.5 40 C35 39 39.5 33 39.5 25 Z" fill={tint} />
      <Path d="M10.5 19.5 H37.5" fill="none" />
      <Rect x={3.5} y={17} width={7} height={5} rx={1.6} fill={tint} />
      <Rect x={37.5} y={17} width={7} height={5} rx={1.6} fill={tint} />
      {kind === 'diaper-wet' && <Drop cx={24} top={18.5} h={13} />}
      {kind === 'diaper-dirty' && <Poop cx={24} bottom={33} scale={1.05} ink={ink} />}
      {kind === 'diaper-both' && (
        <>
          <Drop cx={17.5} top={19} h={10.5} />
          <Poop cx={30.5} bottom={33.5} scale={0.8} ink={ink} />
        </>
      )}
    </Lines>
  );
}

/** A capsule turned 40°, its lower half outlined, and a sparkle and a dot in the accent. */
function Med({ ink, light, accent }: Colours) {
  const [x, y, width, height] = [0.32, 0.08, 0.36, 0.84];
  const half = height / 2;
  const border = 0.06;
  return (
    <>
      <G transform="rotate(40 50 50)">
        <Path d={box(x, y, width, half, [[18, 18], [18, 18], [0, 0], [0, 0]])} fill={ink} />
        <Path d={box(x, y + half, width, half, [[0, 0], [0, 0], [18, 18], [18, 18]])} fill={ink} />
        <Path
          d={box(x + border, y + half + border, width - 2 * border, half - 2 * border, [[0, 0], [0, 0], [12, 12], [12, 12]])}
          fill={light}
        />
        <Path
          d={box(x + width * 0.22, y + height * 0.12, width * 0.18, height * 0.22, round(0.05))}
          fill={light}
          fillOpacity={0.6}
        />
      </G>
      <Path d={box(0.135, 0.06, 0.055, 0.22, round(0.03))} fill={accent} />
      <Path d={box(0.052, 0.142, 0.22, 0.055, round(0.03))} fill={accent} />
      <Circle cx={84.5} cy={84.5} r={4.5} fill={accent} />
    </>
  );
}
