# Test strategy: done when every box is ticked

Tests first for `packages/core` (Vitest, Given / When / Then, zero → one → many, then boundaries and errors). The screen is covered by Playwright against the built web image, and its look by a manual review. Fixtures are made up.

## Unit (Vitest, `packages/core`)

### `day-window.test.ts`

Learned wake 08:30, "Day starts" 08:00, night from 22:42, 3–6 month band (threshold 60 min) unless said:

- [ ] Nothing learned: the existing range tests pass unchanged.
- [ ] Woke 06:03, awake at 07:05: `dayWindow` is a day from 06:03.
- [ ] Woke 06:03, awake at 06:40: still the night.
- [ ] Woke 06:03, asleep from 08:38: `isNight` is false for it, and `dayWindow` at 09:00 is Today from 06:03.
- [ ] Woke 07:45 (inside both ranges): a day from 07:45, as before.
- [ ] Learned 07:00, "Day starts" 08:00: a wake at 10:30 after a bad night counts (range end 11:00); one at 11:01 doesn't.
- [ ] Wake at 06:00 (exactly `before` ahead of the setting) counts; 05:59 doesn't.
- [ ] Woke 06:03, back asleep at 06:30: the 06:03 waking is part of the night (`isNight` true for the 06:30 sleep).
- [ ] Awake 03:00–04:00: still the night.
- [ ] `nightFrom` for a sleep from 08:38 in the issue's morning is null (a nap whenever it stops).
- [ ] Regression: the issue's morning end to end, one test.

### `day-rhythm.test.ts`

- [ ] Learned-times helper: none learned → both null; wake only; both; bedtime past midnight shown as `00:15`; under 3 months → wake null.

### Whole suite

- [ ] `day-fixtures.test.ts` green for every profile and setting.
- [ ] `pnpm replay:fixtures` scores, before and after, in `NOTES.md`; no new wake or bedtime "right" count below the `implan-day-night` numbers.

## Playwright (`e2e/tests/day-night.spec.ts`)

- [ ] The child screen's new explainer is shown; "Day starts 07:00" still there.
- [ ] No sleeps: "Still learning".
- [ ] Seeded made-up days: "Molly has learned: wakes about HH:MM, bed about HH:MM" with the seeded times.
- [ ] The issue's morning (if the seed can learn a wake later than the setting): stopping the 08:38 sleep saves `nap: true`. Otherwise the reason is in `NOTES.md`.
- [ ] Existing day-night, settings and children specs pass.

## Manual look review (web and emulator-5554)

- [ ] The "Day and night" panel's new line fits at 412 px wide in every theme and reads well with "Still learning".

## Wrap-up

- [ ] `implan-cleanup` wrap-up sweep run; findings applied or noted.
- [ ] `CLAUDE.md`, `plans/README.md`, `plans/implan-day-night/NOTES.md` pointer updated.
- [ ] `pnpm check` and `pnpm e2e` green; PR open against `develop`.
- [ ] Issue #18 updated with anything that changed during the work.
