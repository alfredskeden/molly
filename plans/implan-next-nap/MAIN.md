# Next-nap prediction

Context: the Molly system plan in [`../implan-molly/MAIN.md`](../implan-molly/MAIN.md) (architecture, rules) and the day window from [`../implan-today-window/MAIN.md`](../implan-today-window/MAIN.md). Decisions, research and verified facts are in [`NOTES.md`](NOTES.md). The Definition of Done is in [`TEST_STRATEGY.md`](TEST_STRATEGY.md).

**Outcome:** while the baby is awake, Molly shows when the **next sleep** is likely, as a window of clock times ("Nap likely 08:55 – 09:25", or "Bedtime likely …" once bedtime is next). It shows on the dashboard hero, as a dashed ghost in the Today strip and Recent, and on the widgets. It predicts only the next sleep, never a whole day (superseded: the Today strip now shows the whole day ahead, see [`../implan-day-plan/MAIN.md`](../implan-day-plan/MAIN.md)). Baby Buddy has no predictions, so Molly computes this from logged sleeps and writes nothing to the server.

The goal is a window that turns out right for this baby, not one that only looks plausible. Two things carry that: a sourced age guide for babies with little history, and a replay of real logged days that measures the hit rate and tunes the constants before any UI is built.

## The design source

`Molly Predictions.dc.html`, the (private) design source. Build **direction 1a** ("Window on the bar") and the shared "Why this window" sheet. Ignore 1b.

Where this plan and the design disagree, this plan wins. The deviations:
- **No reminder.** The sheet's "Remind me when it opens" toggle and the local notification are left for later (see Out of scope).
- **No editable age guide in Settings.** The guide is fixed in code; the sheet shows the band used.
- The design's age-guide numbers are placeholders. Use the sourced table in `NOTES.md`.
- The window starts at the design's constants (±15 min, blend 3→10 samples), except that history looks back 14 days, not 7, so 10 samples can happen. The replay step may change them. The values in `NOTES.md` after step 3 win.
- "Usual bedtime" falls back to the device's `napWindow.end`, not a fixed 19:00.

## How the prediction works

All of this is in `packages/core`: pure, no I/O, time passed in.

1. **Hidden** (no prediction) when: a sleep timer is running, there's no finished sleep in the last 6 h, the child has no `birth_date`, or the age is outside the guide (under 6 weeks, over 36 months).
2. **Anchor:** the end of the last sleep that lasted at least 15 min. Shorter catnaps don't end a wake window.
3. **Slot:** which wake window of the day this is, counted from `dayWindow(...).wake` (1 = the first after the morning wake). This uses the sleeps of 15 min or more.
4. **Age guide:** the band for the child's age gives a range of awake time for the slot (the slot rule in `NOTES.md`: the first window uses the low end, the last the high end).
5. **History:** the same slot on each of the last 14 days: how long the baby was awake before that sleep started. The median ± the spread gives a range. "Same slot" means the same count from that day's morning wake.
6. **Blend:** under 3 samples, age guide only. From 3 up, the history range counts more with each sample, and alone from 10. Both ends of the range are blended the same way.
7. **Nap or bedtime:** if the blended window starts within 60 min of the usual bedtime (median start of night sleeps over 14 days, else `napWindow.end`), it's bedtime. Bedtime uses the band's last-window range and the history of bedtimes, not nap slots.
8. **State**, from `now`: `before` (window ahead), `open`, `past` (after the end; dropped 45 min after it).

Output, roughly: `{ kind: 'nap' | 'bedtime', start, end, state, source: 'age' | 'blend' | 'history', samples, anchor, ageMonths, guide: range, history: range | null }`. Exact names are up to you. Everything the "Why" sheet shows comes from this object.

## Shape

```
packages/core/src/sleep-guide.ts      age bands + sources, ageInMonths(birthDate, now), guide range for (age, slot)
packages/core/src/next-sleep.ts       nextSleep(sleeps, running, birthDate, napWindow, now) → prediction | null
scripts/replay-naps.ts                replays real days through nextSleep, prints hit rate etc. (dev-only, never shipped)
apps/molly/src/features/dashboard/    queries.ts: sleeps from the last 14 days (new query)
                                      Hero.tsx `Awake`: the 1a bar, label, state, disclaimer row
                                      a "Why this window" sheet (reuse components/sheet.tsx)
                                      TodayCard / Recent: the dashed ghost block and row
apps/molly/src/app/(main)/index.tsx   computes the prediction once per render, passes it down
apps/molly/src/widget/                model.ts: snapshot gains the prediction; MollyWidget.android.tsx: 1a texts
```

`nextSleep` takes the child's birth date, not a `Child`, so the widget's headless task can call it too. Keep `packages/core` and `packages/api` free of React, Expo and `apps/` (checked by `pnpm check:boundaries`).

## Copy (from the design)

- Say "likely". Never "should" or "overdue". The `past` state is neutral in colour, never red.
- Always a clock-time window: `Nap likely 08:55 – 09:25` / `Bedtime likely 18:45 – 19:15`.
- State on the right: `Opens in 25m` / `Window open` / `Past the window`. Relative times only in the app, which updates live. Widgets can be 30 min stale, so they show clock times only.
- The hero's "Last feed …" row is removed (the Feed tile already shows it). The disclaimer row takes its place.
- Under every prediction in the app: `Estimate · not medical advice` with `Why ›`. For age only: `Based on age (4 months) only · not medical advice` with `›`.
- The ghost row in Recent: dot, `08:55`, `Nap likely`, `until 09:25`. It isn't an entry and can't be tapped.
- Sheet text: "An estimate from past sleeps and a general age guide. Not medical advice. Follow your baby's cues."

## Steps

Work through the steps in order; each lands on its own. Mark a step `[x]` when it's fully done, and record findings (especially replay results and changed constants) in [`NOTES.md`](NOTES.md).

- [x] **1. Age guide in core.** Unit TDD (Vitest, Given / When / Then). Encode the table from `NOTES.md` with a source comment per band. `ageInMonths` from a `YYYY-MM-DD` birth date (boundaries: the day a band starts, month-end birthdays). Guide range per slot, first and last windows included. Hidden bands return nothing.
- [x] **2. `nextSleep` in core.** Unit TDD. Zero: every hidden case. One: age-only window from a single morning wake (before, open, past, dropped). Many: history slots, the blend at 2, 3, 6 and 10+ samples, catnaps not resetting the anchor, bedtime switching (history bedtime, `napWindow.end` fallback), a skipped nap. Boundaries: exactly 6 h since the anchor, exactly 45 min past, the band edges, a day across a clock change.
- [x] **3. Replay against real logs and tune.** `scripts/replay-naps.ts` (`pnpm replay:naps <sleeps.json> <birth date> [--nap-window HH:MM-HH:MM] [--set k=v,...] [--reflag]`) reads a JSON array of sleeps fetched separately (read-only GET, kept outside the repo; the key stays out of every file). The pure part, `packages/core/src/replay.ts` (not exported from the core index), predicts each sleep of 15 min or more that followed at least 15 min awake from 30 min before it started, with only the sleeps that had ended by then, and scores it. The report splits by source and by nap / bedtime / night waking: hit rate, median and 90th-percentile miss, median width. Results and the chosen constants are in `NOTES.md`; the one change kept is a ±20 min spread.
- [x] **4. Dashboard hero and Why sheet.** The 14-day sleeps query, the child's birth date, the prediction computed in `index.tsx`. Build the 1a bar in `Awake`: a track with the window as a band, awake time as the fill, the label, the state and the disclaimer row. Add the Why sheet: awake since, usual window for the slot (days and sample count), age guide (band), "weighted towards". Playwright with a fixed clock (`page.clock`) and seeded sleeps: before, open, past, age-only, bedtime, hidden while a sleep runs.
- [x] **5. Ghost in the Today strip and Recent.** A dashed sleep block for the window in the strip (only the part inside the card's window) and a dashed "Nap likely" row at the top of Recent. Neither can be tapped, and neither shows once the window has been dropped or a sleep starts. Extend the Playwright specs.
- [x] **6. Widgets.** The headless refresh also fetches the last 14 days of sleeps and the child's birth date, calls `nextSleep`, and stores the window (`kind`, `start`, `end`) in the snapshot, parsing old caches that don't have it. 1a texts: 1×1 `nap 08:55`, 2×2 `Nap 08:55 – 09:25` under awake-for, 4×2/4×3 sleep row `Awake 2h 34m · nap 08:55 – 09:25`. No disclaimer fits, so tapping opens the app on the hero. Unit tests for the widget model, then the device checklist.
- [x] **7. Wrap up.** Update the "Where things stand" section in the root `CLAUDE.md`, and put the Baby Buddy facts found on the way in `implan-molly/NOTES.md`.

## Out of scope

- The "Remind me when it opens" toggle and the local notification at window start. Molly has no scheduled notifications yet (the `molly-notify` module only shows ongoing timers), so this needs native scheduling of its own. Plan it separately.
- Predicting the next feed, the expected wake-up during a sleep, night wakings, or a whole day's schedule.
- The lock-screen notification surface.
- Editing the age guide.

## Assumptions

- Sleep logs are mostly complete. The 6 h cut-off hides the prediction during obvious logging gaps instead of predicting from a stale wake.
- Both parents' logs are the same Baby Buddy data, so both phones show the same prediction (up to their own nap-window setting).
- The age guide only covers the start. Expect the baby's own history to take over within about 10 days of steady logging.
