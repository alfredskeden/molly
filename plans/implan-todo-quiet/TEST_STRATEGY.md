# Definition of Done

Method as in `CLAUDE.md`: core and model rules TDD in Vitest (Given / When / Then, zero → one → many, then boundaries); screens through Playwright against the web image and a real Baby Buddy; looks and Android-only behaviour by hand on emulator-5554. No new `packages/api` integration test (no new client call; see `NOTES.md` decision 6).

## Core (`packages/core/src/todo.test.ts`)

- [ ] An item without `molly-todo-quiet` is not quiet; with it, it is.
- [ ] A quiet item has no reminder, with a time and with a date only; an item without the tag reminds as before (1 h before / 19:00 the evening before).
- [ ] Saving a quiet dated draft adds `molly-todo-quiet` once (also when the item already had it).
- [ ] Saving a draft with the reminder on, or with no date, drops a `molly-todo-quiet` the item had; other foreign tags stay.
- [ ] Ticking and unticking keep `molly-todo-quiet`.

## Sheet model (`apps/molly/src/features/todo/sheet-model.test.ts`)

- [ ] A new draft has the reminder on; an edited quiet item's draft has it off.
- [ ] The line for a quiet dated draft is "No reminder on either phone"; without a date there's still no line; the on lines are unchanged.

## Notifications (`apps/molly/src/notification/model.test.ts`)

- [ ] A quiet dated item is neither scheduled nor kept (an already rung reminder is cleared); the other items are unaffected.

## Web flows (`e2e/tests/todo.spec.ts`, `pnpm e2e`)

- [ ] Editing a quiet dated item's text on the web keeps `molly-todo-quiet` on the note.
- [ ] Removing a quiet item's date on the web drops `molly-todo-quiet`.
- [ ] The web edit sheet shows no "Remind me" switch (and still no bells).

## Manual (emulator-5554, release APK)

- [ ] Edit a timed item due in about 2 h, turn "Remind me" off, Save: the subtitle read "No reminder on either phone"; the row has no bell; the read-only sheet shows the struck bell and "No reminder"; the date and time are unchanged; no notification at the reminder time.
- [ ] Turn it back on and Save: the bell is back and the reminder rings 1 h before.
- [ ] Same for a date-only item due tomorrow (no reminder at 19:00 when off).
- [ ] An item saved before this change still reminds.
- [ ] An item made quiet through the API (the other parent) loses its alarm and bell after the next refresh; a reminder that already rang disappears.
- [ ] The switch looks right in light, dark and one patterned theme; Android back closes the sheet without saving.

## Clean

- [ ] `reminderLine` no longer builds a stub `TodoItem`; `TodoView` gets its line from `reminderLine` (`grep reminderAt` in `features/todo/` finds none).
- [ ] Docs updated: `CLAUDE.md` to-do bullet, `plans/implan-todo/` reminder lines, `plans/README.md`.
- [ ] `pnpm check` and `pnpm e2e` green (or a failure shown to fail the same on `develop`).
