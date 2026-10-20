# Definition of Done

Testing follows the project's method (root `CLAUDE.md`, "Testing method"): pure logic is unit-tested TDD (Given / When / Then, zero → one → many, then boundaries and errors), screens and flows are Playwright against the web image, looks are reviewed by hand on web and the emulator (`emulator-5554`). Checks on a physical phone come after. Every box below must be ticked.

## Nothing regresses

- [x] `pnpm check` green after every step.
- [x] Existing Playwright specs pass (the theme-count expectation in `settings.spec.ts` changes on purpose from seven to eight).
- [x] Classic, Ribbon, Arcade, Mission Control, Match Day, Terminal and Safari look as before (web screenshots of dashboard, a sheet and Settings, before step 2 and after step 5): no bars, mood pill, Wants bubble or moodlets outside Life Sim; Ribbon keeps its stitch after it moves to `Look.stitch`; Ribbon no longer shows "New".
- [x] With any other theme chosen, no rhythm request is ever made.

## Needs rules (core, unit TDD, `packages/core/src/needs.test.ts`)

- [x] A need is 100 right after its entry, 0 at or after its due time, linear between, never outside 0–100; its level is 0 / 1 / 2 / 3 at the > 75 / > 50 / > 25 boundaries.
- [x] The usual gap per kind is the median of that kind's gaps whose start falls in the same window kind; gaps over 12 h are ignored; fewer than 5 gaps gives the fixed fallback (feed 3 h, diaper 3.5 h).
- [x] The sleep need runs from the last wake to `nextSleep`'s start; without a prediction it uses 2.5 h; a running sleep gives the running state, not a value.
- [x] Medicine: no need without the Vitamin D reminder; with it, drains from the last Vitamin D over 24 h.
- [x] Mood is the average of sleep, feed and diaper (medicine never counted, unknown needs left out) mapped to Giggly / Content / Fussy / Wailing at ≥ 70 / ≥ 45 / ≥ 25; a running sleep gives Dreaming.
- [x] Wants is the lowest of sleep, feed, diaper under 60, else none (a toy); ties go sleep, feed, diaper; while asleep it's sleep.
- [x] Moodlets: a positive one per kind logged in the last 30 minutes (medicine included), a negative one per need under 25 (medicine excluded); the sleeping pair while a sleep runs.

## Rhythm cache (app)

- [x] The rhythm is fetched once per child and day / night window: not on polls, not after a write, not on returning to the app; again when the window changes or the child switches to one not cached.
- [x] It survives an app restart (persisted) and is cleared on sign-out with the rest of the cache.
- [x] Only the medians are stored, no entries.

## Theme data (unit)

- [x] `sim` palettes in both schemes have every palette key and pass every check in `contrast.test.ts`, including the need inks on `surface` and the need colours behind the tile icon.
- [x] `needs` is set for both Life Sim schemes and null for every other theme; `stitch` is set for Ribbon and Life Sim only.
- [x] `copy.ts` has a complete `sim` entry with the design's words (`Up and about`, `Refuelling`, `Recharging`, `Wake up`, `Stop and save as`, `Cancel feed`); the word table has every level, mood and moodlet word.
- [x] `art.ts`: the criss-cross header, and the night one with dots, fade into `bg` like the others.

## Picker (Playwright, web image)

- [x] Life Sim is third in the Theme sheet with a "New" badge; choosing it applies at once, survives a reload, and the dashboard shows Fredoka, tile bars and the mood pill.
- [x] With Playful labels off, the bars and the mood pill stay and the level labels, mood word and moodlets row are gone.

## Widgets (emulator `emulator-5554`)

- [x] With Life Sim chosen, every widget draws its palette, Fredoka numbers, Mulish text and its words, day and night; no bars, mood or header. The lock-screen notification uses its words.

## Look review (manual, web and emulator, day and night, largest font size)

Against `Molly Sim Board.dc.html`'s eleven screens:

- [x] Dashboard: criss-cross header, accent `+`, track with stitch, mood pill with the cap inside (cap still opens what it opens today), Wants bubble bottom-left, mood chip in the centre, moodlets row above the window row, four tiles with circles, labels and bars.
- [x] Meltdown (nothing logged for hours): red bars, `Wailing` / `Fussy`, `Way past nap time` in the centre, negative moodlets.
- [x] Sleeping (night): `Wake up` tile solid with `Recharging…`, `Dreaming`, the sleeping moodlets; navy with green dots.
- [ ] Feed and diaper pickers, the editor (pill and bubble dim with the ring), the toast (green face, `Fresh bum!` lead, green Edit).
- [ ] Today, Add entry and Theme sheets; Settings with the face icon on the Theme row.
- [x] Medicine tile without a bar when the Vitamin D reminder is off; with a bar when on.
- [x] At the largest font size: tiles don't clip their label or bar, the moodlets row stays one line, nothing overlaps the pill, cap or bubble.
- [x] TalkBack: bars, pill, bubble and moodlets aren't announced; tiles read their plain text.

## Words

- [ ] The drafted `sim` copy and the word table are reviewed, and the agreed wording is in the code.

## Plan housekeeping

- [ ] Every step in `MAIN.md` ticked, `NOTES.md` holds what was found while building, and this plan's row in `plans/README.md` is up to date.
