# Plan while asleep: Definition of Done

Done when every item below is true. Method as in the root `CLAUDE.md`: unit TDD for `packages/core` (Given / When / Then, zero → one → many, then boundaries), Playwright on the web image with the clock fixed by `page.clock` for the dashboard, the emulator for widgets, manual review for looks.

Example times assume the default nap window 07:00–19:00; the rules are what's checked.

## Nothing regresses

- [x] `pnpm check` is green (boundaries, typecheck, lint, all Vitest, web-bundle check).
- [x] Every existing Playwright spec passes, changed only where it asserted no likely sleeps while a sleep or feed runs.
- [x] With no timer running, `nextSleep` and `dayPlan` give exactly what they gave before (all existing tests that don't involve a running sleep pass unchanged).
- [ ] `pnpm replay:naps` gives the same numbers as before (it never passes a running timer).

## The rule (`packages/core`, unit TDD)

- [x] A nap running for less than its slot's usual length: the plan equals the plan for the same sleeps plus that nap ending at `start + usual length`.
- [x] Usual length is the slot's median from history; without history, 45 min.
- [x] The nap past its usual length: the plan equals the one for the nap ending at now. Exactly at the usual length both agree.
- [x] Two renders a few minutes apart inside the usual length give the same plan.
- [x] The next planned sleep's slot is the running nap's slot + 1 (the running nap counts even under 15 min).
- [x] Bedtime: a running sleep that turns the day window into a night gives an empty plan. So does one started when the plan's next unskipped sleep was bedtime.
- [x] Skips tapped before the running nap started don't apply while it runs.
- [x] Still hidden for every other reason: night, no birth date, age out of range, no recent sleep, a 6 h logging gap before the nap started.
- [x] `nextSleep` equals `dayPlan`'s first unskipped sleep with a timer running.

## Widget (`src/widget/model.ts`, unit test)

- [x] A snapshot fetched with a running sleep timer has `nextSleep: null`; with a running feeding timer it has the plan's next sleep.

## Dashboard (Playwright, `page.clock`)

- [x] With a nap started, the ring shows likely sleeps after it and the window row reads the next one (`Nap likely …` or `Bedtime likely …`), with no Skip button.
- [x] Clock moved inside the usual length: same times. Moved past it: times later by the overrun.
- [x] Stopping the nap: the row and ghosts follow the real wake, Skip is back.
- [x] A bedtime started in the evening: no ghosts, no window row.
- [x] With a feed running: ghosts and the window row with Skip, as with nothing running.

## Looks (manual)

- [ ] Web and emulator, day and night themes, largest font: ring with a running nap and ghosts after it, window row without Skip. Nothing overlaps the running arc's label.
- [ ] Emulator: widgets and the lock-screen notification during a nap look as before.
