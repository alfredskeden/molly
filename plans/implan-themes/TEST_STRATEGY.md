# Themes: Definition of Done

Done when every item below is true. The method follows [`../implan-molly/TEST_STRATEGY.md`](../implan-molly/TEST_STRATEGY.md) and the root `CLAUDE.md`. This work is mostly presentation, so there is little TDD:
- **Unit tests (Vitest, Given / When / Then)** for the plain logic: settings parsing, `copyFor`, the widget model's theme inputs, and contrast.
- **Playwright** against the built web image for the picker and labels.
- **The emulator** for Android fonts, shadows and widgets.
- **Manual review** for looks.

`packages/core` and `packages/api` don't change.

## Nothing regresses

- [x] `pnpm check` is green, including `check:boundaries` and `check:web-bundle` (no widget code on web).
- [x] Every existing Playwright spec passes unchanged: with no stored `look`, the app is Classic, with today's labels and looks.
- [x] A settings value stored before this work (no `look`, no `playful`) parses to Classic with Playful on, and keeps its `theme` (Colours) choice.
- [ ] Classic on the emulator looks the same as before step 1 (screenshots before and after, day and night): dashboard, edit, Settings, all four widgets.
- [ ] The lock-screen notification looks and reads as before, whatever theme is chosen.
- [x] The web image's first load fetches only Classic's fonts (Nunito); no request leaves Molly's origin except to Baby Buddy (CSP unchanged).

## Settings (unit TDD, `src/storage/types.ts`)

- [x] `look` defaults to `classic`, `playful` to `true`.
- [x] A stored known `look` and `playful` round-trip through `parseSettings`.
- [x] An unknown or malformed `look` falls back to `classic`; a non-boolean `playful` falls back to `true`.

## Copy (unit TDD, `src/theme/copy.ts`)

- [x] `copyFor('classic', true)` and `copyFor('classic', false)` return today's strings.
- [x] `copyFor(<new theme>, true)` returns that theme's labels from the design's `COPY` table.
- [x] `copyFor(<new theme>, false)` returns Classic's labels.
- [x] Every theme's entry has every key, and none is empty.
- [x] No `accessibilityLabel` on the themed surfaces reads from `useCopy()` (checked by review or by a Playwright pass on role names under a playful theme).

## Colours (unit, `src/theme/contrast.test.ts`)

- [x] The existing contrast checks run for every theme in day and night, not only Classic, and pass: text on its backgrounds, tracker ink on tracker bg, `mark` on `bg`, `on-mid` on `mid`. Every colour changed from the design to pass is listed in `NOTES.md`.

## Theme engine (steps 1–4)

- [x] `NOTES.md` records whether NativeWind variables carry `fontFamily`, `borderRadius` and `boxShadow` on Android, and which path the code uses for each.
- [x] Display text (titles, the hero's big numbers, edit times and duration, primary buttons, sheet clock) uses the display font; everything else uses the body font. Under Classic both are Nunito.
- [ ] Sheets and modals rendered through a portal (`ThemeScope`) show the chosen theme's colours, corners and fonts on web.
- [x] Changing the theme or Playful redraws the widgets within a few seconds (emulator).

## Picker (Playwright, web image)

- [x] Settings shows the Theme card: "For grown-ups" (Classic, Arcade, Mission Control, Match Day, Terminal) and "For little ones" (Safari). Each card is drawn in its own theme and marks the current one as selected (`aria-checked` / radio role).
- [x] Tapping a card applies the theme at once, no Save: the Settings title and the dashboard labels change (for example Arcade → `Options`, `Pause game`).
- [x] The choice survives a reload.
- [x] Playful labels Off keeps the theme's colours and fonts but shows Classic's labels; On brings them back. Survives a reload.
- [ ] Colours (Follow the phone / Day / Night) still work under every theme, and the header's Day / Night switch too.
- [x] A toast that names a tracker uses the theme's words (Arcade: starting sleep toasts with the theme's sleep label).

## Each new theme (steps 5–9, one list per theme)

For Arcade, Mission Control, Match Day, Terminal and Safari:
- [x] Tokens match the design's `<theme>-day` / `<theme>-night` block (hex conversions of the oklch values, except for contrast fixes listed in `NOTES.md`).
- [x] Both fonts are bundled for Android (`expo-font` and the widget plugin) and load on web from Molly's origin; the web build only fetches them when that theme is chosen.
- [x] The header pattern is drawn behind the top of the dashboard and in the picker thumbnail, fading into the background, in day and night.
- [ ] Look review on the emulator and on web, day and night, against the design's Dashboard (idle, feeding, night sleeping), Edit, Settings and Widgets frames: corners, shadows, borders, fonts, labels. Nothing clipped or overlapping at the largest system font size.

Safari also:
- [x] Icons from the design's `ICONS` on the sleep and feed tile buttons, the diaper buttons (icon over label), Recent rows (in place of the dot) and the widget buttons, tinted with the button's text colour, in day and night. No other theme shows icons.

## Widgets (emulator)

- [ ] Under each theme, all four widgets (Molly, Sleep, Feeding, Diaper) use that theme's colours, fonts, corners and labels, and follow Day / Night as they do today. No header pattern.
- [ ] Playful Off → widgets show Classic's labels in the theme's look.
- [x] The widget model's tests cover the theme and playful inputs (which copy and palette a snapshot gets).

## Plan housekeeping

- [ ] `MAIN.md` steps are `[x]`, `NOTES.md` has the findings, and this plan's row in `plans/README.md` is up to date.
