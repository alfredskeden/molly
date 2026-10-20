# Nap or night: Definition of Done

Done when every item below is true. Method as in the root `CLAUDE.md`: unit TDD for `packages/core` (Given / When / Then, zero → one → many, then boundaries), unit tests for app models (`trackers.ts`, `notification/model.ts`, `editor-model.ts`), Playwright on the web image for the editor, the emulator for widget and lock-screen checks, manual review for looks.

Example times assume the nap window 07:00–19:00; the rules are what's checked.

## Nothing regresses

- [x] `pnpm check` is green (boundaries, typecheck, lint, all Vitest, web-bundle check).
- [ ] Every existing Playwright spec passes. (2026-10-04: all but two in `running.spec.ts`, which fail the same way on `main`; see `NOTES.md`.)
- [x] `dayWindow`, `windowsBefore` and `previousWindow` tests pass unchanged.
- [x] For logs where every bedtime starts after the window end and the day has its usual naps, `nextSleep` and `dayPlan` give what they gave before, except where the new late bound or short-nap rule applies.
- [x] `nextSleep` equals `dayPlan`'s first unskipped sleep, awake and with a nap running.

## The rule (core)

- [x] Started after the window end, or before its start: night.
- [x] Started inside and ended by the window end: nap. Started inside and still going at the end: night. Ending exactly at the window end: nap.
- [x] `dayWindow`'s night start comes from the same function.

## Prediction (core, made-up logs from `NOTES.md`)

- [x] **Early bedtimes saved as naps** (2 of 3 evenings at 18:45 flagged `nap: true`), nap 3 running since 15:26, now 16:04: the plan's next sleep is bedtime, starting in the evening, near the usual 18:45–19:15; no 4th nap, nothing after midnight.
- [x] The same logs with every flag flipped give the same plan (the flag is never read).
- [x] **Clean logs, 3 naps usual**, same today: bedtime next, not a 4th nap and 22:06.
- [x] Awake after the day's usual number of naps: bedtime next, from the first planned sleep on.
- [x] A child who usually takes 4 naps still gets a 4th nap planned.
- [x] Bedtime never starts more than `bedtimeWithin` after the usual bedtime (with enough logged bedtimes), nor more than `bedtimeWithin` before it when the nap count ends the day.
- [x] Short naps: shortfall against each slot's usual length moves bedtime earlier by `shortNapShare` × shortfall; naps at or over usual length move nothing; a slot without history adds nothing.
- [x] Short naps and skips together move bedtime at most `earliestBy`, and never before the last wake + the age guide's shortest last window.
- [x] A day with a logging gap (no logged bedtime) among the past days can't push bedtime past the late bound.

## Replay

- [x] `replay.ts` scores nap / bedtime / night by the rule; its tests cover a bedtime flagged as a nap.
- [ ] If real logs are supplied: before / after numbers for bedtime hit rate and median miss in `NOTES.md`.

## Saving (app unit tests)

- [x] Stopping a sleep timer that started 18:45, stopped after 19:00: saved with `nap: false`. Started 18:00, stopped 18:40: `nap: true`. Same through a widget / notification intent.
- [x] Add entry with start and end: `nap` from the rule.
- [x] Lock-screen line for a running sleep reads "saves as night sleep" once it runs past the window end, "saves as nap" before.

## Editing (Playwright, `page.clock`)

- [x] A saved sleep opened in the editor shows `Nap | Night sleep` with its saved value; switching and Done saves the new flag, and the title follows after the refetch.
- [x] Changing only the times keeps the saved flag.
- [x] The running-sleep editor has no choice row.

## Looks (manual)

- [ ] Web and emulator, day and night themes, largest font: the editor's choice row fits beside the time rows; the window row reads a believable bedtime on the screenshot scenario.
- [ ] Emulator: lock-screen "saves as …" line across 19:00 with a sleep running.
