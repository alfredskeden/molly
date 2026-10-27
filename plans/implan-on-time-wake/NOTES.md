# Notes

## Decided (issue #29)

- **On time** = a sleep end within 30 min (either side) of the usual wake (`rhythm.wake`: the learned wake, or "Day starts" while it stands in). Not also "Day starts" once a wake is learned; the early-wake rule (`plans/implan-early-wake/`) keeps its threshold.
- An on-time end starts the day at once: no `now - end >= awake` wait. The next sleep, once it exists, must still start at least `awake` after the end, or the end is a night waking (the undo).
- **"Very short" wake window** = the band's `awake` (40–75 min, capped at ⅔ of the learned first wake window), the line `firstWake` already uses. Not the predicted first nap.
- **After an undo** the next wake follows the same rule: on time → at once, otherwise the threshold. No special path.
- Rule works for any child, never tuned to one log.

## Verified in the code (2026-10-26)

- `firstWake` (`packages/core/src/day-rhythm.ts`) is called from two places only: `dayRhythm` (learning, anchor-free) and `dayOn` (`day-window.ts`, deciding). Learning must not get the on-time branch: it would use the usual wake to find wakes it learns the usual wake from.
- On a past day the next sleep is always known, so the on-time rule gives the same answer as the threshold rule (the `now` part of the check only matters live). Learned times, past windows and the replay's past days don't move.
- `firstWake` ignores ends at or after `now` (`end < now`), so `isNight` at a stop (`now` = the stop) never sees the sleep being stopped as the wake. Unchanged.
- Undo needs no code: with a sleep started 08:15 after an 08:05 end, the 08:05 end fails (`next - end < awake`), `dayOn` finds no wake, and `isNight` returns night (before the day's wake, or yesterday's bedtime on). Same for `nightFrom` (widget cache, lock-screen Stop), which adds the running sleep through `withSleep`.
- Vitamin D: `remindedCache` (`apps/molly/src/widget/model.ts`) computes the cycle from `dayWindow` right after the stop. Today an on-time morning stop still sees the night (threshold not passed), so the cycle is yesterday's; after the fix it is today's, from the wake. That is what its comment already says it does.
- Nap reminders and the plan follow `dayWindow` on each refresh; an undo hides the plan (night) on the next refresh, which a sleep start triggers.
- `replayPlans` (`packages/core/src/replay.ts`) plans each day at `wake + awake` ("known"). On-time wakes are now known at the wake.
- Child screen copy "A morning wake near Day starts or the learned wake starts the day." stays true; no copy change.

## Found during the work (2026-10-26)

- `firstWake` ignores an end at exactly `now` (the sleep still runs then), so `replayPlans` plans an on-time day a minute after its wake, not at it. At the wake itself the plan is empty.
- `replayPlans`' on-time check uses the rhythm as known at the wake (`dayRhythm(knownAt(sleeps, wake), …, wake)`), as the live app would. The helper `onTimeOn(rhythm, day, days)` (`day-rhythm.ts`) is shared with `dayOn`.
- `pnpm replay:fixtures`: identical before and after (past days don't move). The `replayPlans` test is unchanged.
- E2E: the undo needs a logged wake on the day before last night. Without one, `isNight` falls back to the clock and the 08:15 sleep saves as a nap (unchanged behaviour); the spec seeds that day.

## Spotted, not in scope

- E2E specs that seed "last night" on yesterday break on the day after a DST change (yesterday 2026-10-25 here: the night really is an hour longer). Seven fail on 2026-10-26 with or without this change: `day-night` "last night ends at an early wake", `recent-days` 1e / nap in progress / drank / no ml line, `ring` 1f / a past night. They pass again on other days.

## Open

- None.
