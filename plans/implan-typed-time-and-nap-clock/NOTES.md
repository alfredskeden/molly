# Notes

## Decisions (2026-10-08)

- Light plan: `MAIN.md` + `TEST_STRATEGY.md` + these notes, no mental model.
- Typed digits fill `HH:MM` from the left; untyped digits show faint. Look unchanged, no input feel.
- A typed time later than now is yesterday.
- Nap clock only on the window row's main line, in the muted slot (`Nap 2 likely   12:45   in 12m`). Not on the `Then` line, ring ghosts or widgets.
- Also decided: a typed time doesn't drift; an end before the start can't be saved; a chip or ±1 drops the typed digits.

## Facts

- `AdjustSheet` (`features/toast/toast.tsx`) serves both "When did it start?" and "When did it end?" (`adjust` in `features/dashboard/outcome-messages.ts`); `after` is set only for an end.
- `ring.test.ts` deliberately pinned "without clock times" for naps; this plan reverses that.
- `spokenPrediction` already speaks the clock times.

- Core: `typedDigit(digits, key)`, `typedTime({ digits, now, after })` (`Date | 'beforeStart' | null`), `typedText(digits, previous)` in `packages/core/src/adjust.ts`. `windowRow`'s `range` is now always a string.
- Sheet state is a reducer (`choose` in `toast.tsx`): `minutesAgo`, `kept` (4 typed digits, fixed), `draft` (digits while the keyboard is up), `before` (time shown when typing began). ±1 after a typed time steps from that time.
- The hidden `TextInput` must not be `opacity: 0`: Android leaves alpha-0 views out of the accessibility tree (uiautomator and TalkBack can't see it). `color: 'transparent'` alone still draws the text on Android. Used: `color: '#00000000'` + `opacity: 0.01`. Confirmed on emulator-5554.
- `keyboardDidHide` blurs the input, since Android's Back hides the keyboard without blurring.
- The Why sheet keeps its old words: the countdown for a nap, bedtime's range (`index.tsx` picks by `prediction.next.kind`, as `range` is no longer null for naps).

## Checked (2026-10-09)

- Vitest 507 green, typecheck and lint clean. Playwright: 164 of 166 pass; the 2 `pending.spec.ts` editor tests also fail on clean `main` (run just after midnight; not from this plan).
- Web: the sheet at rest looks the same as on `main` (screenshots compared); while typing, the typed digits and the faint rest show; no box, underline or caret.
- Emulator (release build): typing an end before the start shows `Before it started` with Set time off; typing the current minute saves (`Time set to 00:30`); dark mode and font scale 2.0 fit, Set time stays above the keyboard.
- Seen on the way, not from this plan: on web (Playwright, 412×915) the Adjust time sheet draws at the top with no card on `main` too.

## Open

- Look review leftovers: window row with the clock on the emulator at the largest font (needs daytime, or a seeded day), light theme on the emulator, TalkBack typing a time.
