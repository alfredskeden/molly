# Definition of Done

Method as in `CLAUDE.md`: draft rules TDD in Vitest (Given / When / Then, zero → one → many, then boundaries); screens through Playwright against the web image; the Android pickers and looks by hand on emulator-5554 (never the developer's phone).

## Draft rules (`apps/molly/src/features/todo/sheet-model.test.ts`)

- [ ] A picked day after tomorrow chooses Other with that day; text, label and time are kept.
- [ ] A picked today chooses Today; a picked tomorrow chooses Tomorrow; a picked day before today chooses Today.
- [ ] A picked time keeps its exact minute (14:40) and saves at it (`draftDue`).
- [ ] ±15 steps from a picked time (14:40 → 14:55 / 14:25).
- [ ] Stepping stays within 00:00–23:59: +15 from 23:50 gives 23:59, −15 from 00:05 gives 00:00.
- [ ] −1 d / +1 d still never go before today and stay on Other.

## Core (`packages/core/src/format.test.ts`)

- [ ] `localDay` writes the local date as `YYYY-MM-DD`, also late in the evening.

## Web flows (`pnpm e2e`)

- [ ] Picking a date months ahead under Other shows it in the sheet and saves the item due that day.
- [ ] Picking today's date selects Today.
- [ ] Typing 14:40 in the time field saves the item at 14:40; +15 after that saves 14:55.
- [ ] The existing stepper test (Tomorrow 09:30, edit to 09:45) still passes.
- [ ] Measurements' Pick date still saves the chosen past date.

## Manual (emulator-5554, release APK after a clean prebuild)

- [ ] Tapping the date opens the system date dialog with days before today disabled; a set date shows in the sheet; Cancel leaves it as it was.
- [ ] Tapping the time opens the 24-hour clock dialog; its keyboard icon allows typing 14:40; Cancel leaves the time as it was.
- [ ] The text keyboard closes when a picker opens, and the sheet sits right afterwards; Date / Time segment taps still leave the keyboard open.
- [ ] The reminder line follows a picked time (14:40 today → reminds at 13:40).
- [ ] Dialogs readable in a light and a dark theme.
- [ ] TalkBack reads the date and time as buttons that pick.
- [ ] Measurements' Pick date still opens with future days disabled.

## Clean

- [ ] `features/measurements/DateField*` and `dayKey` are gone; nothing references them (`grep`).
- [ ] No test or code still expects the 23:45 cap.
- [ ] `plans/implan-todo/MAIN.md` and `plans/implan-todo-keyboard/MAIN.md` point here where they described the old behaviour; `plans/README.md` status updated.
- [ ] `pnpm check` and `pnpm e2e` green (or a failure shown to fail the same on `develop`).
