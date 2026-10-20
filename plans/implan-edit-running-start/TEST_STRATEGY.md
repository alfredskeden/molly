# Edit a running timer's start: Definition of Done

Done when every item below is true. The method follows [`../implan-molly/TEST_STRATEGY.md`](../implan-molly/TEST_STRATEGY.md): TDD for `packages/core`, Playwright on the web image for flows, manual review for looks.

## Domain rule (`packages/core`, unit TDD)

- [x] A start moved by ±5 min is never later than now and never earlier than the given earliest time, and the rule says when a direction can't move any further.
- [x] Whether overlapping feedings are refused on stop is confirmed against the live API and recorded in `../implan-molly/NOTES.md`, and the feeding earliest time follows from it.

## App flow (Playwright on the web image)

- [x] Tapping the hero's big timer on a running feeding opens the popup; −5 then tapping outside moves the timer's start in Baby Buddy, and the hero's "since" line and a "Start moved to HH:MM" toast show the new time.
- [x] Opening and closing the popup without a change writes nothing.
- [x] +5 can't go past now; a running sleep's start can't go before the last sleep's end.
- [x] A refused save rolls back the hero and shows a failure toast.
- [x] Every existing Playwright spec still passes.

## Visual review (manual, web and Android, both themes)

- [ ] The popup matches the redesign's look (tracker colours, Nunito, tabular digits, radii), and −5 / +5 are at least 44 px tap targets.
