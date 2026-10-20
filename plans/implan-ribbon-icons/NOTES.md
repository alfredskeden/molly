# Notes

## Design facts (read 2026-10-15 from `Molly Ribbon Board.dc.html`, `Ribbon Icon.dc.html`, `Molly Ribbon App.dc.html`)

- What changed since `implan-ribbon-theme`: the pictures, the picker options and the bow (`Ribbon Bow.dc.html` is now an SVG satin bow, 100 × 98; missed at first, added as step 4). Placed as before: ring cap 84 px at (158, 2) of the 400 px ring with the 32 px cap at (184, 10), sheets 34, pickers 24 in the tracker's mid / ink, Settings title 34 tilted −8°, Theme row 22. The teddy's ear bow is unchanged. Palette, ring, bow, teddy, header, toast and sheets are as built (Ribbon palette in `themes.ts` checked against the design's tokens: identical).
- Feed: a mother nursing, 48 × 48 paths, stroke `ink` 2.3 round. Fills: skin `oklch(0.87 0.05 55)` `#efccb6`, hair `oklch(0.63 0.09 40)` `#b8765f`, blanket `light`, baby's cheek `accent` (r 1.4).
- Diaper: waistband (`tint`), body (`light`), two leg cuffs (`tint`), two side tabs (`tint`); `tint` = `color-mix(in oklch, ink 28%, light)`. Wet adds a drop (`water` `oklch(0.74 0.11 235)` `#5eb6e6`, white highlight at 80 %); dirty a smiling poop (`oklch(0.60 0.08 55)` `#a67351`, two `ink` eyes); both a smaller drop at the left and a smaller poop at the right.
- Bottle: the little bow is `max(8, round(size × 0.3))` px at (.35 em, .60 em) (was 0.36 at .32 / .62).
- Picker option (feed stop and diaper): a 40 px circle in the tracker's `bg`, `margin-left: -12px`, the picture at 30 px in its `ink` on its `bg`, 8 px gap to the label. Feed: Left / Right / Both `feed`, Bottle `bottle`. Diaper: Wet / Dirty / Both their states.
- Tiles, marks, Today boxes, Recent rows and Add entry use the plain `feed` / `diaper` kinds (Recent's "Wet" row is the plain diaper). The board text says the teddy closes its eyes at night; the 2026-10-12 decision (only while a sleep runs) stands.

## Defaults chosen during planning

- The Medicine picker's Vitamin D gets the `med` picture in the same circle, so Ribbon's pickers look alike (the design shows no Medicine picker).
- Feed ring marks and Recent feed rows keep the side arrows (as `implan-ribbon-theme` decided: they carry the side).

## Open

- None.

## Found while building

- The design's paths are drawn as-is in a nested `scale(100 / 48)` group inside `RibbonIcon`'s 100 × 100 box (`Lines`), so the stroke width 2.3 is in the design's own units. `tint` uses `over(ink, light, 0.28)` (sRGB mix; the design mixes in oklch, the difference doesn't show at these sizes).
- Playwright finds the pictures by their fixed fills (`#5eb6e6` water, `#a67351` poop, `#efccb6` skin) inside each option: `e2e/tests/ribbon-icons.spec.ts`. The Feed picker's Both is named `Both breasts`.
- Classic and Arcade before / after (dashboard, Diaper and Feed pickers, Add entry, day and night): byte-identical except one anti-aliased pixel on Arcade's day ring, outside any changed code path (no ornaments there).
- Look review on `emulator-5554` (release build, Ribbon, day and night, font scale 1.0 and 2.0): Feed and Diaper pickers match the design's screens and no label clips. At 2.0 the three-column Diaper picker is tight: the circle's 12 px pull reaches the button's left edge on Dirty (not clipped, left as the design draws it). The picker buttons carry their plain labels (`Wet`, `Both breasts`…); the picture's views have no description and can't take focus, so TalkBack reads only the label.
