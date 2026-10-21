# Test strategy: done when every box is ticked

## Unit (Vitest, `apps/molly/src/features/days/recent.test.ts`, TDD, Given / When / Then)

`cardSpan`:

- [ ] Card with night and day → from the night's start to the day's end, capped at `now`.
- [ ] Tonight card (night only) → from the night's start to `now`.
- [ ] Card with no night (day only) → from the day's start.

`cardStats`:

- [ ] Zero: empty card span → 0 slept, 0 sleeps, 0 feeds, 0 diapers.
- [ ] By day: last night's sleep and today's nap both count in slept and sleeps; feeds and diapers from last night count too.
- [ ] A sleep that started before the night's start is clipped at the start and not counted as a sleep of the span.
- [ ] A running sleep adds its time so far and one sleep.
- [ ] At night: only tonight's entries count; today's day doesn't.

## Playwright (`e2e/tests/recent-days.spec.ts`, against the seeded Baby Buddy)

- [ ] `1e` by day: the boxes' label includes last night: `Today: <night + nap> slept, 2 sleeps, <feeds>, <diapers>`.
- [ ] The running-nap case adds the running nap on top of last night + today.
- [ ] A bottle with ml and a breastfeed in the span show `≈ <bottle + default> ml` under the boxes, and the spoken text is in the boxes' label.
- [ ] No feeds in the span → no ml line.
- [ ] At night: the title is `Tonight` and only tonight's entries count.
- [ ] Recent days' ml line is unchanged (existing spec green).
- [ ] `pnpm check` and `pnpm e2e` green.

## Look review (manual: web and emulator-5554, Molly Classic and one decorated theme, day and night, largest font)

- [ ] The ml line sits centred under the boxes and doesn't push the Recent list oddly.
- [ ] Long values (`12h 40m`, `150 ml + 3 feeds without ml`) fit or wrap cleanly at the largest font.
- [ ] TalkBack reads the boxes and then "about … millilitres".

## Wrap-up

- [ ] `todayStats` is gone (`grep -rn todayStats apps` is empty); typecheck and lint green.
- [ ] Docs step done; `plans/README.md` lists this plan; `MAIN.md` steps ticked.
