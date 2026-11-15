# Moving the cursor in a sheet's text field

GitHub issue #46. Verified facts, versions and upstream reading are in [`NOTES.md`](NOTES.md), the Definition of Done in [`TEST_STRATEGY.md`](TEST_STRATEGY.md). Work on branch `plan/issue-46-todo-cursor` (cut from `develop`), PR with `--base develop`.

## Outcome

In the to-do sheet (New item / Edit item), the item text and the New label field behave like any other Android text field:

- A tap in the text puts the cursor there; typing inserts at that point.
- The cursor handle can be dragged, and the sheet doesn't move or close while it is.
- A long-press selects a word and shows the system copy / cut / paste menu; typing replaces the selection.
- The keyboard stays open while the cursor moves.
- Save keeps the edited text.

The fix goes in the shared place the cause lives in (`components/sheet.tsx`, or a shared sheet text field in `components/ui.tsx`), so every free-text field in a sheet gets it: the to-do text and New label, Add entry's notes and food, the Solids panel's and the editor's food field, and a measurement's notes. The web keeps working: click to place the cursor.

## What the code says so far

Not reproduced in the to-do sheet yet (signing the emulator in to the test Baby Buddy was left to the person doing step 1). One control was checked on the emulator: on the installed 1.3.0 release, the onboarding "Baby Buddy address" field (`Field` in `components/ui.tsx`, inside `Screen`'s `ScrollView`, which also has `keyboardShouldPersistTaps="handled"`) takes a tap mid-text: tapping inside `http://10.0.2.2:4778` and typing `X` gave `http://X10.0.2.2:4778`. So a plain controlled `TextInput` in a `handled` scroll view works; the problem is something the sheet or the to-do fields add.

What the to-do fields do **not** have (all ruled out by reading, `NOTES.md` has the lines): no `selection` / `onSelectionChange` prop, no `selectTextOnFocus`, `caretHidden` or `contextMenuHidden`, no transform in `onChangeText` (`set({ text })` and `setNaming` pass the text through), no wrapping `Pressable` / `TouchableWithoutFeedback`, no re-keying while open (`key={editingItem?.id ?? 'new'}`), and the sheet's drag `Pan` is attached only to the header, not the content. The to-do screen re-renders the sheet once a minute (`useNow(60_000)`), not on taps.

## Hypotheses, most likely first

1. **The native text is re-set under the cursor by the sheet's animated layout.** Since #28 a `scroll` sheet's `capped` style animates `maxHeight` (a layout prop) on the UI thread, frame by frame with the keyboard, and `onLayout` writes `sheetHeight`; the sheet also enters with a Reanimated layout animation and sits in three animated, translated views. Every layout commit can make Fabric's Android `TextInput` re-apply its text from state, which puts the selection back at the end. That would explain "does nothing useful" for tap, handle drag and long-press alike (the cursor moves, then snaps back), and why the onboarding field (no animated ancestors) is fine. Evidence for: it's the biggest difference between the working field and the broken ones, and it arrived after the to-do sheet existed (#28). Against: once the keyboard has settled nothing should commit, unless something keeps the keyboard value moving (Gboard's suggestion strip resizing, a floating toolbar).
   **Fix if confirmed:** in `Sheet`, stop committing layout while a field is focused: keep the cap as a transform-only lift and give the scroll view a fixed height from the keyboard's final height (`useKeyboardHandler` `onEnd`, or the keyboard-did-show height), so no layout prop animates per frame; or drop the `onLayout` → `sheetHeight` write while the keyboard moves. Every scroll sheet benefits.
2. **The tap or long-press is taken from the field by a touch handler around it.** Candidates: the sheet `ScrollView`'s JS responder with `keyboardShouldPersistTaps="handled"`, gesture-handler's root view (`GestureHandlerRootView` in `app/_layout.tsx`) cancelling native touches when the header `Pan` or a scroll begins, or the native scroll view intercepting the small moves of a long-press. Evidence for: the issue lists it; the sheet nests a `GestureDetector` beside the `ScrollView`. Against: the onboarding field sits in a `handled` `ScrollView` under the same root and works, and the `Pan` only wraps the header. The Tap log (Settings → long-press the version line) records `touch cancel` at the root: a cancel during a tap or long-press in the field confirms this one.
   **Fix if confirmed:** in `Sheet`, use gesture-handler's `ScrollView` (so the header `Pan` and the scroll are coordinated) and/or put a `Gesture.Native()` around the content with `.disallowInterruption(true)` for text fields; keep `handled` (the first tap on a chip with the keyboard up must still count, #28).
3. **The field's own props.** The to-do fields leave autocorrect and suggestions on (the working `Field` turns them off and uses `keyboardType="url"`). A controlled value round-tripping while the keyboard holds a composing region can move the selection on Fabric Android. Evidence for: it is the one prop difference between the broken and working fields. Against: autocorrect is on in most apps' fields without this bug, and the issue reports it with a plain tap, not only while typing.
   **Fix if confirmed:** a shared sheet text field in `components/ui.tsx` that the sheets use, with whatever prop set is needed (still allowing autocorrect for free text if at all possible; turning suggestions off is a product decision, see `NOTES.md` Open).
4. **NativeWind's style object on `TextInput`.** `className` with `font-sans` (`var(--fb)`) and `font-bold` builds the style through NativeWind's interop; a fresh style each render could re-set spans. Least likely: `Field` uses the same classes and works. Only worth testing if 1 to 3 are ruled out.

## Steps

1. [ ] **Reproduce on the emulator** (`emulator-5554`, `molly` AVD; never a physical phone). `pnpm bb:up && pnpm bb:seed`, build and install from `develop` (`pnpm android:release`, `docs/android-build.md`), sign in with address `http://10.0.2.2:4778` and the `parent_b` key from `e2e/.env.test`. Open To-do → Add item, type `Buy diapers size 3`; then each scenario in `TEST_STRATEGY.md`. Record per scenario in `NOTES.md`: does the cursor never move, or move and jump back (to the end?), and do the Tap log lines show `touch cancel` during the tap / long-press. Also try the same in Add entry → notes and Feed → Solids food (non-scroll sheets: no `capped`), and in a to-do opened for Edit after the keyboard has fully settled.
2. [ ] **Confirm the cause** with a throwaway local build (never committed): one change at a time, retest step 1's failing scenario after each.
   - `onSelectionChange` on the item field logging `start/end` to the Tap log (`tapLog`), to see a selection that lands and then snaps back (hypothesis 1 or 3) versus none at all (hypothesis 2).
   - `TodoSheet` without `scroll` (a plain sheet): fixed → the scroll path (1 or 2).
   - `capped` removed from the scroll sheet (keep `lifted`): fixed → 1.
   - `autoCorrect={false}` on the item field: fixed → 3.
   Write the outcome and the chosen fix into `NOTES.md` before step 4.
3. [ ] **Refactor first: one sheet text field.** The free-text `TextInput`s repeat the same placeholder colour, font and border classes in five places (`NOTES.md`, cleanup). Add `TextBox` in `components/ui.tsx` (a `TextInput` with the theme's placeholder colour, `underlineColorAndroid="transparent"`, the shared classes, `className` appended for size) and use it in `TodoSheet` (item text and New label), `AddSheet`'s `NoteInput`, `FoodField` and `MeasurementSheet`'s Notes; `Field` builds on it. No behaviour change: `pnpm check` and the `todo`, `add-entry`, `solid-food`, `measurements` and `onboarding` Playwright specs green. Skip this step if step 2 shows the fix belongs only in `sheet.tsx` and a shared field would add nothing; note that in `NOTES.md`.
4. [ ] **Fix in the shared place** the cause points to (`Sheet` for 1 and 2, `TextBox` for 3, see each hypothesis). Rules that must survive (from #28 and #40): the header and focused field stay above the keyboard, the first tap on a chip or Save with the keyboard up counts, drag on the header closes the sheet with the keyboard up, Reanimated views take `style` only, `useUnsavedOnReturn` keeps reporting drafts.
5. [ ] **Remove the step 2 diagnostics**: no `onSelectionChange` logging or other test edits left (`git diff develop -- apps/molly/src` shows only the fix and step 3).
6. [ ] **Audit the other sheet fields** on the emulator, same tap / handle / long-press checks: Add entry notes and food, Solids panel food, the editor's food field, a measurement's notes; fix any that still fail through the same shared place. Fields with `selectTextOnFocus` (Add entry's typed time, a measurement's value and time): the first tap selects all as designed; a second tap must then place the cursor. The hidden digit inputs (`BottleAmount`, the toast's typed time) are `caretHidden` + `contextMenuHidden` on purpose and stay as they are.
7. [ ] **Playwright web check** in `e2e/tests/todo.spec.ts`: add an item `Buy diapers size 3`, open it and tap Edit, click inside the text field between `diapers` and `size` (click at a position, then assert the input's `selectionStart` is that offset and not the end, so a click that lands at the end can't pass), type `newborn `, assert the value `Buy diapers newborn size 3`, Save and assert the list shows it. Same for New label: type `Pharmcy`, put the cursor after `Pharm` (click or `ArrowLeft` ×2), type `a`, assert `Pharmacy`. If aiming a click at a character turns out flaky across fonts, place the caret with the keyboard and keep one click test that only asserts `selectionStart < value.length`.
8. [ ] **Docs.** `Sheet`'s doc comment (and `CLAUDE.md` Architecture, if the cause gives a rule others must follow, e.g. "free-text fields in sheets use `TextBox`" or "don't animate layout props around a focused `TextInput`"). Facts and the confirmed cause in this plan's `NOTES.md`.
9. [ ] **`pnpm check`** green; `pnpm e2e` green (or only failures that fail the same on `develop`, noted in `NOTES.md`).
10. [ ] **Emulator checklist** in `TEST_STRATEGY.md`, every box, at 1080×2424 and once at font scale 1.3.
11. [ ] **Wrap-up.** Run the `implan-cleanup` sweep on the diff; `plans/README.md` row marked Done (or Open items left).

## Out of scope

- The hidden digit fields (`BottleAmount`, the toast's typed time): no cursor on purpose.
- iOS: the app ships for Android and the web only.
- Turning autocorrect or suggestions off for free text, unless step 2 proves it's the only fix (then it's the Open question in `NOTES.md`).
