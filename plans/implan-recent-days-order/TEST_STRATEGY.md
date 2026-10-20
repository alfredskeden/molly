# Test strategy: done when every box is ticked

## Unit (Vitest, `apps/molly/src/features/days/recent.test.ts`, TDD)

- [x] Only the live day: one `Today` card, day in the right slot, night slot empty.
- [x] Live day with last night: `Today` card holds last night (left) and `Today so far` (right).
- [x] Many: each past card holds the night ending that morning (left) and that day (right), newest card first.
- [x] Live night: top card `Tonight` with Tonight on the left and no day; next card `Today` with last night + the day.
- [x] Oldest day whose night isn't loaded: day on the right, left empty.
- [x] Card date is the morning's date (Tonight's card shows tomorrow's date).

## Playwright (`e2e/tests/recent-days.spec.ts`)

- [x] `1k`: Today, Yesterday, day before; `Yesterday, Night` is the night that ended yesterday morning, and in each card the night button comes before the day button.
- [x] `Load 3 more days` still adds three and disappears when nothing older is logged.
- [x] `pnpm check` and `pnpm e2e` green.

## Look review (manual: web and emulator-5554, both themes, largest font)

- [ ] Night left, day right on every card; empty halves keep the rings aligned.
- [ ] The Tonight card in the evening reads right and doesn't look broken with its empty half.
- [ ] Tapping either ring still opens that window on the dashboard.
