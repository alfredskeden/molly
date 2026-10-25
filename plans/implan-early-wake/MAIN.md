# An early morning wake starts the day

GitHub issue #18 (the agreed spec, in Gherkin). Follow-up to #14 (`plans/implan-day-night/`, shipped in 1.2.0). Branch `feature/early-wake` from `develop`, PR with `--base develop`.

## Outcome

A morning wake near the parent's "Day starts" setting counts as the morning wake even when Molly has learned a later usual wake. With "Day starts" 08:00 and a learned wake of 08:30, a baby who wakes at 06:03 and stays up gets a day from 06:03 (shown from 07:03, once the threshold has passed), and their 08:38 sleep is the day's first nap, saved `nap: true`.

The child screen shows what Molly has learned (usual wake and bedtime), so the parent can see why the day starts where it does.

Night wakings stay the night: a short early waking (back asleep within the threshold), and a long waking in the middle of the night (outside both ranges).

## The rule

`wakeRange` (`packages/core/src/day-window.ts`) is the clock range a day's morning wake may fall in. Today it's `before` ahead of the usual wake to `after` past it, and the usual wake is the learned one once 3 days are learned, so the setting stops counting.

New: from `before` ahead of the **earlier** of the usual wake and "Day starts", to `after` past the **later** one.

| Usual wake | Day starts | Range today | Range new |
| --- | --- | --- | --- |
| 08:30 (learned) | 08:00 | 06:30–11:30 | 06:00–11:30 |
| 07:00 (learned) | 08:00 | 05:00–10:00 | 05:00–11:00 |
| 07:00 (not learned, = setting) | 07:00 | 05:00–10:00 | 05:00–10:00 (unchanged) |

Nothing else in the rule changes: the awake threshold, the "after a night" check, bedtime, the clock fallback. Everything that goes through `dayOn` follows: the ring (`dayWindow`), `isNight` (the saved nap/night flag), `nightFrom` (widget cache, notification), `nextSleep`, `dayPlan`, the Days screen, Recent days, Vitamin D, development.

The learning pass in `dayRhythm` keeps its fixed 05:00–11:00 range, so the usual wake can't drift because of this change.

## Steps

TDD in `packages/core` (Vitest, Given / When / Then, zero → one → many, then boundaries). Fixtures are made up, never real logs.

- [ ] **1. Morning range covers the setting** (`day-window.ts` `wakeRange`, tests in `day-window.test.ts`). Tests build a learned rhythm from the existing `setting` fixture (`{ ...setting, wake: 8 * 60 + 30, wakeLearned: true }` with `napWindow` 08:00–19:00), in this order:
  - **Zero**: no learned wake (setting stands in): the existing range tests stay green unchanged.
  - **One (the bug)**: learned 08:30, setting 08:00; night from 22:42, woke 06:03, still awake at 07:05 → Today from 06:03.
  - **Before the threshold**: same morning at 06:40 → still the night.
  - **The nap after it**: asleep at 08:38 → `isNight` false (saved as a nap), and the ring is Today with the 08:38 sleep as a nap.
  - **Many**: a wake inside both ranges (07:45) is unchanged; a learned wake *earlier* than the setting (learned 07:00, setting 08:00) widens the end to 11:00 (a wake at 10:30 after a bad night counts).
  - **Boundaries**: a wake exactly `before` ahead of the setting (06:00) counts; one minute earlier (05:59) with a learned 08:30 doesn't.
  - **Errors / night wakings**: 06:03 back asleep at 06:30 → the 06:03 waking is part of the night; 03:00–04:00 awake → still the night.
  - **Regression**: the issue's morning as one test, through `dayWindow` and `isNight`, with the issue's numbers.
- [ ] **2. Replay check.** `pnpm --filter @molly/core exec vitest run day-fixtures` green, and `pnpm replay:fixtures` with the three settings in `day-fixtures.test.ts` (07:00–19:00, 06:00–18:00, 08:30–20:00). New wake and bedtime "right" counts must not drop below the numbers recorded in `plans/implan-day-night/NOTES.md` "Tuning". Record before / after in `NOTES.md`. If a profile drops (most likely: an early setting reaching an early waking that stays up the 10-month threshold), stop and bring the numbers to the developer before tuning anything. The developer's own logs are theirs to run (`pnpm replay:naps <file> <birth> --days`), never committed.
- [ ] **3. Learned times in core.** A pure helper next to `dayRhythm` (e.g. `learnedTimes(rhythm)` → `{ wake: 'HH:MM' | null, bedtime: 'HH:MM' | null }`, null while not learned; a bedtime past 24:00 shown as its clock time) so the panel doesn't do minute maths. Unit tests: nothing learned → both null; wake learned only; both; bedtime 24:15 → `00:15`; under 3 months → wake null even with history (`learnsWake` false).
- [ ] **4. The "Day and night" panel** (`apps/molly/src/app/(main)/child/[id]/index.tsx`, about line 192). Fetch the child's sleeps with `useGuideEntries(child.id)` (`features/development/queries.ts`, 15 days, already used on this screen through the development card, so it's cached), learn the rhythm with `dayRhythm`, and show one line under the explainer:
  - both learned: "Molly has learned: wakes about 08:30, bed about 21:45"
  - one learned: only that one ("Molly has learned: bed about 21:45")
  - none, or the fetch not back / failed: "Still learning" (no error banner here; the screen works offline)
  - Rewrite the explainer so it says that a morning wake near either "Day starts" or the learned wake counts, and drop "Under 3 months, the morning always goes by Day starts." if the line above already makes it clear (under 3 months shows no learned wake). Copy stays short, plain, and uses `Text` from `@/components/ui`.
- [ ] **5. Playwright** (`e2e/tests/day-night.spec.ts`):
  - update `the child screen calls Day starts and Day ends starting values` to the new explainer
  - new: with no sleeps seeded the panel says "Still learning"; with 3+ days of seeded made-up sleeps it shows the learned times
  - new: the issue's morning end to end (setting 08:00, seeded days that learn a later wake, a wake at 06:03, a sleep from 08:38 stopped → saved `nap: true`), if the seed can place a learned wake later than the setting; otherwise covered by core step 1 and noted in `NOTES.md`.
- [ ] **6. Docs.** `CLAUDE.md` line 63 ("The morning wake is the first sleep end near the usual wake…" → near the usual wake or "Day starts"); a line in `plans/implan-day-night/NOTES.md` pointing here (its MAIN.md is history, left as it was); `plans/README.md` row; `plans/implan-molly/NOTES.md` only if it describes the morning range.
- [ ] **7. Wrap-up.** `implan-cleanup` wrap-up sweep, `pnpm check` and `pnpm e2e` green, PR into `develop`, issue #18 updated with anything that changed during the work.

## Decisions and why

- **Widen the range, don't cap the learned wake.** Capping the learned wake at the setting would break learning for a child whose rhythm moves later. Widening makes both anchors count and leaves learning alone.
- **The hull of both ranges, not two separate ranges.** The gap between the two times is always a plausible morning; a hull is one interval and keeps `dayOn` unchanged.
- **The threshold still applies.** The day starts at the wake, backdated, and shows only once the baby has stayed up the age's threshold.
- **A wake in the middle of the night stays the night.** 03:00 is outside both ranges for any sensible setting.
- **Show the learned times.** The parent sees "Day starts 08:00" and nothing else today; the learned wake explains the rest.
- **Widget: out of scope. Notification: unchanged.** Both follow automatically through `nightFrom` / `dayOn`.

## Not in this plan

- No new setting, no toggle between learned and set times.
- The learning pass's fixed 05:00–11:00 range and the age bands stay as tuned in #14.
- Bedtime is untouched (the setting's "Day ends" doesn't widen the bedtime cut).

## Assumptions

- `useGuideEntries`' 15 days are enough for `dayRhythm` (it learns from 14).
- The default setting (07:00) with a later learned wake only widens the range earlier, toward times the default already allowed before anything was learned.
