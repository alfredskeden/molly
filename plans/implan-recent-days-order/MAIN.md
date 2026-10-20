# Recent days: night, then day

**Outcome:** each card on the Recent days screen (`apps/molly/src/app/(main)/recent-days.tsx`, design `1k`) shows **the night that led into a day on the left, and that day on the right**. Today, a card holds a day and the night that *starts* on it (day left, night right). The night the baby woke from should sit next to the day it opened, because they belong together.

Nothing else changes: the dashboard ring, its cap / pair switching (`pairOf` in `src/app/(main)/index.tsx`), the Today sheet, mini rings, totals and `Load 3 more days` all stay as they are.

## The rule

A card is one **morning** (a calendar date). It holds two fixed slots:

| Slot | Window | Which one |
| --- | --- | --- |
| Left | night | the night that **ends** on that date (bedtime the evening before → wake that morning) |
| Right | day | the day that **starts** on that date |

So a window's card key is: day → the calendar date of its `start`; night → the calendar date after its `start`. Use `start` + 1 day rather than `end`, because a live night's `end` is a guess, not the wake.

## Decisions

- **Tonight gets its own top card.** While the night is live it belongs to tomorrow's morning, which has no day yet. The top card is titled `Tonight`, Tonight's ring in the left slot, right slot empty. Below it, Today's card shows last night + the day.
- **Slots are positioned by kind, not by order.** A card with only a night (Tonight) shows it on the left; a card with only a day (the oldest loaded day, whose night isn't fetched yet, or a day with no logged bedtime before it) shows it on the right. The missing half stays empty, so rings line up down the list.
- **Card date is the morning's date** (`windowDate` of the day, or of the night's end morning). The Tonight card therefore shows tomorrow's date.
- **Titles:** day cards keep `Today` / `Yesterday` / weekday, from the morning's date. The Tonight card is `Tonight`.
- **Labels stay:** `Night`, `Day`, `Today so far`, `Tonight`. Screen-reader labels keep their shape (`Yesterday, Night: slept …. Open`), now meaning the night that ended yesterday morning.

## Where the work is

- `apps/molly/src/features/days/recent.ts` → `recentDays(live, past)`: the grouping key, the title, the date, and returning slots by kind (e.g. `{ night?, day? }` instead of a sorted `windows` array, or keep the array and let the card place by `kind`; your call, keep it simple).
- `apps/molly/src/features/days/recent.test.ts`: unit tests change to the new grouping.
- `recent-days.tsx` → `DayCard`: render left (night) and right (day) slots, an empty half where one is missing.
- `e2e/tests/recent-days.spec.ts` (`1k` and `Load 3 more days`): assertions that rely on which night sits on which card.

## Steps

1. [x] Core of the change in `recent.ts`, test-first (unit, Vitest): new grouping, Tonight card, slots by kind.
2. [x] `DayCard` draws night left / day right with an empty half when missing.
3. [x] Update the Playwright Recent days specs; `pnpm check` and `pnpm e2e` green.
4. [ ] Look review (see `TEST_STRATEGY.md`), then update the `implan-ring-redesign` mentions if they describe the old order (`MENTAL_MODEL.md` "day + night mini rings") and add this plan to `CLAUDE.md`.

## Assumptions

- `DayWindow` (`packages/core`) has `kind`, `start`, `end`; a night starts on one calendar date and ends on the next.
- `daysRows` already gives every finished window newest first; only the grouping in `recentDays` needs to move.
- TDD per the testing method (`CLAUDE.md` "Testing method"): `recent.ts` is unit-tested; the screen is checked with Playwright and by eye.
