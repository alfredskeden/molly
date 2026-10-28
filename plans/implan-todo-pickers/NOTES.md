# Notes: due date and time pickers

## Context

- Spec: GitHub issue #34 (merged from #35). The issue gets rewritten in Gherkin once the decisions below are confirmed.
- **Builds on issue #30** (PR #39, branch `plan/issue-30-todo-read-only`), which added the read-only `TodoView` and changed how the edit sheet opens. This plan's branch `plan/issue-34-todo-pickers` starts from that branch, not from `develop`. Its PR must wait for #39 to merge, then rebase onto `develop` before opening (`gh pr create --base develop`).
- **Overlap with issue #36** (turn off an item's reminder), planned at the same time. Both change the Date block of `TodoSheet.tsx` (the reminder line sits right under the time row) and `sheet-model.ts` / `sheet-model.test.ts` (#36 likely adds a reminder on/off field to `TodoDraftState` and changes `reminderLine`). Expect merge conflicts in those three files; whichever lands second rebases. Neither plan changes the other's rule.

## Decisions to confirm

Each is a recommendation made while planning without the developer. The steps in `MAIN.md` follow the recommendation; if one is overturned, update `MAIN.md`, `MENTAL_MODEL.md` and `TEST_STRATEGY.md` with it.

1. **Shared `components/DateField` (recommended) vs a copy for the to-do.**
   Recommended: move `features/measurements/DateField.android.tsx` / `DateField.tsx` to `apps/molly/src/components/DateField.android.tsx` / `DateField.tsx`, with optional `min` and `max` and an accessibility `label` (default `Date`, so the measurements e2e `getByLabel('Date', { exact: true })` keeps working; the to-do passes `Due date`, since its Segment is already labelled `Date`). One dialog wrapper, one web input, both users get bounds.
   Alternative: copy it into `features/todo/` with `min` only. Less churn in measurements, but two near-identical platform pairs.
2. **Time clamp: 00:00–23:59 (recommended) vs keep 23:45.**
   Recommended: `stepTime` clamps to 0…`24 * 60 - 1`. The picker allows any minute, and with the 23:45 cap a picked 23:50 plus 15 drops to 23:45 (a "later" tap moving earlier). The current test even pins that (`23:50 + 15 → 23:45` in `sheet-model.test.ts`). 23:59 is still the same day, so `draftDue` and the reminder are unaffected.
   Alternative: keep 23:45 but never let `+15` lower the time (`max(current, cap)`). An odd rule for no gain.
3. **Typing the time: system time dialog, clock first, keyboard one tap away (recommended).**
   Checked in `node_modules/@react-native-community/datetimepicker` 9.1.0:
   - `initialInputMode: 'keyboard'` exists, but only with `design: 'material'` (`android/.../RNMaterialTimePicker.kt` → `MaterialTimePicker.INPUT_MODE_KEYBOARD`). The default design (`RNTimePickerDialogFragment.java`, the framework `TimePickerDialog`) has no input-mode option.
   - The material pickers need the app theme to inherit `Theme.Material3.DayNight.NoActionBar` (package README, Material pickers section); Material Components throw on a non-Material theme. Molly's prebuilt `AppTheme` is `Theme.AppCompat.DayNight.NoActionBar` (Expo default; `android/` is generated). Getting there means a config plugin that changes the app-wide native theme parent, which can restyle every native dialog the app shows. `com.google.android.material:material:1.12.0` is already a dependency of the package.
   - The framework clock dialog (Android 8+) has a keyboard icon that switches to typed hours and minutes, so typing is one extra tap.
   Recommended: `DateTimePickerAndroid.open({ mode: 'time', is24Hour: true })`, default design. No native theme change, same family of dialog as the measurements date picker.
   Alternatives: (a) material design with `initialInputMode: 'keyboard'` plus a config plugin setting `AppTheme`'s parent to Material3. Needs a spike on the emulator first: the dialog's colours in each theme, and that nothing else native (alerts, splash, widget picker) changes look. (b) In-sheet typing as the Adjust time sheet does (`typedDigit` / `typedText` in core `adjust.ts`, an invisible `TextInput` over the big time in `features/toast/toast.tsx`): tap the time, the number pad opens, type `1440`. Fastest to type and the same on web, but no clock to tap and a bigger change to the sheet.
4. **Snapping to Today / Tomorrow: picks snap, steps don't (recommended).**
   Picking today or tomorrow in the date picker sets the segment to Today / Tomorrow; a picked date before today (possible by typing in the web field) becomes Today. Stepping with −1 d / +1 d keeps Other even when it lands on today or tomorrow, so the row the parent is tapping doesn't vanish under the thumb.
   Alternative: steps snap too (one rule everywhere, but the stepper row disappears mid-tapping).
5. **Opening a picker closes the text keyboard (recommended).** `implan-todo-keyboard` left "should Date / Time taps dismiss the keyboard" to this issue. Recommended: tapping the date or time calls `Keyboard.dismiss()` before the dialog opens (a dialog over a raised keyboard is cramped, and the keyboard would pop back after). Segment and stepper taps still don't close it.
   Alternative: leave the keyboard alone everywhere.
6. **Web: the browser's own inputs take the big text's place (recommended).** On web the date row shows `<input type="date" min=today>` and the time row `<input type="time">` (labels `Due date` / `Due time`), styled like the measurements date field, with the steppers beside them. That's what Playwright drives (`fill('2027-01-14')`, `fill('14:40')`).
   Alternative: keep the big text on web too with a transparent input over it. Same look on both platforms, more fiddly, and browsers differ on opening the picker from an invisible input.

## Code as found (branch `plan/issue-30-todo-read-only` at dbbfff4)

- Sheet: `apps/molly/src/features/todo/TodoSheet.tsx` lines ~176–212 (Date block): `Segment` labelled `Date` (No date / Today / Tomorrow / Other); under Other, `shortDate(draft.other)` in `font-display text-[26px]` and `StepButton`s `−1 d` / `+1 d` (spoken `A day earlier` / `A day later`); with At a time, `clockText(due!.at)` (accessibility label `At HH:MM`) and `−15` / `+15` (spoken `15 minutes earlier` / `later`); then the reminder line.
- Draft rules: `apps/molly/src/features/todo/sheet-model.ts`: `TodoDay`, `TodoDraftState { text, label, day, other, timed, minutes }`, `DEFAULT_MINUTES = 9 * 60` (private), `newTodoDraft` (Other starts the day after tomorrow), `todoDraftOf`, `draftDue`, `stepDay` (never before today), `stepTime` (cap `DAY_MINUTES - 15`), `reminderLine`. Tests: `sheet-model.test.ts` (Given / When / Then).
- Measurements date field: `features/measurements/DateField.android.tsx` (`DateTimePickerAndroid.open`, `mode: 'date'`, `maximumDate`, opens when `open` turns on, renders nothing) and `DateField.tsx` (web `<input type="date" aria-label="Date" max>`, uses `dayKey` from `features/measurements/model.ts`). Only user: `MeasurementSheet.tsx` ~line 154 (`max={now}`; on web shown only once Pick date is chosen).
- Same-extension pair (`.android.tsx` + `.tsx`), as `CLAUDE.md` requires; keep it that way for the new `TimeField` too.
- `@react-native-community/datetimepicker` 9.1.0 is in `apps/molly/package.json` and the `app.json` plugins (no options). The native date dialog clamps a value outside min / max to the bound (`RNDatePickerDialogFragment.java` ~line 142), so opening it on an overdue item shows today.
- `dayKey` (measurements) and core `localDay` (`packages/core/src/todo.ts` ~line 68) are the same function (`YYYY-MM-DD` of the local date).
- E2E: `e2e/tests/todo.spec.ts` "a dated item with a time is saved and shown as Tomorrow, and an edit moves it" (~line 266) uses the `15 minutes later` buttons; `e2e/tests/measurements.spec.ts` ~line 90 fills `getByLabel('Date', { exact: true })`.

## Cleanup sweep (planning)

Remove / refactor, in the step that makes each one obsolete:

- `features/measurements/DateField.android.tsx` and `DateField.tsx` move to `components/` (step 1); nothing else imports them (`grep -rn DateField apps/molly/src`).
- `dayKey` in `features/measurements/model.ts` duplicates core `localDay`: move `localDay` to core `format.ts` (it isn't to-do specific), use it in measurements and the shared field, delete `dayKey` and its test in `features/measurements/model.test.ts` (~line 27), with a `localDay` test in `packages/core/src/format.test.ts` (step 1).
- `stepTime`'s `DAY_MINUTES - 15` cap and the test asserting `23:50 + 15 → 23:45` (step 2).
- The time's accessibility label `At HH:MM` becomes a button label that says it opens the picker (step 4).
- Docs that describe the steppers as the only way: `plans/implan-todo/MAIN.md` step 5 (~line 75) gets a pointer to this plan; `plans/implan-todo-keyboard/MAIN.md` "waits for issue #34" (~line 24) gets the answer (step 7).

No dependency, flag or asset becomes unused; no new dependency.

Spotted, not in scope:

- `shortDate` has no year, so a date picked a year ahead reads like this year's (`14 Jan`). Same in the list (`dueText`). Worth a small issue if far-ahead dates become common.
- The temperature time in `MeasurementSheet.tsx` (~line 29), `features/add/add-model.ts` and `storage/types.ts` each keep their own `CLOCK` regex.

## Open

- The six decisions above, until the developer confirms them.
