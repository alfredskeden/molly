# Nap or night

Context: the prediction from [`../implan-next-nap/MAIN.md`](../implan-next-nap/MAIN.md), the day plan from [`../implan-day-plan/MAIN.md`](../implan-day-plan/MAIN.md) and the running-nap rule from [`../implan-plan-while-asleep/MAIN.md`](../implan-plan-while-asleep/MAIN.md), which this changes. Facts, research and the reproduced bug are in [`NOTES.md`](NOTES.md), the Definition of Done in [`TEST_STRATEGY.md`](TEST_STRATEGY.md), the picture in [`MENTAL_MODEL.md`](MENTAL_MODEL.md).

**Outcome:** the day plan's bedtime is always a believable evening time, near the child's usual one, and earlier after a day of short naps. Sleeps are saved as nap or night sleep by a rule that gets early bedtimes right, and a wrongly saved one can be changed by hand.

**The bug:** a 5-month-old with three short naps, a nap running at 16:04, was shown "Nap 4 likely … Then bedtime 03:26". Past bedtimes at 18:45 were saved as naps (start inside the 07:00–19:00 window), so the prediction took a 02:00 night stretch as "bedtime". Details and a second, independent cause in `NOTES.md`.

## One rule for "is this the night?"

A sleep is **night sleep** when it started outside the nap window, or started inside it and was still going at the window's end. Otherwise it's a **nap**. (Window = the child's nap window on the sleep's start day, e.g. 07:00–19:00.)

- `18:45 → 02:00`: night. `18:00 → 18:40`: nap. `06:30 → 07:30`: night (an early wake's back-to-sleep). `19:30 → 20:00`: night.
- This is the rule `dayWindow` already uses to find where the night starts (`bedtime()` in `packages/core/src/day-window.ts`). Move it into one exported core function and use it everywhere below, so the ring, the plan and saving can't disagree.
- `isNap(start)` stays only where nothing better is known; check each caller.

## Where the rule applies

| Place | Change |
| --- | --- |
| **Saving** (`apps/molly/src/actions/trackers.ts`: `stopSleep`, `logSleep`; widget and lock-screen stops use these) | `nap` from the rule with the real end: the stop moment for a timer, the entered end for Add entry. |
| **Running sleep's words** (lock-screen "saves as nap \| night sleep", ring centre "nap so far / night sleep so far", running-sleep editor title) | The rule with end = now: what stopping now would save. |
| **Prediction** (`next-sleep.ts`, `day-plan.ts`) | Never reads `nap`. A past day's bedtime is the first sleep after its morning wake that the rule calls night; the naps are the sleeps before it. Feeds `bedtimeAwake`, `usualBedtime`, `napAwake`, `usualNapLength`, `usualNapCount`. |
| **Replay** (`replay.ts`) | Classifies logged sleeps by the rule too, so its scores match what the plan predicts. |
| **Labels of saved sleeps** (Today sheet, editor title, ring spoken text, centre "since the nap") | Unchanged: the saved flag. |

## Editing the flag

The sleep editor (`apps/molly/src/features/dashboard/Editor.tsx`, wired in `src/app/(main)/index.tsx`, `editor-model.ts`) gets a `Nap | Night sleep` choice row, like the feed editor's kind row. It starts at the saved flag; Done sends `nap` with the times (`patchOf`). Changing the times doesn't flip it. Not offered for a running sleep (nothing is saved yet).

## Prediction fixes

All in `packages/core`, unit TDD, tuning next to the existing knobs.

1. **Bedtime by timing** (above). Alone this turns the 03:26 into an evening bedtime.
2. **Nap count from the first planned sleep.** `dayPlan` checks "the day already has its usual naps" for every planned sleep, including the first (today it starts at the second). With a nap running, the running nap counts. `nextSleep` must keep equalling the plan's first unskipped sleep, so the check belongs where both see it (`predictSleep`'s `bedtimeNext`, fed by the usual count), not only in the `dayPlan` loop.
3. **Bedtime stays near the usual one.** The plan's bedtime starts no later than usual bedtime + `bedtimeWithin` (60 min), as it already starts no earlier than usual − 60 when the nap count ends the day. Only with enough logged bedtimes (`bedtimesNeeded`); otherwise the nap-window end stands in, as today.
4. **Short naps pull bedtime earlier.** Shortfall = the sum, over today's real naps (the running one at its assumed length), of the slot's usual length minus the actual length, only for slots with logged history, never below 0 in total. Bedtime moves earlier by `shortNapShare` × shortfall (new `DAY_PLAN_TUNING` knob, start at 0.5). It shares the existing `earliestBy` cap (60 min) with skips and the existing floor (last wake + the age guide's shortest last window), through `earlierBedtime`. Research gives direction, not size (`NOTES.md`), so the numbers stay conservative and tunable.

No new age rule for a 4th nap: the child's own usual nap count decides, which already follows the catnap-then-early-bedtime pattern the guides describe.

## Steps

1. [x] **The rule** (core, unit TDD): one exported function for night vs nap from start, end and nap window; `dayWindow` uses it (its tests unchanged).
2. [x] **Bedtime by timing** (core): past days split by the rule, no `nap` reads in `next-sleep.ts` / `day-plan.ts`. The early-bedtime scenario from `NOTES.md` as a test: evening bedtime, not 01:56, and 3 naps usual.
3. [x] **Nap count and late bound** (core): fixes 2 and 3. The clean-data scenario as a test: bedtime after nap 3, not a 4th nap and 22:06.
4. [x] **Short naps** (core): fix 4, `shortNapShare` tuning.
5. [ ] **Replay by the rule** (`replay.ts`, its tests). Done in code; left: if real logs are supplied, before / after numbers into `NOTES.md`.
6. [x] **Saving and running words** (`trackers.ts` + its tests, `notification/model.ts` + its tests, `index.tsx`).
7. [x] **Editor choice** (editor model unit tests, Playwright on the web image).
8. [ ] **Look review and wrap up** per `TEST_STRATEGY.md`. Update this plan's row in `plans/README.md`; update the architecture note on next-sleep prediction if wording changed.

## Out of scope

- Rewriting flags already saved in Baby Buddy (done by hand with the editor).
- Changing labels of saved sleeps to the rule.
- A fixed clock cap on bedtime (families differ: mean bedtimes range 19:27–22:17 across countries).
- An age-based "no 4th nap after 5 months" rule.
- Changing Baby Buddy's server nap settings.

## Assumptions

- The nap window per child (`childPrefs(...).napWindow`) is the window the rule uses, on saving and predicting alike.
- The stop moment is close enough to Baby Buddy's stored end to decide the flag (timers end at the server's now).
- Past days with logging gaps stay noisy; the clamps exist so they can't produce absurd times.
