# Nap or night: notes

## Decisions (2026-10-04)

- **Labels show what Baby Buddy has saved.** "Nap" / "Night sleep" titles in the Today sheet, the editor and the ring's spoken text keep reading the stored `nap` flag. Old wrongly saved sleeps are fixed by hand.
- **The flag can be changed by hand**: a `Nap | Night sleep` choice in the sleep editor.
- **Saving follows the timing rule** (nap only if it started inside the nap window and ended by its end). Decided at Stop, when the end is known.
- **Predicting never reads the flag.** Bedtime on past days is found by timing, the same rule `dayWindow` already uses, so old wrong flags and sleeps logged in Baby Buddy's own UI (its own nap window) can't break it.
- Reproduce with made-up data, not real logs, for now. A replay on one family's real logs (not committed) is welcome later, numbers into this file.

## The bug, reproduced (made-up logs, 2026-10-04)

Two weeks of a 5-month-old (born 2026-05-03), nap window 07:00–19:00, naps 09:30–10:30, 12:30–13:30, 15:30–16:15, night 18:45 or 19:15 → 02:00, back to sleep 02:20 → 07:30. Today as in the reported screenshot: woke 08:30, naps 10:13–10:53, 12:49–13:24, nap running since 15:26, now 16:04.

| Past evenings | `dayPlan` at 16:04 |
| --- | --- |
| 2 of 3 bedtimes at 18:45 (saved as nap: start ≤ 19:00) | nap 18:20–19:02, bedtime 01:56–02:36 |
| all bedtimes at 19:15 (saved as night) | nap 18:11–19:11, bedtime 22:06–22:46 |

Causes, in `packages/core/src`:

1. `next-sleep.ts` (`bedtimeAwake`, `usualBedtime`, `napAwake`, `usualNapLength`) and `day-plan.ts` (`usualNapCount`) treat the first sleep with `nap: false` as bedtime. An 18:45 bedtime saved as a nap makes the 02:20 stretch the "bedtime": the usual bedtime becomes ~02:00 and `notBeforeUsualBedtime` clamps the plan's bedtime to usual − 60. The usual nap count also becomes 4, hence "Nap 4 likely".
2. `dayPlan` applies the nap-count stop only from the second planned sleep: the first one (`let next = predictSleep(context, context.anchor, slot, …)`) never checks it, awake or with a nap running. With clean data it invents a 4th nap at 18:11 and a full wake window after it.
3. No upper bound: nothing keeps bedtime near the usual one on the late side.
4. Short naps don't move bedtime; only a tapped Skip does (`earlierBedtime`, capped at `earliestBy` 60).

The made-up scenario script lived in the planning session's scratchpad. Rebuild it as unit tests (see `TEST_STRATEGY.md`).

## Facts found while planning

- Saving: `client.stopSleep({ timer, nap: isNap(timer.start) })` and `client.logSleep({ …, nap: isNap(draft.start) })` in `apps/molly/src/actions/trackers.ts`. Widget and lock-screen stops go through the same functions (`runIntent`).
- `isNap(start, window)` (`packages/core/src/nap.ts`) is start-only, inclusive of the window end (19:00 is a nap).
- Running-sleep words also use `isNap(start)`: lock-screen "saves as nap | night sleep" (`src/notification/model.ts`), the ring centre while sleeping and the running-sleep editor title (`src/app/(main)/index.tsx`).
- `dayWindow`'s private `bedtime()` (`day-window.ts`) already finds the night by timing: the first sleep after the morning wake that started after the nap-window end, or started inside the window and was still going at its end. `morningWake` already ignores the flag (it uses `isNap` on the start).
- `replay.ts` scores by the flag (`target.nap`, `!entry.nap`).
- The inline sleep editor (ring redesign) has no nap choice: its title reads `target.entry.nap`, `patchOf` sends only start / end. The feed editor already has a `kinds` choice row. `editEntry('sleep', id, { nap })` works (`EntryPatch`).
- Baby Buddy fills `nap` itself when it's missing, from server settings `NAP_START_MIN` / `NAP_START_MAX` (default 06:00–18:00), by start time only. Molly always sends it.

## Research (2026-10-04)

[G] = guidance, no data. [M] = measured.

- **Earlier bedtime after short naps** [G]: Huckleberry (5-month schedule: "bedtime will likely need to be adjusted earlier"; near 6 months prefer early bedtime over a 4th nap), Taking Cara Babies (bedtime as early as 18:00; a late catnap pushes bedtime later; ≤ 5 months may need both). Weissbluth, unverified quote: 10–30 min earlier. **No study measures how much earlier.** Hence a conservative share of the shortfall with the existing 60 min cap.
- **Early bedtime pays off** [M, indirect]: actigraphy, 24 infants 6–24 weeks: each hour earlier than the infant's usual sleep onset gave 34 min more night sleep and only 8 min earlier waking (PMC11983790).
- **Bedtime range**: Huckleberry 18:00–20:00 at 5 months [G]; Mindell 2010, 29 287 children 0–36 months, mean bedtime 19:27 (NZ) to 22:17 (HK) [M]. So no fixed clock cap that suits every family: bound by the child's own usual bedtime instead.
- **Last wake window is the longest** [G]: Huckleberry at 5 months, 2–2.5 h, near 3 h close to 6 months. Matches `wakeForSlot('last')`.
- **4th nap vs early bedtime** [G]: catnap fine at ≤ 5 months, early bedtime after. Molly already follows the child's own usual nap count; no age rule added.
- **Other apps**: Baby Buddy by start window; Huckleberry by user-set day / night start times plus nap count; research actigraphy counts a nap only from 20 min (6–12 months).

Sources: huckleberrycare.com/blog/5-month-old-sleep-schedule-and-development, huckleberrycare.com/blog/4-to-3-nap-transition, takingcarababies.com/blogs/sleep-schedules/nap-schedules-5-months-to-24-months, pmc.ncbi.nlm.nih.gov/articles/PMC11983790, pubmed.ncbi.nlm.nih.gov/20138578, github.com/babybuddy/babybuddy issue 503, pubmed.ncbi.nlm.nih.gov/27198952.

## Implementation (2026-10-04)

- The rule is `isNightSleep(start, end, napWindow)` in `packages/core/src/nap.ts`. `dayWindow`'s `bedtime()` uses it, and so does `morningWake` (it was start-only, so the morning after an 18:45 bedtime with no logged night waking had no wake: the day fell back to the clock).
- `PastDay` is now `{ wake, naps, bedtime }`, split by the rule in `daysBefore`; nothing in `next-sleep.ts` / `day-plan.ts` / `replay.ts` reads `nap`.
- The usual nap count, the late bound and the short-nap move live in `predictSleep` / `sleepContext` (`usualNaps`, `bedtimeKnown`, `naps`, `earlier` on `SleepContext`), so `nextSleep` keeps equalling the plan's first unskipped sleep. `DayPlanTuning` / `DAY_PLAN_TUNING` moved to `next-sleep.ts` for that (re-exported from `day-plan.ts`); `nextSleep` takes it as an optional last argument.
- **Decision made while building:** the usual nap count skips past days with no logged nap (a logging gap, not a day without naps). Without that, a family logging only nights got "bedtime next" straight after the morning wake (an existing `next-sleep` test caught it).
- Skips and short naps share `earliestBy`: short naps take their part first (`context.earlier`), skips get what's left.
- Saving: `stopSleep` takes `now` (default the stop moment), `runIntent` passes it through; `addEntry` uses the entered end. Running words (lock screen, ring centre, running editor title) use the rule with end = now. The lock-screen line only changes when the notification is redrawn (a refresh), not on the minute at 19:00.
- Editor: the sleep draft carries `nap`, `withNap` sets it, `patchOf` always sends it; the row is the existing `kinds` segment labelled "Saved as" (`Nap | Night sleep`). The title stays the saved flag until the refetch.
- `scripts/replay-naps.ts --reflag` reflags by the rule too.
- Playwright: all pass except `running.spec.ts` "−5 and Done move a running feed's start" and "a refused start move rolls back…", which fail the same way on `main` without these changes (run at 19:16 local; they look time-of-day dependent).

## Open

None.
