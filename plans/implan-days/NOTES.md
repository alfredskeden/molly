# Notes: days

## Decisions

- The swipe goes back **one window only**: Today → last night, Tonight → the day that just ended. The 7-day swipe was doing too much.
- A new **Days** screen, opened from `All days ›` on the Today card. It shows **separate day and night rows** (the same split as the swipe pages), with the **Likely lane and accuracy line** on days, **newest first**, and **Load earlier** a week at a time like History.
- The Days screen **starts at the last finished window**. The live window stays on the dashboard only.
- **Read-only**, **no filter chips**.
- **No design file**: rows reuse the past-page card look.
- Plan is flat, with its own folder (not a phase of the day plan).

## Defaults chosen during planning (overturn if they look wrong)

- Days rows have **dated titles** (`Saturday 26 September`, `Friday night 25 September`), because weekday names repeat after a week. The swipe's single past page keeps its plain weekday.
- `All days ›` is in the live card's header slot on both Today and Tonight, not on the past page (that slot holds `Back to now ›`).

## Findings

- Step 1: `previousWindow` is `windowsBefore(entries, napWindow, now, 1, running)[0]`. Writing its tests showed `windowsBefore` ignored the running sleep when finding past bedtimes: with the bedtime timer running (live page Tonight from 19:25), the first past page was a clock night from 19:00 instead of today's day ending 19:25. It now counts the running sleep as a span up to now, as `dayWindow` does (shared `spans` helper).
- Step 2: Baby Buddy v2.11.0's `/api/notes/` filters `date_max` on `time`, like medication: with `date_min` 14 September and `date_max` 21 September, a `molly-skip` note on the 22nd drops out and one on the 15th stays (`notes.int.test.ts`). The client already passed the query through; only `NoteQuery` gained `date_max`.
- Step 3: the shared card is `PastWindowCard` (`features/dashboard/PastWindowCard.tsx`, with `pastSummary` for screen readers); the swipe page passes `Back to now ›` as its header. `usePastEntries` now reads entries since two midnights back (`PAST_MIDNIGHTS`) and sleeps 17 midnights back; the skips query reads since the same two midnights. The live card's `All days ›` sits inside the adjustable pager, where TalkBack can't reach a link on its own, so the pager also offers it as a custom accessibility action (`more`).
- Step 4: `useDays` (`features/days/queries.ts`) fetches one query per week: every kind in History's week, sleeps by overlap from `PREDICTION_DAYS` before it, and the week's `molly-skip` notes (`date_min`/`date_max`). `daysRows` (`features/days/rows.ts`) merges the weeks and takes `windowsBefore` over them, keeping windows that start in a loaded week, and drops the oldest rows with nothing logged in them (empty days before the first log); empty windows between logged ones stay. Rows go by the data's fetch time (`dataUpdatedAt`), not the ticking clock, so the Likely lanes are worked out only when the data, nap window or running sleep change. Not virtualised: plain rows in the screen's ScrollView, to look at in the manual review.
- Found by the `Load earlier` spec: `windowsBefore` took a day's bedtime from any later sleep, however far on. A day with a wake and no logged bedtime (a gap in the logs) ended at the next day's 09:00 nap, or a week later, and repeated a later night. A bedtime now has to start before the next morning's nap-window start (unit test in `day-window.test.ts`). The old 7-day swipe had the same fault.
- `Start sleep` under Playwright's fixed clock gets Baby Buddy's real time as its start (the server stamps it), so the "write on the dashboard" spec cancels a seeded bedtime timer instead.
- After install: the Days screen was slow to open on a physical phone. In Node, a week's rows take ~1 ms for `windowsBefore` and ~30 ms for the Likely lanes (`likelyFor` replays a day plan per sleep), and Hermes has no JIT. The rows are now a `FlatList` (2 cards before first paint, then 2 per batch) instead of the Screen's ScrollView. The same cost explains why the dashboard feels faster: it used to run `likelyFor` for 7 past days on every render, clock ticks included.

## Open

- None.
