# Day plan

Context: the Molly system plan in [`../implan-molly/MAIN.md`](../implan-molly/MAIN.md) (architecture, rules), the day window from [`../implan-today-window/MAIN.md`](../implan-today-window/MAIN.md) and the next-sleep prediction from [`../implan-next-nap/MAIN.md`](../implan-next-nap/MAIN.md), which this builds on. Decisions and verified facts are in [`NOTES.md`](NOTES.md). The Definition of Done is in [`TEST_STRATEGY.md`](TEST_STRATEGY.md).

**Outcome:** after a day of testing the next-nap work, four changes.

1. **The Today strip shows the whole day ahead**: every likely nap until bedtime, not just the next one. The hero, Recent and the widgets still show only the next sleep.
2. **Strip labels mark where sleeps start.** The 3-hour grid goes. Each sleep start (logged or likely) gets a time on a stem above the Sleep row; the only label under the strip is the time now, riding the now line. Tonight shows just that one label.
3. **The card swipes back** through earlier days and nights (7 days). A past day shows what Molly expected above what happened, with a one-line accuracy summary. *Since [`../implan-days/`](../implan-days/MAIN.md): swipe-back narrowed to one page, older days on the Days screen.*
4. **A nap can be skipped.** One tap in the hero, with Undo. The rest of the day is worked out again, and both parents' phones agree because the skip is stored in Baby Buddy.
5. **The card's sleep total counts the sleep that's still running** (asked for after the design, not in it). Tonight at 22:43 with a sleep since 19:30 reads `3h 13m sleep` and keeps rising, instead of `0m sleep` until the timer is stopped. The same on Today for a nap in progress. The total still counts from the window's start (bedtime for Tonight) and starts again at each new window.

This replaces the next-nap plan's "never a whole day's schedule". Everything is still computed on the device from logged data. The only new thing written to Baby Buddy is a skip note.

## The design source

`Molly Day Plan.dc.html`, the (private) design source. Sections 01–05 are the spec. Build label option **2a** ("Stems above") and skip storage option **2d** ("A tagged note"); ignore 2b, 2c, 2e and 2f. Canvas props: later naps drawn as **outline** (`laterNaps: 'outline'`), accuracy line **on** (`showAccuracy: true`).

Where this plan and the design disagree, this plan wins. The deviations:
- **Undo retags the note instead of deleting it.** Parents can't delete notes in Baby Buddy (see NOTES). Undo sets the note's tags to `["molly-skip-undone"]`.
- **No "other phone" wording and no device id.** The hero always says `Nap 15:05 skipped · bedtime was 18:50`, whichever phone skipped. The 2d mockup's "skipped on the other phone at 14:55" line is not built.
- **Widgets honour skips.** Still next sleep only, as the design says, but after a skip they show what the hero shows (the widget refresh fetches skips too).
- The design's times and totals are illustrative. The rules below are the spec.

## The day plan

All of this is in `packages/core`: pure, no I/O, time passed in. New file `day-plan.ts`; tunable numbers go in a `DAY_PLAN_TUNING` object next to `NEXT_SLEEP_TUNING` so the replay can vary them.

`dayPlan(sleeps, running, birthDate, napWindow, skips, now)` returns the likely sleeps from now until bedtime, in order. Each is a `NextSleep` plus `skipped: boolean`.

1. **Hidden** exactly when `nextSleep` is: an empty plan. At night there's no plan.
2. **First sleep** = `nextSleep(...)`, unchanged.
3. **Chaining:** assume each planned nap starts mid-window and lasts that slot's usual length (median over the history days, else 45 min). Its end is the anchor for the next one, predicted with the same age guide + history blend as `nextSleep` (same `candidate` logic, next slot). Refactor `next-sleep.ts` so both share it rather than copying it.
4. **Stop** at the first bedtime (the same "within 60 min of usual bedtime" switch as `nextSleep`), or once the day has its usual number of naps (median of past days, from 3 logged bedtimes; that bedtime starts no earlier than 60 min before the usual one). Added after the replay, see NOTES. Recomputed on every render, so a logged nap moves everything after it.

**Skips.** A skip is `{ at, start, end }`: when it was tapped and the nap window it skipped (as shown then).
- A skip is **active** while its `at` is after the current anchor (the end of the last sleep of 15 min or more). So a sleep of 15 min or more clears it, and a sleep that starts inside the skipped window simply counts as that nap.
- Active skips, oldest first, each take the next nap of the plan that isn't skipped yet. That nap stays in the plan with `skipped: true` and is drawn at the skip's own `start`–`end`. A skip left over when the next unskipped sleep is bedtime does nothing. Bedtime is never skipped.
- **The anchor stays at the last wake.** The skipped window counts as awake time.
- **The nap after a skipped one** opens 30 min after the skipped window ends, with the skipped window's width. Later naps chain from it as above.
- **Bedtime moves earlier** by the skipped nap's usual length (median, else 45 min), at most 60 min in total however many naps are skipped, and never earlier than anchor + the band's last-window low end. Design example: 18:50 − 40 min = 18:10.
- Starting numbers (30, 45, 60) are the design's. The replay can score them later, once real skips have been logged.

**Skip notes.** Stored as a Baby Buddy note: `POST /api/notes/ { child, time: <tap time>, note: "Skipped nap 15:05–15:45", tags: ["molly-skip"] }`. Put the note text builder and parser in core (`skipNote(skip)`, `parseSkip(note)`): the times in the text are local clock times on the note's local date, and a note that doesn't parse is ignored. Molly reads notes tagged `molly-skip` from the last 7 days, which also feeds the past days' Likely row.

## Strip, labels and pages

In `packages/core` (`strip.ts`, `day-window.ts`, `replay.ts`); the dashboard only draws.

- **`ghostBlocks(window, plan)`** replaces `ghostBlock`: the part of each planned sleep inside the card's window. The next unskipped one is the filled dashed block (as now), later ones are dashed outline only, skipped ones are hatched.
- **`stripTicks(window, plan, sleeps)`** replaces the 3-hour grid: a stem label for each logged sleep start in the window (grey, solid stem) and each planned, unskipped sleep start (violet, dashed stem). Bedtime's stem sits on its label's right so the label stays inside the card. The wake is in the card's subtitle, not a stem. **Crowding:** a label that would overlap its neighbour is dropped, logged labels before likely ones (the look-ahead is what the strip is for).
- **`nowTick(window, now)`**: the only label under the strip, under the now line, clamped so it stays inside the strip near either end. Day and night alike. Live nights have no stems.
- **Strip end on a day with a plan:** the end of the bedtime window, or now + 30 min if later. Without a plan, as today (`dayWindow`). The nap-window-end marker goes (bedtime is on the strip now); remove `TodayStrip.marker`.
- **`windowsBefore(entries, napWindow, now, days = 7)`** in `day-window.ts`: the past pages, newest first (Saturday night, Saturday, Friday night, Friday …), built with the same rules as `dayWindow` for each earlier day. Older days live in History.
- **`likelyFor(window, sleeps, skips, …)`** in `replay.ts`, now exported from the core index: for each sleep in a past day, the last window Molly would have shown just before it started (only the sleeps that had ended by then), and the day's skipped windows (hatched). Nothing is stored.
- **Accuracy line** (past days): `3 of 3 naps started in the likely window · bedtime 5m after`, from `likelyFor`'s windows scored with the existing `score`. Bedtime reads `in the window`, `Nm after` or `Nm before`. Leave out a part that has no window.

## Screens

- **Hero:** unchanged except a `Skip nap` button beside `Why ›` while the next sleep is a nap (any state), and the same button in the Why sheet. Never for bedtime. The tap applies at once, no confirm: a toast `Nap skipped · bedtime likely 18:10` with `Undo`, and until the next sleep starts the hero's disclaimer area shows `Nap 15:05 skipped · bedtime was 18:50` with `Undo skip` in place of `Skip nap`.
- **Writes:** skipping is optimistic like every other write (`features/dashboard/optimistic.ts`): the skip applies at once and is undone with a toast if the POST fails. A 401/403 goes through the existing key check (`src/session/key-check.ts`), so a missing permission shows the normal permission toast. The skips query is persisted and refreshed after writes like the others.
- **Today card, live page:** all planned sleeps, stems, the now label (section 01). Tonight: the now label only (section 02).
- **Today card, past pages** (section 03): swipe right on the card to go back in time; only the card moves, hero, tiles and Recent stay live. A past page has no now line; its title names the day and span (`Saturday`, `06:40 – 19:25`; a night names its night and span), its totals line covers that window, stems sit on each logged sleep start and bedtime (past nights: each sleep start), and past days have a `Likely` lane under Sleep plus the accuracy line. `Back to now ›` jumps to the live page, and the card snaps back after 60 s on a past page or when the app returns from the background. Dots show the position, shrinking with distance. Screen readers get the pages as adjustable (previous / next) and each page's title and totals. Gesture handler and Reanimated are already dependencies; the swipe must also work on web.
- **Data:** past pages need 7 more days of all entries, and their Likely row needs sleep history before each of those days. Extend or add queries as you see fit (`features/dashboard/queries.ts`: `useRecentEntries` starts at yesterday's midnight, `useRecentSleeps` covers 15 days); load the extra data only when it's needed if that keeps the dashboard's first load as it is.
- **Recent and widgets:** next sleep only, from the plan's first unskipped sleep.
- **Totals line:** `todaysTotals` (`packages/core/src/totals.ts`) takes the running sleep timer and `now`, and counts the running sleep from its start (clipped at the window's start, like finished ones) up to now. Only the live page has a running sleep; past pages' totals are finished entries only. The widgets don't show this total.

## Shape

```
packages/core/src/day-plan.ts        dayPlan, skipNote, parseSkip, DAY_PLAN_TUNING (new)
packages/core/src/next-sleep.ts      shares candidate/history code with day-plan
packages/core/src/strip.ts           ghostBlocks, stripTicks (stems), nowTick; marker and 3-hour grid removed
packages/core/src/day-window.ts      windowsBefore; day end from the plan's bedtime
packages/core/src/replay.ts          likelyFor, accuracy summary; exported
packages/core/src/totals.ts          todaysTotals counts the running sleep up to now
scripts/replay-naps.ts               also scores later planned sleeps
packages/api/src/                    notes: list (child, tags, min_time), create, update tags
apps/molly/src/features/dashboard/   queries (skips, past days), Hero, WhySheet, TodayCard (pages), Recent
apps/molly/src/app/(main)/index.tsx  computes the plan once per render, passes it down
apps/molly/src/widget/model.ts       refresh fetches skips; snapshot shape unchanged
docs/setup.md                        skipping needs note add/change permissions plus the tag ones already listed (check e2e/seed.py for where the seeded parents get them)
```

Keep `packages/core` and `packages/api` free of React, Expo and `apps/` (checked by `pnpm check:boundaries`).

## Steps

Work through the steps in order; each lands on its own. Mark a step `[x]` when it's fully done, and record findings (replay numbers, changed constants, API facts) in [`NOTES.md`](NOTES.md).

- [x] **1. Running sleep in the totals.** Unit TDD in `totals.test.ts`: no running sleep (as now), a running sleep that started inside the window (counted to now), one that started before the window (clipped at its start), a finished sleep plus a running one. Wire it in `index.tsx`. Playwright with a fixed clock: Tonight with a sleep running since bedtime shows the time slept so far and it rises as the clock moves; a nap in progress counts on Today.
- [x] **2. `dayPlan` and skips in core.** Unit TDD (Vitest, Given / When / Then). Zero: every hidden case gives an empty plan. One: next sleep only (bedtime next). Many: chaining with history lengths and the 45 min default, stopping at bedtime, a logged nap moving the rest. Skips: `skipNote` / `parseSkip` round trip and bad notes; an active skip of the last nap (bedtime earlier, the 60 min cap, the anchor floor), of an earlier nap (30 min after, same width, bedtime moved), two skips, a skip cleared by a 15 min sleep but not by a catnap, a sleep inside the skipped window, a leftover skip with bedtime next. Boundaries: a sleep of exactly 15 min, the cap and floor exactly, a clock change.
- [x] **3. Replay: later sleeps and past days.** Export `likelyFor` and the accuracy summary from `replay.ts`, unit TDD (a later sleep never leaks in, skipped windows come back hatched). Extend `pnpm replay:naps` to plan each day from the morning wake and report, per planned position (2nd sleep, 3rd …, bedtime), the hit rate, median miss and median width. Run it on real logs (the URL and key are never written into a file) and record the conclusions in `NOTES.md`. No target: it's a check that later naps are worth showing. Decide from the numbers before the UI steps (6 onwards); if later naps are clearly useless, the plan changes there.
- [x] **4. Strip geometry and pages in core.** Unit TDD. `ghostBlocks`, `stripTicks` (logged and likely stems, bedtime on the right, crowding), `nowTick` (clamped at both ends), the day's end from the plan's bedtime, `windowsBefore` (7 days, newest first, nights and days alternating, a day with no logged wake). Update the existing tests to the new signatures and remove the old grid, `ghostBlock` and the marker.
- [x] **5. Notes in the api package.** Integration tests against the test Baby Buddy (`pnpm bb:up && pnpm bb:seed`): create a `molly-skip` note, list by `child` + `tags` + `min_time` (UTC, as the other queries), retag to `molly-skip-undone` and see it drop out of the list, a refused request mapped to `forbidden`. Record any new facts in `NOTES.md` and `../implan-molly/NOTES.md`.
- [x] **6. The whole day on the dashboard.** `index.tsx` computes the plan; `TodayCard` draws the planned blocks, stems and now label (day and Tonight); Recent and the hero read the plan's first unskipped sleep. Playwright with a fixed clock (`page.clock`) and seeded sleeps: section 01 at 10:50, Tonight at 23:10 and 03:40, and the hidden cases. Update any spec that asserted the old ticks or the marker.
- [x] **7. Skip nap.** The skips query (last 7 days of `molly-skip` notes, persisted), the `Skip nap` button in the hero and the Why sheet, the optimistic write with toast and `Undo`, the hero's skipped line with `Undo skip`, permission handling. Playwright: section 04 at 14:55 (before → after), undo, the skip clearing when a sleep starts, no button for bedtime, a second browser context (the other parent) seeing the skip after refresh. Update `docs/setup.md`.
- [x] **8. Swipe-back pages.** Past-day data, the pager on the card, past-page title, span, totals, stems, Likely lane, accuracy line, dots, `Back to now ›`, snapping back after 60 s and on returning from the background, screen-reader paging. Playwright: section 03 at 23:10 (one swipe back to Saturday), `Back to now`, the snap-back with the clock advanced, a skipped nap hatched on a past day. *Since [`../implan-days/`](../implan-days/MAIN.md): swipe-back narrowed to one page, older days on the Days screen.*
- [ ] **9. Widgets.** The headless refresh fetches the skips too and shows the plan's first unskipped sleep; an old cache still parses. Widget model unit tests, then the emulator: skip in the app, the widget shows the earlier bedtime on its next draw.
- [x] **10. Wrap up.** Update "Where things stand" in the root `CLAUDE.md`, point the next-nap plan's "never a whole day" line at this plan, and put the Baby Buddy facts found on the way in `../implan-molly/NOTES.md`.

## Out of scope

- The "skipped on the other phone" wording and any device id (decided against).
- Scoring the skip rules with the replay: needs real skips logged first. The constants stay the design's until then.
- The lock-screen notification and a reminder when the window opens (still later work from the next-nap plan).
- Predicting feeds, night wakings or the wake-up time.
- Pages older than 7 days (History covers them) and editing a skip beyond Undo.

## Assumptions

- Both phones run in the same time zone: skip notes hold local clock times.
- Parent accounts can add and change notes and tags. Checked on the test Baby Buddy for both seeded parents (NOTES); superusers can anyway.
- Later planned naps are rough by nature: each is built on the one before, which is why they're drawn outline only. The replay in step 3 says how rough.
- The next-nap plan's remaining manual look review is separate and can happen before or alongside this work.
