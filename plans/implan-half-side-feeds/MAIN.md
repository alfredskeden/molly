# One-side breastfeeds count half the default bottle

GitHub issue #7.

## Outcome

The "about how much the baby drank" line (Recent days cards, Today sheet) counts a breastfeed from one side as half the child's default bottle, and one from both sides as the whole default. Before, every breastfeed counted the whole default, so a day of one-side feeds read about twice too high.

| Feed | Counts (default 120 ml) |
| --- | --- |
| `left breast` / `right breast` | half the default: 60 ml |
| `both breasts` | the default: 120 ml |
| `bottle` with `amount` | that amount (unchanged) |
| `bottle` without `amount` | the default (unchanged) |
| `parent fed` / `self fed` | nothing (unchanged) |

## The rule

Only `drank` in `packages/core/src/drank.ts` changes. Its callers (`drankLine` in `apps/molly/src/app/(main)/recent-days.tsx`, the Today sheet in `apps/molly/src/app/(main)/index.tsx`) don't change.

- Each estimated feed adds a share of `defaultMl`: `0.5` for `left breast` / `right breast`, `1` for `both breasts` and for a bottle without `amount`.
- Add the exact shares, then round the **total** once to whole ml (`Math.round`). Three left-breast feeds at 125 ml → 187.5 → 188 ml. Don't round each half.
- With no default (`defaultMl` undefined) nothing changes: those feeds add no ml and are counted in `unmeasured` / `unmeasuredBreast` as before (`360 ml + 3 breastfeeds`).
- `estimated` stays true when any feed was guessed, half or whole.
- `drankText` and the wording don't change.

## Decisions and why

- **One side = half a feed**: a single breast is about half of what the baby takes from both. The default bottle is still the parent's idea of a full feed, so `both breasts` keeps the full default as the upper guess.
- **Round the total, not each feed**: rounding each half would let odd defaults drift by up to 0.5 ml per feed. The line is a whole number anyway.
- **Left then right saved as two entries** count half + half = one full feed, which matches `both breasts`.

## Boundaries

- No change to how feeds are saved, to the feed tile, widgets, notifications, `totalsBetween` or `drankText`.
- No new setting (no per-side amount).
- Nothing is written to Baby Buddy; no new query.

## Steps

1. [x] `drank` counts one side as half the default, TDD in `packages/core/src/drank.test.ts` (see `TEST_STRATEGY.md`). Update the tests that assumed a full default per breastfeed (the `it.each` over the three methods, "adds bottles and a default per breastfeed together"). Rewrite the doc comments on `Drank` and `drank` so they no longer say every breastfeed counts `defaultMl`.
2. [x] Update the ml numbers in `e2e/tests/recent-days.spec.ts` (expected values are in `NOTES.md`) and rename the two tests "… a breastfeed counted as the default bottle" to say one side counts half. Add a `both breasts` feed to the Today sheet test so the full-default case is covered end to end.
3. [x] Docs: in `plans/implan-day-ml-total/MAIN.md` (outcome line and the "Default bottle as the breastfeed estimate" decision) and `plans/implan-today-sheet-card/MAIN.md` (ml line rule) add a pointer that one-side breastfeeds count half since this plan, the way `implan-day-ml-total` already points to `implan-today-sheet-card`. Add this plan to `plans/README.md`.
4. [x] `pnpm check` and `pnpm e2e` green; tick `TEST_STRATEGY.md`.

## Assumptions

- Baby Buddy's feeding methods are exactly `bottle`, `left breast`, `right breast`, `both breasts`, `parent fed`, `self fed` (`Feeding['method']` in `packages/api/src/types.ts`).
- Breastfeeds never carry an `amount` that should be trusted: Molly saves them without one, and `drank` ignores `amount` on non-bottle feeds today. Keep that.
