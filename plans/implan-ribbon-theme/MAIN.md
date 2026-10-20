# Ribbon theme

Context: the theme engine built in [`../implan-themes/MAIN.md`](../implan-themes/MAIN.md) (how a theme is data in `themes.ts`, its copy in `copy.ts`, fonts, header art, widgets) and the root `CLAUDE.md`. Decisions and defaults are in [`NOTES.md`](NOTES.md). The Definition of Done is in [`TEST_STRATEGY.md`](TEST_STRATEGY.md).

**Outcome:** a seventh theme, **Ribbon**, picked in Settings → Theme like the others: dusty rose by day, deep plum with gold flecks by night, DM Serif Display over Mulish, rose primary buttons, and three ornaments no other theme has: a satin **bow** (tying the ring at the top with the cap in its knot, in place of every sheet's grab bar, small and tone-coloured on the pickers, beside the Settings title), a **teddy** in the ring's empty bottom-left corner that closes its eyes while a sleep runs, and a dashed **stitch** along the ring's track. The widgets follow it with its palette, fonts and words. Every other theme looks exactly as it does today.

## The design source

`Molly Ribbon Board.dc.html` (the private design source). It is an index page: ten screens (dashboard, sleeping, feed picker, diaper picker, editor, toast, Today sheet, Add entry sheet, Settings, Theme sheet), each in day and night. Every phone is `Molly Ribbon App.dc.html` with props `screen` and `mode`; that file holds the spec:

- **Tokens**: the `ribbon-day` / `ribbon-night` CSS blocks at the top (oklch; convert to hex as the other themes did). New beyond today's palette: `--accent` / `--on-accent`, `--track`, `--stitch`, `--bow` / `--bow-shade`, the teddy's `--fur` / `--muzzle` / `--teddy-ink` / `--cheek`, and `--art` (header).
- **Ring**: the `ring()` function in its script (stitch, track colour). Same geometry as today's ring (`packages/core/src/ring.ts`).
- **Ornaments**: `Ribbon Bow.dc.html` and `Teddy Bear.dc.html`, CSS shapes to redraw as SVG.
- **Theme sheet**: its `THEMES` list (Ribbon second, with a "New" badge).

`support.js` is the canvas runtime, not design content. The design's times and entries are illustrative and its layout is today's app (Ring v4): only the look changes. Exact sizes and placements read from it are in `NOTES.md` under "Design facts".

## How it fits together

- **New tokens in every palette** (`src/theme/tokens.ts` `Palette`, `themes.ts`): `accent`, `on-accent`, `track`. Every existing theme sets accent = its `ink`, on-accent = its `bg`, track = its `line`, so nothing changes for them. Tailwind gets `accent` / `on-accent` / `track` colours. Primary buttons (the header `+`, Done, Save, Start sleep, the switches' on state, the Theme sheet's chosen edge and radio) move from `ink` to `accent`; the ring's track from `line` to `track`. Neutral dark surfaces that aren't actions (the toast) stay `ink`.
- **`ornaments` on `Look`** (`themes.ts`, plain data): `{ bow: { color, shade }, teddy: { fur, muzzle, ink, cheek }, stitch }` as hex, or `null`. Only Ribbon sets it. Components check the slot, never the theme key, so another theme could reuse it.
- **`Bow` and `Teddy`** (new, `src/theme/`, react-native-svg): drawn from the design's shapes, sized by width, colours as props. `Teddy` has a `sleepy` prop (closed-eye arcs instead of dots). Both `aria-hidden`.
- **Where the ornaments go** when the slot is set:
  - Ring (`features/ring/Ring.tsx`): the stitch path over the track, the bow behind the cap (the cap stays the tap target), the teddy in the bottom-left corner, sleepy while any sleep runs (not by Night colours) (a small pure function, unit-tested), dimmed with the rest of the ring while the inline editor is open.
  - Sheet (`components/sheet.tsx`): the bow in place of the grab bar; the drag area and its touch height stay as they are.
  - Picker (`features/dashboard/Picker.tsx`): a small bow before the title in the tracker's `mid` / `ink`.
  - Settings: a bow beside the screen title and before the theme's name on the Theme row.
  - Toast (`features/toast/toast.tsx`): a heart in the bow colour before the text, the Edit action in the bow colour.
- **Header art** (`src/theme/art.ts`): day is plain `stripes`; night is stripes with two layers of gold flecks over them, so `art.ts` needs a way to layer `dots` over `stripes` (one new helper or an option, unit-tested like the others).
- **Copy** (`src/theme/copy.ts`): a full `ribbon` entry. The design gives only `sleeping: 'Sweet dreams'`; draft the rest in that soft tone (warm, short, a parent's bedside voice), keeping the same rules as every theme (screen readers, History, errors stay plain). The wording gets a review.
- **Fonts**: DM Serif Display and Mulish as in `implan-themes` (`app.json` `expo-font` and the widget plugin's `fonts`, `fonts.web.ts`), only the weights used.
- **Theme sheet** (`src/theme/ThemeSheet.tsx`): Ribbon's card, with a "New" badge from an optional `isNew` on `Theme`.
- **Widgets and notification**: widgets pick up palette, fonts and copy through the existing path; no ornaments, no header. The lock-screen notification is unchanged.

## Steps

Each step lands on its own with `pnpm check` green.

- [x] **1. Accent and track tokens.** `accent`, `on-accent`, `track` in `Palette` and every existing theme (ink / bg / line), Tailwind colours, primary buttons and the ring's track switched to them. Contrast test: accent vs on-accent in every theme. Every existing theme renders identically (web screenshots unchanged).
- [x] **2. Ribbon look.** `ribbon` in `THEME_KEYS` (second), palettes for day and night (hex, contrast-tested), fonts (app, web, widget), header art with the night flecks, `isNew` and the badge on the Theme sheet, and the drafted `ribbon` copy entry. Ribbon is now pickable and complete except for ornaments. Widgets checked on the emulator.
- [x] **3. Ornaments in the ring.** `ornaments` on `Look` (Ribbon's colours), `Bow` and `Teddy`, and the ring's stitch, bow behind the cap and teddy with its sleepy rule.
- [x] **4. Ornaments elsewhere.** The bow on every sheet, on the pickers, in Settings; the toast's heart.
- [ ] **5. Look review.** Ribbon in day and night on web and the emulator against the design's ten screens, at the largest font size; every other theme spot-checked for no change; the copy wording reviewed. Per `TEST_STRATEGY.md`.

## Shape

```
apps/molly/src/theme/tokens.ts       Palette gains accent, on-accent, track
apps/molly/src/theme/themes.ts       ribbon look; ornaments slot on Look; isNew on Theme
apps/molly/src/theme/art.ts          flecks layered over stripes
apps/molly/src/theme/copy.ts         ribbon entry
apps/molly/src/theme/Bow.tsx         new, react-native-svg
apps/molly/src/theme/Teddy.tsx       new, react-native-svg
apps/molly/src/theme/ThemeSheet.tsx  New badge, accent for the chosen card
apps/molly/src/features/ring/Ring.tsx         stitch, bow behind the cap, teddy
apps/molly/src/components/sheet.tsx           bow as the handle
apps/molly/src/features/dashboard/Picker.tsx  bow before the title
apps/molly/src/features/toast/toast.tsx       heart
apps/molly/app.json, src/theme/fonts.web.ts   DM Serif Display, Mulish
```

## Assumptions

- The theme engine from `implan-themes` works as described there (variables via NativeWind, widgets reading `look` from `Settings`); its `NOTES.md` "Found while building" has the workarounds.
- No layout changes: Ribbon is the Ring v4 app restyled. If the design shows something today's app doesn't have, the app wins and the difference goes in `NOTES.md`.
- Nothing about Ribbon is stored in Baby Buddy; the choice is per device, as for every theme.
