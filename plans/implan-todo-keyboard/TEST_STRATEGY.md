# Test strategy: done when every box is ticked

No core logic changes, so no unit tests. Android behaviour is checked by hand on the emulator (`emulator-5554`); the web is covered by the existing Playwright suite.

## Android emulator, to-do sheet

Run on the emulator's 1080×2424 screen, and the opening check again at 1080×2000 with font scale 1.3.

- [x] Text visible while typing: "Add item" opens with the keyboard up and the sheet's header and the "What needs doing" field fully on screen; typed text is readable.
- [x] Editing a long item: its text field is on screen above the keyboard while edited.
- [x] Label first: with the keyboard open on the empty field, one tap on "Buy" chooses it.
- [x] Time first: with the keyboard up, "Today" then "At a time" are each chosen on the first tap; a ±15 stepper steps on the first tap.
- [x] Save with the keyboard up saves on the first tap.
- [x] "+ New label" shows its field and Add above the keyboard, and Add works on the first tap.
- [x] The rest of the sheet (date, time, reminder line, photo, Save) is reachable by scrolling while the keyboard is up.
- [x] Closing the keyboard (back) grows the sheet back smoothly; a second back closes the sheet.
- [x] Drag down on the header closes the sheet with the keyboard up and with it closed.

## Android emulator, other sheets

- [x] Today and Theme open at the same height as before and scroll (the guide note uses the same scroll path; not opened separately).
- [x] Add entry still lifts its field above the keyboard, unchanged (measurement sheets share the non-scroll path, which this change doesn't touch).

## Wrap-up

- [x] `Sheet`'s doc comment describes the keyboard behaviour.
- [x] `plans/README.md` row marked Done (or Open items left).
- [x] `pnpm check` green; `pnpm e2e` 251 passed, 1 failed (`recent-days.spec.ts` 1k, fails the same on develop without this change).
