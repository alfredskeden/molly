# Notes

## Decisions

- Reason: the night belongs with the day it led into, so a card reads night + day.
- Live Tonight: own top card titled `Tonight`, ring left, right half empty (chosen over squeezing three rings onto Today's card).
- Card date = the morning's date; Tonight's card shows tomorrow's date. Revisit at the look review if it reads oddly.

## Done

- `RecentDay` holds `night?` / `day?` slots (`RecentSlot`) instead of a `windows` array; the card is keyed by the morning (`morningOf`: a night's start date + 1). `DayCard` draws `Slot`s, an empty half where one is missing.
- Web look (Classic day, 412 px): night left, day right, rings line up; the evening's Tonight card with its empty right half reads fine. Emulator, night scheme and largest font still to check.
- Seen on the web, not changed here: the live Tonight ring's total reads `0m` while the sleep runs (`summary` counts finished sleeps only), same as before.
- A night whose bedtime falls after midnight would land on the card a day too late (start + 1); no such night in practice.

## Facts found while planning

- Grouping lives in `recentDays` (`features/days/recent.ts`): today keyed by `dateKey(window.start)` and sorted by start, which is why day comes first.
- `windowTitle` (core `ring.ts`) returns a weekday for a future-dated day, so the Tonight card's title must be set explicitly.
- The dashboard's cap pairs windows counting back from the live one (`pairOf` in `index.tsx`), not by calendar: unaffected.
