# Test strategy: done when every box is ticked

Tests first for `packages/core` (Vitest, Given / When / Then, zero → one → many, then boundaries and errors). The screen by Playwright against the built web image. Fixtures are made up.

## Unit (Vitest, `packages/core`)

### `day-window.test.ts`

Learned wake 07:30, bedtime 22:40, 3–6 month band, unless said:

- [x] Wake 06:00, at midday: `previousWindow` is the night 22:40 → 06:00; `dayWindow` starts at 06:00.
- [x] Wake 08:15: the night ends 08:15, Today starts 08:15.
- [x] `windowsBefore` over a week: each night's `end` equals the newer day's `start`; each day's `end` the newer night's `start`.
- [x] No wake found the next morning: the night ends at that day's "Day starts".
- [x] Live night, no wake yet: `dayWindow` still ends at the usual wake (existing tests green).
- [x] Day with a wake and no bedtime, learned bedtime 21:00, "Day ends" 19:00: the day ends 21:00 and its night starts 21:00, past and live; `windowsBefore` lists that night once.
- [x] Learned bedtime 18:30, "Day ends" 19:00: no gap.
- [x] No wake that day: clock day and clock night as before.
- [x] Bedtime after midnight and the clock-change groups pass, with nights ending at the next wake.
- [x] The old past-page expectations (`week` / `days` fixtures, night ending at 07:00 after a 06:40 wake) now end at 06:40.

### Counts

- [x] A feed at 06:20 and a diaper at 06:30 after a 06:00 wake count in Today's `windowStats`, not last night's; last night's `sleptMs` ≤ bedtime → wake.

### Whole suite

- [x] `pnpm test` green; every changed expectation changed only because a night now ends at the next day's start (or a no-bedtime night starts at its day's end). `day-fixtures.test.ts` and `needs-seeded.test.ts` green.

## Playwright

- [x] `day-night.spec.ts`: learned 08:30 wake, 06:03 wake, a feed 06:20 and a diaper 06:30 → last night's ring and boxes don't count them, its pager ends at 06:03; Today's sheet counts them.
- [x] Existing `ring.spec.ts`, `recent-days.spec.ts`, `day-night.spec.ts` green.

## Checks

- [x] `pnpm check` and `pnpm e2e` green.
- [x] Doc comments in `day-window.ts` (`windowsBefore`, `windowsOn`, `nightOf`) describe the new ends; `CLAUDE.md`, `plans/implan-day-night/NOTES.md`, `plans/README.md` updated.

## Manual (emulator-5554, after the PR)

- [ ] A morning after an early wake: last night's sleep arc reaches the top of the ring; the morning's feeds show only on Today.
