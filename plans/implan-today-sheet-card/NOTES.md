# Notes

## Decisions (2026-10-21, from issue #2)

- The sheet uses the same span as Recent days' **top card**:
  - by day, last night + today so far;
  - at night, tonight only. The owner chose "the night I'm currently on only".
- The four boxes stay, with the same look and taps. All four count over that span: slept (night + day), sleeps, feeds and diapers.
- The ml line uses the same `drank` / `drankText` as Recent days, over the same span. It sits under the boxes.
- No mini rings in the sheet. The Recent list and the Recent days row don't change.

## Facts from the code

- Sheet: `apps/molly/src/features/dashboard/TodaySheet.tsx`, opened from `app/(main)/index.tsx` (`askingToday`). Its numbers come from `todayStats` there, which is `todaysTotals(loaded, liveWindow.start, sleepRunning, now)` plus a count of sleeps started since.
- Recent days' ml line: `drankLine` in `app/(main)/recent-days.tsx` runs from the night's start (or the day's) to the day's end (or the night's), capped at `now`. Cards come from `recentDays(live, past)` in `features/days/recent.ts`, which has unit tests (`recent.test.ts`, app Vitest, TZ Europe/Stockholm).
- Dashboard entries (`useRecentEntries`) hold sleeps whose end is in the last 14 days, and feeds, diapers and medicine since yesterday's midnight. Last night is covered, so no new query is needed.
- `windowsBefore(entries, napWindow, now, days, running)` in `packages/core/src/day-window.ts` gives the finished windows, newest first.
- E2E: `e2e/tests/recent-days.spec.ts`. `1e` expects `Today: 1h 9m slept, 1 nap, 2 feeds, 2 diapers`, and the running-nap case expects `Today: 1h 29m slept, 2 naps, …`. `seedToday` seeds a night 19:30 → 06:50 before the day, so both labels change: the night joins the slept total, and the label becomes `sleeps`.

## Cleanup sweep (planning)

- **Remove:** `todayStats` in `app/(main)/index.tsx:1198`, replaced by `cardStats`. Nothing else uses it.
- **Refactor first:** the span rule in `drankLine` (`recent-days.tsx:45`) moves to `cardSpan`, so the sheet and Recent days can't drift.
- **Docs now stale:**
  - `plans/implan-day-ml-total/MAIN.md:52` and `NOTES.md:6` ("Recent days only / not the Today sheet");
  - `plans/implan-ring-redesign/MAIN.md` Today sheet section and `NOTES.md:66` ("the live window's totals");
  - doc comments on `TodaySheet` and `todayStats`.
  - Historical plan notes get a pointer, not a rewrite.
- Nothing else found: no copy entries, assets, deps or flags tied to the old span.

## Implementation (2026-10-21)

- `cardSpan` / `cardStats` in `features/days/recent.ts`; `TodayStats` moved there and gained `night` (the span holds a night → `sleep`/`sleeps`). The dashboard builds the card in `todaySheetTotals` (`index.tsx`) with `windowsBefore(loaded, napWindow, now, 1, running)`.
- The ml line sits inside the boxes' accessible group, so TalkBack reads it once, after the diapers.
- Look (web): `13h 17m` was cut to `13h 1…` in a quarter-width box. The slept box is now `flex-[1.25]`, and its value and the labels wrap instead of truncating. 1.4 left `diapers` too narrow at 320 px (broke as `diaper/s`). At 412 px everything fits on one line. At 320 px slept wraps to `13h` / `17m` and `slept` / `today`.
- Web look review: Today sheet screenshots by day and night, Classic and Ribbon, day and night schemes, 412 and 320 px.
- Emulator (release APK, emulator-5554): at font scale 2.0, `diapers` broke mid-word as `diaper/s` once labels could wrap. Now the one-word labels stay on one line with `adjustsFontSizeToFit` (Android shrinks them; the web truncates as before), and only `slept today` / `slept tonight` wraps. Checked Classic by day (`13h 17m`, `≈ 390 ml`) and Ribbon at night (`3h 5m`, `≈ 120 ml`).
- Found while reviewing, not from this plan: on the web build, `className` on the Sheet's Reanimated `Animated.View`s (`absolute bottom-0…`, `rounded-t-sheet bg-surface`) is missing from the DOM, so in headless Chromium the sheet has no surface and covers the full height. `develop` is the same. Filed as #5. Fixed in [`implan-web-sheets`](../implan-web-sheets/MAIN.md).

## Open

- None.
