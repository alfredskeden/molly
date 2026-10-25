# Notes

## The bug (from issue #18, reproduced with the core functions)

A wake at 06:03, a sleep at 08:38, "Day starts" 08:00, `before` 120 min:

| Usual wake learned | Range starts | 07:10 | 08:39 |
| --- | --- | --- | --- |
| 07:45 | 05:45 | day | day |
| 08:00 | 06:00 | day | day |
| 08:15 | 06:15 | night | night |
| 08:30 | 06:30 | night | night |
| 09:00 | 07:00 | night | night |

Cause: `wakeRange` (`packages/core/src/day-window.ts:144`) is built from `rhythm.wake` only, and `dayRhythm` (`day-rhythm.ts:112`) sets `rhythm.wake` to the learned median once `learnedFrom` (3) wakes are found. The setting (`rhythm.napWindow.start`) is then only used by the clock fallback.

## Code facts (planning, 2026-10-25)

- `wakeRange` has one caller, `dayOn`, twice: the day's range and the next morning's start (where the day's sleeps stop). Widening both is intended.
- `firstWake`'s "after a night" check counts back from the range's end a day earlier, so a later range end moves that cut later too. Expected harmless; step 1's tests cover a normal night either way.
- `fromWake` asks for yesterday's day until today's range has closed; a later range end keeps yesterday's day/night in charge a little longer when no wake is found. Covered by the existing "goes by the clock once the wake range has closed" tests.
- `rhythm.wake` itself is unchanged; `usualWakeAfter` (the night's end) still uses the learned wake.
- Under 3 months `learnsWake` is false, so `rhythm.wake` already equals the setting: no change there.
- `useGuideEntries(childId)` (`apps/molly/src/features/development/queries.ts:18`) fetches 15 days of sleeps; already used on the child screen's development card.
- The panel today has no sleeps at hand and no learned-time display; `wakeLearned` / `bedtimeLearned` are read only in core (`next-sleep.ts:194`).
- Test fixture: `day-window.test.ts` builds `setting = dayRhythm([], null, DEFAULT_NAP_WINDOW, …)`; a learned rhythm can be spread from it.

## Decisions (planning, 2026-10-25)

From the issue, agreed before planning:

- Widen `wakeRange` to the hull of both anchors; don't cap the learned wake.
- The threshold still applies; the day is backdated to the wake.
- Mid-night wakings stay the night.
- Learned times shown on the child screen.
- Widget out of scope; notification unchanged.

## Risk to watch in step 2

`day-fixtures.ts` profiles have early wakings 1–2½ h before the morning wake, up 10–50 min. With the 06:00 setting and a learned wake later than it, the range now starts earlier. An early waking that stays up the band's threshold (45 min at 10 months, 40 at 12+) could become the morning. If a score drops, report before changing anything.

## Cleanup sweep (planning)

Nothing to remove: the change widens one function and adds a display. Items folded into steps:

- Child screen copy "Under 3 months, the morning always goes by Day starts." (`child/[id]/index.tsx:198`): reworded in step 4.
- `e2e/tests/day-night.spec.ts:85` asserts the explainer's first words: updated in step 5.
- `CLAUDE.md:63` describes the morning wake as "near the usual wake": step 6.
- `plans/implan-day-night/MAIN.md` / `NOTES.md` describe the range as around the usual wake only. They're history; step 6 adds a pointer in its `NOTES.md` rather than rewriting.

## Replay check (step 2, 2026-10-25)

`pnpm replay:fixtures` with each setting, before the change and after it: the "new" columns (today's rule) are identical, right · wrong · none for wake / bedtime. No drop, nothing to tune.

| Setting | 2 months | 4–5 months | 10 months | 18 months |
| --- | --- | --- | --- | --- |
| 07:00–19:00 | 73 · 1 · 1 / 71 · 3 · 1 | 75 · 0 · 0 / 75 · 0 · 0 | 75 · 0 · 0 / 75 · 0 · 0 | 75 · 0 · 0 / 75 · 0 · 0 |
| 06:00–18:00 | 73 · 1 · 1 / 71 · 3 · 1 | 75 · 0 · 0 / 75 · 0 · 0 | 75 · 0 · 0 / 75 · 0 · 0 | 75 · 0 · 0 / 75 · 0 · 0 |
| 08:30–20:00 | 73 · 1 · 1 / 71 · 3 · 1 | 75 · 0 · 0 / 75 · 0 · 0 | 73 · 2 · 0 / 75 · 0 · 0 | 74 · 0 · 1 / 74 · 0 · 1 |

Matches the `implan-day-night` "Tuning" numbers. The feared case (an early setting reaching an early waking that stays up the threshold) doesn't occur on these fixtures: their early wakings end back asleep within the threshold.

`minutesOf` (`HH:MM` → minutes) was private in both `nap.ts` and `day-rhythm.ts`; it's now exported from `nap.ts` and used by both and by `wakeRange`.

## Open

- None.
