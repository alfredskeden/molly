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

## Open

- None.
