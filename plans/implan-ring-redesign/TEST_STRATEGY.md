# Ring redesign: Definition of Done

Done when every item below is true on the `redesign-ring` branch. The method follows the root `CLAUDE.md`: unit TDD for `packages/core` (Given / When / Then, zero → one → many, then boundaries), Playwright on the web image with the clock fixed by `page.clock` for screens and flows, and manual review for looks (web and emulator `emulator-5554`; device checks follow on a physical phone).

The board phones (`1a`–`1l`, see `MAIN.md`) are the reference. Times follow the design's story (Thursday 24 September, woke 07:13, Day starts 07:00, Day ends 19:00); the seeded history sets the exact times. What's checked is the rules.

## Nothing regresses

- [x] `pnpm check` is green (boundaries, typecheck, lint, all Vitest, web-bundle check). The web bundle has no widget code and still builds with `react-native-svg`.
- [x] Every Playwright spec passes. Specs for removed screens (History, Days, edit screen, avatar stack) are rewritten for their replacements, not just deleted: each behaviour they covered is still covered somewhere.
- [x] Optimistic writes and their undo, tap pending states, the `Can't reach` banner, `Updating…` on return, skeletons, the key-rejected screen and the permission (403) toast all still work on the new screens.
- [ ] Widgets and lock-screen notifications behave and look as on `main` (spot check on the emulator: start/stop from the widget and from the notification).
- [x] `main` is untouched. All commits are on `redesign-ring`.

## Ring logic (`packages/core/src/ring.ts`, unit TDD)

- [x] A time's angle is its fraction of the window over 16°–344°. Times before or after the window are clamped to its ends.
- [x] An arc shorter than 0.5° is drawn at 0.5°. An arc over 180° uses the large-arc flag.
- [x] Hour ticks fall on whole clock hours strictly inside the window, for windows of any length (11 h 47 m, 12 h, 13 h).
- [x] Marks keep time order and sit at their own times (straight line in to the track); overlapping ones stack, latest on top, and a second tap on the stack selects the one underneath. `Day started` / `Bedtime` sits above the cap, where no mark reaches.
- [x] Sleep labels: each sleep's start and end clock times inside the track (a running sleep only its start, times outside the window left out), a short nap's as one `12:00–12:30`, crowded labels moved on or dropped.
- [x] Plan-ghost labels: one per likely sleep, before it outside the track: `in 1h 16m` / `now` for a nap, the clock time for bedtime.
- [x] Centre text for awake (`Awake` / since the last wake), sleeping and feeding (live timer, `since`), a past day (`Slept`, `n naps · n feeds`) and a past night (`n feeds · n diapers`), with singular / plural.
- [x] Window-row text: `Nap 2 likely`, the range, `in …` / `… left` / `… ago`, and the `Then …` line listing later sleeps and bedtime.
- [x] Editor subtitle: `<length> · ended <x> ago` within 12 h, the window's title when older.

## Dashboard (Playwright, fixed clock)

- [x] `1a`: the header reads the child's name and `Today · Thu 24 Sep`. The ring has the seeded sleeps and marks, the `Day started 07:13` label, the next nap's ghost with times, the now hand and `Awake`. The window row and four tiles show under it.
- [x] `1d`: during a running night sleep the moon cap shows, `Bedtime 19:05`, `Sleeping` with a ticking timer, no ghosts and no window row. The Sleep tile reads `Stop sleep`.
- [x] Sleep and Feed tiles start their timers. `Stop sleep` saves the sleep and the arc appears. Sleep and feed can run at the same time.
- [x] `1c`: a running feed is a live mark. Tapping it or `Stop feed` shows `Stop and save as`. `Left` saves a left feed, and `Cancel feed` drops the timer.
- [x] Diaper and Medicine tiles open their pickers. `Wet` and `Vitamin D` log at once and toast.
- [x] `Skip` on the window row hides that nap from the ring and the row, and Undo brings it back (same `molly-skip` / `molly-skip-undone` notes as before).
- [x] `1f`: tapping the sun shows last night (moon, `Slept` totals, `Back to now`). Tapping again returns. From Tonight, the moon shows today's day.
- [x] A past window snaps back to now after 60 s and on returning from the background.
- [x] With two or more shown children, tapping the name opens the Children sheet and switches child. With one child, the name isn't a button.

## Editor (Playwright)

- [x] `1b`: tapping a nap fades the rest and opens the editor (`Nap`, length, `ended … ago`, Start/End). +5 on End then `Done` saves the new end to Baby Buddy, and X discards it.
- [x] End can't move past now, and a sleep can't shrink below 1 minute.
- [x] Feed and diaper kinds can be changed. `Delete` removes the entry.
- [x] Tapping the running sleep arc shows Start only, and moving it changes the running timer's start.
- [x] Entries in a past window (opened from the cap or Recent days) can be edited the same way.

## Today sheet and Recent days (Playwright)

- [x] `1e`: the history button opens `Today` (or `Tonight`) with slept, naps, feeds and diapers matching the window, and the last six entries newest first. Tapping one opens it in the editor on its window.
- [x] `1k`: `Recent days` shows Today, Yesterday and the day before, each with day and night mini rings and totals. `Load 3 more days` adds three, and it disappears when nothing older is logged.
- [x] `1g`: tapping a mini ring opens that window on the dashboard with `Back to now`.

## Add entry (Playwright)

- [x] `1j`: a sleep with no end starts a sleep timer backdated to the chosen start. The explanation line says so.
- [x] A sleep or feed with an end saves as finished, and a feed with an end asks for its side.
- [x] A start or end in the future, or an end before the start, shows the error in `danger` and Save does nothing.
- [x] Medicine `Other` needs a name. `Vitamin D` takes an optional note.
- [x] A typed time later than now means that clock time yesterday.

## Settings, Theme sheet, child screen (Playwright)

- [x] `1h`: changing Colours or a toggle turns the bar into `Save changes`. Saving applies it and toasts `Settings saved`. Leaving unsaved toasts `Changes not saved` and keeps the old values.
- [x] `1l`: the Theme row opens the sheet with six themes. Tapping one applies it at once, toasts `Theme changed to …`, and needs no Save.
- [x] `1i`: the child screen saves Show in Molly, colour (five swatches), Day starts / Day ends (±15), bottle type and amount, and the Vitamin D reminder. The new Day starts / Day ends move the ring's day boundary.
- [x] Stored child colours from `main` map to the nearest of the five new hues (unit test in core).
- [x] The Notifications toggle still shows the live-updates line and `Open settings` when Android won't promote.

## Accessibility

- [x] Every arc, mark, tile, cap and stepper has a spoken label (e.g. "Nap 09:32 to 10:41, 1 hour 9 minutes", "Switch to last night"). Playful labels are shown but screen readers read the plain ones.
- [x] Every tap target is at least 48 px (marks 44 px with slop to 48).
- [x] `accessibility.spec.ts` passes on the new screens.

## Look (manual, web and emulator)

- [ ] Classic day and night match the board side by side: `1a`–`1l` for spacing, sizes, weights, radii, colours and icons.
- [x] Each of the six themes in day and night on the dashboard, a sheet, Settings and Recent days: colours, fonts, corners, header pattern, playful labels and Safari pictures look right, and the ring stays legible.
- [x] At the largest font, the header, window row, tiles and editor don't clip or overlap, and the ring still fits on a small phone screen.
- [ ] The live timer and the now hand move smoothly, and scrolling Recent days with a few loads is smooth.

## Wrap up

- [x] Dead code is gone (Hero, TodayCard, TodayPager, PastWindowCard, Recent, StartPopup, AvatarStack, OtherChildStrip, History, Days and edit routes, unused copy keys). Root `CLAUDE.md` "Where things stand" points at this plan, and the branch was ready to try.
