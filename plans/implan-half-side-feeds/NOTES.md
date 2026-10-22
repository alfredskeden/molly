# Notes

## Decisions (2026-10-22)

- `left breast` / `right breast` count half the default bottle; `both breasts` the whole default (issue #7).
- Halves are added exactly and the total rounded once to whole ml (not each half).
- No `MENTAL_MODEL.md`: the change is one rule in one function.

## Facts from the code

- The rule lives only in `drank` (`packages/core/src/drank.ts`): today every non-bottle, non-solid feed and every bottle without `amount` adds `defaultMl` in full.
- Callers: `drankLine` in `apps/molly/src/app/(main)/recent-days.tsx` and the Today sheet in `apps/molly/src/app/(main)/index.tsx` (`drankText(drank(entries.feeding, from, to, defaultMl))`). Neither needs to change.
- The bottle default steps in 5 ml (`More: +5 ml` in the editor), so an odd default like 125 ml is possible and its half is fractional.
- Cleanup sweep: nothing to remove. Only stale wording (the `drank.ts` doc comments, old plans' rule text) and test numbers, handled in steps 1–3.

## Expected e2e numbers (default bottle 120 ml, `e2e/tests/recent-days.spec.ts`)

`seedToday` has one right and one left breastfeed; `seedDaysBefore` one left breastfeed per day.

| Line | Before | After |
| --- | --- | --- |
| 63, 1e Today sheet label (`seedToday`) | about 240 | about 120 |
| 147, yesterday card (left + 90 ml bottle) | ≈ 210 | ≈ 150 |
| 148, today card (`seedToday`) | ≈ 240 | ≈ 120 |
| 159, "a ring on a card with an ml line…" | `≈ 120 ml` (yesterday's card) | yesterday's card now `≈ 60 ml`, and today's card is `≈ 120 ml`. Check the test still targets the card it means |
| 218, Today label | about 240 | about 120 |
| 236–237, Today sheet (90 ml bottle + right) | ≈ 210 | ≈ 150; with the added `both breasts` feed 270 and 3 feeds |
| 269, Tonight (one right) | about 120 | about 60 |

## Open

- None.
