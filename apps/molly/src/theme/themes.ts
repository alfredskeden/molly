// The themes a parent picks in Settings (the design "Molly Themed App"). Plain data, no React: the
// widget's headless task handler reads it too. Each theme has a day and a night look; `tokens.ts` holds the
// colours and turns a look into the CSS variables the Tailwind classes read.

import { checker, crisscross, dots, pinstripes, scanlines, stripes, type Art } from './art';
import type { IconName } from './icons';
import type { NeedsLook } from './need-look';
import type { Ornaments } from './ornaments';
import { SIM_WORDS } from './sim-words';
import { childVariables, cssVariables, inkActions, PALETTES, rgbTriplet, type BasePalette, type Palette, type Scheme } from './tokens';

export const THEME_KEYS = ['classic', 'ribbon', 'sim', 'arcade', 'space', 'score', 'term', 'safari'] as const;
export type ThemeKey = (typeof THEME_KEYS)[number];

export type FontWeight = '400' | '500' | '600' | '700' | '800' | '900';
/** The weights the widgets draw text in. */
export type WidgetWeight = 700 | 800 | 900;

/** Everything a theme sets besides the colours, for one scheme. */
export type Look = {
  palette: Palette;
  /** Font families as registered on Android (`app.json` `expo-font`) and as `FontFace` names on web. */
  /**
   * `button`: the face on primary buttons and the edit screen's Save, at `buttonWeight`; the display face
   * when not set.
   */
  fonts: { display: string; displayWeight: FontWeight; button?: string; buttonWeight: FontWeight; body: string };
  /** Multiplies the display text's negative letter-spacing (0: none, for pixel and mono faces): `--ls-2` is −2 px × this. */
  tracking: number;
  /** Corners, px. */
  radius: { card: number; button: number; chip: number; sheet: number };
  /** Cards on `surface`: border width (px) and colour. */
  border: { width: number; edge: string };
  /** CSS box-shadow lists (React Native's `boxShadow` takes the same syntax), or 'none'. */
  shadow: { card: string; button: string };
  /** The pattern behind the top of the dashboard (fading into `bg`) and in the picker's thumbnail. */
  header: Art | null;
  /** Pictures on the tile buttons, diaper buttons, Recent rows and widget buttons; null: words only. */
  icons: Record<IconSlot, IconName> | null;
  /** The bow and teddy (Ribbon); null: none. Screens check this slot, never the theme. */
  ornaments: Ornaments | null;
  /** The dashed line along the ring's track (Ribbon, Life Sim), as hex; null: none. */
  stitch: string | null;
  /** Life Sim's need bars, mood, Wants and moodlets; null: none (and nothing is computed for them). */
  needs: NeedsLook | null;
  /**
   * The home-screen widgets. The widget renderer loads fonts by file name (app.json's widget `fonts`)
   * and only fakes other weights, so each face and weight is a file: `display` for the big numbers,
   * `body` for everything else. Corners: the whole widget, a tracker's tile or row, a button.
   */
  widget: {
    fonts: { display: string; body: Record<WidgetWeight, { file: string; weight: FontWeight }> };
    radius: { shell: number; tile: number; button: number };
  };
};

/** Where a theme can put a picture: the trackers, and the diaper buttons. */
export type IconSlot = 'sleep' | 'feed' | 'diaper' | 'med' | 'wet' | 'dirty' | 'both';

export type ThemeGroup = 'grown-ups' | 'little-ones';

/** `isNew`: a "New" badge on its Theme sheet card, while it's new. */
export type Theme = { key: ThemeKey; name: string; tagline: string; group: ThemeGroup; isNew?: boolean } & Record<Scheme, Look>;

const classic = (palette: Palette): Look => ({
  palette,
  fonts: { display: 'Nunito', displayWeight: '900', buttonWeight: '800', body: 'Nunito' },
  tracking: 1,
  radius: { card: 20, button: 14, chip: 12, sheet: 28 },
  border: { width: 1, edge: palette.line },
  shadow: { card: 'none', button: 'none' },
  header: null,
  icons: null,
  ornaments: null,
  stitch: null,
  needs: null,
  widget: {
    fonts: {
      display: 'Nunito_900Black',
      body: {
        700: { file: 'Nunito_700Bold', weight: '700' },
        800: { file: 'Nunito_800ExtraBold', weight: '800' },
        900: { file: 'Nunito_900Black', weight: '900' },
      },
    },
    radius: { shell: 24, tile: 16, button: 12 },
  },
});

// Arcade: the design's arcade-day / arcade-night, oklch converted to hex. `mark` is the mid, darkened in
// Day until it stands out 3 : 1 from bg; `on-mid` is ink in Day, bg in Night (as Classic).
const ARCADE: Record<Scheme, BasePalette> = {
  day: {
    bg: '#f6efd5', // oklch(0.95 0.035 95)
    surface: '#fffef6', // oklch(0.995 0.01 95)
    ink: '#181535', // oklch(0.22 0.06 285)
    muted: '#4f4e73', // oklch(0.44 0.06 285)
    line: '#dbd1ad', // oklch(0.86 0.05 95)
    danger: '#b02a2d', // oklch(0.50 0.17 25)
    scrim: '#13142359', // oklch(0.2 0.03 280 / .35)
    'on-mid': '#181535', // ink
    'sleep-bg': '#e5c9ff', // oklch(0.88 0.09 305)
    'sleep-mid': '#be85f9', // oklch(0.72 0.17 305)
    'sleep-ink': '#52187e', // oklch(0.36 0.16 305)
    'sleep-mark': '#a870e1', // oklch(0.65 0.17 305)
    'feed-bg': '#ffc89f', // oklch(0.88 0.09 55)
    'feed-mid': '#f3821d', // oklch(0.72 0.17 55)
    'feed-ink': '#761000', // oklch(0.36 0.16 55)
    'feed-mark': '#d76900', // oklch(0.64 0.17 55)
    'diaper-bg': '#b3e8b3', // oklch(0.88 0.09 145)
    'diaper-mid': '#54bf5c', // oklch(0.72 0.17 145)
    'diaper-ink': '#005000', // oklch(0.36 0.16 145)
    'diaper-mark': '#2b9c3a', // oklch(0.61 0.17 145)
    'med-bg': '#94e5ff', // oklch(0.88 0.09 225)
    'med-mid': '#00b8f4', // oklch(0.72 0.17 225)
    'med-ink': '#00487b', // oklch(0.36 0.16 225)
    'med-mark': '#0091cb', // oklch(0.60 0.17 225)
    'grow-bg': '#a3e0ff', // oklch(0.88 0.075 230)
    'grow-mid': '#03b4ec', // oklch(0.72 0.143 230)
    'grow-ink': '#01445c', // oklch(0.36 0.072 230)
    'warm-bg': '#ffc89f', // feed-bg
    'warm-mid': '#f3821d', // feed-mid
    'hot-bg': '#ffc7c1', // oklch(0.88 0.065 25)
    'hot-mid': '#fd736c', // oklch(0.72 0.171 25)
    'hot-ink': '#79000e', // oklch(0.36 0.148 25)
    'cool-bg': '#c8d8ea', // oklch(0.88 0.03 250)
    'topic-movement': '#de6909', // oklch(0.65 0.17 50)
    'topic-talking': '#019dcf', // oklch(0.65 0.13 230)
    'topic-sleep': '#877cf1', // oklch(0.65 0.17 285)
    'topic-feeding': '#e45d58', // oklch(0.65 0.17 25)
    'topic-play': '#1ca952', // oklch(0.65 0.17 150)
    'topic-feelings': '#d85d9e', // oklch(0.65 0.17 350)
    'topic-health': '#0ca4a4', // oklch(0.65 0.11 195)
    'topic-parents': '#bf8108', // oklch(0.65 0.14 75)
  },
  night: {
    bg: '#0c0921', // oklch(0.16 0.05 285)
    surface: '#161332', // oklch(0.21 0.06 285)
    ink: '#f5efd8', // oklch(0.95 0.03 95)
    muted: '#acacd6', // oklch(0.76 0.06 285)
    line: '#2b284f', // oklch(0.30 0.07 285)
    danger: '#f7857d', // oklch(0.74 0.14 25)
    scrim: '#0000008c', // oklch(0 0 0 / .55)
    'on-mid': '#0c0921', // bg
    'sleep-bg': '#371a52', // oklch(0.29 0.1 305)
    'sleep-mid': '#bf83fe', // oklch(0.72 0.18 305)
    'sleep-ink': '#f0caff', // oklch(0.9 0.12 305)
    'sleep-mark': '#bf83fe', // mid
    'feed-bg': '#4e1700', // oklch(0.29 0.1 55)
    'feed-mid': '#f77f00', // oklch(0.72 0.18 55)
    'feed-ink': '#ffc98f', // oklch(0.9 0.12 55)
    'feed-mark': '#f77f00', // mid
    'diaper-bg': '#003703', // oklch(0.29 0.1 145)
    'diaper-mid': '#4cc157', // oklch(0.72 0.18 145)
    'diaper-ink': '#abf3ad', // oklch(0.9 0.12 145)
    'diaper-mark': '#4cc157', // mid
    'med-bg': '#003350', // oklch(0.29 0.1 225)
    'med-mid': '#00b9f8', // oklch(0.72 0.18 225)
    'med-ink': '#7cefff', // oklch(0.9 0.12 225)
    'med-mark': '#00b9f8', // mid
    'grow-bg': '#013042', // oklch(0.29 0.057 230)
    'grow-mid': '#09b4ec', // oklch(0.72 0.142 230)
    'grow-ink': '#ace3ff', // oklch(0.89 0.068 230)
    'warm-bg': '#4e1700', // feed-bg
    'warm-mid': '#f77f00', // feed-mid
    'hot-bg': '#520e0f', // oklch(0.29 0.099 25)
    'hot-mid': '#fe726c', // oklch(0.72 0.172 25)
    'hot-ink': '#ffccc7', // oklch(0.89 0.058 25)
    'cool-bg': '#202d3a', // oklch(0.29 0.03 250)
    'topic-movement': '#fa7c1f', // oklch(0.72 0.18 50)
    'topic-talking': '#09b4ec', // oklch(0.72 0.14 230)
    'topic-sleep': '#9c95fe', // oklch(0.72 0.15 285)
    'topic-feeding': '#fe726c', // oklch(0.72 0.17 25)
    'topic-play': '#32c364', // oklch(0.72 0.18 150)
    'topic-feelings': '#f46eb4', // oklch(0.72 0.18 350)
    'topic-health': '#05bcbc', // oklch(0.72 0.12 195)
    'topic-parents': '#db9509', // oklch(0.72 0.15 75)
  },
};

const arcade = (palette: BasePalette, look: Pick<Look, 'border' | 'shadow' | 'header'>): Look => ({
  palette: inkActions(palette),
  fonts: { display: 'PixelifySans', displayWeight: '700', buttonWeight: '700', body: 'SpaceMono' },
  tracking: 0,
  radius: { card: 4, button: 3, chip: 2, sheet: 6 },
  ...look,
  icons: null,
  ornaments: null,
  stitch: null,
  needs: null,
  widget: {
    fonts: {
      display: 'PixelifySans_700Bold',
      body: {
        700: { file: 'SpaceMono_700Bold', weight: '700' },
        800: { file: 'SpaceMono_700Bold', weight: '700' },
        900: { file: 'SpaceMono_700Bold', weight: '700' },
      },
    },
    radius: { shell: 6, tile: 4, button: 3 },
  },
});

// Mission Control: the design's space-day / space-night, converted and derived as Arcade's.
const SPACE: Record<Scheme, BasePalette> = {
  day: {
    bg: '#e6f0f8', // oklch(0.95 0.015 240)
    surface: '#f8fcff', // oklch(0.99 0.006 240)
    ink: '#111f37', // oklch(0.24 0.05 260)
    muted: '#4c5c71', // oklch(0.47 0.04 255)
    line: '#cdd9e4', // oklch(0.88 0.02 245)
    danger: '#b02a2d', // oklch(0.50 0.17 25)
    scrim: '#13142359', // oklch(0.2 0.03 280 / .35)
    'on-mid': '#111f37', // ink
    'sleep-bg': '#d7dfff', // oklch(0.91 0.05 275)
    'sleep-mid': '#8d9df5', // oklch(0.72 0.13 275)
    'sleep-ink': '#313786', // oklch(0.38 0.13 275)
    'sleep-mark': '#7381d7', // oklch(0.63 0.13 275)
    'feed-bg': '#ffd8c6', // oklch(0.91 0.05 45)
    'feed-mid': '#e7885d', // oklch(0.72 0.13 45)
    'feed-ink': '#762100', // oklch(0.38 0.13 45)
    'feed-mark': '#cc7044', // oklch(0.64 0.13 45)
    'diaper-bg': '#bceceb', // oklch(0.91 0.05 195)
    'diaper-mid': '#00bdbe', // oklch(0.72 0.13 195)
    'diaper-ink': '#005558', // oklch(0.38 0.13 195)
    'diaper-mark': '#009798', // oklch(0.60 0.13 195)
    'med-bg': '#e9e3bd', // oklch(0.91 0.05 100)
    'med-mid': '#b8a636', // oklch(0.72 0.13 100)
    'med-ink': '#534100', // oklch(0.38 0.13 100)
    'med-mark': '#9c8a04', // oklch(0.63 0.13 100)
    'grow-bg': '#c3e7f9', // oklch(0.91 0.045 230)
    'grow-mid': '#33b3e6', // oklch(0.72 0.129 230)
    'grow-ink': '#004963', // oklch(0.38 0.076 230)
    'warm-bg': '#ffd8c6', // feed-bg
    'warm-mid': '#e7885d', // feed-mid
    'hot-bg': '#fed5d1', // oklch(0.91 0.046 25)
    'hot-mid': '#ea827b', // oklch(0.72 0.129 25)
    'hot-ink': '#79191b', // oklch(0.38 0.13 25)
    'cool-bg': '#d2e3f4', // oklch(0.91 0.03 250)
    'topic-movement': '#c66f39', // oklch(0.63 0.13 50)
    'topic-talking': '#0996c5', // oklch(0.63 0.12 230)
    'topic-sleep': '#827cd4', // oklch(0.63 0.13 285)
    'topic-feeding': '#cc6660', // oklch(0.63 0.13 25)
    'topic-play': '#459f5d', // oklch(0.63 0.13 150)
    'topic-feelings': '#c26694', // oklch(0.63 0.13 350)
    'topic-health': '#0b9d9d', // oklch(0.63 0.11 195)
    'topic-parents': '#b67c0d', // oklch(0.63 0.13 75)
  },
  night: {
    bg: '#050a1a', // oklch(0.15 0.035 265)
    surface: '#0d1528', // oklch(0.20 0.04 265)
    ink: '#e0edf8', // oklch(0.94 0.02 240)
    muted: '#9dadbe', // oklch(0.74 0.03 250)
    line: '#222b3f', // oklch(0.29 0.04 265)
    danger: '#f7857d', // oklch(0.74 0.14 25)
    scrim: '#0000008c', // oklch(0 0 0 / .55)
    'on-mid': '#050a1a', // bg
    'sleep-bg': '#1f254b', // oklch(0.28 0.07 275)
    'sleep-mid': '#7c8ae1', // oklch(0.66 0.13 275)
    'sleep-ink': '#c8d4ff', // oklch(0.88 0.08 275)
    'sleep-mark': '#7c8ae1', // mid
    'feed-bg': '#441b06', // oklch(0.28 0.07 45)
    'feed-mid': '#d2764a', // oklch(0.66 0.13 45)
    'feed-ink': '#ffc8ac', // oklch(0.88 0.08 45)
    'feed-mark': '#d2764a', // mid
    'diaper-bg': '#003333', // oklch(0.28 0.07 195)
    'diaper-mid': '#00aaab', // oklch(0.66 0.13 195)
    'diaper-ink': '#97e9e8', // oklch(0.88 0.08 195)
    'diaper-mark': '#00aaab', // mid
    'med-bg': '#312900', // oklch(0.28 0.07 100)
    'med-mid': '#a5931b', // oklch(0.66 0.13 100)
    'med-ink': '#e3d99c', // oklch(0.88 0.08 100)
    'med-mark': '#a5931b', // mid
    'grow-bg': '#002e3f', // oklch(0.28 0.056 230)
    'grow-mid': '#09a0d2', // oklch(0.66 0.13 230)
    'grow-ink': '#a6dffb', // oklch(0.87 0.07 230)
    'warm-bg': '#441b06', // feed-bg
    'warm-mid': '#d2764a', // feed-mid
    'hot-bg': '#461917', // oklch(0.28 0.07 25)
    'hot-mid': '#d66f69', // oklch(0.66 0.13 25)
    'hot-ink': '#ffc6c0', // oklch(0.87 0.066 25)
    'cool-bg': '#1e2a37', // oklch(0.28 0.03 250)
    'topic-movement': '#d07842', // oklch(0.66 0.13 50)
    'topic-talking': '#09a0d2', // oklch(0.66 0.13 230)
    'topic-sleep': '#8b85de', // oklch(0.66 0.13 285)
    'topic-feeding': '#d66f69', // oklch(0.66 0.13 25)
    'topic-play': '#4fa866', // oklch(0.66 0.13 150)
    'topic-feelings': '#cc6e9d', // oklch(0.66 0.13 350)
    'topic-health': '#04a7a7', // oklch(0.66 0.11 195)
    'topic-parents': '#c0851f', // oklch(0.66 0.13 75)
  },
};


const space = (palette: BasePalette, header: Art): Look => ({
  palette: inkActions(palette),
  fonts: { display: 'ChakraPetch', displayWeight: '700', buttonWeight: '700', body: 'IBMPlexSans' },
  tracking: 0.4,
  radius: { card: 14, button: 8, chip: 6, sheet: 20 },
  border: { width: 1, edge: palette.line },
  shadow: { card: 'none', button: 'none' },
  header,
  icons: null,
  ornaments: null,
  stitch: null,
  needs: null,
  widget: {
    fonts: {
      display: 'ChakraPetch_700Bold',
      body: {
        700: { file: 'IBMPlexSans_700Bold', weight: '700' },
        800: { file: 'IBMPlexSans_700Bold', weight: '700' },
        900: { file: 'IBMPlexSans_700Bold', weight: '700' },
      },
    },
    radius: { shell: 18, tile: 14, button: 8 },
  },
});

/** The design's three tiled star layers: small, a coloured one, and a faint one. */
const stars = (bg: string, star: string, bright: string) =>
  dots(bg, [
    { width: 37, height: 29, x: 20, y: 30, stops: [{ at: 1, color: star }, { at: 1.7, color: star, opacity: 0 }] },
    { width: 53, height: 41, x: 70, y: 60, stops: [{ at: 1.3, color: bright }, { at: 2.2, color: bright, opacity: 0 }] },
    { width: 23, height: 31, x: 40, y: 80, stops: [{ at: 0.8, color: star }, { at: 1.4, color: star, opacity: 0 }] },
  ]);

// Match Day: the design's score-day / score-night, converted and derived as Arcade's.
const SCORE: Record<Scheme, BasePalette> = {
  day: {
    bg: '#f3f6f3', // oklch(0.97 0.005 150)
    surface: '#ffffff', // oklch(1 0 0)
    ink: '#0f130f', // oklch(0.18 0.01 150)
    muted: '#525752', // oklch(0.45 0.01 150)
    line: '#dadfdb', // oklch(0.90 0.008 150)
    danger: '#b02a2d', // oklch(0.50 0.17 25)
    scrim: '#13142359', // oklch(0.2 0.03 280 / .35)
    'on-mid': '#0f130f', // ink
    'sleep-bg': '#c4e1ff', // oklch(0.9 0.06 255)
    'sleep-mid': '#3f93f7', // oklch(0.66 0.17 255)
    'sleep-ink': '#003984', // oklch(0.36 0.14 255)
    'sleep-mark': '#3c8ff4', // oklch(0.65 0.17 255)
    'feed-bg': '#ffd0c9', // oklch(0.9 0.06 27)
    'feed-mid': '#e86156', // oklch(0.66 0.17 27)
    'feed-ink': '#76080c', // oklch(0.36 0.14 27)
    'feed-mark': '#e86156', // mid
    'diaper-bg': '#c3eac9', // oklch(0.9 0.06 150)
    'diaper-mid': '#24ae56', // oklch(0.66 0.17 150)
    'diaper-ink': '#004f08', // oklch(0.36 0.14 150)
    'diaper-mark': '#03a14a', // oklch(0.62 0.17 150)
    'med-bg': '#f0dcb1', // oklch(0.9 0.06 85)
    'med-mid': '#c18600', // oklch(0.66 0.17 85)
    'med-ink': '#5e3200', // oklch(0.36 0.14 85)
    'med-mark': '#bb8000', // oklch(0.64 0.17 85)
    'grow-bg': '#bbe5f9', // oklch(0.9 0.052 230)
    'grow-mid': '#02a0d3', // oklch(0.66 0.131 230)
    'grow-ink': '#00445d', // oklch(0.36 0.073 230)
    'warm-bg': '#ffd0c9', // feed-bg
    'warm-mid': '#e86156', // feed-mid
    'hot-bg': '#fed1cc', // oklch(0.9 0.052 25)
    'hot-mid': '#e8605b', // oklch(0.66 0.169 25)
    'hot-ink': '#760c14', // oklch(0.36 0.137 25)
    'cool-bg': '#cfe0f1', // oklch(0.9 0.03 250)
    'topic-movement': '#de6803', // oklch(0.65 0.17 50)
    'topic-talking': '#049cce', // oklch(0.65 0.13 230)
    'topic-sleep': '#877bf1', // oklch(0.65 0.17 285)
    'topic-feeding': '#e45c57', // oklch(0.65 0.17 25)
    'topic-play': '#1cab52', // oklch(0.65 0.17 150)
    'topic-feelings': '#d85c9e', // oklch(0.65 0.17 350)
    'topic-health': '#00a4a4', // oklch(0.65 0.11 195)
    'topic-parents': '#bf8101', // oklch(0.65 0.14 75)
  },
  night: {
    bg: '#06130b', // oklch(0.17 0.025 155)
    surface: '#0f1f14', // oklch(0.22 0.03 155)
    ink: '#f2f2eb', // oklch(0.96 0.01 110)
    muted: '#a5b2a7', // oklch(0.75 0.02 150)
    line: '#223227', // oklch(0.30 0.03 155)
    danger: '#f7857d', // oklch(0.74 0.14 25)
    scrim: '#0000008c', // oklch(0 0 0 / .55)
    'on-mid': '#06130b', // bg
    'sleep-bg': '#0d2e55', // oklch(0.3 0.08 255)
    'sleep-mid': '#4c99f8', // oklch(0.68 0.16 255)
    'sleep-ink': '#b1e2ff', // oklch(0.9 0.1 255)
    'sleep-mark': '#4c99f8', // mid
    'feed-bg': '#4f1a17', // oklch(0.3 0.08 27)
    'feed-mid': '#ea6b60', // oklch(0.68 0.16 27)
    'feed-ink': '#ffc5ba', // oklch(0.9 0.1 27)
    'feed-mark': '#ea6b60', // mid
    'diaper-bg': '#033816', // oklch(0.3 0.08 150)
    'diaper-mid': '#3bb360', // oklch(0.68 0.16 150)
    'diaper-ink': '#aef1bb', // oklch(0.9 0.1 150)
    'diaper-mark': '#3bb360', // mid
    'med-bg': '#402900', // oklch(0.3 0.08 85)
    'med-mid': '#c58e00', // oklch(0.68 0.16 85)
    'med-ink': '#fdd990', // oklch(0.9 0.1 85)
    'med-mark': '#c58e00', // mid
    'grow-bg': '#003346', // oklch(0.3 0.06 230)
    'grow-mid': '#07a6da', // oklch(0.68 0.134 230)
    'grow-ink': '#ace3ff', // oklch(0.89 0.068 230)
    'warm-bg': '#4f1a17', // feed-bg
    'warm-mid': '#ea6b60', // feed-mid
    'hot-bg': '#4f1a18', // oklch(0.3 0.08 25)
    'hot-mid': '#ea6a64', // oklch(0.68 0.16 25)
    'hot-ink': '#ffccc7', // oklch(0.89 0.058 25)
    'cool-bg': '#222f3d', // oklch(0.3 0.03 250)
    'topic-movement': '#e4752b', // oklch(0.68 0.16 50)
    'topic-talking': '#07a6da', // oklch(0.68 0.13 230)
    'topic-sleep': '#8f86f6', // oklch(0.68 0.16 285)
    'topic-feeding': '#ea6a64', // oklch(0.68 0.16 25)
    'topic-play': '#3ab260', // oklch(0.68 0.16 150)
    'topic-feelings': '#de69a6', // oklch(0.68 0.16 350)
    'topic-health': '#0dadae', // oklch(0.68 0.11 195)
    'topic-parents': '#ca8905', // oklch(0.68 0.14 75)
  },
};


const score = (palette: BasePalette, look: Pick<Look, 'shadow' | 'header'>): Look => ({
  palette: inkActions(palette),
  // Bebas Neue has one weight.
  fonts: { display: 'BebasNeue', displayWeight: '400', buttonWeight: '400', body: 'Barlow' },
  tracking: 0,
  radius: { card: 6, button: 4, chip: 3, sheet: 10 },
  border: { width: 1, edge: palette.line },
  ...look,
  icons: null,
  ornaments: null,
  stitch: null,
  needs: null,
  widget: {
    fonts: {
      display: 'BebasNeue_400Regular',
      body: {
        700: { file: 'Barlow_700Bold', weight: '700' },
        800: { file: 'Barlow_800ExtraBold', weight: '800' },
        900: { file: 'Barlow_800ExtraBold', weight: '800' },
      },
    },
    radius: { shell: 10, tile: 6, button: 4 },
  },
});

// Terminal: the design's term-day / term-night, converted and derived as Arcade's.
const TERM: Record<Scheme, BasePalette> = {
  day: {
    bg: '#f3f7f0', // oklch(0.97 0.01 130)
    surface: '#fcfefb', // oklch(0.995 0.005 130)
    ink: '#0d2814', // oklch(0.25 0.05 150)
    muted: '#465c4a', // oklch(0.45 0.04 150)
    line: '#d1dbcf', // oklch(0.88 0.02 140)
    danger: '#b02a2d', // oklch(0.50 0.17 25)
    scrim: '#13142359', // oklch(0.2 0.03 280 / .35)
    'on-mid': '#0d2814', // ink
    'sleep-bg': '#e3e0ff', // oklch(0.92 0.05 290)
    'sleep-mid': '#9e8eef', // oklch(0.7 0.14 290)
    'sleep-ink': '#43337c', // oklch(0.38 0.12 290)
    'sleep-mark': '#9281e1', // oklch(0.66 0.14 290)
    'feed-bg': '#fedec4', // oklch(0.92 0.05 60)
    'feed-mid': '#dd8736', // oklch(0.7 0.14 60)
    'feed-ink': '#6e2d00', // oklch(0.38 0.12 60)
    'feed-mark': '#cc7722', // oklch(0.65 0.14 60)
    'diaper-bg': '#ceefd3', // oklch(0.92 0.05 150)
    'diaper-mid': '#54b66e', // oklch(0.7 0.14 150)
    'diaper-ink': '#00531b', // oklch(0.38 0.12 150)
    'diaper-mark': '#3ca059', // oklch(0.63 0.14 150)
    'med-bg': '#bfeff2', // oklch(0.92 0.05 200)
    'med-mid': '#00b7c1', // oklch(0.7 0.14 200)
    'med-ink': '#00535b', // oklch(0.38 0.12 200)
    'med-mark': '#009ea7', // oklch(0.62 0.14 200)
    'grow-bg': '#c7eafd', // oklch(0.92 0.045 230)
    'grow-mid': '#00ade4', // oklch(0.7 0.14 230)
    'grow-ink': '#024962', // oklch(0.38 0.075 230)
    'warm-bg': '#fedec4', // feed-bg
    'warm-mid': '#dd8736', // feed-mid
    'hot-bg': '#fedbd7', // oklch(0.92 0.04 25)
    'hot-mid': '#e97972', // oklch(0.7 0.14 25)
    'hot-ink': '#79191b', // oklch(0.38 0.13 25)
    'cool-bg': '#d6e6f8', // oklch(0.92 0.03 250)
    'topic-movement': '#d5753a', // oklch(0.66 0.14 50)
    'topic-talking': '#099fd2', // oklch(0.66 0.13 230)
    'topic-sleep': '#8a84e4', // oklch(0.66 0.14 285)
    'topic-feeding': '#db6c65', // oklch(0.66 0.14 25)
    'topic-play': '#43a65f', // oklch(0.65 0.14 150)
    'topic-feelings': '#d06b9e', // oklch(0.66 0.14 350)
    'topic-health': '#06a3a4', // oklch(0.65 0.11 195)
    'topic-parents': '#c28405', // oklch(0.66 0.14 75)
  },
  night: {
    bg: '#040b05', // oklch(0.14 0.02 150)
    surface: '#07150a', // oklch(0.18 0.03 150)
    ink: '#83f68a', // oklch(0.88 0.18 145)
    muted: '#7cb57d', // oklch(0.72 0.10 145)
    line: '#15301b', // oklch(0.28 0.05 150)
    danger: '#f7857d', // oklch(0.74 0.14 25)
    scrim: '#0000008c', // oklch(0 0 0 / .55)
    'on-mid': '#040b05', // bg
    'sleep-bg': '#1f1939', // oklch(0.24 0.06 290)
    'sleep-mid': '#9e8cf4', // oklch(0.7 0.15 290)
    'sleep-ink': '#d6c7ff', // oklch(0.88 0.14 290)
    'sleep-mark': '#9e8cf4', // mid
    'feed-bg': '#331700', // oklch(0.24 0.06 60)
    'feed-mid': '#e18528', // oklch(0.7 0.15 60)
    'feed-ink': '#ffc073', // oklch(0.88 0.14 60)
    'feed-mark': '#e18528', // mid
    'diaper-bg': '#04270f', // oklch(0.24 0.06 150)
    'diaper-mid': '#4cb86a', // oklch(0.7 0.15 150)
    'diaper-ink': '#90f1a6', // oklch(0.88 0.14 150)
    'diaper-mark': '#4cb86a', // mid
    'med-bg': '#00272a', // oklch(0.24 0.06 200)
    'med-mid': '#00b9c3', // oklch(0.7 0.15 200)
    'med-ink': '#39f3fc', // oklch(0.88 0.14 200)
    'med-mark': '#00b9c3', // mid
    'grow-bg': '#002331', // oklch(0.24 0.048 230)
    'grow-mid': '#00ade4', // oklch(0.7 0.139 230)
    'grow-ink': '#9bdbfb', // oklch(0.86 0.078 230)
    'warm-bg': '#331700', // feed-bg
    'warm-mid': '#e18528', // feed-mid
    'hot-bg': '#371110', // oklch(0.24 0.06 25)
    'hot-mid': '#ed756e', // oklch(0.7 0.149 25)
    'hot-ink': '#febfb9', // oklch(0.86 0.074 25)
    'cool-bg': '#14202d', // oklch(0.24 0.03 250)
    'topic-movement': '#e67f3e', // oklch(0.70 0.15 50)
    'topic-talking': '#00ade4', // oklch(0.70 0.14 230)
    'topic-sleep': '#968ff7', // oklch(0.70 0.15 285)
    'topic-feeding': '#ed756e', // oklch(0.70 0.15 25)
    'topic-play': '#4db86a', // oklch(0.70 0.15 150)
    'topic-feelings': '#e174ab', // oklch(0.70 0.15 350)
    'topic-health': '#10b5b5', // oklch(0.70 0.12 195)
    'topic-parents': '#d38f01', // oklch(0.70 0.15 75)
  },
};


const term = (palette: BasePalette, look: Pick<Look, 'border' | 'shadow' | 'header'>): Look => ({
  palette: inkActions(palette),
  fonts: { display: 'VT323', displayWeight: '400', buttonWeight: '400', body: 'JetBrainsMono' },
  tracking: 0,
  radius: { card: 2, button: 0, chip: 0, sheet: 2 },
  ...look,
  icons: null,
  ornaments: null,
  stitch: null,
  needs: null,
  widget: {
    fonts: {
      display: 'VT323_400Regular',
      body: {
        700: { file: 'JetBrainsMono_700Bold', weight: '700' },
        800: { file: 'JetBrainsMono_800ExtraBold', weight: '800' },
        900: { file: 'JetBrainsMono_800ExtraBold', weight: '800' },
      },
    },
    radius: { shell: 4, tile: 2, button: 0 },
  },
});

// Safari: the design's safari-day / safari-night, converted and derived as Arcade's, one colour darkened.
const SAFARI: Record<Scheme, BasePalette> = {
  day: {
    bg: '#f6f3dc', // oklch(0.96 0.03 100)
    surface: '#fffef6', // oklch(0.995 0.01 100)
    ink: '#192c14', // oklch(0.27 0.05 140)
    muted: '#495f44', // oklch(0.46 0.05 140)
    line: '#e0dcbe', // oklch(0.89 0.04 100)
    danger: '#b02a2d', // oklch(0.50 0.17 25)
    scrim: '#13142359', // oklch(0.2 0.03 280 / .35)
    'on-mid': '#192c14', // ink
    'sleep-bg': '#e2cfff', // oklch(0.89 0.08 300)
    'sleep-mid': '#ba93fb', // oklch(0.74 0.15 300)
    'sleep-ink': '#552f86', // oklch(0.4 0.14 300)
    'sleep-mark': '#9e77dc', // oklch(0.65 0.15 300)
    'feed-bg': '#ffcfa6', // oklch(0.89 0.08 60)
    'feed-mid': '#ee9138', // oklch(0.74 0.15 60)
    'feed-ink': '#7a2c00', // oklch(0.4 0.14 60)
    'feed-mark': '#d0750a', // oklch(0.65 0.15 60)
    'diaper-bg': '#bfe8b6', // oklch(0.89 0.08 140)
    'diaper-mid': '#74c163', // oklch(0.74 0.15 140)
    'diaper-ink': '#0b5800', // oklch(0.4 0.14 140)
    'diaper-mark': '#4f9b3e', // oklch(0.62 0.15 140)
    'med-bg': '#9ee8ff', // oklch(0.89 0.08 220)
    'med-mid': '#00bfec', // oklch(0.74 0.15 220)
    'med-ink': '#004f75', // oklch(0.38 0.14 220): the design's 0.4 is 4.36 : 1 at 85 % on med-bg
    'med-mark': '#0095c1', // oklch(0.61 0.15 220)
    'grow-bg': '#abe2fe', // oklch(0.89 0.068 230)
    'grow-mid': '#08baf5', // oklch(0.74 0.146 230)
    'grow-ink': '#004f6a', // oklch(0.4 0.08 230)
    'warm-bg': '#ffcfa6', // feed-bg
    'warm-mid': '#ee9138', // feed-mid
    'hot-bg': '#ffcbc5', // oklch(0.89 0.06 25)
    'hot-mid': '#fc817a', // oklch(0.74 0.15 25)
    'hot-ink': '#831a1d', // oklch(0.4 0.14 25)
    'cool-bg': '#cbdbed', // oklch(0.89 0.03 250)
    'topic-movement': '#d56f2c', // oklch(0.65 0.15 50)
    'topic-talking': '#099cce', // oklch(0.65 0.13 230)
    'topic-sleep': '#877fe6', // oklch(0.65 0.15 285)
    'topic-feeding': '#dc655f', // oklch(0.65 0.15 25)
    'topic-play': '#38a65a', // oklch(0.64 0.15 150)
    'topic-feelings': '#d0649c', // oklch(0.65 0.15 350)
    'topic-health': '#06a4a4', // oklch(0.65 0.11 195)
    'topic-parents': '#bf8105', // oklch(0.65 0.14 75)
  },
  night: {
    bg: '#091806', // oklch(0.19 0.04 140)
    surface: '#11250d', // oklch(0.24 0.05 140)
    ink: '#f3efd9', // oklch(0.95 0.03 100)
    muted: '#b1b89c', // oklch(0.77 0.04 120)
    line: '#253920', // oklch(0.32 0.05 140)
    danger: '#f7857d', // oklch(0.74 0.14 25)
    scrim: '#0000008c', // oklch(0 0 0 / .55)
    'on-mid': '#091806', // bg
    'sleep-bg': '#372552', // oklch(0.31 0.08 300)
    'sleep-mid': '#b28fef', // oklch(0.72 0.14 300)
    'sleep-ink': '#e8cfff', // oklch(0.9 0.1 300)
    'sleep-mark': '#b28fef', // mid
    'feed-bg': '#4c2400', // oklch(0.31 0.08 60)
    'feed-mid': '#e38d3d', // oklch(0.72 0.14 60)
    'feed-ink': '#ffcf9a', // oklch(0.9 0.1 60)
    'feed-mark': '#e38d3d', // mid
    'diaper-bg': '#173a0f', // oklch(0.31 0.08 140)
    'diaper-mid': '#72ba63', // oklch(0.72 0.14 140)
    'diaper-ink': '#bbefb0', // oklch(0.9 0.1 140)
    'diaper-mark': '#72ba63', // mid
    'med-bg': '#00384c', // oklch(0.31 0.08 220)
    'med-mid': '#00b8e1', // oklch(0.72 0.14 220)
    'med-ink': '#8deeff', // oklch(0.9 0.1 220)
    'med-mark': '#00b8e1', // mid
    'grow-bg': '#003549', // oklch(0.31 0.062 230)
    'grow-mid': '#16b3eb', // oklch(0.72 0.14 230)
    'grow-ink': '#aee4ff', // oklch(0.89 0.066 230)
    'warm-bg': '#4c2400', // feed-bg
    'warm-mid': '#e38d3d', // feed-mid
    'hot-bg': '#511d1b', // oklch(0.31 0.08 25)
    'hot-mid': '#f07f77', // oklch(0.72 0.14 25)
    'hot-ink': '#fecdc8', // oklch(0.89 0.056 25)
    'cool-bg': '#25323f', // oklch(0.31 0.03 250)
    'topic-movement': '#e9884d', // oklch(0.72 0.14 50)
    'topic-talking': '#16b3eb', // oklch(0.72 0.14 230)
    'topic-sleep': '#9c97f8', // oklch(0.72 0.14 285)
    'topic-feeding': '#f07f77', // oklch(0.72 0.14 25)
    'topic-play': '#5bbd74', // oklch(0.72 0.14 150)
    'topic-feelings': '#e57eb1', // oklch(0.72 0.14 350)
    'topic-health': '#09bcbc', // oklch(0.72 0.12 195)
    'topic-parents': '#d79628', // oklch(0.72 0.14 75)
  },
};


const safari = (palette: BasePalette, look: Pick<Look, 'shadow' | 'header'>): Look => ({
  palette: inkActions(palette),
  fonts: { display: 'Sniglet', displayWeight: '800', buttonWeight: '800', body: 'Quicksand' },
  tracking: 0.3,
  radius: { card: 24, button: 18, chip: 14, sheet: 30 },
  border: { width: 0, edge: palette.line },
  ...look,
  icons: SAFARI_ICONS,
  ornaments: null,
  stitch: null,
  needs: null,
  widget: {
    fonts: {
      display: 'Sniglet_800ExtraBold',
      body: {
        700: { file: 'Quicksand_700Bold', weight: '700' },
        800: { file: 'Quicksand_700Bold', weight: '700' },
        900: { file: 'Quicksand_700Bold', weight: '700' },
      },
    },
    radius: { shell: 28, tile: 20, button: 16 },
  },
});

// The design's ICONS.safari.
const SAFARI_ICONS: Record<IconSlot, IconName> = {
  sleep: 'pets',
  feed: 'nutrition',
  diaper: 'baby_changing_station',
  med: 'medication',
  wet: 'water_drop',
  dirty: 'sentiment_stressed',
  both: 'emoji_nature',
};

// Ribbon: the design's ribbon-day / ribbon-night (Molly Ribbon App), converted and derived as Arcade's;
// `grow`, `hot` and `cool` at its sleep tones' lightness and chroma, the topics at its sleep mark's. Its own
// action tones: rose buttons and switches, a pink track.
const RIBBON: Record<Scheme, Palette> = {
  day: {
    bg: '#fdf3f6', // oklch(0.972 0.012 355)
    surface: '#fffcfd', // oklch(0.995 0.004 355)
    ink: '#45202f', // oklch(0.30 0.06 355)
    muted: '#7b5865', // oklch(0.50 0.05 355)
    line: '#efd6df', // oklch(0.90 0.03 355)
    danger: '#af3d34', // oklch(0.52 0.15 28)
    scrim: '#45202f59', // oklch(0.30 0.06 355 / .35)
    'on-mid': '#45202f', // ink
    'sleep-bg': '#f1e1f8', // oklch(0.93 0.035 315)
    'sleep-mid': '#b896c7', // oklch(0.72 0.08 315)
    'sleep-ink': '#5f3d6f', // oklch(0.42 0.09 315)
    'sleep-mark': '#a280b1', // oklch(0.65 0.08 315)
    'feed-bg': '#fee0eb', // oklch(0.935 0.035 355)
    'feed-mid': '#e28dae', // oklch(0.74 0.11 355)
    'feed-ink': '#8d325c', // oklch(0.46 0.13 355): the design's 0.47 is 4.40 : 1 at 85 % on feed-bg
    'feed-mark': '#c77596', // oklch(0.66 0.11 355)
    'diaper-bg': '#ffe3de', // oklch(0.94 0.035 30)
    'diaper-mid': '#e7a08d', // oklch(0.77 0.09 35)
    'diaper-ink': '#833e2d', // oklch(0.45 0.10 35): the design's 0.48 is 4.15 : 1 at 85 % on diaper-bg
    'diaper-mark': '#bf7b6a', // oklch(0.65 0.09 35)
    'med-bg': '#feebd6', // oklch(0.95 0.035 70)
    'med-mid': '#e6bc8b', // oklch(0.82 0.08 70)
    'med-ink': '#784c26', // oklch(0.46 0.08 60): the design's 0.48 is 4.19 : 1 at 85 % on med-bg
    'med-mark': '#af8758', // oklch(0.65 0.08 70)
    'grow-bg': '#d1edfb', // oklch(0.93 0.035 230)
    'grow-mid': '#6eaecd', // oklch(0.72 0.08 230)
    'grow-ink': '#005574', // oklch(0.42 0.09 230)
    'warm-bg': '#fee0eb', // feed-bg
    'warm-mid': '#e28dae', // feed-mid
    'hot-bg': '#ffdfdc', // oklch(0.93 0.035 25)
    'hot-mid': '#e18881', // oklch(0.72 0.11 25)
    'hot-ink': '#822b2a', // oklch(0.42 0.12 25)
    'cool-bg': '#d7eaff', // oklch(0.93 0.035 250)
    'topic-movement': '#b78163', // oklch(0.65 0.08 50)
    'topic-talking': '#5898b7', // oklch(0.65 0.08 230)
    'topic-sleep': '#8a88be', // oklch(0.65 0.08 285)
    'topic-feeding': '#bb7c76', // oklch(0.65 0.08 25)
    'topic-play': '#6b9d75', // oklch(0.65 0.08 150)
    'topic-feelings': '#b57b96', // oklch(0.65 0.08 350)
    'topic-health': '#4c9f9e', // oklch(0.65 0.08 195)
    'topic-parents': '#ac8856', // oklch(0.65 0.08 75)
    accent: '#a83f5e', // oklch(0.52 0.14 5)
    'on-accent': '#fffafc', // oklch(0.99 0.005 355)
    track: '#fadbe1', // oklch(0.92 0.035 5)
    toggle: '#a83f5e', // accent
  },
  night: {
    bg: '#1d0e17', // oklch(0.19 0.03 345)
    surface: '#2a1722', // oklch(0.235 0.035 345)
    ink: '#f6e6ed', // oklch(0.94 0.02 350)
    muted: '#c3a8b4', // oklch(0.76 0.035 350)
    line: '#442d3a', // oklch(0.33 0.04 345)
    danger: '#f4928a', // oklch(0.76 0.12 25)
    scrim: '#0000008c', // oklch(0 0 0 / .55)
    'on-mid': '#1d0e17', // bg
    'sleep-bg': '#3a2842', // oklch(0.31 0.05 315)
    'sleep-mid': '#a17bb2', // oklch(0.64 0.09 315)
    'sleep-ink': '#e4ceef', // oklch(0.88 0.05 315)
    'sleep-mark': '#a17bb2', // mid
    'feed-bg': '#4a2534', // oklch(0.32 0.06 355)
    'feed-mid': '#d481a2', // oklch(0.70 0.11 355)
    'feed-ink': '#fad1e0', // oklch(0.90 0.05 355)
    'feed-mark': '#d481a2', // mid
    'diaper-bg': '#492923', // oklch(0.32 0.05 30)
    'diaper-mid': '#d7907e', // oklch(0.72 0.09 35)
    'diaper-ink': '#fdd3c8', // oklch(0.90 0.05 35)
    'diaper-mark': '#d7907e', // mid
    'med-bg': '#45301c', // oklch(0.33 0.045 65)
    'med-mid': '#d9af7f', // oklch(0.78 0.08 70)
    'med-ink': '#f3ddc5', // oklch(0.91 0.04 70)
    'med-mark': '#d9af7f', // mid
    'grow-bg': '#103545', // oklch(0.31 0.05 230)
    'grow-mid': '#4b96b8', // oklch(0.64 0.09 230)
    'grow-ink': '#b7def3', // oklch(0.88 0.05 230)
    'warm-bg': '#4a2534', // feed-bg
    'warm-mid': '#d481a2', // feed-mid
    'hot-bg': '#462623', // oklch(0.31 0.05 25)
    'hot-mid': '#cb6d67', // oklch(0.64 0.12 25)
    'hot-ink': '#ffc4bd', // oklch(0.88 0.08 25)
    'cool-bg': '#1c3249', // oklch(0.31 0.05 250)
    'topic-movement': '#b87c59', // oklch(0.64 0.09 50)
    'topic-talking': '#4b96b8', // oklch(0.64 0.09 230)
    'topic-sleep': '#8684c1', // oklch(0.64 0.09 285)
    'topic-feeding': '#bd7670', // oklch(0.64 0.09 25)
    'topic-play': '#639c6f', // oklch(0.64 0.09 150)
    'topic-feelings': '#b67594', // oklch(0.64 0.09 350)
    'topic-health': '#3b9d9d', // oklch(0.64 0.09 195)
    'topic-parents': '#ac844a', // oklch(0.64 0.09 75)
    accent: '#f0a6b6', // oklch(0.80 0.09 5)
    'on-accent': '#25101c', // oklch(0.21 0.04 345)
    track: '#3c222e', // oklch(0.29 0.045 350)
    toggle: '#f0a6b6', // accent
  },
};

const ribbon = (palette: Palette, look: Pick<Look, 'shadow' | 'header' | 'ornaments' | 'stitch'>): Look => ({
  palette,
  // The design's buttons are Mulish 900, its titles and numbers DM Serif Display (one weight).
  fonts: { display: 'DMSerifDisplay', displayWeight: '400', button: 'Mulish', buttonWeight: '900', body: 'Mulish' },
  tracking: 0,
  radius: { card: 22, button: 24, chip: 20, sheet: 28 },
  border: { width: 1, edge: palette.line },
  ...look,
  icons: null,
  needs: null,
  widget: {
    fonts: {
      display: 'DMSerifDisplay_400Regular',
      body: {
        700: { file: 'Mulish_700Bold', weight: '700' },
        800: { file: 'Mulish_800ExtraBold', weight: '800' },
        900: { file: 'Mulish_900Black', weight: '900' },
      },
    },
    radius: { shell: 26, tile: 20, button: 22 },
  },
});

// Life Sim: the design's sim-day / sim-night (Molly Sim App), converted and derived as Ribbon's; three Day
// tracker inks a step darker than the design's to pass at 85 %. Its own action tones: blue buttons and track.
const SIM: Record<Scheme, Palette> = {
  day: {
    bg: '#ebf7fa', // oklch(0.968 0.014 215)
    surface: '#fbfeff', // oklch(0.995 0.004 215)
    ink: '#102743', // oklch(0.27 0.06 255)
    muted: '#4f5f74', // oklch(0.48 0.04 255)
    line: '#cbdee8', // oklch(0.89 0.025 230)
    danger: '#b6322b', // oklch(0.52 0.17 28)
    scrim: '#10274359', // oklch(0.27 0.06 255 / .35)
    'on-mid': '#102743', // ink
    'sleep-bg': '#e2e6ff', // oklch(0.93 0.04 280)
    'sleep-mid': '#9196e2', // oklch(0.7 0.11 280)
    'sleep-ink': '#424091', // oklch(0.42 0.13 280)
    'sleep-mark': '#8287d1', // oklch(0.65 0.11 280)
    'feed-bg': '#ffe6d1', // oklch(0.94 0.04 60)
    'feed-mid': '#e99e5e', // oklch(0.76 0.12 60)
    'feed-ink': '#863f00', // oklch(0.45 0.12 55): the design's 0.48 is under 4.5 : 1 at 85 % on feed-bg
    'feed-mark': '#c47c3b', // oklch(0.65 0.12 60)
    'diaper-bg': '#d1f3f2', // oklch(0.94 0.035 195)
    'diaper-mid': '#50bfbe', // oklch(0.74 0.1 195)
    'diaper-ink': '#005e63', // oklch(0.43 0.09 200): the design's 0.46 is under 4.5 : 1 at 85 % on diaper-bg
    'diaper-mark': '#229c9c', // oklch(0.63 0.1 195)
    'med-bg': '#fbe2f8', // oklch(0.94 0.04 330)
    'med-mid': '#d291cc', // oklch(0.74 0.11 330)
    'med-ink': '#7b3577', // oklch(0.45 0.13 330): the design's 0.47 is under 4.5 : 1 at 85 % on med-bg
    'med-mark': '#b576af', // oklch(0.65 0.11 330)
    'grow-bg': '#ceeefe', // oklch(0.93 0.04 230)
    'grow-mid': '#49abd6', // oklch(0.7 0.11 230)
    'grow-ink': '#005785', // oklch(0.42 0.13 230)
    'warm-bg': '#ffe6d1', // feed-bg
    'warm-mid': '#e99e5e', // feed-mid
    'hot-bg': '#ffdedb', // oklch(0.93 0.04 25)
    'hot-mid': '#da827b', // oklch(0.7 0.11 25)
    'hot-ink': '#862726', // oklch(0.42 0.13 25)
    'cool-bg': '#d4ebff', // oklch(0.93 0.04 250)
    'topic-movement': '#c57a4f', // oklch(0.65 0.11 50)
    'topic-talking': '#369bc5', // oklch(0.65 0.11 230)
    'topic-sleep': '#8885d0', // oklch(0.65 0.11 285)
    'topic-feeding': '#ca736d', // oklch(0.65 0.11 25)
    'topic-play': '#5aa26b', // oklch(0.65 0.11 150)
    'topic-feelings': '#c17299', // oklch(0.65 0.11 350)
    'topic-health': '#07a4a4', // oklch(0.65 0.11 195)
    'topic-parents': '#b68539', // oklch(0.65 0.11 75)
    accent: '#0961bb', // oklch(0.5 0.16 255)
    'on-accent': '#f8fdfe', // oklch(0.99 0.005 215)
    track: '#cde6f1', // oklch(0.91 0.03 225)
    toggle: '#0961bb', // accent
  },
  night: {
    bg: '#091426', // oklch(0.19 0.04 260)
    surface: '#111e33', // oklch(0.235 0.045 260)
    ink: '#e6f0f8', // oklch(0.95 0.015 240)
    muted: '#a5b7c7', // oklch(0.77 0.03 245)
    line: '#2a384f', // oklch(0.34 0.045 260)
    danger: '#f98f87', // oklch(0.76 0.13 25)
    scrim: '#0000008c', // oklch(0 0 0 / .55)
    'on-mid': '#091426', // bg
    'sleep-bg': '#2d2f51', // oklch(0.32 0.06 280)
    'sleep-mid': '#7e83d3', // oklch(0.64 0.12 280)
    'sleep-ink': '#cfd4ff', // oklch(0.88 0.06 280)
    'sleep-mark': '#7e83d3', // mid
    'feed-bg': '#4c2d12', // oklch(0.33 0.06 60)
    'feed-mid': '#db9152', // oklch(0.72 0.12 60)
    'feed-ink': '#fdd5b7', // oklch(0.9 0.06 60)
    'feed-mark': '#db9152', // mid
    'diaper-bg': '#083a3d', // oklch(0.32 0.05 200)
    'diaper-mid': '#41b2b2', // oklch(0.7 0.1 195)
    'diaper-ink': '#b8e9e8', // oklch(0.9 0.05 195)
    'diaper-mark': '#41b2b2', // mid
    'med-bg': '#472944', // oklch(0.33 0.06 330)
    'med-mid': '#c585bf', // oklch(0.7 0.11 330)
    'med-ink': '#f2d3ee', // oklch(0.9 0.05 330)
    'med-mark': '#c585bf', // mid
    'grow-bg': '#06384b', // oklch(0.32 0.06 230)
    'grow-mid': '#1f99c7', // oklch(0.64 0.12 230)
    'grow-ink': '#b0e0f8', // oklch(0.88 0.06 230)
    'warm-bg': '#4c2d12', // feed-bg
    'warm-mid': '#db9152', // feed-mid
    'hot-bg': '#4d2623', // oklch(0.32 0.06 25)
    'hot-mid': '#cb6d67', // oklch(0.64 0.12 25)
    'hot-ink': '#fdc9c4', // oklch(0.88 0.06 25)
    'cool-bg': '#193550', // oklch(0.32 0.06 250)
    'topic-movement': '#c67544', // oklch(0.64 0.12 50)
    'topic-talking': '#1f99c7', // oklch(0.64 0.12 230)
    'topic-sleep': '#8581d2', // oklch(0.64 0.12 285)
    'topic-feeding': '#cb6d67', // oklch(0.64 0.12 25)
    'topic-play': '#50a064', // oklch(0.64 0.12 150)
    'topic-feelings': '#c26c96', // oklch(0.64 0.12 350)
    'topic-health': '#00a2a3', // oklch(0.64 0.12 195)
    'topic-parents': '#b68028', // oklch(0.64 0.12 75)
    accent: '#5dcbff', // oklch(0.8 0.13 235)
    'on-accent': '#0b1628', // oklch(0.2 0.04 260)
    track: '#1f2e47', // oklch(0.3 0.05 260)
    toggle: '#5dcbff', // accent
  },
};

/** The need colours, `oklch(0.80 0.16 h)` with h = 25 + 1.2 × value, per tenth (the same in both schemes). */
const NEED_COLORS = ['#ff9188', '#ff9570', '#ff9b58', '#ffa340', '#fbab29', '#edb417', '#dbbd1b', '#c6c530', '#afcd48', '#94d361', '#75d87a'];
const NEED_FACE = '#091f3b'; // oklch(0.24 0.06 255)
const SIM_BOW = '#75d87a'; // oklch(0.80 0.16 145)

const SIM_NEEDS: Record<Scheme, NeedsLook> = {
  day: {
    colors: NEED_COLORS,
    // The design's Day label ink, oklch(0.50 0.15 h).
    inks: ['#a83634', '#a73a18', '#a34000', '#9d4800', '#955000', '#8a5800', '#7c6000', '#6c6800', '#586e00', '#3e7400', '#107823'],
    off: '#d3e0ea', // oklch(0.90 0.02 240)
    offRunning: '#ffffff33', // oklch(1 0 0 / .2)
    face: NEED_FACE,
    bow: SIM_BOW,
    toast: SIM_BOW,
    words: SIM_WORDS,
  },
  night: {
    colors: NEED_COLORS,
    inks: NEED_COLORS,
    off: '#29364a', // oklch(0.33 0.04 260)
    offRunning: '#ffffff33',
    face: NEED_FACE,
    bow: SIM_BOW,
    toast: '#107823', // oklch(0.50 0.15 145): the design's bow is 1.53 : 1 on the light Night toast
    words: SIM_WORDS,
  },
};

/** Life Sim's criss-cross: 2 px lines every 16 px at ±45°. */
const CRISSCROSS = { width: 2, every: 16 };

const sim = (scheme: Scheme): Look => ({
  palette: SIM[scheme],
  // The design's titles, tile names, numbers and sheet titles are Fredoka 600, everything else Mulish.
  fonts: { display: 'Fredoka', displayWeight: '600', button: 'Mulish', buttonWeight: '900', body: 'Mulish' },
  tracking: 0,
  radius: { card: 22, button: 24, chip: 20, sheet: 28 },
  border: { width: 1, edge: SIM[scheme].line },
  shadow: { card: scheme === 'day' ? '0 1px 2px #2b3e5a14' : 'none', button: 'none' }, // oklch(0.4 0.06 255 / .08)
  header:
    scheme === 'day'
      ? crisscross(SIM.day.bg, { color: '#bbdfe8', opacity: 0.55, ...CRISSCROSS }) // oklch(0.88 0.04 215 / .55)
      : crisscross(SIM.night.bg, { color: '#152237', opacity: 1, ...CRISSCROSS }, [ // oklch(0.25 0.045 260)
          { width: 43, height: 37, x: 30, y: 40, r: 1.35, color: '#a5e0a5', opacity: 0.7 }, // oklch(0.85 0.10 145 / .7)
        ]),
  icons: null,
  ornaments: null,
  stitch: scheme === 'day' ? '#fbfeff' : '#415a79', // oklch(0.995 0.004 215), oklch(0.46 0.06 255)
  needs: SIM_NEEDS[scheme],
  widget: {
    fonts: {
      display: 'Fredoka_600SemiBold',
      body: {
        700: { file: 'Mulish_700Bold', weight: '700' },
        800: { file: 'Mulish_800ExtraBold', weight: '800' },
        900: { file: 'Mulish_900Black', weight: '900' },
      },
    },
    radius: { shell: 26, tile: 20, button: 22 },
  },
});

/** Ribbon's pinstripes: 10 px every 22 px. */
const PINSTRIPE = { width: 10, every: 22 };
const GOLD = '#e9ce94'; // oklch(0.86 0.08 85)

const SPOT = '#ad7b3d'; // oklch(0.62 0.10 70), at 50 %
const FIREFLY = '#e8dd4d'; // oklch(0.88 0.16 105)

export const THEMES: Record<ThemeKey, Theme> = {
  classic: {
    key: 'classic',
    name: 'Molly Classic',
    tagline: 'Calm and warm. The everyday look.',
    group: 'grown-ups',
    day: classic(PALETTES.day),
    night: classic(PALETTES.night),
  },
  ribbon: {
    key: 'ribbon',
    name: 'Ribbon',
    tagline: 'Satin bows, a little teddy and dusty rose.',
    group: 'little-ones',
    day: ribbon(RIBBON.day, {
      shadow: { card: '0 1px 2px #613a4914', button: 'none' }, // oklch(0.4 0.06 355 / .08)
      ornaments: {
        bow: { color: '#e58da1', shade: '#c86b82' }, // oklch(0.74 0.11 5), oklch(0.64 0.12 5)
        // fur oklch(0.83 0.04 50), muzzle oklch(0.95 0.02 60), ink oklch(0.30 0.06 355), cheek oklch(0.80 0.09 5 / .7) over fur
        teddy: { fur: '#dec0b1', muzzle: '#f9ece1', ink: '#45202f', cheek: '#ebaeb5' },
        toast: '#e58da1', // bow
      },
      stitch: '#fffcfd', // oklch(0.995 0.004 355)
      header: pinstripes(RIBBON.day.bg, { color: '#f7d4da', opacity: 0.7, ...PINSTRIPE }), // oklch(0.90 0.04 5 / .7)
    }),
    night: ribbon(RIBBON.night, {
      shadow: { card: 'none', button: 'none' },
      ornaments: {
        bow: { color: '#df879b', shade: '#ba5f76' }, // oklch(0.72 0.11 5), oklch(0.60 0.12 5)
        // fur oklch(0.64 0.04 50), muzzle oklch(0.82 0.03 60), ink oklch(0.20 0.03 345), cheek oklch(0.72 0.10 5 / .6) over fur
        teddy: { fur: '#a18677', muzzle: '#d3c0b1', ink: '#201019', cheek: '#c3888d' },
        toast: '#a04760', // oklch(0.52 0.12 5): the design's bow is 2.16 : 1 on the light Night toast
      },
      stitch: '#764d5c', // oklch(0.47 0.06 355)
      // Gold flecks (a 1 px dot fading out by 1.7 px, and a fainter 0.8 → 1.4 px one) over plum stripes.
      header: pinstripes(RIBBON.night.bg, { color: '#2d1722', opacity: 1, ...PINSTRIPE }, [ // oklch(0.24 0.04 350)
        { width: 43, height: 37, x: 30, y: 40, r: 1.35, color: GOLD, opacity: 0.8 },
        { width: 29, height: 31, x: 70, y: 70, r: 1.1, color: GOLD, opacity: 0.5 },
      ]),
    }),
  },
  sim: {
    key: 'sim',
    name: 'Life Sim',
    tagline: 'Needs drain from green to red. Moodlets included.',
    group: 'little-ones',
    isNew: true,
    day: sim('day'),
    night: sim('night'),
  },
  arcade: {
    key: 'arcade',
    name: 'Arcade',
    tagline: '8-bit pixels, chunky buttons. Player 1 is awake.',
    group: 'grown-ups',
    // No card border: the first shadow, a 3 px spread, draws it (and the hard offset one below it).
    day: arcade(ARCADE.day, {
      border: { width: 0, edge: ARCADE.day.ink },
      shadow: { card: `0 0 0 3px ${ARCADE.day.ink}, 5px 5px 0 3px ${ARCADE.day.ink}`, button: `3px 3px 0 ${ARCADE.day.ink}` },
      header: checker(ARCADE.day['sleep-bg'], ARCADE.day.bg),
    }),
    night: arcade(ARCADE.night, {
      border: { width: 0, edge: '#a064db' }, // oklch(0.62 0.18 305)
      shadow: { card: '0 0 0 2px #a064db, 0 0 22px -6px #a064db', button: '3px 3px 0 #00000080' },
      header: checker('#1b1440', ARCADE.night.bg), // oklch(0.23 0.08 285)
    }),
  },
  space: {
    key: 'space',
    name: 'Mission Control',
    tagline: 'Hypersleep, refuels and a starry night mode.',
    group: 'grown-ups',
    day: space(SPACE.day, stars(SPACE.day.bg, '#5e738f', '#7a88d8')), // oklch(0.55 0.05 255), oklch(0.65 0.12 275)
    night: space(SPACE.night, stars(SPACE.night.bg, '#d9e7f1', '#98a7fa')), // oklch(0.92 0.02 240), oklch(0.75 0.12 275)
  },
  score: {
    key: 'score',
    name: 'Match Day',
    tagline: 'Scoreboard numbers, time-outs and water breaks.',
    group: 'grown-ups',
    day: score(SCORE.day, {
      shadow: { card: `0 2px 0 ${SCORE.day.line}`, button: 'none' },
      header: stripes(SCORE.day.bg, ['#69ba7c', '#59aa6d'], 28), // oklch(0.72 0.12 150), oklch(0.67 0.12 150)
    }),
    night: score(SCORE.night, {
      shadow: { card: 'none', button: 'none' },
      header: stripes(SCORE.night.bg, ['#0c2e16', '#0b2612'], 28), // oklch(0.27 0.06 150), oklch(0.24 0.05 150)
    }),
  },
  term: {
    key: 'term',
    name: 'Terminal',
    tagline: 'Green-screen uptime. :wq to save.',
    group: 'grown-ups',
    day: term(TERM.day, {
      border: { width: 1, edge: TERM.day.ink },
      shadow: { card: 'none', button: 'none' },
      header: scanlines(TERM.day.bg, TERM.day.ink, 0.09),
    }),
    night: term(TERM.night, {
      border: { width: 1, edge: '#3e8343' }, // oklch(0.55 0.12 145)
      shadow: { card: '0 0 18px -8px #59de6599', button: 'none' }, // oklch(0.8 0.2 145 / .6)
      header: scanlines(TERM.night.bg, TERM.night.ink, 0.08),
    }),
  },
  safari: {
    key: 'safari',
    name: 'Safari',
    tagline: 'Lion naps, munch time and fireflies at night.',
    group: 'little-ones',
    day: safari(SAFARI.day, {
      shadow: { card: '0 5px 0 #192c1429', button: '0 3px 0 #00000033' }, // oklch(0.27 0.05 140 / .16), black / .2
      // Leopard spots: a ring and a dot per tile.
      header: dots(SAFARI.day.bg, [
        {
          width: 34,
          height: 30,
          x: 30,
          y: 30,
          stops: [
            { at: 3, color: SPOT, opacity: 0 },
            { at: 3.5, color: SPOT, opacity: 0.5 },
            { at: 5.5, color: SPOT, opacity: 0.5 },
            { at: 6, color: SPOT, opacity: 0 },
          ],
        },
        { width: 34, height: 30, x: 75, y: 75, stops: [{ at: 2.6, color: SPOT, opacity: 0.5 }, { at: 3.2, color: SPOT, opacity: 0 }] },
      ]),
    }),
    night: safari(SAFARI.night, {
      shadow: { card: '0 5px 0 #0000004d', button: '0 3px 0 #00000059' },
      // Fireflies: a bright core with a soft glow.
      header: dots(SAFARI.night.bg, [
        {
          width: 47,
          height: 39,
          x: 20,
          y: 30,
          stops: [{ at: 1.4, color: FIREFLY }, { at: 3, color: FIREFLY, opacity: 0.25 }, { at: 5, color: FIREFLY, opacity: 0 }],
        },
        {
          width: 61,
          height: 53,
          x: 70,
          y: 65,
          stops: [{ at: 1, color: FIREFLY }, { at: 2.4, color: FIREFLY, opacity: 0.2 }, { at: 4, color: FIREFLY, opacity: 0 }],
        },
      ]),
    }),
  },
};

export const isThemeKey = (value: unknown): value is ThemeKey => THEME_KEYS.includes(value as ThemeKey);

/** The display text's letter-spacings, px before the theme scales them (`tracking-display-*` in tailwind.config.js). */
const TRACKING = [0.5, 0.8, 1, 1.2, 1.5, 2];

/**
 * The CSS variables `tailwind.config.js` reads (`font-display`, `rounded-card`, `shadow-card`…), colours
 * included. `px` writes a length: web needs "12px", while React Native's NativeWind needs the number (it
 * reads "-0.5px" with parseInt, as 0).
 */
export function lookVariables(
  look: Look,
  scheme: Scheme,
  px: (length: number) => string | number,
): Record<`--${string}`, string | number> {
  return {
    ...cssVariables(look.palette),
    ...childVariables(scheme),
    '--fd': look.fonts.display,
    '--fdw': look.fonts.displayWeight,
    '--fdb': look.fonts.button ?? look.fonts.display,
    '--fdbw': look.fonts.buttonWeight,
    '--fb': look.fonts.body,
    ...Object.fromEntries(
      TRACKING.map((size) => [`--ls-${String(size).replace('.', '_')}`, px(Number((-size * look.tracking).toFixed(2)))]),
    ),
    '--rc': px(look.radius.card),
    '--rb': px(look.radius.button),
    '--rs': px(look.radius.chip),
    // The ring design's 10 px segment options and 16 px boxes, from Classic's 12 px chips and 20 px cards.
    '--rsi': px(Math.max(0, look.radius.chip - 2)),
    '--rcs': px(Math.max(0, look.radius.card - 4)),
    '--rsh': px(look.radius.sheet),
    '--bw': px(look.border.width),
    '--edge': rgbTriplet(look.border.edge),
    '--sh': look.shadow.card,
    '--shb': look.shadow.button,
  };
}
