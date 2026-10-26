# Test strategy: done when every box is ticked

No core logic changes, so no unit tests. Android behaviour is checked by hand on the emulator (`emulator-5554`); the web is covered by the existing Playwright suite.

## Android emulator, to-do sheet

Run each on a small screen (e.g. Pixel 4a size) and a large one (Pixel 9 Pro size), and once at font scale 1.3.

- [ ] Text visible while typing: "Add item" opens with the keyboard up and the sheet's header and the "What needs doing" field fully on screen; typed text is readable.
- [ ] Editing a long item: its text field is on screen above the keyboard while edited.
- [ ] Label first: with the keyboard open on the empty field, one tap on "Buy" chooses it.
- [ ] Time first: with the keyboard up, "Today" then "At a time" are each chosen on the first tap; a ±15 stepper steps on the first tap.
- [ ] Save with the keyboard up saves on the first tap.
- [ ] "+ New label" shows its field and Add above the keyboard, and Add works on the first tap.
- [ ] The rest of the sheet (date, time, reminder line, photo, Save) is reachable by scrolling while the keyboard is up.
- [ ] Closing the keyboard (back) grows the sheet back smoothly; a second back closes the sheet.
- [ ] Drag down on the header closes the sheet with the keyboard up and with it closed.

## Android emulator, other sheets

- [ ] Today, Theme and a development guide note open at the same height as before and scroll.
- [ ] Add entry and a measurement sheet still lift their fields above the keyboard, unchanged.

## Wrap-up

- [ ] `Sheet`'s doc comment describes the keyboard behaviour.
- [ ] `plans/README.md` row marked Done (or Open items left).
- [ ] `pnpm check` and `pnpm e2e` green (web sheets unchanged).
