# Definition of Done

Method as in `CLAUDE.md`: draft rules TDD in Vitest (Given / When / Then, zero → one → many, then boundaries); screens through Playwright against the web image; the Android pickers and looks by hand on emulator-5554 (never the developer's phone).

## Draft rules (`apps/molly/src/features/todo/sheet-model.test.ts`)

- [x] A picked day after tomorrow chooses Other with that day; text, label and time are kept.
- [x] A picked today chooses Today; a picked tomorrow chooses Tomorrow; a picked day before today chooses Today.
- [x] A picked time keeps its exact minute (14:40) and saves at it (`draftDue`).
- [x] ±15 steps from a picked time (14:40 → 14:55 / 14:25).
- [x] Stepping stays within 00:00–23:59: +15 from 23:50 gives 23:59, −15 from 00:05 gives 00:00.
- [x] −1 d / +1 d still never go before today and stay on Other.

## Core (`packages/core/src/format.test.ts`)

- [x] `localDay` writes the local date as `YYYY-MM-DD`, also late in the evening.

## Web flows (`pnpm e2e`)

- [x] Picking a date months ahead under Other shows it in the sheet and saves the item due that day.
- [x] Picking today's date selects Today.
- [x] Typing 14:40 in the time field saves the item at 14:40; +15 after that saves 14:55.
- [x] The existing stepper test (Tomorrow 09:30, edit to 09:45) still passes.
- [x] Measurements' Pick date still saves the chosen past date.

## Manual (emulator-5554, release APK after a clean prebuild)

- [x] Tapping the date opens the system date dialog with days before today disabled; a set date shows in the sheet; Cancel leaves it as it was.
- [x] Tapping the time opens the 24-hour clock dialog; its keyboard icon allows typing 14:40; Cancel leaves the time as it was.
- [x] The text keyboard closes when a picker opens, and the sheet sits right afterwards; Date / Time segment taps still leave the keyboard open.
- [x] The reminder line follows a picked time (14:40 today → reminds at 13:40).
- [x] Dialogs readable in a light and a dark theme.
- [ ] TalkBack reads the date and time as buttons that pick. *Accessibility tree checked on the emulator (`uiautomator`: clickable, `Due date 14 Nov, pick a date` / `Due time 14:40, pick a time`); listening with TalkBack on is left to the developer.*
- [x] Measurements' Pick date still opens with future days disabled.

## Clean

- [x] `features/measurements/DateField*` and `dayKey` are gone; nothing references them (`grep`).
- [x] No test or code still expects the 23:45 cap.
- [x] `plans/implan-todo/MAIN.md` and `plans/implan-todo-keyboard/MAIN.md` point here where they described the old behaviour; `plans/README.md` status updated.
- [x] `pnpm check` and `pnpm e2e` green (or a failure shown to fail the same on `develop`). *`pnpm e2e`: 257 passed, 1 flaky (`editor.spec.ts` "an entry the other parent changed opens with their values after the poll", untouched here) that passed on its own rerun.*
