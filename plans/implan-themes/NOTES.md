# Notes: themes

## Decisions (2026-09-27)

- **Widgets follow the theme**: colours, fonts, corners and playful copy, as in the design's Widgets screens. The header pattern is not drawn on widgets. The lock-screen notification stays Molly Classic.
- **Playful labels reach** the design's surfaces (dashboard, edit screen, settings, widgets) **plus toasts** that name a tracker. History, Help, onboarding, error messages and screen-reader labels stay plain.
- **Build order**: the theme engine with Classic unchanged and the picker first, then one theme per step, each with its own look review.
- **Playful labels default to on**, as in the design. Classic has no playful copy, so nothing changes for anyone who never opens the picker.

## Defaults chosen during planning (overturn if a step shows they don't work)

- **Classic is today's app, not the design's Classic.** Where the design's Classic copy or tokens differ from what ships (for example `Next feed around`), the app wins. The other themes' copy maps onto the app's real labels; an app label with no counterpart in the design's `COPY` table stays plain in every theme.
- **The existing `theme` setting keeps its meaning** (day / night / follow the phone, the "Colours" choice) so stored settings need no migration. The new settings are `look` (which theme) and `playful`.
- **Colours are converted once from oklch to hex**, as `tokens.ts` already does, because React Native, the widget renderer and Android notifications don't parse oklch. Each theme gets the `mark` and `on-mid` tokens the design doesn't have, derived the same way as Classic's (see the comments in `tokens.ts`). Where a design colour fails the contrast tests, adjust it and note the change below.
- **Header pattern and Safari icons as SVG**, no new dependency: `expo-image` draws SVG on Android and web, and `react-native-android-widget` has `SvgWidget`. One header SVG per theme and scheme (the pattern plus the fade into `bg`), one SVG per Safari glyph (Material Symbols Rounded, Apache 2.0, filled, weight 500).
- **Fonts**: `@expo-google-fonts/*` packages, only the weights the design uses. Android registers each family in `app.json`'s `expo-font` plugin (as Nunito is now) and in the widget plugin's `fonts`. Web loads only the chosen theme's faces from Molly's own origin (the CSP allows fonts only from `'self'`) and keeps Nunito as the fallback while they load.
- **Screen-reader labels stay plain** whatever the theme ("Start sleep", not "Pause game"), so TalkBack and tests keep one vocabulary.

## Open

- No open questions. Left to check by hand (step 10, `TEST_STRATEGY.md`'s open boxes): the Sleep, Feeding and Diaper widgets under each theme (only the Molly widget is on the emulator's home screen), widgets with Playful off, the lock-screen notification under a non-Classic theme, sheets on web under a theme (`ThemeScope`), Follow the phone under every theme, and each theme's edit screen and feeding / night-sleeping dashboard against the design (Arcade's edit screen is checked).

## Found while building

### Step 1: NativeWind variables on Android (NativeWind 4.2.7, react-native-css-interop 0.2.7, RN 0.86.3)

Checked with a temporary probe on the emulator (a View with its own `vars()`), then removed.

- **Work as plain `var()` classes on Android and web**, so the code uses Tailwind classes, not styles from the theme context: `fontFamily` (`font-sans` → `--fb`, `font-display` → `--fd`), `fontWeight` (`--fdw`), `borderRadius` (`rounded-card` / `-button` / `-chip` / `-sheet`), `borderWidth` (`border-card` → `--bw`) and colour (`border-edge`), and `boxShadow` (`shadow-card` / `shadow-button`: offset, spread and several comma-separated shadows all draw, via React Native's own `boxShadow`). A `box-shadow` written without a variable would not: css-interop then keeps only `shadowColor` / `shadowRadius`, which Android ignores.
- **`calc()` over a variable doesn't resolve on Android** (`letter-spacing: calc(var(--ls) * -2px)` had no effect). The theme's tracking is therefore one precomputed variable per size (`--ls-0_5` … `--ls-2`, from `TRACKING` in `themes.ts`) behind `tracking-display-*`.
- **A variable holding a fractional px string is truncated on Android**: css-interop reads `"-0.5px"` with `parseInt`, giving 0. `lookVariables(look, px)` writes lengths as numbers on native and as `"12px"` on web (`theme.tsx`).
- React Native parses `boxShadow: 'none'` as no shadow, so Classic's `none` is safe.
- `pnpm test` runs `packages/api`'s integration tests against the same test Baby Buddy the emulator is signed in to: they add and remove entries, so emulator screenshots taken around a test run show different data.

### Step 1: Classic unchanged

- Every `font-black` in the app was display text (Classic's display weight is 900), so all became `font-display`, and their `tracking-[-Npx]` became `tracking-display-N`. The edit screen's Save is `Button display` (`font-display-button`, `--fdbw`: 800 in Classic, as today, the display weight in other themes).
- Web: HEAD and step 1 exports screenshotted on the test Baby Buddy (dashboard and Settings, day and night): pixel-identical. Android (emulator, night): Settings identical except the status-bar clock; the header and the Diaper / Medication tiles identical.

### Step 2: copy

- The design's `COPY` keys map onto the app's labels; where Classic's design string differs from the app (`Start feed`, `Next feed around`), the app's string is Classic's. One key the design doesn't have: `feedNoun`, because today's toasts say `Feeding started` but `Feed saved`, and the Molly widget's row is `Feeding`; in the other themes it is the tile's word (`Power-up`).
- Toasts name the tracker with the tile words (`Save point started 09:14`, `Power-up saved · Left · 15m`, `Respawn saved · Wet`): `outcomeToast(…, copy)`. `Already running…`, `Already stopped…` and failures stay plain.
- `appName` only replaces the header's fallback when the child has no name.
- Screen readers: every themed Button, heading and link passes the plain label (`PLAIN`, Classic's copy) as `accessibilityLabel`, but only when the theme's word differs (`spoken(shown, plain)`), so TalkBack and Playwright's role names keep one vocabulary. Setting it always broke specs: an `aria-label="Medication"` on the tile heading made `getByLabel('Medication')` match the heading as well as the field.
- Not themed, no design counterpart: `Stop feeding` and `Cancel` on the tiles, `Vitamin D` / `Other`, the feeding stop sides.

### Step 3: picker

- `src/theme/ThemePicker.tsx`, inside Settings' existing Theme card: the design's intro line, a `radiogroup` per group ("For grown-ups" / "For little ones", an empty group is left out), each card a `radio` named `<name>. <tagline>`, then Colours, then Playful labels with the design's hint (`Choice` gained `hint`).
- Each card's thumbnail is drawn in that theme's look through `LookScope` (its variables on a View): `bg`, the chip corners, the four `mid` swatches, `Aa` in `font-display`, and the header pattern as an image when the theme has one. The name uses the theme's display face in this screen's ink (a style, not the card theme's colours).
- Web fonts: the picker shows every theme's display face, so on web the picker loads each theme's display face (`loadPreviewFonts`) when Settings opens. The app's first load still fetches only the chosen theme's faces; the others are fetched only if Settings is opened.
- Playwright: `e2e/tests/theme-picker.spec.ts` (Classic listed and chosen, choice and Playful survive a reload). The theme-changes-labels checks come with Arcade.

### Step 4: widgets

- The task handler and `syncWidget` already read `Settings` for the Colours choice, so `look` and `playful` come from there too, not from the widget cache as planned: same device, same moment, one less copy to keep in step.
- `widgetThemes(settings)` (`model.ts`, unit-tested) gives each half of Android's light/dark pair its look and copy; `MollyWidget.android.tsx` threads one `Draw` (palette, copy, font files, corners) through every part.
- Each look has a `widget` block: font files by weight (the renderer loads fonts by file name and fakes other weights), `display` for the big numbers (the design uses `--fd` for them), and corners for the whole widget, a tile or row, and a button (Classic: 24 / 16 / 12, as before). The widget renderer draws no shadows or borders, so the widgets take the theme's colours, fonts, corners and labels only.
- Widget labels from the copy: the Molly header (`appName`), tracker titles, `Sleeping since` / `Feeding since`, `Start sleep`, the diaper buttons, `+ Wet`. The Large feed widget keeps its shorter `Start feed` unless the theme has its own words. Buttons' `accessibilityLabel`s use the plain titles.
- Emulator: Classic's Molly widget draws as before (fonts, corners, labels).

### Step 5: Arcade

- Colours: the design's `arcade-day` / `arcade-night` converted with the same oklch → sRGB (clamped) conversion as Classic's (checked: it reproduces `tokens.ts`' Classic hex exactly). Derived: `mark` = the mid, darkened in Day until ≥ 3 : 1 on `bg` (sleep L 0.65, feed 0.64, diaper 0.61, med 0.60), Night = mid; `on-mid` = ink in Day, bg in Night. Every contrast check passes with the design's colours unchanged.
- No card border (`--bw: 0`): the card shadow's first entry, a 3 px (Night 2 px) spread, draws the frame, and the second the hard offset (Day) or the purple glow (Night). React Native draws both on Android.
- Fonts: `@expo-google-fonts/pixelify-sans` (700 only: the display and Save weight) and `@expo-google-fonts/space-mono` (400, 700; Android picks the nearest file for 500–900). Widget: `PixelifySans_700Bold` for the numbers, `SpaceMono_700Bold` for everything else, drawn at weight 700 so the renderer doesn't fake a bolder one.
- Header: `checker()` in `src/theme/art.ts`, 8 px squares of `sleep-bg` (Day) / `oklch(0.23 0.08 285)` (Night) on `bg`, fading into `bg` below the top quarter; the picker's thumbnail is the pattern alone.
- The Today pager clipped a card's shadow on its right and bottom (it's `overflow-hidden` for the swipe). Its clip now reaches the screen edges and 8 px below, with matching padding and negative margins, so the pages sit where they did.
- expo-image on Android (Glide) reads only base64 data URIs: `data:image/svg+xml;utf8,…` fails in the video decoder (`setDataSourceCallback failed` in logcat) and draws nothing. `svgSource` encodes base64 (`btoa`; the SVGs are ASCII).
- Emulator, Night and Day: fonts, frames, glow, hard shadows, checker header and thumbnail, edit screen, the Molly widget (fonts, corners, labels, `Combo`). Seen: the Full widget's running feed row truncates `Powering up since 23:48` (the time is also in the line under it); left for the look review. Largest font size: in the step 10 review.

### Steps 6–9: Mission Control, Match Day, Terminal, Safari

- Colours converted and derived as Arcade's; all pass the contrast tests as designed except one fix: **Safari Day `med-ink`** is oklch(0.40 → 0.38 0.14 220), `#00557b` → `#004f75`, because the design's was 4.36 : 1 at 85 % on `med-bg` (4.67 now).
- Fonts (`@expo-google-fonts/*`, only the weights used): Chakra Petch 700 + IBM Plex Sans 400–700; Bebas Neue 400 (its only weight, so display and Save are 400) + Barlow 500–800; VT323 400 + JetBrains Mono 400, 500, 700, 800; Sniglet 800 + Quicksand 500–700. Widget files: each display face, and the body face's 700 (and 800 where it exists) at their own weights.
- Headers (`art.ts`): `dots` (tiled radial dots: Mission Control's three star layers, Safari's leopard rings and spots by day, fireflies by night), `stripes` (Match Day's 28 px pitch stripes), `scanlines` (Terminal's 1 px lines every 4 px).
- **Android's SVG renderer (expo-image) ignores `stop-opacity`**: the fade drew nothing and Safari's 50 % spots drew solid. The fade is now 32 bands of `bg` with rising `fill-opacity` (which it does draw), and see-through colours are mixed with `bg` beforehand. `art.test.ts` keeps `stop-opacity` out.
- Match Day's stripes faded into their own green (the fade took the first stripe colour as the background): `stripes(bg, colors, width)` now takes the theme's `bg`.
- Safari's pictures: `src/theme/icons.ts` holds the seven glyphs from `@material-symbols/svg-500` 0.47.5 (`rounded/*-fill.svg`, Apache 2.0), fetched once, not a dependency. `Look.icons` maps slots (sleep, feed, diaper, med, wet, dirty, both) to glyphs, null in every other theme. `Button icon={{ slot, stacked }}` draws the picture beside the label (tile Start/Stop/Cancel) or above a 13 px label (diaper buttons) in the label's colour; Recent rows show the tracker's picture in its ink instead of the dot (`EntryRow pictured`; History keeps dots); the widgets' Start/Stop and diaper buttons get a 16 px `SvgWidget` beside the label. The tile headers' big pictures in the design are not drawn (the plan lists buttons, diaper buttons, Recent and widgets).
- Recent's time column was a fixed 46 px: wider faces (Space Mono) wrapped `05:22` onto two lines. It's a minimum width now, one line.
- Emulator, all four themes: Settings with every card, dashboard, the Molly widget (fonts, corners, labels, Safari's pictures). Web: dashboard and Settings, day and night.

### Step 10: look review so far

- Emulator at the largest font size (2.0), every theme: dashboard (a running sleep) and Settings, nothing clipped or overlapping; the header wraps its Day / Night switch and Settings link onto a second line, as it does in Classic.
- Web, first load: Classic fetches only Nunito's five files; Arcade only Pixelify Sans and Space Mono. Opening Settings fetches the other themes' display faces for the picker. No request leaves Molly's origin except to Baby Buddy.
