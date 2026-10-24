# Day and night from the child's rhythm

GitHub issue #14. The investigation (data, research, the production case, the questions answered here) is in the issue body. Branch `feature/day-night` from `develop`, PR with `--base develop`.

## Outcome

Molly decides where a day starts (the **morning wake**) and where a night starts (**bedtime**) from the child's own rhythm and age, instead of a fixed per-child nap window. The nap-or-night flag saved to Baby Buddy follows the same rule.

Two cases must come out right, and today they don't:

1. **A back-to-sleep morning.** Bedtime 20:58, woke 06:31, awake 1 h 44 min, slept 08:15–10:26. The night ends at **06:31**; 08:15–10:26 is the day's first **nap** (saved `nap: true`). Today the night runs to 10:26 and the sleep is saved as a night sleep.
2. **An evening catnap.** Usual bedtime about 21:45; a 25 min sleep at 19:30. That's a **nap**: the card stays Today, the plan stays, and stopping it saves `nap: true`. Today it flips to Tonight at 19:00 and saves a night sleep.

Nothing new is stored: the day and night are still recomputed from the sleeps on every render. No new buttons.

## The rule

### What the child's rhythm is (`dayRhythm`)

Learned per child from the last 14 days of sleeps, in one place (today it's spread over `usualMorningAfter` in `needs.ts` and `usualBedtime` in `next-sleep.ts`):

| | Learned as | Clamped to | Until learned (fewer than 3 days) |
| --- | --- | --- | --- |
| **Usual wake** | median clock time of past morning wakes | 05:00–11:00 | the setting's "Day starts" |
| **Usual bedtime** | median clock time of past bedtimes (after midnight counts as late) | 18:00–00:30 | the setting's "Day ends" |
| **Usual first wake window** | median of wake → first nap | — | none (no cap) |

**Learning must not feed on its own decisions.** A variant in the investigation learned from its own picks and its usual wake crept from 08:51 to past 11:00 until it chose lunch naps. So the learning pass finds past wakes and bedtimes with a wide, anchor-free version of the rule (the clamp ranges above, the age threshold, a long sleep for bedtime). Only the deciding pass below uses the learned anchor. Replay (step 5) checks the anchor stays put across the fixtures.

### Age bands (starting values, tuned in step 5)

From the child's `birth_date`. No birth date: the 3–6 month band.

| Age | Morning range around the usual wake | Awake at least (≤ ⅔ of the usual first wake window) | An evening sleep is long at |
| --- | --- | --- | --- |
| under 3 months | no stable wake yet: "Day starts" −2 h / +3 h | 75 min | 3 h |
| 3–6 months | −2 h / +3 h | 60 min | 2 h |
| 6–12 months | −2 h / +3 h | 45 min | 2 h |
| 12 months and up | −2 h / +3 h | 40 min | 2 h |

The range is narrow before the usual wake (an early waking at 05:00 is still the night) and wide after it (a bad night can run late). The numbers live in one exported tuning object (shaped like `NEXT_SLEEP_TUNING`) so replay can override them.

### Morning wake

After a night, the end of a sleep is the **morning wake** when both hold:

1. it's inside the age band's range around the usual wake, and
2. the baby then stays awake for at least the band's threshold: the next sleep starts that much later, or none has started and that much time has passed.

The earliest end that passes both is the wake. A sleep end that fails is a **night waking**, and the sleep after it is still the night.

Live, the ring stays in night mode until the threshold has passed, then becomes Today **starting at the wake** (06:31, not 07:31). No wake passes by the range's end: clock fallback, as `byClock` does today, from the setting.

### Bedtime

After the morning wake, the first sleep that is the **night**:

- it starts no earlier than 90 min before the usual bedtime, **or**
- it starts no earlier than 3 h before the usual bedtime and runs at least the band's "long" (so a long lunch nap is never bedtime).

Anything else in the evening is a nap. A night waking soon after bedtime doesn't undo it: once a sleep was the night, the night goes on until the morning wake. While a sleep runs, the card stays Today until the sleep meets one of the two conditions (by its start, or by running long enough), then becomes Tonight from the sleep's start.

### Nap or night on save

Decided at stop or log, as now, with the rule above in place of `isNightSleep`. At that moment it already knows enough: a back-to-sleep after the day began is a nap, and an evening sleep that started before the bedtime cut and stopped short is a nap. Saved entries are never patched afterwards.

Every place that writes the flag or names a sleep needs the child's recent sleeps and birth date, not just the setting. Where none are at hand (cold start, failed fetch), fall back to the setting by clock, which is today's `isNightSleep`. A tap must never wait on, or fail because of, this lookup (`implan-instant-taps`).

## What depends on it

Every caller moves to the new rule:

- `packages/core`: `day-window.ts` (`dayWindow`, `windowsBefore`, `previousWindow`, `morningWake`, `bedtime`, `byClock`), `next-sleep.ts` (`daysBefore`, `usualBedtime`), `day-plan.ts`, `needs.ts` (`sleepingSpan`, `usualMorningAfter`), `vitamin-d.ts`, `replay.ts`, `development/sleep.ts` (only its nap-or-night split; its days stay calendar days).
- `apps/molly`: dashboard and ring (`app/(main)/index.tsx`: ring centre "nap"/"night", editor title, `dayWindow`), `recent-days.tsx`, `features/days/rows.ts`, `features/dashboard/queries.ts`, `features/development/TopicPersonal.tsx`, `widget/model.ts`, `notification/model.ts` ("saves as nap / night sleep"), `actions/trackers.ts` (`stopSleep`, `addEntry`).
- `scripts/replay-naps.ts` (`--reflag`).

`dayWindow` and friends gain the birth date (or a ready `dayRhythm`). Pick one shape and use it everywhere.

## Steps

TDD in `packages/core` (Vitest, Given / When / Then, zero → one → many, then boundaries). Fixtures are made up: several ages, with the two cases above built into them, and no real logs.

- [ ] **1. Refactor first: one past-day split.** `next-sleep.ts`'s `daysBefore` repeats `day-window.ts`'s `windowsOn` (wake, then the first night sleep after it). Make `day-window.ts` own a single "past days: wake, naps, bedtime" function and have `daysBefore` use it. Behaviour stays the same; existing tests stay green.
- [ ] **2. Age bands and `dayRhythm`.** The tuning object, band by age, and the learning pass: usual wake, usual bedtime, usual first wake window, clamps, fallback to the setting under 3 days. It replaces `usualMorningAfter` (`needs.ts`) and `usualBedtime` (`next-sleep.ts`); remove both, and fold `NEEDS_TUNING.wakesNeeded` and `NEXT_SLEEP_TUNING.bedtimesNeeded` into the new tuning.
- [ ] **3. Morning wake.** New `morningWake` per the rule, including the live first hour (night until the threshold passes, then day from the wake). Cases: the back-to-sleep morning, an early waking under the threshold, an early waking before the range, a late wake after a bad night, a short "woke then napped within the threshold" morning (stays night, as decided), under 3 months, no wake by the range's end (clock fallback). Remove `WAKE_RANGE_MS`; rewrite the `day-window.test.ts` cases that assert "closest to the window start, ±2 h".
- [ ] **4. Bedtime and the nap-or-night verdict.** New `bedtime`, and one context-aware verdict for a single sleep (finished or running) that replaces `isNightSleep` for every caller. Keep the by-clock rule only as the fallback with no history; un-export `isNap`, which only `isNightSleep` uses. Cases: the evening catnap, a bedtime with a waking an hour later, a long lunch nap, a 2 h evening sleep 2½ h before the usual bedtime, a bedtime after midnight, the night across the clock change (25 Oct 2026, Europe/Stockholm).
- [ ] **5. Replay days mode and tuning.** `pnpm replay:naps <sleeps.json> <birth> --days` prints, per day, the morning wake and bedtime by the old and the new rule, and the mornings and evenings where they differ. An optional `--truth <file>` (wake / bedtime times from another tracker) scores them as right, wrong or none, like the issue's tables. `--set` overrides the new tuning keys too, and `--reflag` uses the new verdict. Tune the starting values on the made-up fixtures; run the developer's logs as a sanity check only (never committed, never the tuning target). Record the final numbers and scores in `NOTES.md`.
- [ ] **6. Core callers.** `next-sleep.ts`, `day-plan.ts`, `needs.ts`, `vitamin-d.ts`, `replay.ts`, `development/sleep.ts` on the new rule. Full core suite green, including `needs-seeded.test.ts`.
- [ ] **7. App callers.** Everything listed under "What depends on it". Writes: `stopSleep` and `addEntry` get the recent sleeps and birth date from the caller (dashboard: `useRecentSleeps` and the child; widget and notification actions: what their refresh already fetches), with the by-clock fallback. The lock-screen label is computed where the widget cache is built and read by `notification/model.ts`, unless the notification already has the sleeps at hand.
- [ ] **8. The setting.** The child screen (`app/(main)/child/[id]/index.tsx`, about line 197) keeps "Day starts" / "Day ends", reworded as starting values: Molly uses them until it has learned the child's usual wake and bedtime (a few days), and for babies under 3 months. Replace the line "The day starts at the wake-up closest to the start time." Same storage key, no migration.
- [ ] **9. Docs.** `CLAUDE.md` (the next-sleep bullet names `isNightSleep`; add a short day-and-night bullet), `README.md` line 19 ("nap window"), `plans/implan-molly/NOTES.md` where it calls the setting the nap window as current, `plans/README.md` row, and the issue rewritten as the agreed spec.

## Decisions and why

- **Inferred only, no "Up for the day" / "Bedtime" buttons.** Parents shouldn't have to tap more. A smarter rule fixes both cases in the data without UI.
- **Anchored on the child's usual wake and bedtime, not the setting.** On the summer logs a learned anchor scored about as well as the best fixed time picked after the fact (57–58 of 66 against 60), and it follows the child as their rhythm drifts. A fixed window was wrong 13 % of the time with the default and 4 % at best.
- **Numbers by age.** Long early wakings are normal under about 4 months and gone by 6. Night wakings shrink with age while wake windows grow. One number for every age either misses the summer cases or the autumn ones.
- **Asymmetric morning range (−2 h / +3 h).** Narrow before the usual wake keeps a long 05:00 waking in the night. Wide after it keeps the wake after a bad night.
- **A short "woke, napped within the threshold" morning stays night.** The 5 summer mornings like this were the rule's main misses; lowering the threshold would turn early wakings into days. Accepted for now.
- **Bedtime by start near the usual bedtime, or by length in the evening.** The cut catches a normal bedtime at once. The length catches an early bedtime. A catnap fails both.
- **Flag at stop, never patched.** Enough is known at stop. Patching would need the edit permission paths and change the other parent's view after the fact.
- **The setting stays, as starting values.** A new child has no history, and under 3 months there's no stable wake to learn.

## Not in this plan

- Development sleep comparison, weeks and History stay on calendar days (issue question 6). Only their nap-or-night split moves to the new rule.
- No explicit wake / bedtime taps.
- Baby Buddy's own nap window (server side) is untouched; Molly always sends `nap`.

## Assumptions

- Sleeps fetched for the last 14 days are enough for the rhythm (the dashboard and widget refresh already fetch that range).
- The child's `birth_date` is in the children list wherever the rule runs. Missing: the 3–6 month band.
- Past days and nights redraw under the new rule. That's intended: Recent days and the prediction's history get better at once.
