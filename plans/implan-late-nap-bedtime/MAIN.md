# A planned nap near bedtime stays a nap

GitHub issue #48 (the agreed spec, with Gherkin scenarios). Follows `plans/implan-day-night/` (#14), `plans/implan-night-ends-at-wake/` (#23) and `plans/implan-on-time-wake/` (#29). Verified facts, every caller and the decisions are in [`NOTES.md`](NOTES.md), the picture in [`MENTAL_MODEL.md`](MENTAL_MODEL.md), the Definition of Done in [`TEST_STRATEGY.md`](TEST_STRATEGY.md). Work on branch `plan/issue-48-late-nap-bedtime` (cut from `develop`), PR with `--base develop`.

## Outcome

A sleep the app showed as a nap is a nap, even close to the usual bedtime. The ring turns to night only for a sleep the app called bedtime, or when it predicted nothing, and a short sleep near bedtime is undone once the baby has been up for a while after it.

The bug: Molly has learned "bed about 21:45". The plan shows nap 3 next, and the baby sleeps it 20:30–21:05, then is up until 23:20. From 20:30 the header says "Tonight · Bedtime 20:30", the plan hides, the nap is saved as a night sleep, and Recent days ends that day at 20:30. The cause is two rules that disagree: `predictSleep` keeps the next sleep a nap until 60 min (`bedtimeWithin`) before the usual bedtime, `isBedtime` makes anything from 90 min (`bedtimeCut`) before it the night, and `dayOn` never undoes the first bedtime it finds. Reproduced in a throwaway test (NOTES.md).

## The rule

For each sleep after the morning wake, in order, until one is the bedtime. "Shown" is what the day plan showed next at the sleep's start: `dayPlan(sleeps before it, null, birthDate, rhythm, skips, its start)`, first unskipped entry.

| Shown at its start | Bedtime when… | Undo (rule 5) |
| --- | --- | --- |
| a nap (rule 1) | it starts ≥ `eveningFrom` before the usual bedtime **and** runs `long` (rule 2) | no |
| bedtime, after a skipped nap (rule 3) | always, wherever it starts | yes |
| bedtime without a skip, or nothing (rule 4) | today's `isBedtime`: starts ≥ `bedtimeCut` before, or ≥ `eveningFrom` before and runs `long` | yes |

**Undo (rule 5).** Its stretch is the sleep plus any that start within the band's `awake` after the previous one ends (a running one up to now): `asleepFrom` in `day-rhythm.ts`, the chain learning already uses. The bedtime is undone when the stretch ran less than the band's `long` **and** the baby was then up `awake` minutes (the next sleep started that much later, or none has and that much time has passed). An undone bedtime is a nap; the search goes on with the next sleep.

`bedtimeCut` (90) and `bedtimeWithin` (60) don't change. Nothing is stored; every render judges again.

## Design

### The seam: the plan reaches `dayOn` through the rhythm, as a function

`day-window.ts` can't import `day-plan.ts` (`day-plan` → `next-sleep` → `day-window`). Instead `day-window.ts` calls a function it is handed, and only knows its type:

- **`day-rhythm.ts`**: a new type and field on `DayRhythm`:
  ```ts
  /** What the day plan showed next at `at`, from the sleeps before it: a nap, bedtime after a skipped nap, or neither (bedtime without a skip, or no plan). */
  export type Shown = 'nap' | 'skipped' | null;
  export type ShownAt = (before: Sleep[], at: Date) => Shown;
  // DayRhythm gains: shown: ShownAt | null   (dayRhythm() sets null)
  export function withoutPlan(rhythm: DayRhythm): DayRhythm; // { ...rhythm, shown: null }
  ```
  `asleepFrom` is exported (it's private today) so `dayOn` shares learning's chain.
- **New `packages/core/src/shown-plan.ts`**: `withPlan(rhythm, birthDate, skips): DayRhythm` returns the rhythm with `shown` set to a function that runs `dayPlan(before, null, birthDate, withoutPlan(rhythm), skips, at)` and maps its first unskipped sleep: `nap` → `'nap'`; `bedtime` with a skipped entry before it → `'skipped'`; bedtime without one, or an empty plan → `null`. It imports `day-plan.ts`; nothing in `day-window` / `next-sleep` / `day-plan` imports it, so there is no cycle. Exported from `packages/core/src/index.ts`.
- **`day-window.ts` `dayOn`**: replaces `findIndex(isBedtime)` with a walk over the sleeps after the wake that asks `rhythm.shown?.(before, start)` for each (only when it could matter: see "Cost"), applies the table above, then the undo. `isBedtime` keeps today's test as rule 4 and gains rule 1's branch; the undo is a small `undone(after, index, rhythm, now)` using `asleepFrom`.

Why on the rhythm and not a new parameter: every day function already takes the `DayRhythm`, and every caller already builds it once per render or refresh next to the sleeps (NOTES.md has the list). A parameter would touch ~15 signatures and their tests for the same effect. A caller that doesn't wrap the rhythm gets rules 4 and 5 only, which is the safe fallback (no plan = no rule 1), and every existing core test keeps its meaning.

### No recursion through history

"Only the day being decided consults the plan; the plan's inputs use the rule without it."

- `withPlan` hands `dayPlan` `withoutPlan(rhythm)`, so everything inside a judgement (its `dayWindow`, `pastDays`, `isNight`) runs on rules 4 and 5 only. Depth is at most two: the app's call → one plain plan per judged sleep.
- `next-sleep.ts` `awakeContext` computes `pastDays` with `withoutPlan(rhythm)` (14 past days never ask the plan, also when the app's planned rhythm comes in), but keeps the given rhythm for **today's** `dayWindow` ("night wakings aren't predicted") and `sleepContext` keeps it for the running sleep's `isNight`. Otherwise, with the app's planned rhythm, the plan would hide between a planned nap's end and `awake` later (plain rule 4 calls it the night until the undo), and would vanish while a planned nap runs.
- Learning (`dayRhythm`, `firstLongSleep`) is untouched: it never goes through `dayOn`.

### Cost

A judgement is one `dayPlan` (two `dayOn` for today plus 14 for `pastDays`). `dayOn` asks only for sleeps where the answer can change the verdict: every sleep after the wake once `shown` is set (rule 3 can make any sleep bedtime), stopping at the first bedtime. Typical day: 3–5 judgements. `windowsBefore` judges every past day it lists (Recent days: every loaded week). Step 6 measures it; if a dashboard render or a Recent days page of 4 weeks costs more than ~20 ms on the web build, `withPlan` memoises per `(sleeps array, start)` inside its closure (the rhythm is rebuilt every render, so the cache lives one render).

### How `birthDate` and the skips reach every caller

The app wraps the rhythm where it builds it: `withPlan(dayRhythm(sleeps, birthDate, napWindow, now), birthDate, skips)`.

| Caller | birthDate | skips | Change |
| --- | --- | --- | --- |
| Dashboard `app/(main)/index.tsx:500` (ring, header, plan, needs, pager, Today sheet, `byRhythm` → `NightRule` at the tap) | `child.birth_date` | `skipNotes` (since 2 midnights) plus the Recent days weeks' skips when loaded (`mergeDays(...).skips`) | wrap; compute `skips` before `night = byRhythm(...)` (it's after today, line 501–505) |
| Widget refresh `widget/model.ts:388` (`fetchSnapshot`: plan, `nightFrom` → cached `sleepTimer.nightFrom`; per-child `timers[].sleep` copies it) | fetched children | `molly-skip` notes since yesterday (`:389`) | wrap; `nightFrom` then follows |
| Nap reminder `napReminderRing` `widget/model.ts:615` | in `NapReminderData` | in `NapReminderData` | wrap |
| Vitamin D after a stop `remindedCache` `widget/model.ts:567` | fetched | none fetched | `withPlan(..., [])`: rules 1, 2, 4, 5 |
| Recent days `features/days/rows.ts:32` (and `recent-days.tsx:59` via its `rhythm`) | screen's child | every loaded week's (`:28`) | wrap |
| Development topic `features/development/TopicPersonal.tsx:57,115` (`sleepComparison`, `vitaminDCycle`) | `child.birth_date` | none | `withPlan(..., [])` |
| Life Sim rhythm `features/dashboard/queries.ts:207` (`windowsBefore`) | via `day` from the dashboard | via `day` | none (gets the dashboard's rhythm); bump `NEEDS_TUNING.rhythmVersion` 3 → 4 so persisted rhythms are recomputed |
| Needs `sleepingSpan` (`features/needs/use-needs.ts:52`) | via `day` | via `day` | none |
| Notification `notification/model.ts:87`, taps `tapContext` `widget/model.ts:100` | — | — | none: they read the cache's `nightFrom`, which the refresh now computes with the plan |
| `scripts/replay-naps.ts:67` (`--reflag`) | yes | none in the data | wrap with `[]` so the reflag mirrors the app |
| `packages/core/src/replay.ts` scoring | — | — | stays plain (scores the prediction, and must not feed on it); note in its doc comment |

`nightFrom` needs no new code: it calls `isNight` at now and at start + `long`, which go through `dayOn`. A planned nap gives null before `long`, then `start + long` if rule 2 makes it the night.

## Steps

TDD in `packages/core` (Vitest, Given / When / Then comments, zero → one → many, then boundaries). Fixtures are made up (the issue's example times), never real logs. Unless said: 5-month child (`fiveMonths`, 3–6 month band: `awake` 60, `long` 2 h; keep the learned first wake window ≥ 90 min or unlearned so `awake` isn't capped below 60), learned wake 07:00, learned bedtime 21:45 (`usualDays([21, 45], [7, 0], …)` in `day-window.test.ts`), woke for the day at 07:00. New group(s) in `day-window.test.ts`; the planned-rule groups use a stub `shown` on the rhythm (`{ ...rhythmAt(...), shown: () => 'nap' }`) so they test `dayOn`, not the planner.

- [x] **1. Refactor first, no behaviour change.**
  - Export `asleepFrom` from `day-rhythm.ts` (doc comment unchanged in meaning).
  - Add `Shown`, `ShownAt`, `DayRhythm.shown` (`dayRhythm` sets `null`) and `withoutPlan`. No test builds a `DayRhythm` literal (they spread `dayRhythm(...)`, which carries `shown: null`), so nothing else changes.
  - Split `dayOn`'s bedtime search into a function that walks the sleeps (`bedtimeIn(after, wake, usual, rhythm, now)`) so steps 2–3 change one place. Whole core suite green, unchanged.
- [x] **2. Rule 5, the undo (rules 4 and 5, no plan).** RED one at a time, from the issue's third Rule (no `shown`):
  - Up for good: 20:30–21:05, nothing since, at 23:00 → `dayWindow` day from 07:00; `isNight` for 20:30–21:05 → false.
  - Too soon to tell (outline): at 21:30 and 22:04 → night from 20:30; at 22:05 → day from 07:00 (boundary: up exactly `awake`).
  - Still the night while it runs: timer since 20:30, at 21:00 → night from 20:30.
  - A quick waking keeps the night: 21:00–21:50 and 22:10–07:00, at 02:00 → night from 21:00 (existing test at `day-window.test.ts:774` stays green).
  - Short sleeps add up: 21:00–21:40 and 21:55–23:30, at 01:00 → night from 21:00.
  - A long first stretch: 21:00–02:00, at 03:30 → night from 21:00.
  - After an undo the next sleep is judged: 20:30–21:05 then 23:20–07:00, at 02:00 → night from 23:20; `windowsBefore` at 12:00 the next day ends that day at 23:20 (the past-day path through `windowsOn`).
  - Boundary: stretch exactly `long` → kept; `long` − 1 min → undone.
  - Under 3 months (`awake` 75, `long` 3 h): one undo case with the band's own numbers.
  - Existing bedtime tests (`the day window at bedtime`, `bedtime by the child's rhythm`, `when stopping a running sleep starts to save the night`, `a bedtime after midnight`, `a past night ends where the next day starts`, `a night with no bedtime logged`) stay green. A changed expectation is allowed only where a short bedtime was followed by `awake` minutes up; any other change: stop and bring it to the developer.
- [x] **3. Rules 1–3 through `rhythm.shown`** (stub judges):
  - Planned nap running (shown `'nap'`): timer since 20:30, at 21:00 → day from 07:00; `isNight({20:30, 21:00})` → false; `nightFrom(20:30, …, 21:00)` → 22:30.
  - The day goes on: 20:30–21:05, at 21:30 → day from 07:00.
  - The real bedtime after it: 20:30–21:05 and 23:20–07:00 (shown `'nap'` at 20:30, `null` at 23:20), at 02:00 → night from 23:20; `windowsBefore` ends that day at 23:20.
  - Runs long (outline): timer since 20:30, at 22:29 → day from 07:00; at 22:30 → night from 20:30.
  - A planned nap starting before `eveningFrom` that runs `long` stays a nap (rule 2 needs both).
  - Skip (shown `'skipped'`): timer since 18:30, at 18:45 → night from 18:30, `isNight` true; 18:30–18:50, at 20:00 → day from 07:00 (undo); 18:30–18:50 at 19:40 → still night.
  - The judge is asked with the sleeps that started before the judged one (a catnap before it included) and at its start: assert on a recording stub.
  - `shown` returning `null` behaves exactly as step 2 (one parametrised check over step 2's cases).
- [x] **4. `withPlan` with the real planner** (`shown-plan.test.ts`, new):
  - Fixture where `dayPlan` at 20:30 shows nap 3 next (seed usual days with three naps, the third ending late enough that nap 3's window starts before 20:45 = bedtime − `bedtimeWithin`; check the fixture with `dayPlan` in the Given). Then the issue's first Rule end to end: day while it runs, day after, night from 23:20 at 02:00.
  - A `molly-skip` skip of nap 3 tapped at 18:00 → `'skipped'`; next sleep 18:30 → night from 18:30.
  - The plan shows bedtime without a skip → `null` (rule 4).
  - No plan: no birth date, age outside 6 weeks–36 months, more than 6 h awake, 45 min after the window → `null`.
  - Catnap: a 10-min catnap at 19:50 before a 20:30 sleep doesn't anchor the plan (it is in `before`, the planner skips it).
  - No recursion: the rhythm `dayPlan` receives inside `withPlan` has `shown === null` (test via a past day whose verdict differs with and without the plan: the past day's naps in `sleepContext(...).pastDays` are the plain verdict).
- [x] **5. `next-sleep.ts` keeps the plan visible.** `awakeContext`: `pastDays` from `withoutPlan(rhythm)`; today's `dayWindow` and `sleepContext`'s running `isNight` with the given rhythm. Tests (`next-sleep.test.ts` / `day-plan.test.ts`, planned rhythm from step 4's fixture):
  - At 21:30 after the planned 20:30–21:05 nap: `nextSleep` is not null (bedtime next), `dayPlan` non-empty.
  - While the planned nap runs at 21:00: `dayPlan` shows the sleeps after it (as `implan-plan-while-asleep`).
  - Plain rhythm: every existing `next-sleep` / `day-plan` / `likely-detail` / `nap-reminder` / `needs` test unchanged.
- [x] **6. Cost check.** A Vitest timing guard is flaky; instead a one-off measurement in the REFACTOR step: 28 days of fixture sleeps, `windowsBefore(…, 28)` and one dashboard render's calls (`dayWindow`, `dayPlan`, `windowsBefore(…, 1)`, `isNight`) with a planned rhythm, timed in Node. Record the numbers in `NOTES.md`. Memoise inside `withPlan` only if over ~20 ms (see Design).
- [x] **7. Wire the app** (table above). App unit tests first where logic is testable:
  - `apps/molly/src/widget/model.test.ts`: a snapshot whose running sleep started at a planned nap near bedtime has `nightFrom` = start + `long`, not the start; a skipped nap → `nightFrom` = start. `napReminderRing` unchanged for the existing cases.
  - `apps/molly/src/actions/trackers.test.ts` (or where `byRhythm` is tested): `byRhythm` with a planned rhythm saves a stopped planned nap as a nap.
  - Dashboard: move `skips` above `night`; wrap the rhythm; pass the loaded weeks' skips when `days.data` is there.
  - `rows.ts`, `TopicPersonal.tsx`, `remindedCache`, `napReminderRing`, `fetchSnapshot`: wrap.
  - `NEEDS_TUNING.rhythmVersion` 3 → 4 (`packages/core/src/needs.ts:15`): the window split changed, persisted Life Sim rhythms must be refetched.
  - `scripts/replay-naps.ts` `--reflag`: wrap with `[]`; `replay.ts`: say in its doc comment that scoring uses the plain rule on purpose.
- [ ] **8. Playwright.**
  - `e2e/tests/settings.spec.ts` "a child's day and night…" (`:249`): the test child (born 2026-04-27, 6–12 month band, `awake` 45 at today's date) is up 80 min after the 16:30–17:00 sleep at 18:20, so rule 5 undoes it. Move the clock to 17:30 (inside `awake`), and check the plan at 16:30 isn't a nap (only last night is seeded, so no usual naps; with "Day ends" 17:00 it should be bedtime → rule 4). Keep the assertion that the setting moved the usual bedtime ("Bedtime 16:30"). Fix the comment at `:266`.
  - New in `e2e/tests/day-night.spec.ts`: seeded usual days where the plan shows a late nap; add a sleep near the usual bedtime that's short → "Today" stays, saved `nap: true`.
  - Existing `today-window` ("after bedtime…", 19:25–22:30: a 3 h stretch, kept), `ring`, `recent-days`, `day-plan`, `next-sleep`, `day-night` specs green; change an assertion only for the step-2 reason.
- [x] **9. Docs and comments** (in the step's REFACTOR, listed here so they aren't skipped):
  - Doc comments: `isBedtime` (rules 1–4), `dayOn` ("split at the bedtime (`isBedtime`)" → the walk with the plan and the undo), `DayTuning.bedtimeCut` ("is the night" → "is bedtime unless the plan showed a nap, and is undone if short"), `DayTuning.eveningFrom` (also used by rule 2), `asleepFrom` (now shared), `isNight` / `nightFrom` (the plan through the rhythm), `sleepContext` (today with the given rhythm, past days plain), `NightRule` / `byRhythm` (a planned rhythm), `fromWake` (unchanged logic; check its "while its bedtime may still come" sentence still holds).
  - `CLAUDE.md` "Day and night": the bedtime sentence → the rule table in one sentence (planned nap stays a nap unless it runs long; a skip makes the next sleep bedtime; otherwise within 90 min, undone when short and followed by `awake` up), and that the rhythm carries the plan (`withPlan`) with past days plain. "Next-sleep prediction": "Past days are split into naps and bedtime by the day rhythm" → "by the plain day rule (no plan)".
  - `plans/implan-day-night/NOTES.md` line 8 ("Bedtime: night if it starts ≥ usual bedtime − 90 min…"): add "since #48: unless the plan showed a nap, and undone when short; `plans/implan-late-nap-bedtime/`". `plans/implan-day-night/TEST_STRATEGY.md:34` stays true (quick waking keeps the night).
  - `plans/README.md` row → status when done.
- [ ] **10. Wrap-up.** `implan-cleanup` wrap-up sweep over the diff; `pnpm check` and `pnpm e2e` green; `pnpm replay:fixtures` before/after recorded in `NOTES.md` (a moved score is reported, not tuned); PR into `develop` (`gh pr create --base develop`); issue #48 rewritten in Gherkin with anything that changed during the work. The developer's `pnpm replay:naps` sanity run and Pixel checks are theirs (TEST_STRATEGY.md).

## Not in this plan

- `bedtimeCut`, `bedtimeWithin`, `eveningFrom`, the age bands: unchanged (decided).
- Learning (`dayRhythm`, `firstLongSleep`): unchanged; it never used `isBedtime`.
- The morning ring staying night until the wake is confirmed (`plans/implan-on-time-wake/`), #47 (a night starting after midnight on Recent days).
- Patching saved `nap` flags: never (CLAUDE.md "never patched").
