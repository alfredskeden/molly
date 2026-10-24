# Notes

## Decisions (planning, 2026-10-24)

- Inferred only; no explicit wake / bedtime actions.
- Scope: morning wake and bedtime, plus the nap flag. Calendar-midnight views stay.
- Morning: anchor learned from the child (median of 14 days, clamped 05:00–11:00, setting until 3 wakes); range and awake threshold by age, threshold capped at ⅔ of the child's usual first wake window.
- Bedtime: night if it starts ≥ usual bedtime − 90 min, or starts ≥ usual bedtime − 3 h and runs long (age-based). Card stays Today while a sleep runs until one holds.
- Nap flag decided at stop / log with the new rule; never patched.
- "Day starts / Day ends" setting stays, reworded as starting values.

## Evidence from the investigation (issue #14)

- Summer logs (another tracker, explicit taps, 66 days, ≈ 2¾ → 5 months): today's rule 39 right · 15 wrong · 12 none on morning wakes; proposed rule with a learned anchor ±3 h and ≥ 60 min, 57 · 8 · 1.
- Production Baby Buddy (Sep 20 – Oct 24, ≈ 4¾ → 6 months): night wakings before going back to sleep lasted 18–58 min; real first wake windows 64–111 min. The 60 min threshold sits in that gap. Old and new rule differ on 7 of 35 mornings, all the back-to-sleep shape.
- Learned-anchor drift: a −90 min / +3 h variant learning from its own picks crept 08:51 → 11:00+. Hence the separate anchor-free learning pass.

## Cleanup sweep (planning)

Each item is a sub-step in `MAIN.md`.

- `isNap` (`packages/core/src/nap.ts:6`): only used by `isNightSleep` (grep across apps, packages, scripts). Un-export in step 4.
- `WAKE_RANGE_MS` (`day-window.ts:7`): only the old `morningWake` and `fromWake`. Removed in step 3.
- `usualMorningAfter` (`needs.ts:258`) and `usualBedtime` (`next-sleep.ts:353`): two copies of "median of past wakes / bedtimes with a fallback to the setting". Replaced by `dayRhythm` in step 2, along with `NEEDS_TUNING.wakesNeeded` and `NEXT_SLEEP_TUNING.bedtimesNeeded`.
- `daysBefore` (`next-sleep.ts:326`) repeats `windowsOn` (`day-window.ts`). Refactor first (step 1).
- `replay.ts` and `scripts/replay-naps.ts --reflag` call `isNightSleep` / `morningWake` directly (steps 5–6).
- Docs naming the old rule as current: `CLAUDE.md:63`, `README.md:19`, `plans/implan-molly/NOTES.md:83,231`, child screen copy `app/(main)/child/[id]/index.tsx:197` (steps 8–9).

## Implementation (2026-10-24)

- **Shape**: every day function takes a `DayRhythm` (`dayRhythm(sleeps, birthDate, napWindow, now)`) where it took the `NapWindow`: `dayWindow`, `windowsBefore`, `previousWindow`, `pastDays`, `nextSleep`, `sleepContext`, `dayPlan`, `sleepingSpan`, `vitaminDCycle`, `likelyFor`, `sleepComparison`. The rhythm carries the setting for the clock fallback. Callers learn it once per render / refresh from the same sleeps they pass.
- **Verdict**: `isNight({ start, end }, sleeps, rhythm, now)` in `day-window.ts`. Running sleep: `end = now`. No wake to place it by: `isNightSleep` (by clock), which is now only that fallback; `isNap` is private.
- **Learning pass** (`dayRhythm`, `firstWake`): a day's wake is the earliest sleep end in 05:00–11:00 followed by the band's awake threshold (uncapped), only after a sleep that started since 11:00 the day before. Bedtime is the first sleep starting 18:00–00:30 that, with the sleeps after it while the baby was back asleep within the threshold, runs the band's `long`: a waking an hour after bedtime doesn't move the learned bedtime, a catnap never is one. Only days before today count.
- **Morning wake, "after a night"**: the same `firstWake`, in the band's range around the usual wake, only after a sleep that started since the range's end the day before (so an unlogged night with a morning nap has no wake).
- **Day end / night end**: a day runs to the usual bedtime (was the setting's end); a night to the next usual wake (was the setting's start). Clock fallback unchanged.
- **Past midnight**: yesterday's day keeps going after midnight while its bedtime may still come (up to `bedtimeCut` after the usual bedtime); then the clock.
- **Running sleep and the plan**: `sleepContext` now treats a running sleep as the current nap unless `isNight` says it's the night (was: "bedtime was next when it started"), so the evening catnap keeps the plan with bedtime to come.
- **Replay**: `replayPlans` plans each day once its wake is known (the threshold after it), since before that it's still the night.
- **Unlearned bedtime**: until 3 bedtimes are learned the setting's end is the usual bedtime, so with the default 19:00 a sleep from 17:30 is the night. Accepted: the setting's end means "usual bedtime" now, and it's learned within 3 days.

- **Taps** (step 7): `stopSleep` / `addEntry` take a `NightRule` (`actions/trackers.ts`): the dashboard's `byRhythm(loaded.sleep, rhythm)` from the cached entries (never fetched at the tap; none cached comes out by the clock), the widget and notification `nightRule(timer, napWindow)` from the cache. The widget refresh works out each running sleep's `nightFrom` (core `nightFrom`: from when a stop saves a night sleep) into the cached `sleepTimer` and `timers[].sleep`; the lock-screen "saves as" reads it. A timer started on this phone since the refresh, or a shown child whose sleeps no snapshot fetched, goes by the clock until the next refresh.
- The development topic's sleep fetch went from 9 to 15 days so its rhythm can learn; the Vitamin D check after a stop fetches 15 days of sleeps and the children (for the birth date). `NEEDS_TUNING.rhythmVersion` bumped to 3 (the window split changed).

- **Playwright** (`e2e/tests/day-night.spec.ts`): the catnap and back-to-sleep saves and the child-screen copy. Three older specs moved with the rule: two opened the dashboard less than an hour after the wake (still the night now), one put a 17:30 nap 90 min before the default 19:00, which is now a bedtime until one is learned.

## Tuning (step 5)

Made-up fixtures (`packages/core/test/day-fixtures.ts`: 2 months, 4–5 months, 10 months, 18 months; early wakings, back-to-sleep mornings, evening catnaps, a long lunch nap) replayed with `pnpm replay:fixtures`, 3 seeds × 28 days, the first 3 days not scored. Right · wrong · none:

| Setting | Profile | Old wake | New wake | Old bedtime | New bedtime |
| --- | --- | --- | --- | --- | --- |
| 07:00–19:00 | 2 months | 73 · 2 · 0 | 73 · 1 · 1 | 25 · 50 · 0 | 71 · 3 · 1 |
| | 4–5 months | 74 · 1 · 0 | 75 · 0 · 0 | 60 · 15 · 0 | 75 · 0 · 0 |
| | 10 months | 72 · 3 · 0 | 75 · 0 · 0 | 75 · 0 · 0 | 75 · 0 · 0 |
| | 18 months | 75 · 0 · 0 | 75 · 0 · 0 | 75 · 0 · 0 | 75 · 0 · 0 |
| 06:00–18:00 | 2 months | 63 · 12 · 0 | 73 · 1 · 1 | 3 · 72 · 0 | 71 · 3 · 1 |
| | 4–5 months | 62 · 13 · 0 | 75 · 0 · 0 | 30 · 45 · 0 | 75 · 0 · 0 |
| 08:30–20:00 | 2 months | 37 · 38 · 0 | 73 · 1 · 1 | 56 · 19 · 0 | 71 · 3 · 1 |
| | 10 months | 31 · 8 · 36 | 73 · 2 · 0 | 39 · 0 · 36 | 75 · 0 · 0 |

The new rule doesn't depend on the setting once it has learned the child. Single-knob sweeps (`--set`): the awake thresholds, the range (`before` 90, `after` 120) and `eveningFrom` 150 change nothing on these fixtures; `bedtimeCut` 60 lifts the 2-month bedtimes to 74 (a catnap 90 min before bedtime was being taken for it) and 120 drops every age (65 / 70 / 72). **Final numbers: the starting values, unchanged** (the fixtures can't tell 60 from 90 for the cut, and 90 is what the investigation's real evenings supported).

The fixtures are a check that the rule does what it says, not evidence about real children; the developer's own logs are the sanity check (`pnpm replay:naps <file> <birth> --days [--truth <file>]`, never committed).

## Open

- Sanity run on the developer's own logs (step 5): theirs to do; record anything worse than the old rule here with a reason.
