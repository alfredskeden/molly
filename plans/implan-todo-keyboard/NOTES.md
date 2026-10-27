# Notes

## Decisions (2026-10-26)

- Shrink the sheet with the keyboard (issue option 1), not a compose bar.
- Date / Time choices don't dismiss the keyboard; that question moves to issue #34, which replaces the steppers with pickers.
- No `MENTAL_MODEL.md`: one component, two causes.
- No unit tests: no core logic, behaviour is Android keyboard and layout. Manual on the emulator (`emulator-5554` only, never the developer's phone), Playwright stays the web regression net.

## Facts from the code

- `Sheet` (`apps/molly/src/components/sheet.tsx`): `scroll` sheets render header (drag area) + `ScrollView`, body `View` has `maxHeight: height * 0.82`. `lifted` translates by `max(0, keyboardHeight − insets.bottom)`; `keyboard` is `useReanimatedKeyboardAnimation().height` (0 → minus the keyboard height).
- Scroll sheets: `TodoSheet` (`features/todo/`), `TodaySheet` (`features/dashboard/`), `ThemeSheet` (`theme/`), `GuideNote` (`features/development/`). Only `TodoSheet` has `TextInput`s: the item text (top, `autoFocus` on a new item) and "New label" (mid-sheet, `autoFocus` when "+ New label" is tapped).
- Non-scroll sheets with inputs: `AddSheet`, `MeasurementSheet`, the toast's time editing (`features/toast/toast.tsx`). Out of scope; the lift works for them.
- Already `keyboardShouldPersistTaps="handled"`: `Screen` (`components/ui.tsx`), the dashboard's `KeyboardAwareScrollView` (`app/(main)/index.tsx`, with `bottomOffset`).
- `react-native-keyboard-controller` 1.21.9, `KeyboardProvider` in `app/_layout.tsx`. `KeyboardAwareScrollView` already runs on the web in the dashboard.

## Cleanup sweep (planning)

Nothing to remove. No keyboard workarounds in the scroll sheets; the 82 % cap stays for the keyboard-closed case; the `keyboardDidHide` blur listeners in `toast.tsx` and `feed/BottleAmount.tsx` are unrelated and still needed.

## Open

- Verify on the emulator that the sheet's container spans the full window (edge to edge, behind the status bar), so `insets.top` is the right top limit. If it starts below the status bar, the cap drops the inset.

## Implementation (2026-10-27)

- `capped` animated style on the dragged view: `maxHeight = min(0.82 × height, height − insets.top − lift)`, `lift` as in `lifted`. Continuous, so no branch on "keyboard open"; on the web it's the old 82 %.
- Body `View` gets `flexShrink: 1` so it shrinks to the cap; `KeyboardAwareScrollView` (`bottomOffset={16}`, `keyboardShouldPersistTaps="handled"`) takes `style` for its padding, since it's a Reanimated scroll view.
- `pnpm check` green. `pnpm e2e`: 251 passed, 1 failed (`recent-days.spec.ts` 1k, "Yesterday, Night: slept 11 hours 20 minutes"), which fails the same on develop without this change.
- Emulator checks not run yet: the emulator's install has a rejected key after a reseed, needs signing in again.
