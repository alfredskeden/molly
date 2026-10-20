# Typed time and the next nap's clock time

Context: the Molly system plan in [`../implan-molly/MAIN.md`](../implan-molly/MAIN.md). Definition of Done in [`TEST_STRATEGY.md`](TEST_STRATEGY.md).

Two small fixes:

1. **Typed time.** In the Adjust time sheet ("When did it start?" / "When did it end?"), tapping the big time opens the number keyboard and lets the parent type the exact time. The sheet looks the same as now: no box, no underline, no visible caret.
2. **Nap clock.** The window row under the ring says when the next nap opens as a clock time, beside the countdown: `Nap 2 likely   12:45   in 12m`.

## 1. Typed time

Where: `AdjustSheet` in `apps/molly/src/features/toast/toast.tsx`. It opens from a toast's "Set time" after a start or stop (`adjust` in `features/dashboard/outcome-messages.ts`, type `Adjustable`). Today the chosen time is `minutesAgo` turned into a date by `adjustedTime` (`packages/core/src/adjust.ts`), and it changes only through the chips and the ±1 buttons.

How typing behaves:

- Tapping the big time opens the number keyboard. Typed digits fill `HH:MM` from the left; digits not yet typed show faint, in the same font, size and colour (lower opacity). Example: `2` `3` `1` gives `23:1` plus a faint `5`, where the faint digit is the previous time's own digit.
- Impossible digits are ignored as they're typed, so 4 digits always make a valid time. A first hour digit of 3–9 becomes `0X` (`7` → `07:`). The second hour digit can't push past 23. The first minute digit must be 0–5.
- Backspace removes the last typed digit.
- A typed time later than now means that time yesterday (23:50 typed at 00:10 = 20 min ago). The "… ago" line under it confirms which time was meant.
- A typed time stays fixed. It doesn't drift as `now` ticks, unlike the chips, which mean "N minutes before now". So the sheet's state becomes either "minutes ago" (chips, ±1) or "this exact time" (typed).
- For an end (`after` set), a typed time at or before the start can't be saved: the line under the time says `Before it started`, and Set time is off.
- While fewer than 4 digits are typed, Set time is off. Closing the keyboard (Back, keyboard Done) with fewer than 4 digits goes back to the time shown before typing started.
- Tapping a chip or ±1 while typing drops the typed digits and closes the keyboard; the chip wins.
- Keyboard Done with 4 digits closes the keyboard and keeps the typed time. Saving is still the Set time button.

Implementation direction (adjust if something better turns up):

- The pure part goes in `packages/core/src/adjust.ts`, next to `adjustedTime`. One function takes the typed digits so far plus the new digit and returns the accepted digits (the "ignore impossible digits" rule). One takes the 4 digits, `now` and `after` and returns the time (yesterday rule) or `beforeStart`. Names and shapes are up to you. Display of typed + faint digits can be a small helper there too.
- The look: the big `Text` stays as it is; a `TextInput` sits transparently over it (`opacity: 0` or `color: transparent`, `caretHidden`, `keyboardType="number-pad"`, `maxLength={4}`) and only feeds digits. Wrapping the time in a `Pressable` that focuses the input is fine too. Check that it also works on web (the sheet runs there; Playwright tests it).
- The sheet already follows the keyboard (`react-native-keyboard-controller`, `KeyboardProvider` at the root, from `implan-expo-review`). Confirm the Set time button stays visible above the keyboard.
- Accessibility: the time is a button with a label like `Start time 23:43, double tap to type a time`; TalkBack must be able to type into it.

## 2. Nap clock

Where: `windowRow` in `packages/core/src/ring.ts`, drawn by `apps/molly/src/features/dashboard/WindowRow.tsx`.

- For a nap, `range` (today `null`) becomes the window's start clock, `12:45`, shown in the same muted slot bedtime uses for its `18:30–19:00`. Bedtime stays as it is.
- `when` stays as it is: `in 12m` before, `20m left` while open, `14m ago` after. While open the row reads `Nap 2 likely   12:45   20m left`.
- The `Then …` line, the ring ghost labels, the likely panel, widgets and notification are unchanged.
- This reverses an earlier choice: the test `names the next nap by its place in the day and how soon it opens, without clock times` in `packages/core/src/ring.test.ts` pins `range: null`. Update it, and the `range` doc comment on the `WindowRow` type and the component's doc comment.
- The spoken label (`spokenPrediction` in `features/dashboard/prediction-text.ts`) already says `Nap likely between 12:45 and 13:15`; nothing to change.
- Check the row at the largest font: title, clock and countdown on one line must still fit or wrap cleanly (the title has `numberOfLines={2}`).

## Decisions

| Decision | Why |
| --- | --- |
| Typed digits fill from the left, impossible ones ignored | Reads like writing the time; never an invalid state to explain |
| Later than now = yesterday | Start and end are always in the past; Baby Buddy refuses future times |
| Typed time doesn't drift | The parent typed an exact clock time and expects exactly that saved |
| End before start can't be saved | Baby Buddy refuses it; clamping to start + 1 min would save a time nobody typed |
| Nap clock in the existing muted `range` slot | Same place bedtime shows its clock; no new layout |
| Only the main row gets the clock | Keeps the `Then` line short |

## Steps

Core work is TDD (Vitest, Given / When / Then, zero → one → many, then boundaries).

- [x] **1. Nap clock in `windowRow`.** TDD in `ring.test.ts`: nap row carries its start clock (before, while open, after); bedtime unchanged. Then `WindowRow.tsx` doc comment; the component needs no layout change. Update any Playwright spec that reads the row text (`next-sleep.spec.ts`, `day-plan.spec.ts`, `likely-panel.spec.ts`, `ring.spec.ts`).
- [x] **2. Typed-time rules in core.** TDD in `adjust.test.ts`: digit acceptance (first hour digit 3–9 → `0X`, hour ≤ 23, minute tens ≤ 5, at most 4), time from 4 digits (today, yesterday when later than now, exactly now), `beforeStart` for an end at or before `after`, faint-digit display.
- [x] **3. Typing in `AdjustSheet`.** Hidden input over the big time, state "minutes ago" vs "typed time", Set time off while incomplete or before start, chips / ±1 drop typing, keyboard close reverts an incomplete entry. Same look as before when not typing.
- [x] **4. Playwright.** In `e2e/tests/toast.spec.ts`: start a sleep, Set time, tap the time, type `4` digits for a few minutes ago, Set time → toast `Time set to HH:MM` and the ring/timer shows that start. One case for an end typed before the start: Set time disabled.
- [ ] **5. Look review.** Web and emulator (emulator-5554), both themes (day / night), largest font: sheet at rest looks exactly as before; while typing no box, underline or caret; the faint digits read as faint; the keyboard doesn't cover Set time. Window row with the clock fits.
- [x] **6. Wrap up.** `pnpm check` green, entry in the root `CLAUDE.md` "Where things stand", `NOTES.md` tidy.
