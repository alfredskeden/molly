# A past night ends where the next day starts

GitHub issue #23 (the agreed spec, in Gherkin). Follow-up to #14 (`plans/implan-day-night/`) and #18 (`plans/implan-early-wake/`). Branch `fix/issue-23-night-ends-at-wake` from `develop`, PR with `--base develop`.

## Outcome

The past days and nights tile the timeline: no overlap, no gap. Each past night runs from the moment its day ended to the moment the next day started.

The bug: bedtime 22:40, the baby wakes at 06:00 and Today says "Day started 06:00", but the learned usual wake is 07:30. Last night's ring runs 22:40 → 07:30, so 06:00–07:30 sits in both windows: the night's sleep arc stops short of the top, the morning's feeds and diapers show on both rings, and they count in the night's boxes ("1 feed · 2 diapers", and "Slept" if a morning nap starts before 07:30). A wake later than the usual one leaves a gap instead.

After the fix, last night is 22:40 → 06:00 and Today starts at 06:00.

## The rule

```
 day d                         night d                            day d+1
 wake ──────────────── end  =  start ─────────────────── end  =  start ──────── …
 (or Day starts)    (bedtime;  (same instant)          (next morning's wake;
                     no bedtime:                         no wake: Day starts)
                     usual bedtime after a wake,
                     Day ends without one)
```

- **A past night ends where the next day starts**: the next morning's wake as `dayOn` finds it (`firstWake`), or, with no wake found that morning, the "Day starts" setting (the start of that day's clock window). Today: `nightOf` ends at `usualWakeAfter` and a clock night at the next "Day starts", whatever the next day did.
- **A night starts where its day ends**: at the bedtime sleep's start when one was found (as today); with no bedtime, at the day's end, which is the usual bedtime after a logged wake (`dayOf`) or "Day ends" without one. Today a clock night after a day with a wake starts at "Day ends" while that day ran to the usual bedtime, so a learned bedtime later than "Day ends" overlaps and an earlier one leaves a gap.
- **The live window keeps its forward guess.** The live night after a bedtime still ends at the usual wake (`usualWakeAfter`); the morning hasn't happened. The live clock night after a day with a wake but no bedtime (`fromWake` → `byClock`) starts at that day's end, the same instant as the past day's end, so `windowsBefore`' filter (`page.start < live.start`) keeps working and nothing shows twice. Its end stays the next "Day starts".

`windowsBefore` and `previousWindow` feed the past ring and its boxes (`windowStats`), the pager, Recent days, the Today sheet's totals (`todaySheetTotals`), the Days screen (`features/days/rows.ts`) and the needs rhythm (`features/dashboard/queries.ts`). All follow from the core change; no app code changes are expected.

**Where to change it**: `packages/core/src/day-window.ts`. One way: `windowsOn` for day `d` also looks at day `d + 1` (`dayOn(…, days + 1, …)`, or the clock window's start without a wake) for the night's end, and starts a bedtime-less night at the day's end. Another: build the pages as now, then stitch each night's end to the newer day's start. Pick what reads simplest; keep `dayOn`, `wakeRange` and `firstWake` as they are.

## Steps

TDD in `packages/core` (Vitest, Given / When / Then, zero → one → many, then boundaries and errors). Fixtures are made up, never real logs.

- [x] **1. The night ends at the next morning's wake** (`day-window.test.ts`, "the past pages of the Today card" and "the Today card's previous page"). A learned rhythm (wake 07:30) is needed to show the bug; the `setting` fixture alone has usual wake = "Day starts" = 07:00, and the existing `week` fixture (woke 06:40) already shows it: its expectations `end: on(20, 7, 0)` encode the bug and change to `on(20, 6, 40)`. Order:
  - **One (the bug)**: bedtime 22:40, wake 06:00, learned wake 07:30, at midday → `previousWindow` is the night 22:40 → 06:00, and `dayWindow` starts at 06:00.
  - **Later wake**: same, wake 08:15 → night ends 08:15, Today starts 08:15.
  - **Many**: `windowsBefore` over a week: every night's `end` equals the newer day's `start`, every day's `end` the newer night's `start`.
  - **No wake the next morning**: night ends at that day's "Day starts" (its clock window's start).
  - **Live night unchanged**: tonight's bedtime running or logged, no wake yet → `dayWindow` ends at the usual wake (existing tests stay green).
  - **Night after midnight bedtime** (00:20, existing "a bedtime after midnight" group) and **the clock change** (existing group) still line up.
  - In REFACTOR: rewrite the doc comments that now lie: `windowsBefore` ("A past day runs from its morning wake to its bedtime…": add the night), `windowsOn`, and `nightOf` ("to the next usual wake": now the live night only).
- [x] **2. A night with no bedtime starts where its day ended.** Learned bedtime 21:00, "Day ends" 19:00, a day with a wake and no bedtime logged:
  - past: that day ends 21:00 and its night starts 21:00 (today 19:00);
  - live, after midnight once `bedtimeCut` has passed: Tonight starts 21:00, and `windowsBefore` doesn't list a second night for it;
  - learned bedtime earlier than "Day ends" (18:30 vs 19:00): no gap either way;
  - no wake that day: unchanged, clock day to "Day ends", clock night from it.
- [x] **3. Counts follow.** One `ring.test.ts` (or `day-window.test.ts`) test with the issue's second scenario: a feed at 06:20 and a diaper at 06:30 after a 06:00 wake are in `windowStats` of Today's window, not of last night's; last night's `sleptMs` is no more than bedtime → wake for a night with one sleep.
- [x] **4. Whole core suite.** Fix every expectation that encoded the old ends (search for `end: on(` in past-page tests and `needs-seeded.test.ts`). An expectation that changes for another reason than "the night now ends at the wake" is a regression: stop and bring it to the developer. `day-fixtures.test.ts` green.
- [x] **5. Playwright** (`e2e/tests/day-night.spec.ts`, next to the early-wake test that seeds a learned 08:30 wake and a 06:03 wake): add a feed at 06:20 and a diaper at 06:30, open last night (`Switch to last night`) → its boxes don't count them and its pager ends at 06:03; Today's sheet counts them. Existing `ring.spec.ts`, `recent-days.spec.ts` and `day-night.spec.ts` pass (their seeded wakes may already sit before the usual wake; update an assertion only for the reason above).
- [x] **6. Docs.** `CLAUDE.md` "Day and night" bullet: add that past windows tile (a past night ends at the next day's start, a night without bedtime starts at its day's end; the live night still runs to the usual wake). `plans/implan-day-night/NOTES.md` line "Day end / night end": point here. `plans/README.md` row.
- [x] **7. Wrap-up.** `implan-cleanup` wrap-up sweep, `pnpm check` and `pnpm e2e` green, PR into `develop`, issue #23 updated with anything that changed during the work.

## Decisions and why

- **Past windows tile, live ones guess.** A past night knows its morning; only the live one has to guess, so only it uses the usual wake.
- **One rule for every past night**, with or without a logged bedtime: the clock night had the same overlap.
- **Both seams, not only the morning.** The evening seam (day with no bedtime vs clock night) had the same overlap/gap with a learned bedtime, and the live clock night must start where the past day ends or the pages filter would show it twice.
- **The wake is the one `dayOn` finds**, so the night ends exactly where Today's "Day started" says. A waking that didn't meet the threshold stays in the night.
- **No app changes.** The rings, boxes, pager and Recent days all read `windowsBefore`.

## Not in this plan

- How the morning wake or bedtime is found (`wakeRange`, `firstWake`, `isBedtime`): unchanged.
- The live night's end, `nextSleep`, `dayPlan`, `isNight` / `nightFrom` (the saved nap flag): unchanged; they don't read past windows' ends.
- The needs layer's tuning (`NEEDS_TUNING`). Its rhythm reads the windows and may shift slightly; that's expected. The rhythm query isn't persisted, so no `rhythmVersion` bump.

## Assumptions

- The night's `wake` field (the wake before its bedtime) keeps its meaning.
- `dayWindow` stretches the live end to now + 30 min; past windows never stretch.
