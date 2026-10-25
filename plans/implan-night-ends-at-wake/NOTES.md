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

## Done (implementation)

- `windowsOn` builds the night, then sets its end to `dayStart(d + 1)` (the wake `dayOn` finds, or "Day starts"); a night without bedtime is `clockNightAfter(day)`, starting at the day's end. `fromWake` returns that same clock night for yesterday's day with a wake and no bedtime once `bedtimeCut` has passed (while it lasts), so the live and past copies start at the same instant. `byClock` reuses `clockDay` / `clockNightAfter` (wrap-up refactor, same windows).
- Changed expectations, all because a night now ends at the next wake: five in `day-window.test.ts` (07:00 → 06:40) and two in `e2e/tests/ring.spec.ts` (`seedDay`'s night 19:05 → 07:13 used to be clipped at the usual 07:00: 11h 55m → 12h 8m). Nothing else moved; `needs-seeded.test.ts` and `day-fixtures.test.ts` green unchanged.
- e2e: the pager shows only title and date, so "ends at 06:03" is covered by the boxes (`Last night: 7h 21m slept, 0 feeds, 0 diapers`), which fail on the old code (checked).
- Wrap-up sweep: nothing to remove (`usualWakeAfter` and `nextNapStart` still used); fixed the garbled `dayOn` doc comment; dropped the stale duplicate `implan-early-wake` "Planned" row from `plans/README.md`.

## Open

- None.
