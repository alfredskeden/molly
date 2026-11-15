# Test strategy: done when every box is ticked

No core logic changes, so no unit tests. Gating: `pnpm check`, the new Playwright test and `pnpm e2e`. The Android sections below are the developer's spot check after merge (decided 2026-11-16), not a blocker; when run, it's on the emulator (`emulator-5554`, `molly` AVD; never a physical phone), signed in to the test Baby Buddy (`pnpm bb:up && pnpm bb:seed`, address `http://10.0.2.2:4778`). The web gets a Playwright check and the existing suite as its regression net.

## Definition of done (issue #46)

- [ ] Tap, handle drag and long-press selection work in the to-do item text and New label fields on Android (fix in place; developer's spot check).
- [ ] The sheet doesn't drag or close while moving the cursor.
- [ ] Other sheet text fields get the same fix through `Sheet` and `TextBox`.
- [ ] Web still works.
- [ ] `pnpm check` passes.

## Android emulator, to-do sheet (the issue's scenarios)

Background for each: on the To-do list with an item `Buy diapers size 3` (made-up text). Run at 1080×2424, and the first two again at font scale 1.3. Gboard needs `show_ime_with_hard_keyboard=1` and `stylus_handwriting_enabled=0` on the emulator (`plans/implan-todo-keyboard/NOTES.md`).

- [ ] **Tap to move the cursor in an existing item.** Open the item, tap Edit, tap between `diapers` and `size`: the cursor lands there and stays; typing `newborn ` gives `Buy diapers newborn size 3`.
- [ ] **Drag the cursor handle.** In the Edit item sheet, tap in the text and drag the handle to just after `Buy`: the cursor follows; the sheet doesn't move or close during or after the drag.
- [ ] **Select and replace a word.** Long-press `3`: it's selected and the system copy / cut / paste menu shows; typing `4` gives `Buy diapers size 4`. Copy, then paste elsewhere in the field, also works.
- [ ] **Move the cursor while writing a new item.** Add item, type `Buy diapers size 3`, tap right after `Buy`: the cursor moves there and the keyboard stays open.
- [ ] **The New label field behaves the same.** "+ New label", type `Pharmcy`, tap between `Pharm` and `cy`, type `a`: the field reads `Pharmacy`; Add then shows the `Pharmacy` chip chosen.
- [ ] **Saving keeps the edited text.** After changing `Buy diapers size 4` by moving the cursor, Save: the list shows `Buy diapers size 4`.
- [ ] The Tap log shows no `touch cancel` lines for those taps and long-presses.

## Android emulator, what #28 and #40 must keep

- [ ] With the keyboard up, one tap on a label chip, "Today", "At a time", a stepper and Save each does its thing (first tap counts).
- [ ] "Add item" opens with the header and text field above the keyboard; "+ New label" shows its field and Add above the keyboard; the rest scrolls.
- [ ] Drag down on the header closes the sheet, with the keyboard up and with it closed.
- [ ] Back closes the keyboard, a second back closes the sheet; a minute away with changes closes it with "Changes not saved".

## Android emulator, other sheet fields

Same three checks (tap mid-text, drag the handle, long-press a word) in each:

- [ ] Add entry: notes field, and the food field for a solid-food meal.
- [ ] Feed → Solids panel: the food field.
- [ ] Dashboard editor on a solid-food meal: the food field.
- [ ] A measurement (e.g. Weight): Notes.
- [ ] `selectTextOnFocus` fields (Add entry's typed time, a measurement's value and Time): the first tap selects all; a second tap places the cursor.
- [ ] The hidden digit inputs (bottle amount, the toast's typed time) behave as before (no caret, digits typed in).

## Web

- [ ] New Playwright test in `e2e/tests/todo.spec.ts`: click between `diapers` and `size` in the Edit item text (assert `selectionStart` is that offset, not the end), type `newborn `, value is `Buy diapers newborn size 3`, Save shows it in the list.
- [ ] New label: `Pharmcy` → cursor after `Pharm` → `a` → `Pharmacy`.
- [ ] `pnpm e2e` green (or only failures that fail the same on `develop`, listed in `NOTES.md`).

## Wrap-up

- [ ] Every free-text sheet field uses it, `rg "placeholderTextColor=\{palette.muted\}" apps/molly/src` finds it only in `ui.tsx` (plus fields deliberately left out, listed in `NOTES.md`).
- [ ] `Sheet`'s doc comment and `CLAUDE.md` Architecture updated.
- [ ] `pnpm check` green.
- [ ] `plans/README.md` row marked Done (or Open items left).
