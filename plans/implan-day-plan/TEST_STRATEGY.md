# Day plan: Definition of Done

Done when every item below is true. The method follows [`../implan-molly/TEST_STRATEGY.md`](../implan-molly/TEST_STRATEGY.md) and the root `CLAUDE.md`: unit TDD for `packages/core` (Given / When / Then, zero → one → many, then boundaries and errors), integration tests against the real test Baby Buddy for `packages/api`, Playwright on the web image with the clock fixed by `page.clock` for screens, the emulator for widgets, and manual review for looks. The replay adds numbers from real logs.

Times follow the design's story (Saturday 26 September, woke 06:40) with the default nap window 07:00–19:00. Exact window times come from the seeded history. The rules are what's checked, and the design's times are examples.

## Nothing regresses

- [x] `pnpm check` is green, including `check:boundaries` (core and api import no React, Expo or `apps/`) and `check:web-bundle` (no widget code on web).
- [x] Every existing Playwright spec passes, updated only where it asserted the old 3-hour ticks, the nap-window marker or a single ghost block.
- [x] The hero, Recent and the widgets show the same next sleep as before when no nap is skipped.

## Sleep total (`packages/core` unit TDD, then Playwright)

- [x] With no sleep running, the total is what it is today.
- [x] A sleep running since bedtime counts from bedtime to now on Tonight. A running sleep that began before the window counts only from the window's start.
- [x] A nap in progress counts on Today, added to the finished naps.
- [x] On the dashboard the total rises as the clock moves (for example 22:43 with a sleep since 19:30 reads `3h 13m sleep`) and starts again at 0 in the next window.

## Day plan (`packages/core`, unit TDD)

- [x] Empty plan in every case where `nextSleep` is hidden (sleep running, night, no recent sleep, no birth date, age out of range, dropped).
- [x] The first planned sleep equals `nextSleep`'s answer for the same inputs.
- [x] Each later nap is predicted from the one before assumed to start mid-window and last that slot's median length, or 45 min without history.
- [x] The plan stops at the first bedtime, and there is never a sleep after it.
- [x] Logging a nap moves every planned sleep after it.
- [x] `next-sleep.ts` and `day-plan.ts` share the window logic instead of duplicating it, and every existing `nextSleep` test still passes.

## Skips (`packages/core`, unit TDD)

- [x] A skip note's text round-trips (`Skipped nap 15:05–15:45` ↔ its window on the note's local date), and a note that doesn't parse is ignored.
- [x] Skipping the last nap moves bedtime earlier by that nap's usual length (design: 18:50 − 40 min = 18:10), never more than 60 min in total and never before the last wake + the band's shortest last window. Both limits are checked exactly at the edge.
- [x] Skipping an earlier nap opens the next one 30 min after the skipped window, with the same width. Later naps chain from it, and bedtime moves as above.
- [x] Two skips in one wake apply in order, each to the next unskipped nap.
- [x] A skip stays active through a catnap under 15 min and clears once a sleep of 15 min or more has happened. A sleep inside the skipped window counts as that nap.
- [x] A skip left over when bedtime is next changes nothing. Bedtime is never marked skipped.

## Replay (step 3)

- [x] `likelyFor` gives each past sleep the window Molly would have shown just before it started, using only sleeps that had ended by then (a unit test shows a later sleep can't leak in). Skipped windows come back marked.
- [x] The accuracy summary counts naps started in their window and says how far bedtime landed from its window (`in the window`, `Nm after`, `Nm before`), leaving out parts with no window.
- [x] `pnpm replay:naps` reports, for each planned position (2nd sleep, 3rd, …, bedtime as planned from the morning), the count, hit rate, median miss and median width. The run on real logs is summed up in `NOTES.md`, and no key or raw log is in any file, commit or output.
- [x] The numbers were reviewed and later naps judged worth showing before step 6 started.

## Strip and pages (`packages/core`, unit TDD)

- [x] `ghostBlocks` returns the part of each planned sleep inside the window: the next one filled, later ones outline, skipped ones hatched at the note's window.
- [x] Stem labels: one per logged sleep start and per unskipped likely start, none for the wake or for skipped naps. Bedtime's stem is on its right. When two would overlap, the logged one is dropped first.
- [x] The now label sits at now's position and is clamped inside the strip at both ends. Nights get the now label only.
- [x] On a day with a plan, the window ends at the bedtime window's end, or now + 30 min if later. Without a plan it ends as today. There is no nap-window marker or 3-hour grid left in the code.
- [x] `windowsBefore` returns 7 days of past pages, newest first, alternating nights and days, including a day with no logged wake (the clock fallback), with the same boundaries as `dayWindow`.

## Notes in the api package (integration, test Baby Buddy)

- [x] A `molly-skip` note can be created, listed by child + tag + time since, and retagged to `molly-skip-undone`, after which it no longer lists.
- [x] A refused note request maps to `forbidden`, like the other entry kinds.

## Dashboard (Playwright, fixed clock, seeded sleeps)

- [x] Section 01 at 10:50: the hero shows only the next nap, the strip shows every likely sleep until bedtime (the next one filled, later ones outline), and there are stems at the logged and likely sleep starts, with bedtime's on its right. The only label under the strip is `10:50`, and Recent's likely row is unchanged.
- [x] Section 02: Tonight at 23:10 and at 03:40 shows one label under the strip, the time now, and it moves with the clock. There are no start, end or hour labels.
- [x] A running sleep or a child without a birth date: no planned sleeps and no likely stems. The strip still shows logged sleeps and their stems.
- [x] Screen readers read the planned sleeps as clock-time windows marked as estimates.

## Skip nap (Playwright)

- [x] Section 04 at 14:55: `Skip nap` beside `Why ›` (and in the Why sheet) applies at once. The hero switches to the bedtime window with `Nap 15:05 skipped · bedtime was 18:50` and `Undo skip`, the strip hatches the skipped window with no stem, bedtime's stem moves, and a toast offers `Undo`.
- [x] `Undo` (toast) and `Undo skip` (hero) both restore the plan, and the note in Baby Buddy is retagged `molly-skip-undone`, not deleted.
- [x] There is no `Skip nap` while bedtime is next.
- [x] Once a sleep of 15 min or more starts and ends, the skipped line and `Undo skip` are gone.
- [x] A second browser context signed in as the other parent shows the same skip after a refresh.
- [x] A failed or refused skip undoes itself and shows the usual toast (a permission toast for 403, confirmed through the key check).
- [x] `docs/setup.md` says skipping needs the note and tag permissions.

## Swipe-back pages (Playwright)

- [x] Section 03 at 23:10: one swipe right on the card shows Saturday (`06:40 – 19:25`) with its totals, a Likely lane under Sleep, stems on each logged sleep start and bedtime, and the accuracy line. There is no now line. The hero, tiles and Recent haven't changed.
- [x] Swiping further reaches Friday night, then Friday, and so on back 7 days, and stops there. The dots show the position.
- [ ] `Back to now ›` returns to the live page. The card also snaps back after 60 s on a past page (clock advanced) and when the app returns from the background.
- [x] A skipped nap shows hatched in a past day's Likely lane.
- [ ] Screen readers can page back and forward, and each page announces its title and totals.
- [x] The dashboard's first load fetches no more than it did before the pages were added, or the extra cost is recorded in `NOTES.md` and accepted.

## Widgets (unit tests, then emulator)

- [x] The widget refresh fetches skips, and the snapshot's next sleep is the plan's first unskipped sleep. An old cache still parses.
- [ ] On the emulator: after a nap is skipped in the app, the widget shows the earlier bedtime on its next draw. After undo it shows the nap again.

## Looks (manual review, web and emulator)

- [ ] The strip, stems, now label, outline and hatched blocks, past pages, Likely lane, accuracy line, dots, skip button and skipped line match `Molly Day Plan.dc.html` (2a) in the Day and Night themes.
- [ ] At the largest font scale nothing clips, stem labels stay inside the card, and the now label never overlaps anything.
