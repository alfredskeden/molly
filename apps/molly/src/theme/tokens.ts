// The design's colours (the design "Molly Redesign"), converted once from oklch to hex because
// React Native, the widget renderer and Android notifications don't parse oklch(). Plain data, no React:
// the widget's headless task handler and the notification use it too.

export type Scheme = 'day' | 'night';
/** The widget's trackers. Medication (`med`) has colours but no widget. */
export type Tracker = 'sleep' | 'feed' | 'diaper';

/** A theme's colours. */
export type Palette = BasePalette & Record<ActionTone, string>;

/**
 * Primary buttons (`accent`, their text `on-accent`), the ring's track (`track`) and a switch that's on
 * (`toggle`). Themes from before Ribbon use `inkActions`: ink buttons, a `line` track, diaper-ink switches.
 */
export type ActionTone = 'accent' | 'on-accent' | 'track' | 'toggle';

/** A theme's colours apart from its `ActionTone`s. */
export type BasePalette = {
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  line: string;
  danger: string;
  /** Behind sheets. Carries its own alpha. */
  scrim: string;
  /** Text on a tracker's `mid` (the toast's Adjust time and Edit). */
  'on-mid': string;
} & Record<`${Tracker | 'med'}-${'bg' | 'mid' | 'ink' | 'mark'}`, string> &
  Record<MeasureTone, string> &
  Record<TopicTone, string>;
// `mark`: the Today strip's blocks and dots, ≥ 3 : 1 on `bg` (the design's `mid` is too faint in Day).

/**
 * The Development guide's topic bars, one hue each (movement 50, talking 230, sleep 285, feeding 25, play 150,
 * feelings 350, health 195, parents 75) at the lightness and chroma of the theme's own `sleep-mark`, nudged
 * darker or lighter where needed to stay ≥ 3 : 1 on `surface`. Ids as `TopicId` in `@molly/core`.
 */
export type TopicTone = `topic-${'movement' | 'talking' | 'sleep' | 'feeding' | 'play' | 'feelings' | 'health' | 'parents'}`;

/**
 * The measurement screens' colours (design "Molly Measurements"): `grow` (blue, the weight bands, chips and
 * + buttons), `warm` (the height ruler, Raised; the theme's feed tones), `hot` (Fever), `cool` (Low). Each
 * theme's from its own sleep tones' lightness and chroma at the design's hues (230, 25, 250).
 */
export type MeasureTone = `grow-${'bg' | 'mid' | 'ink'}` | `warm-${'bg' | 'mid'}` | `hot-${'bg' | 'mid' | 'ink'}` | 'cool-bg';

/** The action tones of a theme from before Ribbon: what it drew buttons, the track and switches in. */
export const inkActions = (palette: BasePalette): Palette => ({
  ...palette,
  accent: palette.ink,
  'on-accent': palette.bg,
  track: palette.line,
  toggle: palette['diaper-ink'],
});

const CLASSIC: Record<Scheme, BasePalette> = {
  day: {
    bg: '#f9f4ee', // oklch(0.97 0.01 75)
    surface: '#fffdfa', // oklch(0.995 0.004 75)
    ink: '#2e241d', // oklch(0.27 0.02 55)
    muted: '#6d6059', // oklch(0.5 0.02 55)
    line: '#e7e0d9', // oklch(0.91 0.012 70)
    danger: '#af3d34', // oklch(0.52 0.15 28)
    scrim: '#2e241d59', // oklch(0.27 0.02 55 / 0.35)
    'on-mid': '#2e241d', // ink
    'sleep-bg': '#e1e1ff', // oklch(0.92 0.045 285)
    'sleep-mid': '#aba9e8', // oklch(0.76 0.09 285)
    'sleep-ink': '#433e7b', // oklch(0.4 0.1 285)
    'sleep-mark': '#8684c1', // oklch(0.64 0.09 285)
    'feed-bg': '#ffddca', // oklch(0.92 0.045 50)
    'feed-mid': '#e0a07d', // oklch(0.76 0.09 50)
    'feed-ink': '#7a3c14', // oklch(0.43 0.1 50)
    'feed-mark': '#b87c59', // oklch(0.64 0.09 50)
    'diaper-bg': '#caefdd', // oklch(0.92 0.045 165)
    'diaper-mid': '#77c4a3', // oklch(0.76 0.09 165)
    'diaper-ink': '#0a553d', // oklch(0.4 0.08 165)
    'diaper-mark': '#4b9779', // oklch(0.62 0.09 165)
    'med-bg': '#f7ecbe', // oklch(0.94 0.06 95)
    'med-mid': '#e7c869', // oklch(0.84 0.12 92)
    'med-ink': '#6c4c02', // oklch(0.44 0.09 80)
    'med-mark': '#a68922', // oklch(0.64 0.12 92)
    'grow-bg': '#c7ebfd', // oklch(0.92 0.045 230)
    'grow-mid': '#71bcdf', // oklch(0.76 0.09 230)
    'grow-ink': '#004f6a', // oklch(0.4 0.08 230)
    'warm-bg': '#ffddca', // feed-bg
    'warm-mid': '#e0a07d', // feed-mid
    'hot-bg': '#fedbd7', // oklch(0.92 0.04 25)
    'hot-mid': '#f4928a', // oklch(0.76 0.12 25)
    'hot-ink': '#7f2021', // oklch(0.4 0.13 25)
    'cool-bg': '#d6e6f8', // oklch(0.92 0.03 250)
    'topic-movement': '#b87b59', // oklch(0.64 0.09 50)
    'topic-talking': '#4a96b8', // oklch(0.64 0.09 230)
    'topic-sleep': '#8684c1', // oklch(0.64 0.09 285)
    'topic-feeding': '#bd7670', // oklch(0.64 0.09 25)
    'topic-play': '#629c6e', // oklch(0.64 0.09 150)
    'topic-feelings': '#b67594', // oklch(0.64 0.09 350)
    'topic-health': '#3a9d9d', // oklch(0.64 0.09 195)
    'topic-parents': '#ac8449', // oklch(0.64 0.09 75)
  },
  night: {
    bg: '#18120f', // oklch(0.19 0.012 55)
    surface: '#231d18', // oklch(0.235 0.013 55)
    ink: '#e9e4dc', // oklch(0.92 0.012 75)
    muted: '#a59d95', // oklch(0.7 0.015 70)
    line: '#352f2a', // oklch(0.31 0.012 60)
    danger: '#e6867a', // oklch(0.72 0.12 28)
    scrim: '#00000080', // oklch(0 0 0 / 0.5)
    'on-mid': '#18120f', // bg: ink is too light on Night's mid colours
    'sleep-bg': '#2e2c49', // oklch(0.31 0.05 285)
    'sleep-mid': '#7b78b4', // oklch(0.6 0.09 285)
    'sleep-ink': '#cbcbfe', // oklch(0.86 0.07 285)
    'sleep-mark': '#7b78b4', // mid
    'feed-bg': '#452818', // oklch(0.31 0.05 50)
    'feed-mid': '#b27654', // oklch(0.62 0.09 50)
    'feed-ink': '#fbc8ac', // oklch(0.87 0.07 50)
    'feed-mark': '#b27654', // mid
    'diaper-bg': '#13382a', // oklch(0.31 0.05 165)
    'diaper-mid': '#4e9074', // oklch(0.6 0.08 165)
    'diaper-ink': '#a6e0c6', // oklch(0.86 0.07 165)
    'diaper-mark': '#4e9074', // mid
    'med-bg': '#38300f', // oklch(0.31 0.05 95)
    'med-mid': '#b79c46', // oklch(0.7 0.11 92)
    'med-ink': '#e8d89b', // oklch(0.88 0.08 95)
    'med-mark': '#b79c46', // mid
    'grow-bg': '#0e3545', // oklch(0.31 0.052 230)
    'grow-mid': '#3e8aac', // oklch(0.6 0.091 230)
    'grow-ink': '#a1daf6', // oklch(0.86 0.071 230)
    'warm-bg': '#452818', // feed-bg
    'warm-mid': '#b27654', // feed-mid
    'hot-bg': '#4a2320', // oklch(0.31 0.06 25)
    'hot-mid': '#bd615b', // oklch(0.6 0.12 25)
    'hot-ink': '#ffbeb8', // oklch(0.86 0.076 25)
    'cool-bg': '#25313f', // oklch(0.31 0.03 250)
    'topic-movement': '#ac704d', // oklch(0.60 0.09 50)
    'topic-talking': '#3e8aac', // oklch(0.60 0.09 230)
    'topic-sleep': '#7a78b4', // oklch(0.60 0.09 285)
    'topic-feeding': '#b06a64', // oklch(0.60 0.09 25)
    'topic-play': '#568f63', // oklch(0.60 0.09 150)
    'topic-feelings': '#a96988', // oklch(0.60 0.09 350)
    'topic-health': '#2a9191', // oklch(0.60 0.09 195)
    'topic-parents': '#a0783e', // oklch(0.60 0.09 75)
  },
};

export const PALETTES: Record<Scheme, Palette> = { day: inkActions(CLASSIC.day), night: inkActions(CLASSIC.night) };

/**
 * The child colours as a notification icon: Android draws the initial white in a circle of this colour, so it's a
 * mid tone of the same hue (oklch(0.52 0.10 h), over 5:1 against white) rather than the avatar's pastel or ink.
 */
export const CHILD_ICON_COLOURS = ['#934f71', '#007889', '#1c7b5a', '#925a25', '#6360a0'];

/**
 * The five child colours (avatar background and its initial), the same in every theme so a child is
 * recognisable whatever the look. Day from the ring design: oklch(0.90 0.05 h) / oklch(0.40 0.10 h) for
 * h = CHILD_HUE_ANGLES (350, 210, 165, 60, 285); night: oklch(0.40 0.07 h) / oklch(0.90 0.06 h). A child's
 * `hue` is the index.
 */
export const CHILD_COLOURS: Record<Scheme, { bg: string; ink: string }[]> = {
  day: [
    { bg: '#f9d1e3', ink: '#6e2e4f' },
    { bg: '#b9e8f0', ink: '#005565' },
    { bg: '#c0e9d6', ink: '#00583a' },
    { bg: '#f8d7be', ink: '#6d3800' },
    { bg: '#dadaff', ink: '#433e7b' },
  ],
  night: [
    { bg: '#64374d', ink: '#fecee4' },
    { bg: '#00525c', ink: '#b0eaf4' },
    { bg: '#1a533e', ink: '#baebd4' },
    { bg: '#633e1d', ink: '#fdd5b7' },
    { bg: '#44426c', ink: '#d9d9ff' },
  ],
};

/** `--child-1-bg` … `--child-5-ink`, for `bg-child-1-bg` / `text-child-1-ink`. */
export function childVariables(scheme: Scheme): Record<`--${string}`, string> {
  return Object.fromEntries(
    CHILD_COLOURS[scheme].flatMap(({ bg, ink }, index) => [
      [`--child-${index + 1}-bg`, rgbTriplet(bg)],
      [`--child-${index + 1}-ink`, rgbTriplet(ink)],
    ]),
  );
}

/** NativeWind reads colours as `rgb(var(--name) / alpha)`, so each variable holds "r g b". */
export function cssVariables(palette: Palette): Record<`--${string}`, string> {
  return Object.fromEntries(
    Object.entries(palette).map(([name, hex]) => [`--${name}`, name === 'scrim' ? rgba(hex) : rgbTriplet(hex)]),
  );
}

const channels = (hex: string) => [1, 3, 5, 7].map((i) => parseInt(hex.slice(i, i + 2) || 'ff', 16));

export const rgbTriplet = (hex: string) => channels(hex).slice(0, 3).join(' ');

function rgba(hex: string) {
  const [r, g, b, a] = channels(hex);
  return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(2)})`;
}
