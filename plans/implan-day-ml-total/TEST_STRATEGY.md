# Test strategy: done when every box is ticked

## Unit (Vitest, `packages/core/src/drank.test.ts`, TDD, Given / When / Then)

`drank`:

- [x] Zero: no feeds → 0 ml, not estimated, nothing unmeasured.
- [x] One bottle with 120 ml → 120 ml, not estimated.
- [x] Many bottles with ml → their sum.
- [x] One breastfeed (each of left / right / both) with a 150 ml default → 150 ml, estimated.
- [x] Bottle without ml with a default → counts the default, estimated.
- [x] Bottles and breastfeeds mixed → bottle ml plus default per breastfeed, estimated (one breast counts half since [`implan-half-side-feeds`](../implan-half-side-feeds/MAIN.md)).
- [x] `parent fed` and `self fed` add nothing and aren't counted as unmeasured.
- [x] Boundaries: a feed starting exactly at `from` counts, one starting at `to` doesn't, one that started before `from` and ran past it doesn't.
- [x] No default: breastfeeds add no ml, `unmeasured` and `unmeasuredBreast` count them, not estimated.
- [x] No default: a bottle without ml is unmeasured but not a breastfeed.

`drankText`:

- [x] Nothing counted → `null`.
- [x] Measured only → `640 ml` / `640 millilitres`.
- [x] Estimated → `≈ 840 ml` / `about 840 millilitres`.
- [x] No default, breastfeeds only unmeasured → `360 ml + 3 breastfeeds`; one → `+ 1 breastfeed`.
- [x] No default, a bottle without ml among them → `360 ml + 4 feeds without ml`.
- [x] No default, nothing measured → `3 breastfeeds` (no `0 ml +`).

## Playwright (`e2e/tests/recent-days.spec.ts`, against the seeded Baby Buddy)

- [x] A card with a seeded bottle with ml and a breastfeed shows `≈ <bottle + default> ml` under its rings, and its text reaches the accessibility tree.
- [x] A card with no feeds shows no ml line.
- [x] Tapping either ring still opens that window.
- [x] `pnpm check` and `pnpm e2e` green.

## Look review (manual: web and emulator-5554, Molly Classic and one decorated theme, day and night, largest font)

- [x] The line sits centred under both rings and doesn't push them out of line.
- [x] The longest line (`360 ml + 4 feeds without ml`) wraps cleanly at the largest font.
- [x] TalkBack reads "about … millilitres" on an estimated card.

## Wrap-up

- [x] `CLAUDE.md` plan list has an entry for `implan-day-ml-total`; `MAIN.md` steps ticked.
