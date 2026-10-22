# Test strategy: done when every box is ticked

## Unit (Vitest, `apps/molly/src/features/days/recent.test.ts`, TDD, Given / When / Then)

`cardSpan`:

- [x] Card with night and day → from the night's start to the day's end, capped at `now`.
- [x] Tonight card (night only) → from the night's start to `now`.
- [x] Card with no night (day only) → from the day's start.

`cardStats`:

- [x] Zero: empty card span → 0 slept, 0 sleeps, 0 feeds, 0 diapers.
- [x] By day: last night's sleep and today's nap both count in slept and sleeps; feeds and diapers from last night count too.
- [x] A sleep that started before the night's start is clipped at the start and not counted as a sleep of the span.
- [x] A running sleep adds its time so far and one sleep.
- [x] At night: only tonight's entries count; today's day doesn't.

## Playwright (`e2e/tests/recent-days.spec.ts`, against the seeded Baby Buddy)

- [x] `1e` by day: the boxes' label includes last night: `Today: <night + nap> slept, 2 sleeps, <feeds>, <diapers>`.
- [x] The running-nap case adds the running nap on top of last night + today.
- [x] A bottle with ml and a breastfeed in the span show `≈ <bottle + default> ml` under the boxes, and the spoken text is in the boxes' label.
- [x] No feeds in the span → no ml line.
- [x] At night: the title is `Tonight` and only tonight's entries count.
- [x] Recent days' ml line is unchanged (existing spec green).
- [x] `pnpm check` and `pnpm e2e` green.

## Look review (manual: web and emulator-5554, Molly Classic and one decorated theme, day and night, largest font)

- [x] The ml line sits centred under the boxes and doesn't push the Recent list oddly. (web; emulator-5554 day and night)
- [x] Long values (`12h 40m`, `150 ml + 3 feeds without ml`) fit or wrap cleanly at the largest font. (web 412/320 px; emulator-5554 at font scale 2.0, Classic day and Ribbon night)
- [x] TalkBack reads the boxes and then "about … millilitres". (emulator-5554 accessibility tree: `Today: 13h 17m slept, 2 sleeps, 3 feeds, 2 diapers, about 390 millilitres`; spoken TalkBack not listened to)

## Wrap-up

- [x] `todayStats` is gone (`grep -rn todayStats apps` is empty); typecheck and lint green.
- [x] Docs step done; `plans/README.md` lists this plan; `MAIN.md` steps ticked.
