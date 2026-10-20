# Definition of Done

Testing follows the project's method (root `CLAUDE.md`, "Testing method"): pure logic is unit-tested TDD (Given / When / Then, zero → one → many), screens and flows are Playwright against the web image, and looks are reviewed by hand. Every box below must be ticked.

## Nothing regresses

- [x] `pnpm check` green after every step.
- [ ] Existing Playwright specs pass unchanged. (All 184 pass after step 4; one existing spec changed on purpose: `settings.spec.ts` now expects seven themes, not six.)
- [x] Classic, Arcade, Mission Control, Match Day, Terminal and Safari look exactly as before step 1, in day and night (web screenshots of dashboard, a sheet and Settings compared before / after step 1, and spot-checked again after step 4: no bow, teddy or stitch outside Ribbon).

## Tokens (unit, `src/theme/contrast.test.ts` and a themes test)

- [x] Every theme's palette has `accent`, `on-accent`, `track` (and `toggle`, see `NOTES.md`); for the six existing themes they equal `ink`, `bg`, `line` (`diaper-ink`).
- [x] Contrast test covers `on-accent` on `accent` in every theme and scheme, and Ribbon's palettes pass every check the other themes pass.

## Ribbon data (unit TDD)

- [x] `art.ts`: the layered helper draws flecks over stripes (fade into `bg` as the others, no `stop-opacity`); tested like `art.test.ts`'s existing cases.
- [x] `copy.ts`: the `ribbon` entry has every key, none empty, `sleeping` is `Sweet dreams`.
- [x] `ornaments` is null for every theme but Ribbon, set for both Ribbon schemes.
- [x] The teddy's sleepy rule (eyes closed only while a sleep runs, not by Night colours) is a small pure function with a test.

## Picker (Playwright, web image)

- [x] Ribbon is second in the Theme sheet with a "New" badge; choosing it applies at once, survives a reload, and the dashboard shows Ribbon's fonts and rose primary button.

## Widgets (emulator `emulator-5554`)

- [ ] With Ribbon chosen, every widget draws Ribbon's palette, DM Serif Display numbers, Mulish text and Ribbon's words, day and night; no ornaments, no header.

## Look review (manual, web and emulator, day and night, largest font size)

Against `Molly Ribbon Board.dc.html`'s ten screens:

- [ ] Dashboard awake: header stripes, rose `+`, pink track with stitch, bow tied at the top with the cap in its knot (cap still tappable), teddy bottom-left with eyes open.
- [ ] Sleeping: teddy's eyes closed, `Sweet dreams` in the centre; night: plum with gold flecks.
- [ ] Feed and diaper pickers: small bow in the tracker's colours before the title.
- [ ] Editor open: teddy and ring dim together.
- [ ] Toast: heart and Edit in bow colour.
- [ ] Today, Add entry and Theme sheets: bow in place of the grab bar; dragging down from it still closes the sheet.
- [ ] Settings: bow beside the title and on the Theme row; switches in accent.
- [ ] At the largest font size nothing overlaps the bow, the cap or the teddy.
- [ ] TalkBack: ornaments aren't announced; labels stay plain.

## Words

- [ ] The drafted `ribbon` copy has been reviewed and the agreed wording is in `copy.ts`.

## Plan housekeeping

- [ ] Every step in `MAIN.md` ticked, `NOTES.md` "Found while building" holds the versions and workarounds found, and this plan's row in `plans/README.md` is up to date.
