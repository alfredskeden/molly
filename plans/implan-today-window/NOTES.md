# Notes

## Decisions (2026-09-25)

- Design: `Today Window Spec.dc.html` (the private design source, not in this repo); its `support.js` and `deck-stage.js` are the slide runtime, not spec.
- Keep the current Today card layout (four labelled lanes, full totals line). The design's two unlabelled lanes and sleep-plus-feeds header are a slide simplification. What changes: the title, the "woke / bed HH:MM" subtitle, the range, the ticks, and the dashed nap-window-end marker.
- Ticks: start, every third whole hour, end (the design's 06:40 · 10:00 · 13:00 · 16:00 · 19:00).
- Recent also moves off midnight, and starts at the morning wake that opened the current day, so at night it shows the whole day plus tonight. It resets at the next morning wake.
- The rules are stricter than the slide's wording, so early wakes and morning naps don't move the window:
  - Morning wake: the end of a sleep that isn't a nap (it started outside the nap window), within ±2 h of `napWindow.start`. The closest one wins. Naps never count.
  - Bedtime: the first sleep after the morning wake that starts after `napWindow.end`, or a sleep that started in the window and is still asleep after `napWindow.end`. A sleep starting before `napWindow.start` (back to sleep at 06:00 after a 05:30 wake) is not a bedtime. When it ends it becomes the new, closer morning wake.
- No morning wake found: go by the clock. From `napWindow.start` to `napWindow.end` it's "Today" from `napWindow.start`. Otherwise it's "Tonight" from the last `napWindow.end`, e.g. at 03:00 with nothing logged: Tonight, 19:00 yesterday → 07:00.

## Found while planning (2026-09-25)

- Midnight is hard-coded in three core functions: `todayStrip` (`packages/core/src/strip.ts`), `todaysTotals` (`totals.ts`) and `todaysTimeline` (`timeline.ts`). They're called only from `apps/molly/src/app/(main)/index.tsx`. Widgets and the notification don't use them.
- `useRecentEntries` (`src/features/dashboard/queries.ts`) fetches from yesterday's local midnight. That covers everything the window needs: the earliest start it can produce is yesterday's morning wake, at `napWindow.start − 2h` at the earliest.
- `NapWindow` and `isNap` are in `packages/core/src/nap.ts`. The window is a per-device setting (`settings.napWindow`, Settings screen), so nothing may assume 07:00 / 19:00.
- `todaysTotals` doesn't count running timers, and `todayStrip` draws them up to now. Keep that as is.
- Playwright specs touching the Today card or Recent: `dashboard`, `hero`, `history`, `medication`, `accessibility`. They run on the real clock, so any that assert the title or Recent contents need a fixed clock (`page.clock`) or they'll flip at night.

## Found while building (2026-09-25)

- **Ticks sit on the nap-window start's grid**, not "three hours from the window start": `stripTicks(window, napWindow)` puts hour ticks every third hour counted from `napWindow.start` (07:00, 10:00 … 22:00, 01:00, 04:00). That's what the slide shows for both cards (06:40 · 10 · 13 · 16 · 19 and 19:25 · 22 · 01 · 04 · 07); counting from the window start would give 20 · 23 · 02 · 05 at night. An hour tick within 10% of the window of the start or end label is left out.
- `DayWindow` is `{ kind, start, end, wake, clock }` with `Date`s. `clock: true` means the clock fallback (the card then has no subtitle). The nap-window-end marker is `todayStrip(…).marker` (share or null), so `todayStrip` takes the nap window too.
- `atClock(day, days, 'HH:MM')` moved to `nap.ts` and is shared: every "07:00 on some day" is built by the calendar, so the October clock change doesn't shift the night's end (unit-tested for Europe/Stockholm, 25 Oct 2026).
- `todaysTotals(entries, since)` and `todaysTimeline(entries, since)` take a start time: the window start for totals, `window.wake` for Recent. No midnight versions remain; History keeps its own midnight clipping (`historyDays`).
- **E2E clock**: `page.clock` can't pin "today at 23:10": Baby Buddy stamps timers with server time and refuses entries in the future, so a fixed browser clock ahead of the real one breaks. `today-window.spec.ts` seeds the whole day into *yesterday* and installs the browser clock at yesterday's 18:20 / 19:20 / 23:10. Specs that log through the UI at the real time (or seed around midnight) instead sign in with `ALL_DAY` (`e2e/tests/session.ts`), which makes the card run from local midnight whatever the hour. The full suite passed at 23:18 real time.
- After Settings → Done the router keeps the first dashboard mounted under the new one, so dashboard locators after a round trip need `.filter({ visible: true })`.
