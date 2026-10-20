# Ribbon icons

Context: the Ribbon theme built in [`../implan-ribbon-theme/MAIN.md`](../implan-ribbon-theme/MAIN.md) (its `NOTES.md` "Design update (2026-10-12)" describes today's `RibbonIcon` / `TrackerIcon`) and the root `CLAUDE.md`. Decisions and defaults are in [`NOTES.md`](NOTES.md). The Definition of Done is in [`TEST_STRATEGY.md`](TEST_STRATEGY.md).

**Outcome:** Ribbon draws the design's updated tracker pictures: feeds are a mother nursing (not a milk drop), the diaper is a new outlined diaper, and the diaper picker shows a wet, a dirty and a both diaper. In the Feed and Diaper pickers, Ribbon's options carry their picture in a small light circle (Left / Right / Both the nursing mother, Bottle the bottle, Wet / Dirty / Both their diapers). The bottle's bow is a little smaller, and every bow (ring cap, sheets, pickers, Settings, the bottle's) is the design's new satin bow. Every other theme looks exactly as it does today.

## The design source

`Molly Ribbon Board.dc.html` (the private design source, not in this repo). Its new "Icons" section shows the eight pictures (sleep, breastfeed, bottle, diaper, wet, dirty, both, medicine) day and night, at 60, 28 and 22 px. The spec is in:

- `Ribbon Icon.dc.html`: `art()` holds the new feed and diaper pictures as SVG paths in a 48 × 48 viewBox (stroke `ink` 2.3, round joins), `drop()` and `poop()` for the diaper states. Bottle, sleep and medicine stay the CSS boxes the app already draws, except the bottle's bow (30 % of the icon, at .35 / .60 em).
- `Molly Ribbon App.dc.html`: the picker options (`pk.opts`: a 40 px circle in the tracker's `bg`, `margin-left: -12px`, the picture at 30 px in the tracker's `ink`), and where each kind is used (tiles, marks, Today, Recent, Add entry: the plain `feed` / `diaper` kinds).

The board's `ideaRows` (Cradle, Cheek to cheek, Heart + milk, Laid open, Fastened, Wetness line) are the rejected alternatives the design file still holds; they aren't shown and aren't built.

## How it fits together

- **`RibbonKind`** gains `diaper-wet`, `diaper-dirty`, `diaper-both`. `RibbonIcon` draws `feed`, `diaper` and the three states from the design's paths in a nested 48 × 48 `Svg` group (scaled into the 100 × 100 box the other pictures use), with the stroke in `ink`. Fixed picture colours (skin, hair, water, the brown) are hex constants beside it, the same in day and night as in the design; `tint` (the diaper's cuffs) is `ink` at 28 % over `light`.
- **Picker** (`features/dashboard/Picker.tsx`): `PickerOption` gains `ribbon?: RibbonKind`. With ornaments set and a `ribbon` kind, the option draws the picture in a 40 px `bg`-tone circle (30 px picture, `ink` on `bg`) pulled 12 px left, as the design. Without ornaments, or without a kind, the option is drawn as today. The dashboard (`src/app/(main)/index.tsx`) sets the kinds: feed Left / Right / Both `feed`, Bottle `bottle`, diaper Wet / Dirty / Both their states, Vitamin D `med`.
- **Everywhere else** (tiles, ring marks, Today, Recent, Add entry, editor headers) already ask `TrackerIcon` for `feed` / `diaper` and pick up the new pictures with no change; the design keeps the plain diaper there, not the states.

## Steps

Each step lands with `pnpm check` green.

- [x] **1. The new pictures.** `feed` (nursing mother), `diaper` (outlined), `diaper-wet` / `-dirty` / `-both` in `RibbonIcon`, the bottle's bow at 30 % and (.35, .60). Checked on web against the board's Icons section, day and night, at 60 / 28 / 22 px.
- [x] **2. Pictures in the pickers.** `ribbon` on `PickerOption`, the circle in `Picker`, the kinds set by the dashboard. Playwright: the Ribbon Diaper picker shows three pictures and still logs on tap; Classic's picker unchanged.
- [x] **4. The satin bow.** `Bow` / `BowParts` draw the design's new `Ribbon Bow` (SVG in a 100 × 98 box, outlined and shaded in `shade`, white sheen, long tails); height is 0.98 × the width; the ring's cap sits 24 px down an 84 px bow (`bowKnot`), as the design. Checked on web and the emulator, day and night.
- [x] **3. Look review.** Web and emulator, day and night, largest font size, per `TEST_STRATEGY.md`.

## Shape

```
apps/molly/src/theme/RibbonIcon.tsx           feed, diaper and the three diaper states; bottle bow
apps/molly/src/theme/Bow.tsx                  the satin bow
apps/molly/src/features/dashboard/Picker.tsx  ribbon kind per option, picture in a circle
apps/molly/src/app/(main)/index.tsx           kinds for the feed, diaper and medicine options
```

## Assumptions

- No layout changes beyond the picker option's circle; the design's times and entries are illustrative.
- The design's fixed picture colours (skin, hair, water, brown) are meant for both schemes (the design uses the same values in both).
