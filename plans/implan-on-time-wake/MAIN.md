# The day starts at once on an on-time wake

GitHub issue #29 (the agreed spec, in Gherkin). Follows `plans/implan-day-night/` (#14), `plans/implan-early-wake/` (#18) and `plans/implan-night-ends-at-wake/` (#23). Decisions and verified facts are in [`NOTES.md`](NOTES.md), the picture in [`MENTAL_MODEL.md`](MENTAL_MODEL.md), the Definition of Done in [`TEST_STRATEGY.md`](TEST_STRATEGY.md). Work on branch `plan/issue-29-on-time-wake` (it holds this plan, cut from `develop`), PR with `--base develop`.

## Outcome

When the baby wakes from the night at about the usual time, the dashboard shows the day at once, starting at that wake.

The bug: Molly has learned "wakes about 08:08". The night sleep 05:10–08:05 is stopped at 08:05. At 08:08 the screen still says "Tonight", with "Up and about · 2m since waking up" inside the night ring. It only flips once the baby has been up the age band's `awake` threshold (40–75 min). The threshold is there so an early waking (05:10 feed, back down 05:40) doesn't start the day. A wake right at the usual time doesn't need that wait.

## The rule

A sleep end inside the wake range (`wakeRange`, unchanged) is the morning wake when:

| End is… | Next sleep exists | No next sleep yet |
| --- | --- | --- |
| **on time**: within 30 min of the usual wake | starts ≥ `awake` after the end | always (at once) |
| anything else (as today) | starts ≥ `awake` after the end | `now - end ≥ awake` |

- **Usual wake** is `rhythm.wake`: the learned wake, or "Day starts" while the setting stands in (under 3 months, fewer than 3 learned days). Once a wake is learned, an end near "Day starts" is not on time. It still gets the early-wake rule and waits the threshold.
- **The undo is the same rule, applied later.** If the baby falls asleep again within `awake` of an on-time wake, that end fails the "next sleep" column. The day is gone, the sleep counts as the night, and the next end is judged again with the same table. If it is on time, the day starts at once; otherwise it waits the threshold.
- **The tap follows without code.** The nap or night flag comes from `isNight` / `nightFrom`, which go through `dayOn`. A sleep started within `awake` of an on-time wake has no wake before it, so it is saved as night. A sleep started later (e.g. 09:20 after an 08:05 wake, past the threshold) is a nap.

### Where to change it

- `packages/core/src/day-rhythm.ts`: add `onTime: 30` (minutes) to `DayTuning` / `DAY_TUNING`, so the replay can vary it. Teach `firstWake` the on-time column, for example with an optional `onTime: { at: Date; within: number }`. Without that argument it behaves exactly as today.
- `dayRhythm`'s learning pass keeps calling `firstWake` **without** it. Learning must not use the usual wake to find the wakes it learns that usual wake from (`implan-day-night/MAIN.md`, "Learning must not feed on its own decisions"). On past days both rules give the same answer anyway, because the next sleep is known.
- `packages/core/src/day-window.ts` `dayOn`: pass the day's usual wake (`minutesPast(day, days, rhythm.wake)`) and `tuning.onTime`.

Everything that goes through `dayOn` follows: `dayWindow` (the ring, header, widgets), `isNight` / `nightFrom` (the saved flag, widget cache, lock-screen Stop), `nextSleep`, `dayPlan`, nap reminders, `vitaminDCycle`, the needs layer, past windows. No app code changes are expected.

## Steps

TDD in `packages/core` (Vitest, Given / When / Then, zero → one → many, then boundaries and errors). Fixtures are made up, never real logs. The existing `day-window.test.ts` group "the morning wake by the child's rhythm" (a 5-month child, 3–6 month band, 60 min awake) is a good place to start. You need a learned wake for most tests (seed 3+ earlier days).

- [x] **1. An on-time wake starts the day at once** (`day-window.test.ts`, new group "a wake at the usual time"). Learned wake 08:08, night 05:10–08:05:
  - **One (the bug)**: at 08:08 → `dayWindow` is `day`, `start` 08:05.
  - **Early waking keeps the threshold**: a sleep ending 05:10, at 05:20 with no new sleep → still the night.
  - **Boundaries**: end 30 min before and after the usual wake → on time; 31 min → waits the threshold. An end on time but the range check fails (no night before it) → no wake, as today.
  - **Setting stands in**: under 3 months, or fewer than 3 learned days: on time is measured from "Day starts". With a learned wake 08:30 and "Day starts" 08:00, an end at 07:40 is not on time (50 min from the learned wake): it waits the threshold.
  - **Learning unchanged**: `dayRhythm` learns the same usual wake and first wake window as before from fixtures that include on-time wakes (`day-rhythm.test.ts`).
- [x] **2. Back to sleep soon after is still the night** (same group):
  - **Undo**: wake 08:05, sleep running from 08:15, at 08:20 → `dayWindow` is the night; `isNight` for the 08:15 sleep stopped at 09:30 → true; `nightFrom(08:15…)` → 08:15.
  - **The day starts again** at the end of that sleep: it ends 08:35 (on time) → day from 08:35 at once. It ends 09:30 (not on time) → night until 09:30 + `awake`, then day from 09:30.
  - **A nap after the threshold**: wake 08:05, sleep from 09:20 (past `awake`) → `isNight` false, the day stays from 08:05.
  - **Plan**: at 08:10 after an on-time wake `nextSleep` / `dayPlan` give a first nap (no longer null as the night); after the undo, none.
- [x] **3. Replay plans an on-time day at its wake** (`replay.ts` `replayPlans`): `known` is the wake for an on-time wake, `wake + awake` otherwise. Reuse the on-time check from step 1 (export it from `day-rhythm.ts`) rather than repeating it. Rewrite the comments at the `replayPlans` doc and the "only known once" line. `day-fixtures.test.ts` and `replay*.test.ts` green. A score that moves more than a hair is something to report, not tune.
- [x] **4. Whole core suite.** An existing expectation may change only because an end within 30 min of the usual wake now starts the day before the threshold. Any other change is a regression: stop and bring it to the developer. In the REFACTOR step, rewrite the doc comments that now lie: `firstWake`, `dayOn` ("after which the baby stayed awake the band's threshold"), `AgeBand` (`awake`).
- [ ] **5. App unit tests** (`apps/molly/src/widget/model.test.ts`), no production change expected:
  - `nightFrom` in the snapshot for a sleep started 10 min after an on-time wake → its start (a Stop saves night).
  - `remindedCache` after stopping the night at an on-time wake, with Vitamin D given yesterday and not today → reminder due, `cycleStart` = the wake.
- [ ] **6. Playwright** (`e2e/tests/day-night.spec.ts`, using `seedUsualDays` / `clockAt` / `addSleep`). Seed usual days waking 08:08, last night 21:00 → yesterday 08:05:
  - clock 08:08 → `Day started 08:05` visible, no "Tonight".
  - add a sleep 08:15–09:30 → saved `nap: false`, and at 09:35 the screen is back to the night.
  - Existing `day-night.spec.ts`, `ring.spec.ts`, `recent-days.spec.ts`, `next-sleep.spec.ts`, `day-plan.spec.ts` pass. Change an assertion only for the reason in step 4.
- [ ] **7. Docs.** `CLAUDE.md` "Day and night" bullet: "after which the baby stayed up the age's threshold (so the ring stays night for that first hour)" → add that an end within 30 min of the usual wake starts the day at once, unless the baby sleeps again within the threshold. `plans/implan-day-night/NOTES.md` "Morning" line: point here. `plans/README.md` row.
- [ ] **8. Wrap-up.** `implan-cleanup` wrap-up sweep, `pnpm check` and `pnpm e2e` green, PR into `develop`, issue #29 updated with anything that changed during the work.

## Decisions and why

- **On time is measured from the usual wake only.** That is where a morning wake is expected. An early wake near "Day starts" keeps the threshold (`implan-early-wake`), because it can be an early waking.
- **30 min either side.** Close enough that a night waking is unlikely, and wide enough for normal day-to-day spread.
- **The undo uses the existing `awake` line**, not the predicted first nap. It is one line the rule already has, and it works from the first day, before any plan exists.
- **One rule, judged again on every render.** Nothing is stored. A day that started and was undone simply isn't found anymore once the next sleep exists.
- **Learning stays anchor-free.** The on-time branch is only in the deciding pass.

## Not in this plan

- `wakeRange`, the "after a night" check, bedtime (`isBedtime`, `firstLongSleep`), past-window tiling: unchanged.
- Any change to the age bands' `awake` values.
- Copy: the child screen's "A morning wake near Day starts or the learned wake starts the day." stays true.

## Assumptions

- A short flip to the day and back (wake 08:05, asleep 08:15) is accepted. The ring shows the day for those 10 minutes; nothing is stored, so nothing needs undoing apart from what refreshes recompute.
- Device and Pixel checks are the developer's (emulator only for agents).
