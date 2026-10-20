# Plan while asleep

Context: the Molly system plan in [`../implan-molly/MAIN.md`](../implan-molly/MAIN.md), the prediction from [`../implan-next-nap/MAIN.md`](../implan-next-nap/MAIN.md) and the day plan from [`../implan-day-plan/MAIN.md`](../implan-day-plan/MAIN.md), which this changes. The dashboard is the ring from [`../implan-ring-redesign/MAIN.md`](../implan-ring-redesign/MAIN.md). Decisions and facts are in [`NOTES.md`](NOTES.md), the Definition of Done in [`TEST_STRATEGY.md`](TEST_STRATEGY.md), the picture in [`MENTAL_MODEL.md`](MENTAL_MODEL.md).

**Outcome:** while a nap is running, or a feed, the dashboard keeps showing the day's likely sleeps (ring ghosts and the window row) instead of dropping them until the timer stops. The plan stays put during a normal-length nap and moves only when the rules say so: the nap runs longer than usual, or it stops.

Today `sleepContext` (`packages/core/src/next-sleep.ts`) returns null whenever a sleep timer runs, so `nextSleep` and `dayPlan` are empty, and the dashboard also hides ghosts and the window row while a feeding timer runs (`apps/molly/src/app/(main)/index.tsx`, the `row` and `ghosts={…}` conditions).

## The rule

A running sleep on the live day is **the current nap**, unless it is the bedtime.

- **Assumed wake** = `max(running.start + usual length of its slot, now)`. Usual length is the median of that slot's logged naps over the history days, else 45 min (today's `usualNapLength` in `day-plan.ts`, `DAY_PLAN_TUNING.napLength`).
- The plan is then built exactly as for an awake baby whose last sleep ended at the assumed wake: anchor = assumed wake, slot = the running nap's slot + 1, same `predictSleep` chaining, same bedtime and nap-count stops.
- So during a nap of normal length nothing moves. Once the nap is longer than usual, the assumed wake is now and the later sleeps slide with the clock (every render, as the dashboard already recomputes the plan). At stop, the real end is the anchor and the plan is the normal one.
- **Bedtime, nothing after it:** the running sleep is the bedtime when the day window is already a night with it running (`dayWindow` decides, as it does for the ring), or when the plan just before it started (`running.start` as now, no timer) had bedtime as its next unskipped sleep. Then the plan is empty, as now.
- **Skips** tapped before the nap stop counting once it runs: they need `at` after the anchor, and the anchor is now the assumed wake. This is what happens anyway once the nap stops.
- **Catnaps:** the running sleep counts as the nap from its first minute. If it stops under 15 min, it's a catnap and the plan goes back to the previous wake, as today.
- `staleAfter` and `dropAfter` work off the assumed wake, so a running nap never hides the plan.

Put this in `sleepContext`, not in `dayPlan` alone, so `nextSleep` and `dayPlan` keep agreeing (the day plan's "first planned sleep equals `nextSleep`" test holds with a timer too). `usualNapLength` moves into `next-sleep.ts` (or a shared spot) for that; tuning stays where it is. `SleepContext` may need to carry whether the anchor is projected if a caller cares; nothing below needs it.

Side effect, intended: the dashboard passes the plan's bedtime to `dayWindow`, so while a nap runs the live day now ends at the likely bedtime, as it does when awake.

## Where it shows

| Surface | While a nap runs | While a feed runs |
| --- | --- | --- |
| Ring ghosts (`ringGhosts`) | Shown: the planned sleeps after the running one. The running arc is unchanged (ends at now, no dashed tail). | Shown, as when nothing runs. |
| Window row (`windowRow`) | Shown for the next sleep after the running one (`Nap likely 13:40 – 14:20` / bedtime). **No Skip** while sleeping. | Shown with Skip, as when nothing runs. |
| Widgets, lock-screen notification | Unchanged: no next sleep while sleeping. The widget refresh (`fetchSnapshotAndChildren` in `src/widget/model.ts`) sets `nextSleep: null` itself while `sleepTimer` is set, since core now returns a plan. | Unchanged. |
| Replay (`replay.ts`) | Unchanged: it always passes `running: null`. | — |

The other conditions on the row and ghosts stay (`live`, day window, not editing, tiles panel).

## Steps

1. [x] **Core rule** (`packages/core`, unit TDD). Projection in `sleepContext`, bedtime detection, `usualNapLength` shared. Update the tests that asserted "hidden while a sleep timer runs" in `next-sleep.test.ts` and `day-plan.test.ts` to the new rule.
2. [x] **Widget keeps hiding** (`src/widget/model.ts`, unit test): a running sleep timer gives `nextSleep: null` in the snapshot.
3. [x] **Dashboard** (`index.tsx`): drop `!sleepRunning && !feedRunning` from the ghosts condition and `!feedRunning` / `!sleepRunning` from the row's, hide Skip while a sleep runs. Playwright (`e2e/tests/day-plan.spec.ts` or `running.spec.ts`) with `page.clock` and a started sleep.
4. [ ] **Look review and wrap up**: web and emulator, both themes, largest font, per `TEST_STRATEGY.md`. Update this plan's row in `plans/README.md` and fix its architecture line that says the prediction is hidden while a sleep runs.

## Out of scope

- A dashed "likely wake" tail on the running arc.
- Next sleep on widgets or the notification while sleeping.
- Changing any tuning number, or the replay.
