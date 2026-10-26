# Writing in a sheet with the keyboard open

GitHub issue #28.

## Outcome

Writing a to-do item works with the keyboard open:

- The sheet's header and the "What needs doing" field stay on screen while the keyboard is up; what's below them scrolls.
- The first tap on a label chip, a Date or Time option, a stepper or Save while the keyboard is open does what it says. Before, it only closed the keyboard.

The fix is in `Sheet` (`apps/molly/src/components/sheet.tsx`), so every scrolling sheet gets it (To-do, Today, Theme, the development guide note). Only the to-do sheet has text fields today; the others just keep working.

## The causes

1. **Text off screen.** A `scroll` sheet is capped at `height * 0.82`. When the keyboard opens, `lifted` moves the whole sheet up by the keyboard's height but never shrinks it, so 82 % of the window plus a ~40 % keyboard pushes the header and the first field (the text, `autoFocus` on a new item) above the top edge.
2. **First tap lost.** The sheet's `ScrollView` has no `keyboardShouldPersistTaps`. React Native's default `"never"` makes the first tap outside the focused field dismiss the keyboard and drops the press. `Screen` in `components/ui.tsx` and the dashboard's `KeyboardAwareScrollView` already set `"handled"` for this; the sheet never did.

## Decisions

- **Shrink the sheet with the keyboard** (issue option 1), not a separate compose bar above the keyboard. One change in `Sheet`, helps every scrolling sheet, no new UI.
- **The cap while the keyboard is up** is the space between the top inset and the keyboard: the sheet's top never goes above `insets.top`. With the keyboard closed the cap stays `height * 0.82`. It follows the keyboard frame by frame (the same `useReanimatedKeyboardAnimation` value `lifted` uses), so the sheet doesn't jump.
- **The scroll view becomes `KeyboardAwareScrollView`** from `react-native-keyboard-controller` (already a dependency, used on the dashboard), with `keyboardShouldPersistTaps="handled"`. It scrolls a focused field that sits lower down (the to-do sheet's "New label" field) above the keyboard.
- **Taps never close the keyboard on purpose.** Whether choosing a Date or Time should also dismiss the keyboard waits for issue #34 (date and time pickers), which reworks that row. The keyboard closes with Android back, the scrim, or Save as today.
- **Non-scroll sheets don't change** (Add entry, measurements, Why, Children, Lock screen, the toast's time sheet). They're short, and the lift alone keeps their fields visible.

## Rules to keep

- Reanimated views take `style` only (`plans/implan-web-sheets/`): the animated cap goes on an `Animated.View`, the themed classes stay on the plain body `View`. That body `View` must be able to shrink to the cap so the scroll view inside gets a bounded height.
- `lifted`'s floating-keyboard rule stays: the sheet only moves by the part of the keyboard taller than `insets.bottom`. The cap uses the same lift, so the sheet's top lands at `insets.top`.
- The drag-to-close reads the sheet's measured height (`sheetHeight`, `onLayout`). A shrunk sheet reports its new height, so closing by drag keeps working with the keyboard open.
- On the web the keyboard height is always 0, so the web sheet doesn't change.

## Steps

1. [ ] **First tap counts.** `keyboardShouldPersistTaps="handled"` on the scrolling sheet's scroll view. Check on the emulator: with the keyboard open on an empty new item, one tap on "Buy", "Today", "At a time", a ±15 stepper each does its thing.
2. [ ] **Shrink with the keyboard.** Animated cap on scroll sheets as in Decisions. Check on the emulator: "Add item" opens with the header and text field fully visible above the keyboard; a long item's text is visible while edited; the rest scrolls; the sheet grows back as the keyboard closes; drag to close still works with the keyboard up.
3. [ ] **Focused field scrolls into view.** Swap the `ScrollView` for `KeyboardAwareScrollView` (keep `"handled"`, the content padding and classes). Check: "+ New label" with the keyboard up shows its field and Add above the keyboard.
4. [ ] **Other sheets unchanged.** Today, Theme and the guide note still open at their old height and scroll; Add entry and a measurement still lift their fields over the keyboard. Web: the to-do sheet opens, scrolls and saves as before (`pnpm e2e` covers it).
5. [ ] **Wrap-up.** Doc comment on `Sheet` says scroll sheets shrink with the keyboard and keep taps. `plans/README.md` row marked Done (or Open items left). `pnpm check` and `pnpm e2e` green. Every box in `TEST_STRATEGY.md` ticked.

## Out of scope

- Dismissing the keyboard on Date / Time choices: issue #34.
- A compose bar above the keyboard (issue option 2).
- iOS: the app ships for Android and the web only.
