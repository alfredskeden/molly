# Notes

## Decided (issue #48)

- Principle: the ring turns to night only for a sleep the app called bedtime, or when it predicted nothing. "What the app showed" is the day plan's first unskipped sleep (`dayPlan` with skips, as the widgets show it), from the sleeps before the judged one, at its start.
- Rules 1–5 as in `MAIN.md` ("The rule"). Thresholds are the age band's existing `awake` (capped at ⅔ of the learned first wake window) and `long`.
- A skipped nap makes the next sleep the night (rule 3), wherever it starts; the undo still applies.
- The plan showing bedtime without a skip doesn't force the night; today's rules decide (rule 4), so a doze well before the bedtime window isn't the night.
- `bedtimeCut` (90) and `bedtimeWithin` (60) don't change.
- Nothing is stored; every render judges again. The saved `nap` flag is never patched.
- No recursion through history: only the day being decided consults the plan; the plan's inputs use rules 4 and 5 only.
- Accepted limits (issue): a planned nap that turns into the night shows the day until it has run `long`, then flips from its start; under rules 3 and 4 a sleep shows the night while it runs and until the baby has been up `awake` after it; under rule 4 a real bedtime that ends short followed by a long time awake moves the night's start to the next sleep.
- Out of scope: the morning ring staying night until the wake is confirmed; #47.

## Decided while planning

- **Seam**: the plan reaches `dayOn` as a function on the `DayRhythm` (`shown: ShownAt | null`), set by `withPlan(rhythm, birthDate, skips)` in a new `shown-plan.ts` that imports `day-plan.ts`. `day-window.ts` only imports the type from `day-rhythm.ts`, so no cycle. Considered and rejected: (a) a new parameter on `dayWindow` / `windowsBefore` / `isNight` / `nightFrom` / `pastDays` / `wakeAndBedtime` and everything that forwards them (~15 signatures, every test); (b) moving `predictSleep` / `sleepContext` below `day-window` (they read `dayWindow` and `pastDays`, so the cycle stays); (c) `dayRhythm` taking skips (`day-rhythm.ts` can't import `day-plan.ts` either: `day-plan` → `next-sleep` → `day-window` → `day-rhythm`).
- **Fallback**: a rhythm without `shown` (every caller until wrapped, `replay.ts`) gets rules 4 and 5. That is the "no plan" row of the rule, so it is always a valid answer.
- **Today keeps the plan inside `next-sleep.ts`**: `awakeContext`'s today `dayWindow` and `sleepContext`'s running-sleep `isNight` use the rhythm they're given (planned from the app), `pastDays` uses `withoutPlan`. Plain everywhere would hide the plan for `awake` minutes after a planned nap near bedtime and while it runs, which is the issue's symptom.
- **Past days use the plan too** (`windowsBefore`, `windowsOn`), with whatever skips the caller has: one level only, since each judgement is plain inside. A past day older than the caller's skips (the dashboard fetches `molly-skip` since 2 midnights; Recent days has every loaded week's) is judged without its skips: rule 3 doesn't apply there and the cut decides. Recent days and the dashboard pager can then disagree on a skipped day older than 2 midnights only until the dashboard has the weeks loaded (it merges `mergeDays(days.data.pages)` already for entries; pass its skips too).
- **Callers without skips** (Vitamin D check after a stop, development topic, `replay-naps --reflag`): `withPlan(..., [])`, so rules 1, 2, 4, 5 apply.
- **`replay.ts` scoring stays plain**: it measures the prediction against what happened; judging what happened by the prediction would score it against itself.
- **Life Sim**: bump `NEEDS_TUNING.rhythmVersion` 3 → 4; the window split changed and the rhythm is persisted with `staleTime: Infinity`.

## Verified in the code (2026-11-15, `develop` at 414159d)

### The bug

- `isBedtime` (`packages/core/src/day-window.ts:167-173`): `start >= usual - bedtimeCut` → true, whatever its length; else `start >= usual - eveningFrom` and ran ≥ `band.long` (running up to `now`).
- `dayOn` (`day-window.ts:137-149`): `after.findIndex(isBedtime)` over the sleeps from the wake to the next day's wake range; the first hit is the bedtime, everything after it belongs to that night. Nothing undoes it.
- `predictSleep` (`next-sleep.ts:231-245`): a nap while its window starts before `bedtime - bedtimeWithin` and the day hasn't its usual naps (`usualNaps`). So a nap window starting between usual − 90 and usual − 60 is shown as a nap and judged the night.
- Throwaway test (not committed): learned bedtime 21:45 (`rhythm.bedtime` 1305), 5-month child, today's sleeps 21:45–07:00, 09:00–10:00, 15:00–16:30, then 20:30–21:05. At 23:00 `dayWindow` is `night` from 20:30 and `isNight({20:30, 21:05})` is `true`. With the same history a 19:00–19:35 sleep stays a nap (before the cut). In that fixture the plan showed nap 19:10–19:50 then bedtime 22:45–23:25; step 4 needs a history with a later nap 3 for the plan to show a nap at 20:30.
- Learning is not affected: `dayRhythm` (`day-rhythm.ts:90-125`) finds past bedtimes with `firstLongSleep` (`:179-185`), a sleep from 18:00–00:30 whose chain (`asleepFrom`, `:188-195`) runs `long`. It never calls `dayOn` or `isBedtime`.

### Current signatures

- `dayWindow(entries, running, rhythm, now, bedtime = null)` `day-window.ts:24`
- `windowsBefore(entries, rhythm, now, days = 7, running = null)` `:69`; `previousWindow(entries, rhythm, now, running = null)` `:93`
- `pastDays(sleeps, rhythm, now, count)` `:121`; `wakeAndBedtime(sleeps, rhythm, day, now)` `:205`
- `isNight(sleep, sleeps, rhythm, now)` `:181`; `nightFrom(start, sleeps, rhythm, now)` `:196`
- private: `fromWake` `:42`, `windowsOn` `:101`, `dayStart` `:110`, `dayOn(sleeps, rhythm, day, days, now)` `:137`, `isBedtime(entry, usual, rhythm, now)` `:167`
- `dayRhythm(sleeps, birthDate, napWindow, now, tuning = DAY_TUNING)` `day-rhythm.ts:90`; private `asleepFrom(sleeps, index, awake, now)` `:188` (sorted by start; returns the end of the chain, a running sleep up to now)
- `nextSleep(sleeps, running, birthDate, rhythm, now, tuning, planTuning)` `next-sleep.ts:91`; `sleepContext(...)` `:134`; private `awakeContext` `:164` (today via `dayWindow` `:180`, past via `pastDays` `:187`); running sleep's `isNight` `:156`
- `dayPlan(sleeps, running, birthDate, rhythm, skips, now, tuning, nextTuning)` `day-plan.ts:42`; skips count only when tapped after the anchor (`:54`); empty when `sleepContext` is null or 45 min after the first unskipped sleep's window (`:73`)
- `Skip = { at, start, end }` `day-plan.ts:25`; `parseSkip(note)` `:107`; tag `molly-skip` `:95`
- Imports: `next-sleep.ts:4` and `needs.ts:4` and `development/sleep.ts:4` import `day-window`; `day-plan.ts` imports `next-sleep`; `day-window.ts:3` imports `day-rhythm`. `day-window` imports no planner, and must not.
- `scripts/check-boundaries.mjs` only forbids React/Expo/app imports in `packages/*`; it doesn't check cycles.

### Every caller (outside tests)

Core:
- `dayWindow`: `day-window.ts:76` (`windowsBefore`), `next-sleep.ts:180` (`awakeContext`).
- `isNight`: `day-window.ts:198,201` (`nightFrom`), `next-sleep.ts:156` (`sleepContext`, running sleep), `needs.ts:247` (`sleepingSpan`), `development/sleep.ts:36` (`sleepComparison`), `replay.ts:18` (scoring).
- `pastDays`: `next-sleep.ts:187`, `replay.ts:133`. `wakeAndBedtime`: `replay.ts:201`.
- `dayOn` (private): `fromWake` `:43,46`, `windowsOn` `:102`, `dayStart` `:111`, `pastDays` `:122`, `isNight` `:184,186`, `wakeAndBedtime` `:206`.
- `sleepContext`: `day-plan.ts:52`, `needs.ts:248`, `apps/molly/src/app/(main)/index.tsx:1076`.

App and scripts (each builds its own rhythm):
- Dashboard `apps/molly/src/app/(main)/index.tsx`: `dayRhythm` `:500`, `byRhythm` `:501` (the tap's `NightRule`), skips `:502-505`, `dayPlan` `:508`, `dayWindow` `:513`, `useNeeds({ day: rhythm })` `:515`, `windowsBefore` `:542`, `sleepContext` `:1076`, Today sheet `windowsBefore` `:1361`, nap reminder `:1099` (passes `skips`, `birthDate`).
- `apps/molly/src/actions/trackers.ts`: `NightRule` `:135`, `byClock` `:138`, `byRhythm(sleeps, rhythm, now)` `:146` → `isNight`.
- Widget `apps/molly/src/widget/model.ts`: `fetchSnapshot` `dayRhythm` `:388`, skips `:389` (notes since yesterday, `:380`), `dayPlan` `:391`, `nightFrom` `:392` → `sleepTimer.nightFrom` `:397`; per-child `timers[].sleep` copies the snapshot's `nightFrom` `:497-501`; `tapContext` → `nightRule(timer, napWindow)` `:100,107-112` (reads the cache only); Vitamin D `remindedCache` `:567-569` (birthDate fetched, no skips); `napReminderRing` `:612-621` (`NapReminderData` has `birthDate` and `skips`).
- Notification `apps/molly/src/notification/model.ts:87`: `nightRule(sleepTimer, …)` from the cache.
- Recent days: `features/days/rows.ts:32-35` (`dayRhythm`, `windowsBefore`, skips parsed `:28`), `app/(main)/recent-days.tsx:58-59` (`dayWindow` with the rows' rhythm).
- Life Sim `features/dashboard/queries.ts:198-208` (`useRhythm`: `windowsBefore` with the dashboard's `day`, persisted, key has `NEEDS_TUNING.rhythmVersion`, now 3 at `packages/core/src/needs.ts:15`).
- Needs `features/needs/use-needs.ts:52` (`sleepingSpan` with `day`).
- Development `features/development/TopicPersonal.tsx:57,115-116` (`dayRhythm`, `dayWindow`, `vitaminDCycle`; no skips).
- Child screen `app/(main)/child/[id]/index.tsx:105` (`learnedTimes(dayRhythm(...))`: learning only, not affected).
- `scripts/replay-naps.ts:67-68` (`--reflag`: `isNight`), `packages/core/src/replay.ts` (`dayPlan`, `nextSleep`, `isNight`, `pastDays`, `wakeAndBedtime`).

### How birthDate and skips flow today

- birthDate: the dashboard has `child.birth_date` (`index.tsx:498`); the widget refresh fetches `listChildren()` (`model.ts:378,387`); Recent days gets it from `useChildrenOnScreen` (`recent-days.tsx:49`); Vitamin D refresh fetches children (`model.ts:564-566`); TopicPersonal has `child.birth_date`.
- skips: dashboard `useSkipNotes` (`features/dashboard/queries.ts:166-178`, since `PAST_MIDNIGHTS` = 2 midnights, `:125`); Recent days' week pages carry `skips` (`features/days/queries.ts:30-45`); widget refresh since yesterday (`model.ts:380`); nap reminder refresh `model.ts:660-662`. Vitamin D refresh and TopicPersonal have none.
- The tap: `byRhythm` closes over the dashboard's `rhythm`, so wrapping it there carries the plan to `stopSleep` / `addEntry`. The widget and notification taps read `nightFrom` from the cache (`nightRule`); a timer started on this phone since the last refresh goes by the clock (unchanged).

### Tests that pin the old rule

- `day-window.test.ts` `the day window at bedtime` (`:68-136`): 19:25–21:00 at 21:30 and 18:30–19:40 at 20:00 with the setting's 19:00 bedtime: up 30 and 20 min (< 60), so still the night under rule 5. Expected unchanged.
- `bedtime by the child's rhythm` (`:742-843`) and `when stopping a running sleep starts to save the night` (`:932-962`): plain rhythm, no undo case (quick waking 21:00–21:50 / 22:10 chains). Expected unchanged.
- `e2e/tests/settings.spec.ts:249-275`: 16:30–17:00 sleep, clock 18:20, "Day ends" moved to 17:00 → expects "Tonight · Bedtime 16:30". Up 80 min > the test child's `awake` (born 2026-04-27 in `e2e/seed.py:10`: 6–12 month band, 45 min, until April 2027 when it becomes 40), so rule 5 undoes it. Must move.
- `e2e/tests/today-window.spec.ts:61-86` and `recent-days.spec.ts:264` (19:25–22:30 at 23:10): 3 h 05 stretch ≥ `long`, kept. `ring.spec.ts:95,113` ("Bedtime 19:05" from `seedNight` / `seedDay`): check the seeded nights run long (they're whole nights).

### Cleanup sweep (planning, `implan-cleanup`)

- Remove: nothing becomes dead. `isBedtime` stays (rule 4 and rule 2's branch), `bedtimeCut` / `bedtimeWithin` stay (decided), `byClock` / `nightRule` stay (fallbacks).
- Refactor first (step 1): export `asleepFrom` instead of copying the chain into `day-window.ts` (one rule for "a stretch", shared by learning and the undo); pull the bedtime search out of `dayOn`.
- Data: `NEEDS_TUNING.rhythmVersion` bump (persisted Life Sim rhythm, step 7).
- Docs and comments that would lie after the change (step 9): `CLAUDE.md:63` bedtime sentence and `:64` "Past days are split… by the day rhythm"; `day-window.ts:131-136` (`dayOn`), `:162-166` (`isBedtime`), `:175-180` (`isNight`), `:191-195` (`nightFrom`); `day-rhythm.ts:29-32` (`bedtimeCut`, `eveningFrom`), `:187` (`asleepFrom`); `next-sleep.ts:116-120` (`sleepContext`); `actions/trackers.ts:131-147`; `e2e/tests/settings.spec.ts:266`; `plans/implan-day-night/NOTES.md:8,36`.
- Tests: none become obsolete; `settings.spec.ts` moves (step 8).
- Spotted, not in scope: `plans/implan-night-ends-at-wake/MAIN.md:46` and other finished plans describe the cut as it was then; they are history, not current docs, and stay.

## Open

1. **The saved flag under rules 3 and 4.** A short sleep near bedtime with no planned nap (rule 4), or right after a skip (rule 3), is stopped while it is still bedtime, so it is saved `nap: false`; once the baby has been up `awake` minutes the ring and Recent days call it a nap, but the flag is never patched. Is that acceptable (the issue's "the 20:30 sleep is a nap" read as the verdict `isNight`, which Recent days, needs and the development stats use, not the saved flag)? The alternative is a later patch, which CLAUDE.md rules out.
