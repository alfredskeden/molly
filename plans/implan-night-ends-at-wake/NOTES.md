# Notes

## Verified in the code (develop, 06d98aa)

- `nightOf` (`packages/core/src/day-window.ts`) ends every night with a bedtime at `usualWakeAfter(rhythm, start)`; `windowsOn`' clock night ends at the next "Day starts" (`nextNapStart`). Neither looks at the next day.
- A day with a wake and no bedtime ends at the usual bedtime (`dayOf`); its clock night starts at "Day ends" (`nap.end`). The live clock night (`fromWake` returns null → `byClock`) also starts at "Day ends".
- `windowsBefore` drops pages with `start >= live.start`; that's what keeps the live window from showing twice. Any change to a night's start must keep the live and past versions of the same night equal.
- `windowStats` (`packages/core/src/ring.ts`) clips sleep to the window and counts feeds / diapers inside it, so the issue's extra counts and the longer "Slept" both come from the window's end.
- Existing tests that encode the bug: `day-window.test.ts` "the past pages of the Today card" and "the Today card's previous page" expect last night to end at 07:00 though the wake was 06:40.
- `usualWakeAfter` is also used by `needs.ts` (forward guess for a live night); stays.
- The rhythm query (`features/dashboard/queries.ts`) isn't in the persisted cache (only `timer` / `entries` / `children` are), so changed windows need no `rhythmVersion` bump.
- `e2e/tests/day-night.spec.ts` already seeds a learned 08:30 wake with a 06:03 wake ("a wake near Day starts starts the day…"); reuse that seed for the e2e.

## Cleanup sweep (planning)

- Nothing to remove: no app code works around the overlap. `recentDays` keys a night's card by its `start` (`apps/molly/src/features/days/recent.ts` `morningOf`), and `cardSpan` already runs from the night's start to the day's end, so Recent days' card totals were never double-counted; only the per-window ring and boxes were.
- `usualWakeAfter` stays (live night, `needs.ts`).
- Comments to rewrite in the same change: `windowsBefore`, `windowsOn`, `nightOf` in `day-window.ts` (in MAIN step 1).
- `plans/implan-day-night/NOTES.md` "Day end / night end" describes the old rule; MAIN step 6 points it here.

## Decisions

- Scope agreed with the developer: every past night ends at the next day's start (with or without bedtime), and a night with no bedtime starts at its day's end, past and live.
- Lean plan: no mental model file.

## Open

- None.
