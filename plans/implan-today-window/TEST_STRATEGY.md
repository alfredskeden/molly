# Today window: Definition of Done

Done when every item below is true. The method follows [`../implan-molly/TEST_STRATEGY.md`](../implan-molly/TEST_STRATEGY.md): unit TDD for `packages/core` (Given / When / Then, zero → one → many, then boundaries), Playwright on the web image for flows with the clock fixed by `page.clock`, and manual review for looks. No API or Android-only behaviour changes, so there are no new integration or device checks.

All times below assume the default nap window 07:00–19:00 unless stated.

## Nothing regresses

- [x] `pnpm check` is green, and every existing Playwright spec passes at any time of day (specs that assert the Today card or Recent run on a fixed clock).
- [ ] Widgets, the lock-screen notification and History behave as before.

## Which window (`packages/core`, unit TDD)

- [x] Nothing logged: at 12:00 it's Today from 07:00; at 03:00 and at 21:00 it's Tonight from the last 19:00.
- [x] One night sleep ending at 06:40: Today, wake 06:40.
- [x] Several night sleeps ending in the ±2 h range (night wakes, back to sleep): the end closest to 07:00 is the wake. A sleep ending exactly 2 h away still counts; one just outside doesn't.
- [x] A morning nap (started inside the window) never becomes the wake, even when it ends closer to 07:00.
- [x] Early wake then back to sleep at 06:00: stays Today with the early wake while that sleep runs. When it ends, its end becomes the wake.
- [x] Bedtime: a sleep starting after 19:00 flips to Tonight at its start. So does the running sleep timer, and a nap started at 18:30 that's still going (or ended) after 19:00. A nap ending before 19:00 doesn't.
- [x] Still awake at 19:20 with no bedtime: stays Today.
- [x] At night: a night feed and a short wake after bedtime keep Tonight, and the window's wake is the morning wake before bedtime.
- [x] Before 09:00 with no wake yet today, yesterday's wake and bedtime carry the night on. After 09:00 with none, the clock decides.
- [x] Yesterday's wake with no bedtime after it: the clock decides (no day past midnight).
- [x] Range: day ends at max(19:00, now + 30 min), night ends at max(next 07:00, now + 30 min).
- [x] A non-default nap window (e.g. 06:00–18:30) moves every rule above with it.
- [x] The night that crosses a clock change still produces the right window (no 1 h shift).

## Strip, ticks, totals, timeline (`packages/core`, unit TDD)

- [x] Lanes are shares of the window. A sleep that began before the window start is clipped to it, and nothing before the start appears.
- [x] Ticks: start, every third whole hour, end, with an hour tick too close to the start or end left out (06:40 → 19:00 gives 06:40 · 10:00 · 13:00 · 16:00 · 19:00).
- [x] Nap-window-end marker: present when a day strip runs past `napWindow.end`, at its position, and absent otherwise and at night.
- [x] Totals clip at the window start: sleep only from the start, feeds that started at or after it, diapers and meds at or after it.
- [x] Timeline: everything that ended (or happened) since the given wake, so at night it holds the whole day plus tonight.
- [x] No midnight-only versions of these functions remain, unless something outside the Today card still needs one.

## Dashboard (Playwright, fixed clock)

- [x] 18:20 on a seeded day: the card reads "Today" · "woke HH:MM", its ticks start at the wake, and its accessible label starts "Today:".
- [x] 19:20 still awake: still "Today", the strip runs past 19:00 with the dashed marker.
- [x] After bedtime (Start sleep after 19:00, or a seeded one): "Tonight" · "bed HH:MM", accessible label "Tonight:", totals count only since bedtime, and Recent still lists the day's entries from the morning wake.
- [x] Changing the nap window in Settings changes the card's window without a reload.

## Looks (manual review, web and emulator)

- [ ] The card matches the slide's three states in the Day and Night themes: title and subtitle, ticks, dashed marker, now line. At the largest font scale nothing clips.
