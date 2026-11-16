# Test strategy: done when every box is ticked

Tests first for `packages/core` (Vitest, Given / When / Then comments, zero → one → many, then boundaries). App logic by Vitest in `apps/molly`, screens by Playwright against the built web image. Fixtures are made up; no real logs are committed, and the rules are never tuned to one child.

Unless said: 5-month child (3–6 month band, `awake` 60, `long` 2 h), learned wake 07:00, learned bedtime 21:45, woke for the day at 07:00. "Planned" means the rhythm's `shown` says `'nap'` at that sleep's start (a stub in `day-window.test.ts`, the real planner in `shown-plan.test.ts`); "skipped" means `'skipped'`; "no plan" means `shown` is null or answers null.

## Unit (Vitest, `packages/core`): the issue's scenarios

### A sleep the plan showed as a nap is a nap (rules 1, 2)

- [x] Timer since 20:30 (planned), at 21:00: `dayWindow` is the day from 07:00; `isNight({20:30, 21:00})` false (stopping saves a nap); `nightFrom(20:30)` = 22:30.
- [x] 20:30–21:05 (planned), nothing since, at 21:30: day from 07:00.
- [x] 20:30–21:05 (planned) and 23:20–07:00, at 02:00: night from 23:20; `windowsBefore` ends that day at 23:20.
- [x] Timer since 20:30 (planned): at 22:29 day from 07:00; at 22:30 night from 20:30.
- [x] A planned nap starting before `eveningFrom` (18:45) that runs `long` stays a nap.
- [x] With the real planner (`withPlan`): a fixture whose `dayPlan` at 20:30 shows nap 3 gives the same four results.

### A skipped nap makes the next sleep the night (rules 3, 5)

- [x] Timer since 18:30 (skipped), at 18:45: night from 18:30; `isNight` true.
- [x] 18:30–18:50 (skipped), nothing since, at 20:00: day from 07:00. At 19:49: still the night.
- [x] With the real planner: a `molly-skip` skip of nap 3 tapped before 18:30 → `'skipped'` for the 18:30 sleep.

### Without a planned nap or a skip (rules 4, 5)

- [x] 20:30–21:05, nothing since, at 23:00: day from 07:00; `isNight` for it false.
- [x] Same sleep: at 21:30 and 22:04 night from 20:30; at 22:05 day from 07:00.
- [x] Timer since 20:30, at 21:00: night from 20:30.
- [x] 21:00–21:50 and 22:10–07:00, at 02:00: night from 21:00.
- [x] 21:00–21:40 and 21:55–23:30, nothing since, at 01:00: night from 21:00.
- [x] 21:00–02:00, nothing since, at 03:30: night from 21:00.
- [x] After an undo the next sleep is judged: 20:30–21:05 then 23:20–07:00, at 02:00: night from 23:20.
- [x] Boundaries: stretch exactly `long` kept, `long` − 1 min undone; up exactly `awake` undoes, `awake` − 1 min doesn't.
- [x] Under 3 months (`awake` 75, `long` 3 h): one undo with those numbers.
- [x] `shown` answering null gives the same results as no `shown` (rule 4 is the fallback).

### The planner (`withPlan`)

- [x] Bedtime shown without a skip → null. No birth date, age outside 6 weeks–36 months, more than 6 h awake, 45 min after the window → null.
- [x] A catnap under 15 min before the judged sleep is passed in `before` and doesn't anchor the plan.
- [x] The judge is asked with the sleeps that started before the judged one, at its start.
- [x] No recursion: the rhythm `dayPlan` gets inside a judgement has `shown === null`; `pastDays` in `sleepContext` are the plain verdicts even with a planned rhythm.

### The plan stays visible (`next-sleep.ts`)

- [x] At 21:30 after the planned 20:30–21:05 nap: `nextSleep` not null, `dayPlan` not empty.
- [x] While the planned nap runs at 21:00: `dayPlan` shows the sleeps after it.

### Whole suite

- [x] `pnpm test` green. Every changed expectation changed only because a short bedtime was followed by `awake` minutes up (rule 5); anything else is a regression to bring to the developer.
- [x] `pnpm replay:fixtures` before and after recorded in `NOTES.md`; a moved score is reported, not tuned.
- [x] Cost measured (MAIN.md step 6) and recorded; memoised only if over budget.

## Unit (Vitest, `apps/molly`)

- [x] Widget snapshot: a running sleep that started at a planned nap near bedtime has `nightFrom` = start + `long`; after a skip, `nightFrom` = start.
- [x] `byRhythm` with a planned rhythm: a stopped planned nap near bedtime saves as a nap.
- [x] `napReminderRing` and `remindedCache` tests green.

## Playwright

- [x] `settings.spec.ts` "a child's day and night…" moved (clock within `awake` of the 16:30–17:00 sleep) and still shows "Bedtime 16:30" after "Day ends" moves to 17:00.
- [x] New in `day-night.spec.ts`: a short sleep near the usual bedtime that the plan showed as a nap keeps "Today" and saves `nap: true`.
- [x] `today-window`, `ring`, `recent-days`, `day-plan`, `next-sleep`, `day-night` specs green.

## Checks

- [x] `pnpm check` green (boundaries, typecheck, lint, all Vitest, web bundle).
- [x] `pnpm e2e` green (a DST-day failure that also fails without the change is noted, not fixed here).
- [x] No import cycle: `day-window.ts`, `next-sleep.ts`, `day-plan.ts` don't import `shown-plan.ts` (grep).
- [x] `NEEDS_TUNING.rhythmVersion` is 4.
- [x] Doc comments and docs describe the new rule: `isBedtime`, `dayOn`, `isNight`, `nightFrom`, `asleepFrom`, `DayTuning.bedtimeCut` / `eveningFrom`, `sleepContext`, `NightRule` / `byRhythm`; `CLAUDE.md` "Day and night" and "Next-sleep prediction"; `plans/implan-day-night/NOTES.md`; `plans/README.md`.

## The developer's (after the PR)

- [ ] `pnpm replay:naps <sleeps.json> <birth date>` on their own logs as a sanity check only: hit rate and nap flags shouldn't drop. The data is fetched separately and never committed; a worse number is reported, never tuned for one child.
- [ ] Pixel: a nap the hero showed near bedtime stays Today, its Stop says "saves as nap" on the lock screen, and Recent days ends the day at the real bedtime.

## Manual (agents: emulator-5554 only)

- [ ] Same flow on the emulator: planned late nap logged → ring stays the day, widget and lock-screen "saves as nap"; a skip then a sleep → the night.
