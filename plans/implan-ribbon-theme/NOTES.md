# Notes

## Decisions

- **Ornaments are a generic slot on `Look`** (`ornaments`, null for every other theme), the way Safari's `icons` is: Ring, Sheet, Picker, Settings and Toast read the slot, never `look === 'ribbon'`.
- **`accent` / `on-accent` and `track` become tokens in every palette.** Every existing theme sets accent = `ink`, on-accent = `bg`, track = `line`, so nothing they show changes; Ribbon sets its own. Primary buttons move from `bg-ink` to `bg-accent`.
- **Widgets get palette, fonts and copy only**, like the other themes: no header pattern, no bow, no teddy. The design shows no widgets.
- **Playful labels**: the design only shows `Sweet dreams` (the sleeping hero). The implementer drafts the full `Copy` entry in the same soft tone; the wording gets a review (a box in `TEST_STRATEGY.md`).

## Defaults chosen during planning (overturn if a step shows they don't work)

- Key `ribbon`, name **Ribbon**, tagline "Satin bows, a little teddy and dusty rose." (the design's), group `little-ones`, second in `THEME_KEYS` (after Classic, as the design's Theme sheet lists it).
- The Theme sheet shows a "New" badge on Ribbon (`isNew` on the theme). Drop it in a later change when it stops being new.
- Fonts: DM Serif Display 400 (display) and Mulish 500–900 (body), `@expo-google-fonts/dm-serif-display` and `@expo-google-fonts/mulish`. Widgets: display `DMSerifDisplay_400Regular`, body Mulish 700 / 800 / 900 files.
- ~~The teddy closes its eyes when the scheme is night **or** any sleep is running.~~ **Changed (decided after planning):** the teddy closes its eyes only while a sleep runs; Night colours alone don't.
- The palette keys the design doesn't give (`*-mark`, `on-mid`, `grow-*`, `warm-*`, `hot-*`, `cool-bg`, `topic-*`) are derived from Ribbon's hues the way the other themes derived theirs (see `../implan-themes/NOTES.md`), and must pass `contrast.test.ts`.

## Design facts (read from `Molly Ribbon App.dc.html`)

- Ring: track colour `--track`, not `line`; hour ticks stay `line`. Stitch: a dashed `--stitch` line on the track's centre, 1.5 px, dash 5 5, opacity 0.9, from start + 2° to end − 2°.
- Bow at the ring top: 84 px wide (height 0.66 × width), its knot behind the cap (cap 32 px, `surface`, icon in the cap's tone).
- Teddy: 62 px, bottom-left corner of the 400 px ring box (4 px in), tilted 6°, fades to 0.4 while the inline editor is open (as the rest of the ring dims).
- Sheets: a 34 px bow in place of the grab bar. Pickers (feed stop, diaper): a 24 px bow before the title, coloured the tracker's `mid` with its `ink` as shade. Settings title: a 34 px bow tilted −8°. Settings Theme row: a 22 px bow before "Ribbon".
- Toast: a filled `favorite` heart in `--bow` before the text; the Edit action in `--bow`.
- Header: day `repeating-linear-gradient(90deg, oklch(0.90 0.04 5 / .7) 0 10px, transparent 10px 22px)`; night the same stripes in `oklch(0.24 0.04 350)` with two gold fleck layers (`oklch(0.86 0.08 85)`, 43 × 37 at 30 % 40 %, and 29 × 31 at 70 % 70 % at half opacity).
- Bow and teddy are CSS shapes in the design (`Ribbon Bow.dc.html`, `Teddy Bear.dc.html`); they need redrawing as SVG.

## Open

- Wording review of the drafted playful labels (after the copy step).

## Found while building

### Step 1: accent, track and toggle tokens

- **A fourth token, `toggle`** (a switch that's on): the switches were `diaper-ink`, not `ink`, so moving them to `accent` would have turned every earlier theme's green switches dark. `toggle` = `diaper-ink` in the six earlier themes, Ribbon sets its accent. All four (`ActionTone` in `tokens.ts`) come from `inkActions(palette)` for the earlier themes; the palettes without them are `BasePalette`.
- Moved to `accent` / `on-accent`: `Button` and `InkButton` in the neutral tone (Done, Save, Connect, Back to now…), the header's `+` (`IconButton ink`), Retry (Can't reach), the measurement `+` and Save, the notification line's button, the Development card's button, the Theme sheet's chosen edge and radio, the onboarding child checkbox, the Development month strip's current month. Staying `ink`: the toast, the ring's hand, the temperature and growth ticks (not actions). The Recent days mini rings use `track` too.
- `themes.test.ts` holds the earlier themes to ink / bg / line / diaper-ink; `contrast.test.ts` checks `on-accent` on `accent` (text) and `accent` on bg and surface, `toggle` on surface (graphics).
- Web screenshots of the six themes × day / night × dashboard, Add entry sheet, Diaper picker, Settings and Theme sheet (60, a static export served on :8081, Playwright with a fixed clock): byte-identical before and after.
- **Seen, not changed (exists before this plan):** on web, sheets draw without their `bg-surface` and corners (the Theme and Add entry sheets show the screen through them): the sheet's `Animated.View` from Reanimated drops its `className` on web (computed background transparent, class list only `css-…`). Android is unaffected as far as known. Reported as a separate issue. Fixed in [`implan-web-sheets`](../implan-web-sheets/MAIN.md).

### Step 2: Ribbon look

- Fonts: `@expo-google-fonts/dm-serif-display` 0.4.2 (400, its only weight) and `@expo-google-fonts/mulish` 0.4.2 (500–900), via `npx expo install`. Android: `expo-font` families `DMSerifDisplay` and `Mulish`; widget files `DMSerifDisplay_400Regular`, `Mulish_700Bold` / `_800ExtraBold` / `_900Black` (each at its own weight). Web: `fonts.web.ts`.
- **Buttons in the body face.** The design's buttons (Done, Start sleep, the header `+`'s neighbours, picker options) are Mulish 900, not DM Serif. `Look.fonts.button` (optional) is the face behind `font-display-button` (`--fdb`), the display face when unset, so the six earlier themes are unchanged. Ribbon: `button: 'Mulish'`, `buttonWeight: '900'`.
- **Seen, left as the engine draws it:** the design sets section labels (`CHILDREN`, `FOR EVERYONE`), the ring's `Day started` line and other small labels in Mulish capitals; the app draws them with `font-display` in every theme, so in Ribbon they're DM Serif. For the look review.
- Colours: the design's `ribbon-day` / `ribbon-night` converted with the same oklch → sRGB conversion (it reproduces Classic's hex exactly). Derived as Arcade's: `mark` (Day: the mid darkened to 3 : 1 on bg; Night: the mid), `on-mid` (ink / bg), `grow` / `hot` / `cool` at the sleep tones' lightness and chroma (hues 230, 25, 250; `hot` 0.03 more chroma), topics at `sleep-mark`'s lightness and chroma. Action tones from the design: `accent`, `on-accent`, `track`; `toggle` = accent. One fix: **Day `feed-ink`** oklch(0.46 → 0.45 0.10 25), `#873f3b` → `#843c38`: the design's was 4.40 : 1 at 85 % on `feed-bg` (4.56 now). Everything else passes as designed.
- Corners (from the design's 20–24 px cards, pill buttons and segments): card 22, button 24, chip 20, sheet 28; widget shell 26, tile 20, button 22. Border 1 px `line`; Day card shadow `0 1px 2px` oklch(0.4 0.06 355 / .08), Night none; no button shadow; no display letter-spacing (`tracking: 0`).
- Header: `pinstripes()` in `art.ts`, 10 px stripes every 22 px (Day `#f7d4da` at 70 % mixed into bg, Night `#2d1722`), Night with two gold (`#e9ce94`) fleck layers on top (43 × 37 at 30 % 40 %, r 1.35 at 80 %; 29 × 31 at 70 % 70 %, r 1.1 at 50 %). A fleck is a circle at `fill-opacity` (over stripes and bg alike), its radius the middle of the design's solid and transparent stops.
- Copy: the design names only `Sweet dreams` but shows the rest of its screens in plain words (Awake, Feeding, Stop and save as, Cancel feed, Sleep / Feed / Diaper / Medicine, Start sleep, Settings) and `Wake up` on the running Sleep tile, so those are kept; drafted: `Still awake` (cancel sleep), `Tummy full` (stop feed), `Cuddle feed` (start feed), the likely panel (`Most days`, `Later today`, `Nudge me at {t}` / `Nudge set for {t}`, `Skip this one`, `How we guess ›`), `Growing bigger`, `Head size`, `Little steps`, `Every age`.
- Theme sheet: Ribbon second, `isNew` → a `New` badge (feed tones, 11 px capitals) and `Ribbon, new.` for screen readers. `e2e/tests/settings.spec.ts`: seven themes; Ribbon second with its badge, applies at once, survives a reload, DM Serif tiles, Mulish body, rose `+` (`rgb(168, 63, 94)`).
- Emulator (`emulator-5554`, release build): Ribbon picked in the Theme sheet (badge, DM Serif names, rose radio), dashboard Night with the plum stripes and gold flecks fading into bg, `Sweet dreams` / `Wake up`; the Molly widget Day and Night in Ribbon's palette, Mulish, pill corners, `Sweet dreams since 10:53`. Only the Molly widget is on the emulator's home screen: the Sleep, Feeding and Diaper widgets (DM Serif numbers) are left for the look review. Classic's dashboard on the emulator looked as before.

### Step 3: ornaments in the ring

- `src/theme/ornaments.ts` (no React): the `Ornaments` type, `teddySleepy(sleeps)`, and `roundedBox` / `percentCorners`, which turn a CSS box with `border-radius` (elliptical, per corner, scaled down together when two overlap, as CSS does) into an SVG path. `Bow.tsx` and `Teddy.tsx` draw the design's CSS shapes with it (react-native-svg), `aria-hidden`, no touches. `useOrnaments()` (in `Bow.tsx`) reads the slot.
- Colours (oklch → hex, the cheek's alpha mixed into the fur it sits on): Day bow `#e58da1` / `#c86b82`, fur `#dec0b1`, muzzle `#f9ece1`, ink `#45202f`, cheek `#ebaeb5`, stitch `#fffcfd`; Night bow `#df879b` / `#ba5f76`, fur `#a18677`, muzzle `#d3c0b1`, ink `#201019`, cheek `#c3888d`, stitch `#764d5c`.
- Bow: the loops' `inset ±5px -3px 0 shade` is the loop in `shade` with the loop moved by that offset in `color` on top, clipped to the loop (a `ClipPath` per instance, id from `useId`). The offset stays in px at every size, as the design's CSS does. `bowKnot(size)` gives the knot's middle, where the ring puts its cap.
- The teddy wears the design's ear bow (the app passes `bow` to `Teddy Bear`). Its SVG reaches 4 % left / 8 % up past the face for that bow, so nothing clips.
- Ring: the stitch over the sleeps (as the design orders it), 1.5 px, `5 5`, 90 %, from start + 2° to end − 2°; the 84 px bow centred on the cap; with ornaments the cap is the design's 32 px `surface` circle with its shadow and a 19 px glyph in the cap's tone (52 px tap target unchanged); the 62 px teddy 4 px in from the bottom-left of the 400 px box, turned 6°, under the marks, at 40 % while anything is selected (the editor or the likely panel). Web, Day and Night, awake / sleeping / editor open: as the design.

### Step 4: ornaments elsewhere

- Sheet (`components/sheet.tsx`): a 34 px bow in place of the 5 px grab bar, inside the same drag area (`-my-2 py-2`, the whole header still drags). Picker: a 24 px bow before the title in the tracker's `mid` with its `ink` as shade. Settings: a 34 px bow turned −8° beside the title (10 px gap), a 22 px bow before the Theme row's value (`LinkRow valueLeading`).
- **Toast colour:** the design's heart and Edit are `--bow` on the toast's `ink`, which is light at Night: 2.16 : 1. `Ornaments.toast` is the bow by Day (5.77 : 1 on ink) and oklch(0.52 0.12 5) `#a04760` at Night (4.90 : 1); `ornaments.test.ts` holds it to 4.5 : 1. The heart (Material Symbols `favorite`, filled, from the same `@material-symbols/svg-400` 0.47.6) replaces the success check; error toasts keep their error glyph, a child's toast its avatar. Edit is plain words in that colour, no chip; Adjust time and Undo keep their chips (the design shows a diaper toast with Edit, the app's diaper toast has Adjust time: the app wins).
- No change elsewhere: the same 60 web screenshots as step 1 (six themes × day / night × dashboard, Add entry sheet, Diaper picker, Settings, Theme sheet) are byte-identical except the Theme sheet, which now lists Ribbon (checked: no bow, teddy or stitch in any of them). Full Playwright suite: 184 passed.
- Emulator (release build, Night): the ring's bow with its clipped shading, the stitch and the sleepy teddy draw as on web; the cap still switches to last night through the bow; the Diaper picker's bow in diaper tones; the toast's heart; the Add entry sheet's bow, and a drag down from it closes the sheet.

### Design update: tracker colours and Ribbon's own icons

The design (`Molly Ribbon App.dc.html`, new `Ribbon Icon.dc.html`) changed after step 4:

- **Tracker colours:** sleep lilac at hue 315 (was 310), feed now pink (355, was coral 25), diaper now coral (30 / 35, was green 150), medicine a warmer sand (60–70, was 80–85), both schemes. Converted and derived as before (`mark`, `grow` / `hot` / `cool` from the sleep tones, topics from `sleep-mark`, `warm` = feed). Three Day inks failed 4.5 : 1 at 85 % on their bg as designed and are darkened by the smallest step that passes: `feed-ink` 0.47 → 0.46 (`#8d325c`), `diaper-ink` 0.48 → 0.45 (`#833e2d`), `med-ink` 0.48 → 0.46 (`#784c26`). Night passes as designed. The step-2 fix of the old feed-ink is gone with it.
- **Icons:** `RibbonIcon.tsx` draws the design's five pictures from its CSS boxes (sleepy moon, smiling milk drop, bottle with a bow, diaper with a bow, capsule with a sparkle), with `ink`, `light` (what it sits on: cut-outs, the capsule's lower half) and `accent` (cheeks, teat, sparkles, little bows: the theme's bow; the little bows' shade is the accent 18 % darker). The moon is `crescent()` in `ornaments.ts` (the design's circle shown only by its own `box-shadow`). The bow's shapes are `BowParts` so an icon can hold one.
- **Where:** `TrackerIcon` (`src/theme/TrackerIcon.tsx`) draws a tracker glyph (`bedtime`, `breastfeeding`, `water_full`, `baby_changing_station`, `medication`) as Ribbon's picture when the theme has ornaments, and the glyph otherwise: tiles, ring marks (diaper marks as the diaper whatever kind), the Today sheet's boxes and Recent rows (diaper rows likewise), Add entry's kinds, the editor's and likely panel's header, picker options (Bottle, Vitamin D) and `InkButton` icons (the likely panel's Start sleep; accent in the label colour, as the design's Start sleep). Sizes as the design's where it gives one (tile 30 as the app's glyph, marks 22, Today / Recent 26, Add entry 32, headers 30, picker 26).
- **Kept as the app draws them (app wins):** the feed marks and Recent rows show the side (Left / Right / Both arrows) rather than the design's drop, since they carry the side; the running tile keeps its stop glyph; Add entry's save button keeps its play / check glyph; the Diaper picker's Wet / Dirty / Both keep their glyphs (as the design does); the cap keeps the sun / moon glyph (as the design does).
- Other themes: `TrackerIcon` falls back to the same `Glyph` call as before, so nothing changes for them.

## What's left (step 5)

- The look review in `TEST_STRATEGY.md`: largest font size (web and emulator), TalkBack on the ornaments, the Sleep / Feeding / Diaper widgets (only the Molly widget was checked), the Feed picker, Today and Theme sheets on the emulator, Day on the emulator.
- Wording review of the drafted copy (`copy.ts` `ribbon`).
- Open question: the design's small Mulish capitals (section labels, `Day started`) are DM Serif in the app (step 2 note).

