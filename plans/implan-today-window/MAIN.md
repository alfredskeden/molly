# Today window

Context: the Molly system plan in [`../implan-molly/MAIN.md`](../implan-molly/MAIN.md) (architecture, rules) and the shipped polish work in [`../implan-polish/MAIN.md`](../implan-polish/MAIN.md). Decisions and verified facts are in [`NOTES.md`](NOTES.md). The Definition of Done is in [`TEST_STRATEGY.md`](TEST_STRATEGY.md).

**Outcome:** the dashboard's Today card follows the baby's day instead of the clock's. "Today" starts at the morning wake and lasts until bedtime, then the card becomes "Tonight" until the next morning wake, so night feeds and short night wakes stay in the night they belong to. The strip, the totals line and Recent all use that window instead of local midnight.

## The design source

`Today Window Spec.dc.html` (the private design source, not in this repo). It's one slide: three example cards (18:20 awake, 19:20 still awake, 23:10 asleep) and five numbered rules. Its colours are the tokens already in `apps/molly/src/theme/tokens.ts`.

Where this plan and the slide disagree, this plan wins. The deviations:
- The card keeps its current layout: four labelled lanes (Sleep, Feed, Diaper, Med) and the full totals line. The slide's two unlabelled lanes are a simplification.
- Morning wake and bedtime use stricter rules than the slide's wording (see Rules), so early wakes and morning naps don't move the window.
- The no-wake fallback goes by the clock, not "today's `napWindow.start`" (which lies in the future before 07:00).
- Ticks are start, every third whole hour, end, not every whole hour.
- Recent starts at the morning wake, not at the window's start, so it keeps the whole day at night.

## Rules

`napWindow` is the per-device setting (`settings.napWindow`, default 07:00–19:00). Below, "start" and "end" mean its two times, and 07:00 / 19:00 are only examples. The window is computed on every render from the current setting, so changing the nap window in Settings moves the card at once. Nothing is stored.

1. **Morning wake**: the end of a sleep that isn't a nap (`isNap(start)` is false), within ±2 h of `napWindow.start` on that day. The closest one wins. Only finished sleeps count. Naps never count.
2. **Which day is current**: today's morning wake if one has happened. Before today's ±2 h range has closed (before 09:00) with no wake yet, yesterday's morning wake, so last night carries on.
3. **Bedtime**: the first sleep after the morning wake that starts after `napWindow.end`, or a sleep that started inside the window and is still going (running, or ended) after `napWindow.end`. The running sleep timer counts. A sleep that starts before `napWindow.start` (back to sleep at 06:00 after a 05:30 wake) is not a bedtime. When it ends it becomes a closer morning wake.
4. **Day → night only at bedtime.** Passing `napWindow.end` awake keeps "Today". Night lasts until the next morning wake.
5. **No usable wake, go by the clock**: no morning wake found, or yesterday's wake with no bedtime after it (a day never runs past midnight). Between `napWindow.start` and `napWindow.end`: "Today" from today's `napWindow.start`. Otherwise: "Tonight" from the most recent `napWindow.end`. So at 03:00 with nothing logged, the card shows Tonight, 19:00 yesterday → 07:00.
6. **Range**: day runs wake → max(today's `napWindow.end`, now + 30 min); night runs bedtime (or fallback start) → max(the next `napWindow.start`, now + 30 min).
7. **Ticks**: the start, every third whole hour after it, and the end. Leave out an hour tick that would crowd the start or end label.
8. **Nap-window-end marker**: when a day strip runs past `napWindow.end`, a dashed vertical line marks it (the slide's 19:20 card).
9. **Clipping**: the strip lanes and totals clip at the window's start instead of midnight. Sleep that began before it counts only from the start, and a feeding counts if it started at or after it. Recent shows everything that ended (or happened) since the morning wake of the current day. With the clock fallback, that's the fallback start.

## Shape

```
packages/core/src/day-window.ts   dayWindow(entries, running, napWindow, now)
                                    → { kind: 'day' | 'night', start, end, wake }   (epoch ms or Date: your call)
                                  stripTicks(window) → labelled positions
packages/core/src/strip.ts        todayStrip(entries, running, window, now)  shares of window, + marker
packages/core/src/totals.ts       todaysTotals(entries, window)              clip at window.start
packages/core/src/timeline.ts     todaysTimeline(entries, since)             since = window.wake
apps/molly/src/app/(main)/index.tsx          computes the window once per render (it already has `now`)
apps/molly/src/features/dashboard/TodayCard.tsx   title, subtitle, ticks, marker, a11y label from kind
```

`wake` is the morning wake that opened the current day: for a day it equals `start`, and for a night it's the wake before the bedtime. With the clock fallback it's the fallback start. The exact names and whether `todayStrip` takes the window or its parts are up to you. Keep everything in `packages/core` pure, with no React, no I/O, and time passed in.

Card copy, from the slide:
- Day: title "Today", subtitle "woke HH:MM"
- Night: title "Tonight", subtitle "bed HH:MM"
- Clock fallback: the same titles, with no subtitle (there's no real wake or bedtime to name)
- Screen-reader label: "Today: …" or "Tonight: …" plus the totals, as now

The entry fetch (`useRecentEntries`, from yesterday's local midnight) already covers every window these rules can produce, so it stays as is.

## Steps

Work through the steps in order; each lands on its own. Mark a step `[x]` when it's fully done, and record findings in [`NOTES.md`](NOTES.md).

- [x] **1. `dayWindow` in core.** Unit TDD (Vitest, Given / When / Then): no data first (clock fallback, both sides of the nap window), then one night sleep giving a wake, then bedtime (after the window end, a nap running past it, the running timer), then many (night wakes and feeds, early wake and back to sleep, morning nap), then boundaries (exactly ±2 h, exactly at `napWindow.end`, now + 30 min stretching the end, the day before a clock change, a non-default nap window).
- [x] **2. Window-aware strip, totals, timeline and ticks.** Unit TDD. Move `todayStrip`, `todaysTotals` and `todaysTimeline` from midnight to the window (update the existing tests in `strip.test.ts`, `totals.test.ts`, `today.test.ts` to the new signatures instead of keeping midnight versions around). Add `stripTicks` and the marker. If nothing else uses the midnight behaviour, remove it.
- [x] **3. Dashboard.** Wire the window into `index.tsx`, `TodayCard` and Recent. Playwright with a fixed clock (`page.clock`) for a day card, a stretched day card with the marker, and a night card whose Recent still shows the day. Pin the clock in any existing spec (`dashboard`, `hero`, `history`, `medication`, `accessibility`) that would otherwise flip at night. Update the "Where things stand" section in the root `CLAUDE.md`.

## Assumptions

- Feeding entries are placed by their start, as today. Diaper changes and medication by `time`.
- A night sleep that ends between the two ±2 h ranges (say at 03:00, and the baby stays up) leaves the night running until 09:00, and then the clock fallback makes it "Today from 07:00". That's accepted.
- The slide's numbers (sleep totals, block positions) are illustrative. The rules above are the spec.
