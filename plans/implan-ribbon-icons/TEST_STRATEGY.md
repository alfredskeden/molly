# Definition of Done

Pictures and picker looks are visual: reviewed by hand (root `CLAUDE.md`, "Testing method"). Picker behaviour is Playwright against the web image.

## Nothing regresses

- [x] `pnpm check` green after every step.
- [x] The full Playwright suite passes.
- [x] Classic and one other theme: Feed and Diaper pickers, tiles and Today sheet look as before (web screenshots before / after, byte-identical).

## Pictures (web, day and night, against the board's Icons section)

- [x] Breastfeed, diaper, wet, dirty, both at 60, 28 and 22 px match the design; sleep, bottle (smaller bow) and medicine unchanged otherwise.
- [x] Tiles, ring marks, Today boxes, Recent rows and Add entry show the new feed and diaper pictures.

## Pickers (Playwright, web image)

- [x] Ribbon's Diaper picker shows Wet / Dirty / Both with their pictures in a circle; tapping Wet logs a wet diaper.
- [x] Ribbon's Stop-feed picker shows the nursing picture on Left / Right / Both and the bottle on Bottle.

## Look review (emulator `emulator-5554`, day and night, largest font size)

- [x] Feed and Diaper pickers as the design's "Stop feed" and "Diaper picker" screens; labels don't clip at the largest font.
- [x] The pictures stay readable at 22 px on the ring marks.
- [x] TalkBack: pictures aren't announced; options read their plain labels.

## Plan housekeeping

- [x] Every step in `MAIN.md` ticked, `NOTES.md` "Found while building" filled, the root `CLAUDE.md` "Where things stand" has an `implan-ribbon-icons` line.
