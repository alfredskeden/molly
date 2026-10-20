# Typed time and the next nap's clock time: Definition of Done

Method as in the root `CLAUDE.md` "Testing method": pure rules in `packages/core` by TDD (Vitest), the sheet and the row by Playwright on the web image, the look by manual review, and a few checks on a physical phone at the end.

## Core (Vitest, `packages/core`)

- [x] `windowRow` gives a nap its start clock (`range: '12:45'`) before it opens, while it's open and after it; bedtime keeps `18:30–19:00`; `when` and `then` unchanged.
- [x] Typed digits: a first hour digit 3–9 becomes `0X`; hours past 23 and minute tens past 5 are ignored; no more than 4 digits.
- [x] Typed time: 4 digits earlier than now give today at that time; later than now give yesterday; equal to now gives now.
- [x] For an end, a typed time at or before the start is `beforeStart`; one minute after it is accepted.
- [x] Display: typed digits plus the faint rest of the previous time, for 0–4 typed digits.

## App flow (Playwright on the web image)

- [x] Window row reads `Nap N likely`, the clock and the countdown; existing specs updated, none weakened.
- [x] Start a sleep → Set time → tap the time → type a time a few minutes ago → Set time: toast `Time set to HH:MM`, and the running sleep starts then.
- [x] Set time is disabled with fewer than 4 digits typed, and for an end typed before the start (`Before it started` shown).
- [x] Tapping a chip after typing shows the chip's time.
- [ ] Every existing Playwright spec passes; `pnpm check` is green.

## Look (manual: web and emulator-5554, day and night, largest font)

- [x] The sheet at rest looks exactly as before.
- [x] While typing: no box, underline or caret; the faint digits read as not yet typed; the keyboard doesn't cover Set time.
- [ ] TalkBack can reach the time, hears what it does, and can type a time.
- [ ] Window row with the clock fits on one line, or wraps cleanly at the largest font.

## Physical phone

- [ ] Typing a start and an end time on the phone feels right and saves the typed time.
- [ ] The window row's clock matches the ring's dashed ghost.
