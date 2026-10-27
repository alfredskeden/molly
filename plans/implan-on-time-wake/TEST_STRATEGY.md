# Test strategy: done when every box is ticked

Tests first for `packages/core` (Vitest, Given / When / Then, zero → one → many, then boundaries and errors). App logic by Vitest in `apps/molly`, the screen by Playwright against the built web image. Fixtures are made up.

## Unit (Vitest, `packages/core`)

Learned wake 08:08, 3–6 month band (60 min awake), night from 21:00 the evening before, unless said.

### The day starts at once

- [x] Night 05:10–08:05, at 08:08: `dayWindow` is the day, from 08:05.
- [x] A sleep ending 05:10, at 05:20 with no new sleep: still the night.
- [x] An end 30 min before or after the usual wake starts the day at once; 31 min away waits the threshold.
- [x] An on-time end with no night before it (no sleep started since the evening before): no wake, as before.
- [x] Setting standing in (under 3 months, or under 3 learned days): on time is measured from "Day starts".
- [x] Learned wake 08:30, "Day starts" 08:00: an end at 07:40 is not on time and waits the threshold.
- [x] `dayRhythm` learns the same usual wake, bedtime and first wake window from fixtures with on-time wakes as before.

### Back to sleep, or a nap

- [x] Wake 08:05, sleep running from 08:15, at 08:20: `dayWindow` is the night.
- [x] That sleep stopped at 09:30: `isNight` true; `nightFrom` for it is its start.
- [x] It ends 08:35: the day starts at 08:35 at once. It ends 09:30: the night until 10:30, then the day from 09:30.
- [x] Wake 08:05, sleep from 09:20: `isNight` false, the day stays from 08:05.
- [x] At 08:10 after an on-time wake, `nextSleep` / `dayPlan` give a first nap; after the undo, none.

### Replay

- [x] `replayPlans` plans an on-time day at its wake, other days at wake + `awake`, using the same on-time check as `firstWake`.
- [x] `day-fixtures.test.ts` and the replay tests green; any score that moves is reported, not tuned.

### Whole suite

- [x] `pnpm test` green. Every changed expectation changed only because an end within 30 min of the usual wake now starts the day before the threshold.

## Unit (Vitest, `apps/molly`)

- [x] Widget snapshot: a sleep started 10 min after an on-time wake has `nightFrom` = its start (a Stop saves night).
- [x] `remindedCache` after stopping the night at an on-time wake, Vitamin D given yesterday, none today: reminder due, `cycleStart` = the wake.

## Playwright (`e2e/tests/day-night.spec.ts`)

- [x] Usual days waking 08:08, last night 21:00 → 08:05, clock 08:08: `Day started 08:05` shows, no "Tonight".
- [x] Then a sleep 08:15–09:30 added: saved `nap: false`, and at 09:35 the screen shows the night.
- [x] Existing `day-night`, `ring`, `recent-days`, `next-sleep`, `day-plan` specs green.

## Checks

- [x] `pnpm check` green; `pnpm e2e` green apart from the 7 specs that break on the day after a DST change (see `NOTES.md`, fail the same without this change).
- [x] Doc comments describe the new rule: `firstWake`, `dayOn`, `AgeBand`, `replayPlans`. `CLAUDE.md` "Day and night", `plans/implan-day-night/NOTES.md`, `plans/README.md` updated.
- [x] `DAY_TUNING.onTime` is the only place the 30 min lives.

## Manual (emulator-5554, after the PR)

- [ ] Stop a night sleep at about the learned wake: the ring, widget and lock screen switch to the day within a refresh, and the first nap shows.
