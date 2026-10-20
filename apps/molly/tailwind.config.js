const plugin = require('tailwindcss/plugin');

// Colours, fonts, corners, borders and shadows come from CSS variables set at the app root from
// src/theme/themes.ts, so one class (`bg-surface`, `rounded-card`, `font-display`) follows the chosen theme
// and its day or night look.
const variable = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const tones = (tracker) => ({
  bg: variable(`${tracker}-bg`),
  mid: variable(`${tracker}-mid`),
  ink: variable(`${tracker}-ink`),
  mark: variable(`${tracker}-mark`),
});

// The display face's letter-spacing, scaled by the theme: one variable per size (`--ls-2`), because React
// Native doesn't resolve `calc()` over a variable. The sizes are TRACKING in src/theme/themes.ts.
const TRACKING = ['0.5', '0.8', '1', '1.2', '1.5', '2'];

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: variable('bg'),
        surface: variable('surface'),
        ink: variable('ink'),
        muted: variable('muted'),
        line: variable('line'),
        danger: variable('danger'),
        edge: variable('edge'),
        'on-mid': variable('on-mid'),
        // Primary buttons and their text, the ring's track, a switch that's on (src/theme/tokens.ts ActionTone).
        accent: variable('accent'),
        'on-accent': variable('on-accent'),
        track: variable('track'),
        toggle: variable('toggle'),
        scrim: 'var(--scrim)',
        sleep: tones('sleep'),
        feed: tones('feed'),
        diaper: tones('diaper'),
        med: tones('med'),
        // The measurement screens' colours (src/theme/tokens.ts MeasureTone).
        grow: { bg: variable('grow-bg'), mid: variable('grow-mid'), ink: variable('grow-ink') },
        warm: { bg: variable('warm-bg'), mid: variable('warm-mid') },
        hot: { bg: variable('hot-bg'), mid: variable('hot-mid'), ink: variable('hot-ink') },
        cool: { bg: variable('cool-bg') },
        // The Development guide's topic bars (src/theme/tokens.ts TopicTone): `bg-topic-movement`.
        topic: Object.fromEntries(
          ['movement', 'talking', 'sleep', 'feeding', 'play', 'feelings', 'health', 'parents'].map((id) => [id, variable(`topic-${id}`)]),
        ),
        // The five child colours (src/theme/tokens.ts CHILD_COLOURS): `bg-child-1-bg`, `text-child-1-ink`.
        child: Object.fromEntries(
          [1, 2, 3, 4, 5].flatMap((n) => [
            [`${n}-bg`, variable(`child-${n}-bg`)],
            [`${n}-ink`, variable(`child-${n}-ink`)],
          ]),
        ),
      },
      // One family per face, a file per weight (app.json `expo-font`, src/theme/fonts.web.ts), so `font-bold`
      // picks the right file. `font-display` also sets the display weight.
      fontFamily: { sans: ['var(--fb)'] },
      // The repeated in-between sizes, by role: small grey lines under a title, chip and row labels, larger
      // button and row titles. Size only, so each place keeps its own line height.
      fontSize: { caption: '13px', label: '15px', title: '17px' },
      // `mock`: mock-ups of something outside the theme (the theme picker's cards, Android's notification),
      // so the same corners in every theme.
      borderRadius: { mock: '18px', 'mock-sm': '10px', widget: '24px', card: 'var(--rc)', button: 'var(--rb)', chip: 'var(--rs)', inner: 'var(--rsi)', box: 'var(--rcs)', sheet: 'var(--rsh)' },
      borderWidth: { card: 'var(--bw)' },
    },
  },
  plugins: [
    plugin(({ addUtilities }) => {
      addUtilities({
        '.font-display': { 'font-family': 'var(--fd)', 'font-weight': 'var(--fdw)' },
        '.font-display-button': { 'font-family': 'var(--fdb)', 'font-weight': 'var(--fdbw)' },
        '.shadow-card': { 'box-shadow': 'var(--sh)' },
        '.shadow-button': { 'box-shadow': 'var(--shb)' },
        ...Object.fromEntries(
          TRACKING.map((size) => {
            const name = size.replace('.', '_');
            return [`.tracking-display-${name}`, { 'letter-spacing': `var(--ls-${name})` }];
          }),
        ),
      });
    }),
  ],
};
