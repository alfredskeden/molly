# Due date and time from a picker

GitHub issue #34 (merged from #35). Builds on the to-do list (`plans/implan-todo/`) and on issue #30 (`plans/implan-todo-read-only/`, PR #39): this branch starts from #30's branch, and its PR waits for #39 to merge, then rebases onto `develop`. The decisions (confirmed 2026-10-29) and the alternatives turned down are in [`NOTES.md`](NOTES.md), "Decided". Definition of Done: [`TEST_STRATEGY.md`](TEST_STRATEGY.md).

## Outcome

- **Tapping the date under Other opens the date picker.** Android: the system date dialog, days before today disabled. Web: the browser's date field (`min` today). The picked day shows in the sheet (`14 Jan`) and is saved.
- **Picking today or tomorrow switches the segment to Today / Tomorrow**. A date before today, which only a typed web value can give, becomes Today.
- **Tapping the time (with At a time) opens the time picker.** Android: the system 24-hour clock dialog, whose keyboard icon switches to typing hours and minutes (it opens on the clock, not straight in keyboard mode). Web: the browser's time field. Any minute can be picked (`14:40`).
- **The steppers stay** for small nudges: −1 d / +1 d step from the picked day, never before today, and stay on Other; −15 / +15 step from the picked minute, within 00:00–23:59 (was 23:45).
- **Cancelling a picker keeps the value.** Nothing changes until a date or time is set.
- **Opening a picker closes the text keyboard**; other taps still leave it open (`plans/implan-todo-keyboard/`).
- The reminder line follows the picked moment as today (`reminderLine`): 14:40 today → "This phone reminds you today at 13:40".

No new dependency: `@react-native-community/datetimepicker` 9.1.0 is installed and already configured in `app.json`.

## Pieces of code

- **Shared fields** (`apps/molly/src/components/`): `DateField.android.tsx` + `DateField.tsx` (moved from `features/measurements/`, gains `min`, `max` both optional, and `label`, default `Date`), and new `TimeField.android.tsx` + `TimeField.tsx`. Same extension for the platform file and its fallback (`CLAUDE.md`). On Android each opens its dialog when `open` turns on and renders nothing; `onChange` on set, `onCancel` on dismiss. On web each renders the browser input (styled like the measurements date field) and calls `onChange` with a valid value; the time field's value is `HH:MM` (`clockText`), its result minutes past midnight.
- **Draft rules** (`apps/molly/src/features/todo/sheet-model.ts`, Vitest in `sheet-model.test.ts`):
  - `pickDay(draft, day, now)`: today → `day: 'today'`, tomorrow → `'tomorrow'`, later → `'other'` with `other` = that day; before today → Today. `other` is left as it was when snapping, so choosing Other again shows the last Other day.
  - `pickTime(draft, minutes)`: sets `minutes` exactly (within 0…1439); `timed` stays as it is.
  - `stepTime` clamps to 0…1439 instead of 0…1425. `stepDay` unchanged.
  - Names are suggestions; keep the functions pure and `now`-driven like the rest of the file.
- **Sheet** (`apps/molly/src/features/todo/TodoSheet.tsx`, Date block): the date and the time become buttons (Android) that `Keyboard.dismiss()` and open their field; on web the fields replace the big text. One `picking: 'date' | 'time' | null` state. Accessibility: the date button reads e.g. `Due date 14 Jan, pick a date`, the time `Due time 14:40, pick a time` (the old `At 14:40` label goes); web inputs are labelled `Due date` / `Due time` (the Segment already owns `Date` and `Time`). Steppers and their spoken labels unchanged.
- Theme: semantic classes and `Text` from `@/components/ui` only (`CLAUDE.md`, Theme).

## Steps

1. [ ] **Shared `DateField` (refactor first).** Move `features/measurements/DateField.android.tsx` / `DateField.tsx` to `components/` with `min?` / `max?` / `label?` (Android `minimumDate` / `maximumDate`; web `min` / `max` attributes). Move core `localDay` from `todo.ts` to `format.ts` with a test in `format.test.ts`; use it in the web field and in `features/measurements/model.ts`; delete `dayKey` and its test. Update `MeasurementSheet.tsx`'s import (`max={now}` as before). `pnpm check` green; measurements e2e unchanged.
2. [ ] **Draft rules (TDD, `sheet-model.test.ts`).** In ZOMBIES order: picking a day after tomorrow → Other with that day; picking today → Today; tomorrow → Tomorrow; a day before today → Today; picking keeps text, label, time. Picking 14:40 → 880 minutes exactly; stepping +15 / −15 from there → 14:55 / 14:25; +15 from 23:50 → 23:59; −15 from 00:05 → 00:00. Rewrite the existing stepping test's `23:50 + 15 → 23:45` assertion for the new clamp.
3. [ ] **`TimeField`.** `components/TimeField.android.tsx`: `DateTimePickerAndroid.open({ mode: 'time', is24Hour: true, value })`, set → minutes past midnight, dismissed → `onCancel`. `components/TimeField.tsx`: `<input type="time">` with `aria-label`. Same props shape as `DateField` (`value`, `label`, `open`, `onChange`, `onCancel`).
4. [ ] **Wire the sheet.** Date under Other and time under At a time open their fields (`min` today for the date; value `draft.other` / the due moment). On set: `pickDay` / `pickTime`; on cancel: only `picking` resets. `Keyboard.dismiss()` before opening. Web: inputs in place of the big text, steppers beside them. Update the sheet's doc comment.
5. [ ] **E2E (`e2e/tests/todo.spec.ts`).** Pick a date months ahead (fill `Due date`) → the sheet shows it and the note saves on that day; fill today's date → Today is chosen; fill `Due time` `14:40` → saved at 14:40, then `15 minutes later` → 14:55. Keep the existing stepper test passing. Measurements e2e (`getByLabel('Date')`) still green.
6. [ ] **Emulator check** (emulator-5554 only, never the developer's phone, release APK after a clean prebuild): date dialog with past days disabled, set and cancel; time dialog in 24 h with the keyboard icon, typed 14:40, cancel keeps the value; the keyboard closes when a picker opens and the sheet sits right after; dialogs in light and dark; measurements Pick date still works.
7. [ ] **Wrap-up.** `plans/implan-todo/MAIN.md` step 5: pointer that the date and time also open pickers (this plan). `plans/implan-todo-keyboard/MAIN.md` "waits for issue #34": answered here (opening a picker closes the keyboard). `plans/README.md` status. Run the cleanup sweep on the diff. `pnpm check` and `pnpm e2e` green. Every box in `TEST_STRATEGY.md` ticked. Rebase onto `develop` once #39 is merged, then open the PR.

## Out of scope

- Turning off an item's reminder: issue #36 (touches the same Date block and `sheet-model.ts`; see `NOTES.md`).
- A year in `shortDate` for far-ahead dates (spotted, `NOTES.md`).
- Material 3 pickers or a native theme change (decided against, `NOTES.md` decision 3).
- Pickers anywhere else (Add entry, Adjust time, measurements' time).
