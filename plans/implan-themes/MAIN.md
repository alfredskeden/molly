# Themes

Context: the Molly system plan in [`../implan-molly/MAIN.md`](../implan-molly/MAIN.md) (architecture, rules) and the root `CLAUDE.md`. Decisions and defaults are in [`NOTES.md`](NOTES.md). The Definition of Done is in [`TEST_STRATEGY.md`](TEST_STRATEGY.md).

**Outcome:** a parent can pick one of six themes in Settings: **Molly Classic** (today's look) and five new ones, Arcade, Mission Control, Match Day, Terminal and Safari. Each theme sets the colours, two fonts, corner sizes, shadows, a header pattern and its own playful labels ("Game paused", "Refuel"), in a day and a night version. Safari also puts pictures on its buttons. A **Playful labels** switch keeps a theme's look but goes back to plain words. The widgets follow the theme. Nothing changes for a parent who never opens the picker.

The choice is per device, like the day / night choice: stored in `Settings`, never in Baby Buddy.

## The design source

`Molly Themes.dc.html`, the (private) design source. It is an index page; every phone in it is `Molly Themed App.dc.html` with props `theme`, `mode` (day / night), `playful`, `scenario` and `screen` (dashboard, edit, settings, widget). That file holds the spec:

- **Tokens**: one CSS block per `<theme>-<mode>` at the top. Beyond the colours Molly already has: `--fd` / `--fdw` display font and weight, `--fb` body font, `--ls` letter-spacing multiplier for display text, `--rc` / `--rb` / `--rs` / `--rsh` corners for cards, buttons, chips and sheets, `--bw` / `--edge` card border width and colour, `--sh` / `--shb` card and button shadows, `--art` header pattern.
- **Copy**: the `COPY` table in the script, one entry per theme, keyed by label (`awake`, `sleeping`, `stopSleep`, `startFeed`, `diaperOpts` …).
- **Picker**: `THEMES` (key, name, tagline, group: "For grown-ups" / "For little ones") and the Settings screen markup.
- **Icons**: `ICONS` (Safari only), Material Symbols names.

`support.js` is the canvas runtime, not design content. The design's times, entries and totals are illustrative; its layout is today's app. Where this plan and the design disagree, this plan wins (the deviations are in `NOTES.md`: Classic is today's app, screen-reader labels stay plain, no header pattern on widgets).

## How it fits together

- **`src/theme/themes.ts`** (new, plain data, no React, like `tokens.ts`, because the widget task handler reads it): `THEME_KEYS`, and for each key and scheme the palette (hex, same `Palette` type as today), fonts, corners, border, shadows, tracking, header SVG and, for Safari, icons. Classic's entry is today's `PALETTES` and today's values, moved, not changed. `PALETTES` stays exported as Classic's palettes for the notification.
- **`src/theme/copy.ts`** (new, plain data): a `Copy` type with one key per themed label, `COPY[look]`, and `copyFor(look, playful)` (playful off, or Classic → the plain labels). Classic's entries are exactly the strings the app shows today. A hook `useCopy()` returns the current copy.
- **`ThemeProvider`** (`src/theme/theme.tsx`) grows from a scheme to a `{ look, scheme }` pair: it sets the CSS variables for both (colours as now, plus fonts, corners, border and shadows), exposes `look`, `playful`, `copy` and setters, and redraws the widgets when either changes, as it does for the scheme today. `ThemeScope` passes the same variables into portals.
- **Tailwind**: `fontFamily` gets `display` and `sans` from variables, `borderRadius`'s `card` / `button` / `chip` and a new `sheet` from variables, plus card and button shadow utilities. Components keep using semantic classes; `Text` from `@/components/ui` applies the body font, and display text (titles, the hero's big numbers, the edit screen's times and duration, primary buttons, the sheet clock, widget numbers: every place the design uses `--fd`) uses a `Display` text or a `font-display` class.
- **Settings**: `look: ThemeKey` (default `'classic'`) and `playful: boolean` (default `true`) in `Settings` / `parseSettings` (`src/storage/types.ts`). An unknown stored `look` falls back to Classic.
- **Fonts**: each theme's two families as `@expo-google-fonts/*` packages, only the weights used. Android: `app.json` `expo-font` plugin, one family per font with a file per weight (as Nunito now), and the widget plugin's `fonts`. Web: `fonts.web.ts` loads the chosen theme's faces, and the provider waits for them on first render as it does for Nunito; switching theme swaps them in without a blank frame.
- **Header pattern**: an SVG per theme and scheme (the design's `--art` pattern, fading into `bg` over the top 170 px), drawn with `expo-image` behind the top of the dashboard and in the picker's thumbnails. Classic has none.
- **Widgets** (`src/widget/`): `model.ts` and `MollyWidget.android.tsx` take the look and playful setting from the widget cache along with the scheme preference, and draw with that theme's palette, fonts (the widget `FONT` map per theme), corners and copy. No header pattern.
- **Notification**: unchanged (Classic colours, plain copy).

### Copy rules

- Themed: every label the design's `COPY` table covers, where it appears on the dashboard (header, hero, Today card title, tiles, Recent heading), the edit screen (Save, Delete, notes placeholder), Settings (screen title) and the widgets, plus toasts that name a tracker (`Sleep started 09:14` → `Game paused 09:14` style, using the theme's tracker nouns).
- Plain in every theme: History, Help, onboarding, error and permission messages, and every `accessibilityLabel`.
- An app label the design has no playful version of (the next-nap line, `Why ›`, `Skip nap`, Tonight's totals) stays as it is today.

## Steps

Each step lands on its own with `pnpm check` green and Classic unchanged.

- [x] **1. Theme engine, Classic only.** First check, on the emulator and on web, that NativeWind variables work for `fontFamily`, `borderRadius` and `boxShadow` (spread and offset, as Arcade's `--sh` needs); if one doesn't resolve on Android, `components/ui.tsx` reads that value from the theme context as a style instead, and record which in `NOTES.md`. Then `themes.ts` with Classic, the provider, Tailwind, `look` / `playful` in `Settings`, the font loading path (Nunito only so far), the header-pattern slot (empty for Classic), and display text moved to `font-display`. Existing Playwright specs and screenshots unchanged.
- [x] **2. Copy.** `copy.ts` with the full key set and Classic's entries, `useCopy()`, and every themed label on the dashboard, edit screen, Settings title and toasts read from it (the widgets' labels moved to step 4, which passes the widget its look and copy together). Unit tests: `copyFor` and that every theme's entry has every key (the type enforces the shape; a test catches empty strings).
- [x] **3. Theme picker.** The design's Theme card in Settings: cards grouped "For grown-ups" / "For little ones", each drawn in its own theme (thumbnail with the pattern, `Aa` in the display font, the four tracker swatches, name in the display font, tagline), then the existing Colours choice, then Playful labels On / Off with the design's hint. Applies at once and persists, like the Colours choice today. With only Classic built, the picker lists Classic alone; each theme step adds its card.
- [x] **4. Widgets follow the look.** The widget reads `look` and `playful` from `Settings`, as it reads the Colours choice (not from the widget cache: see `NOTES.md`); the widget draws with the theme's palette, fonts, corners and copy (titles, `Sleeping since` / `Feeding since`, `Start sleep`, the diaper buttons, the Molly header; its `accessibilityLabel`s stay plain). Still Classic only, so this proves the path; each theme step then adds its fonts to the widget plugin.
- [x] **5. Arcade** (`arcade`): Pixelify Sans + Space Mono, square corners, hard offset shadows, checker header.
- [x] **6. Mission Control** (`space`): Chakra Petch + IBM Plex Sans, starfield header, cool blues.
- [x] **7. Match Day** (`score`): Bebas Neue + Barlow, pitch-stripe header, team colours.
- [x] **8. Terminal** (`term`): VT323 + JetBrains Mono, square edges, scanlines, green-screen night.
- [x] **9. Safari** (`safari`): Sniglet + Quicksand, leopard-spot day and firefly night headers, and picture buttons: the icons from the design's `ICONS` on the sleep and feed tile buttons, the diaper buttons (icon over a small label), Recent rows (icon in place of the dot) and the widgets' buttons. Icons as SVG (expo-image in the app, `SvgWidget` in the widget), tinted with the button's text colour. Safari is the only theme with icons; build the icon slot generally so another theme could use it.
- [ ] **10. Look review.** Every theme in day and night on the emulator and on web, at the largest font size, per `TEST_STRATEGY.md`.

Steps 5–9 are each: tokens (hex, contrast-tested), copy entry, fonts (app and widget), header SVG, picker card, look review of that theme.

## Shape

```
apps/molly/src/theme/themes.ts        per theme and scheme: palette, fonts, corners, border, shadows, tracking, header, icons (new)
apps/molly/src/theme/copy.ts          Copy, COPY, copyFor (new, unit-tested)
apps/molly/src/theme/tokens.ts        Palette type, cssVariables; PALETTES = Classic
apps/molly/src/theme/theme.tsx        { look, scheme, playful, copy }, variables, widget redraw
apps/molly/src/theme/fonts*.ts        per-theme faces (web loads the chosen theme's)
apps/molly/src/theme/art/             header SVGs, Safari icon SVGs (new)
apps/molly/src/theme/contrast.test.ts every theme and scheme
apps/molly/tailwind.config.js         display / sans fonts, radii and shadows from variables
apps/molly/src/storage/types.ts       Settings.look, Settings.playful
apps/molly/src/components/ui.tsx      Text / Display fonts, card and button borders and shadows
apps/molly/src/app/(main)/settings.tsx theme picker, Playful labels
apps/molly/src/features/dashboard/    labels from useCopy(), header pattern, Safari icons
apps/molly/src/widget/                look and playful in the cache; theme palette, fonts, copy, icons
apps/molly/app.json                   fonts for expo-font and the widget plugin
```

## Out of scope

- Playful copy in History, Help, onboarding, errors and screen-reader labels.
- Theming the lock-screen notification.
- A header pattern on widgets.
- Sharing the theme between parents (it's per device).
- New themes beyond the five, and user-made themes.
