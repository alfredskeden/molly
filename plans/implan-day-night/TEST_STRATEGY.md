# Test strategy: done when every box is ticked

Tests come first for `packages/core` and the plain-TS app models (Vitest, Given / When / Then, zero → one → many, then boundaries). Fixtures are made up, covering several ages; real logs are never committed. Screens are covered by Playwright against the built web image, and the live ring by a manual check on the emulator (never the developer's phone).

## Unit: `packages/core`

### Refactor first (step 1)

- [ ] The prediction's past days (wake, naps, bedtime) come from the same function as the Recent days windows. `next-sleep`, `day-plan`, `needs` and `day-window` suites pass unchanged.

### The child's rhythm (step 2)

- [ ] Usual wake: the median of the past wakes; fewer than 3, the setting's start; a median outside 05:00–11:00 is clamped.
- [ ] Usual bedtime: the median of past bedtimes, with a bedtime after midnight counted as late (00:15 is later than 23:00); fewer than 3, the setting's end; clamped to 18:00–00:30.
- [ ] Usual first wake window: the median of wake → first nap; none with no days.
- [ ] Age band by birth date: 2 months, 4 months, 8 months and 18 months each get their band; no birth date gets the 3–6 month band.
- [ ] The anchor doesn't drift: on a 21-day fixture where every morning has an early waking just inside the range, the learned usual wake stays within 30 min of the fixture's real wake on every day.

### Morning wake (step 3)

- [ ] **The back-to-sleep morning**: bedtime 20:58, woke 06:31, back asleep 08:15–10:26, usual wake 08:10, 5 months. The wake is 06:31, and 08:15–10:26 is a nap.
- [ ] An early waking that is back asleep within the threshold (05:10, 20 min) is a night waking; the later wake is the morning.
- [ ] A long waking more than 2 h before the usual wake is a night waking.
- [ ] A late wake up to 3 h after the usual wake still counts.
- [ ] "Woke, then napped within the threshold": stays night, and the end of that nap is the wake.
- [ ] Live: 30 min after a 06:31 wake the window is still the night; 61 min after it is a day that starts at 06:31.
- [ ] The threshold is never more than ⅔ of the child's usual first wake window (a child whose first window is 60 min needs 40 min awake).
- [ ] Under 3 months: the range comes from the setting's start, with the 75 min threshold.
- [ ] No wake in range once the range has closed: the clock fallback (`clock: true`), as today.

### Bedtime and the nap-or-night verdict (step 4)

- [ ] **The evening catnap**: usual bedtime 21:45, a 25 min sleep at 19:30 is a nap. The card is Today during and after it, and the verdict is nap.
- [ ] A sleep starting 21:00 (within 90 min of 21:45) is bedtime from its start, even if it ended after 50 min (night waking); the sleep after it is still the night.
- [ ] A sleep starting 19:00 that runs past 2 h becomes bedtime from 19:00. Live, it's Today until 2 h in, then Tonight from 19:00.
- [ ] A 2½ h lunch nap is never bedtime.
- [ ] A bedtime after midnight (00:20, usual 23:50) is found and belongs to the day before.
- [ ] A running sleep gets the verdict stopping it now would save.
- [ ] No history at all: the verdict equals today's by-clock rule (old `isNightSleep` cases pass through the fallback).
- [ ] Across the clock change (night of 25 Oct 2026, Europe/Stockholm): the usual wake and bedtime are clock times on either side, and the night spanning the change has one bedtime and one wake.

### Callers (step 6)

- [ ] `nextSleep` / `dayPlan`: on the back-to-sleep fixture, the day plans from 06:31, with 08:15 as nap 1. On the catnap fixture, the plan is still shown at 19:45.
- [ ] `sleepingSpan`: a running night lasts to the learned usual wake.
- [ ] `vitaminDCycle` counts from the new morning wake.
- [ ] `sleepComparison` splits naps and nights by the new verdict and still groups by calendar days.
- [ ] Every core suite is green, including `needs-seeded.test.ts` and `replay.test.ts`.

## Unit: `apps/molly`

- [ ] `trackers.ts` with the fake client: `stopSleep` and `addEntry` send `nap: true` for the back-to-sleep and the catnap (given recent sleeps and birth date), and fall back to the by-clock flag with none.
- [ ] A stop never waits on fetching recent sleeps: with the history lookup failing, the stop still goes through with the by-clock flag.
- [ ] Widget model: the snapshot's day or night and plan follow the new rule on the back-to-sleep fixture.
- [ ] Notification model: "saves as nap" / "saves as night sleep" match the verdict for a running back-to-sleep and a running catnap.

## Replay (step 5)

- [ ] `pnpm replay:naps <file> <birth> --days` prints each day's wake and bedtime by the old and new rule, and lists where they differ.
- [ ] `--truth` scores right / wrong / none. `--set` takes the new tuning keys, and `--reflag` uses the new verdict.
- [ ] Made-up fixtures for under 3 months, 4–5 months, 9–12 months and a toddler score at least as well as the old rule on wakes and bedtimes. The final tuning numbers and scores are in `NOTES.md`.
- [ ] Sanity check on the developer's own logs (not committed): no day gets worse than the old rule without a written reason in `NOTES.md`.

## Playwright (seeded Baby Buddy, built web image)

- [ ] With 4 seeded days of bedtimes around 21:45, adding a sleep 19:30–19:55 yesterday through Add entry saves it with `nap: true` (checked through the API).
- [ ] With seeded days whose wake is around 08:00, adding yesterday's 06:31 wake and 08:15–10:26 sleep saves the sleep with `nap: true`, and the Recent days card for that day starts at 06:31.
- [ ] The child screen shows the new "Day starts / Day ends" copy, and changing a value still saves.

## Manual (emulator-5554)

- [ ] Ring live: start a sleep in the evening before the usual bedtime minus 90 min. It shows Today with the plan. Stopping it after 20 min saves a nap, and the lock-screen notification said "saves as nap".
- [ ] Ring live: a morning wake flips to Today once the threshold has passed, starting at the wake.
- [ ] Widgets show the same day or night as the app.

## Cleanup (from the planning sweep)

- [ ] `isNap` is no longer exported. `WAKE_RANGE_MS`, `usualMorningAfter`, `usualBedtime`, `NEEDS_TUNING.wakesNeeded` and `NEXT_SLEEP_TUNING.bedtimesNeeded` are gone (grep finds nothing).
- [ ] No caller outside the fallback uses the by-clock rule directly (grep for `isNightSleep` shows only the new verdict's fallback, or the name has moved).
- [ ] `CLAUDE.md`, `README.md`, `plans/implan-molly/NOTES.md` and the child screen copy describe the new rule. `plans/README.md` shows the plan's status.
- [ ] `pnpm check` is green (boundaries, typecheck, lint, all Vitest, web-bundle check).
