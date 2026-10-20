# Plan while asleep: notes

## Decisions (2026-10-04)

- **Projected, not frozen.** The running nap is assumed to last its slot's usual length; later sleeps chain from `max(start + usual, now)`. Rejected: freezing the plan at sleep start (never reacts to a long nap) and a fixed projection until stop.
- **Surfaces:** ring ghosts and window row only. Widgets and the lock-screen notification keep showing no next sleep while sleeping.
- **Feeding** also stops hiding ghosts and the window row.
- **Bedtime sleep:** nothing after it.
- **Window row while asleep:** next sleep after the running one, Skip hidden.
- **Ring:** no dashed tail for the running nap's likely end.

## Facts found while planning

- `sleepContext` returns null on `running` (`next-sleep.ts`), which empties both `nextSleep` and `dayPlan`.
- The widget refresh calls `dayPlan(sleeps, sleepTimer, …)` (`src/widget/model.ts`), so it would start showing a next sleep during naps unless it hides it itself.
- The dashboard passes the plan's bedtime to `dayWindow`, so the live day's end follows the plan while asleep too.
- `usualNapLength` lives in `day-plan.ts` today; `sleepContext` needs it.
- `dayWindow` already counts a running sleep up to now and turns a running bedtime sleep into the night (`spans`, `nightAfter`).

## Found while building (2026-10-04)

- `sleepContext(…, napLength)` takes the default nap length as a last argument (`dayPlan` passes `DAY_PLAN_TUNING.napLength`, `USUAL_NAP_LENGTH` = 45 otherwise), since `next-sleep.ts` can't import `day-plan.ts` without a cycle.
- The running nap's look-back checks (logging gap, age band, past days, usual bedtime) are made at its start: the context is the awake one at `running.start`, with `anchor` and `slot` moved on.
- The bedtime check ignores skips (it uses the plain next sleep at `running.start`), in line with "skips stop counting once a nap runs". So after skipping the last nap, a sleep started before the nap-window end shows a plan (bedtime later that evening) until the window turns into the night at the nap-window end. Accepted as minor; revisit if it shows up in use.
- The window row's nap numbers count the running nap (`napsSoFar` + 1 while a sleep runs), so it reads `Nap 3 likely` during nap 2.
- Playwright can't stop a timer through the UI under `page.clock` on a past day: the stop sends only `{ timer }` and Baby Buddy ends the sleep at its own clock. The stop spec stops it through the API and reloads.

## Open

None.
