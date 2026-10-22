# Test strategy: done when every box is ticked

## Unit (Vitest, `packages/core/src/drank.test.ts`, TDD, Given / When / Then)

`drank`, default 150 ml unless said:

- [ ] One `left breast` → 75 ml, estimated.
- [ ] One `right breast` → 75 ml, estimated.
- [ ] One `both breasts` → 150 ml, estimated.
- [ ] Left then right as two feeds → 150 ml (same as one `both breasts`).
- [ ] Mixed: bottle 120 + `both breasts` + bottle 100 + `right breast` → 445 ml, estimated.
- [ ] Rounding: three `left breast` at a 125 ml default → 188 ml (187.5 rounded once, not 3 × 63).
- [ ] A bottle without ml still counts the whole default.
- [ ] No default: one-side and both-side breastfeeds still add no ml and are counted in `unmeasured` / `unmeasuredBreast` (existing tests still pass unchanged).
- [ ] Every other existing `drank` / `drankText` test still passes unchanged.

## Playwright (`e2e/tests/recent-days.spec.ts`, seeded Baby Buddy, default 120 ml)

- [ ] Recent days cards show the halved totals (`≈ 150 ml`, `≈ 120 ml`; numbers in `NOTES.md`), with matching spoken text.
- [ ] The Today sheet with a 90 ml bottle, a `right breast` and a `both breasts` feed shows `≈ 270 ml` / "about 270 millilitres".
- [ ] Tonight with one `right breast` says "about 60 millilitres".
- [ ] The ring test still opens its window and checks the card it means.

## Wrap-up

- [ ] `drank.ts` doc comments describe the half rule; no plan or doc still says every breastfeed counts the full default without a pointer here.
- [ ] `plans/README.md` lists this plan.
- [ ] `pnpm check` and `pnpm e2e` green.
