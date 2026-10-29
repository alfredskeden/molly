# Definition of Done

Method as in `CLAUDE.md`: core, settings and model rules TDD in Vitest (Given / When / Then, zero → one → many, then boundaries); screens through Playwright against the web image; looks and Android-only behaviour by hand on emulator-5554. No `packages/api` test: nothing changes in Baby Buddy. The switch exists only on Android, so most of the behaviour is proved in Vitest and on the emulator; Playwright only shows the web stays without it.

## Core (`packages/core/src/todo.test.ts`)

- [ ] With no quiet ids, reminders are as before (1 h before / 19:00 the evening before; none for done, undated or past).
- [ ] An item whose id is quiet has no reminder, with a time and with a date only; other items keep theirs.
- [ ] `quietFor` adds an id once, removes it, and records nothing for a guess (negative id).
- [ ] `pruneQuiet` drops ids missing from the fetched list at or below its highest id, keeps ids above it, drops ids listed without a date, keeps done items, and returns the same array when nothing changes.

## Settings (`apps/molly/src/storage/settings.test.ts`)

- [ ] `todoQuiet` defaults to `[]`, round-trips, reads a malformed value as `[]`, and is dropped on sign-out.

## Sheet model (`apps/molly/src/features/todo/sheet-model.test.ts`)

- [ ] A new draft has the reminder on; a draft of a quiet item has it off.
- [ ] The line for a quiet dated draft is "No reminder on this phone"; without a date there's no line; the on lines are unchanged.

## Notifications (`apps/molly/src/notification/model.test.ts`)

- [ ] A quiet dated item is neither scheduled nor kept (an already rung reminder is cleared); other items are unaffected.

## Web flows (`e2e/tests/todo.spec.ts`, `pnpm e2e`)

- [ ] The web edit sheet of a dated item has no "Remind me" switch and no reminder line, and the list still has no bells.

## Manual (emulator-5554, release APK)

- [ ] Edit a timed item due in about 2 h, turn "Remind me" off: the subtitle reads "No reminder on this phone". Save: the row has no bell, the read-only sheet shows the struck bell and "No reminder", the date and time are unchanged, no notification at the reminder time.
- [ ] The note in Baby Buddy (API or its own UI) has the same tags as before: nothing shared changed.
- [ ] Turn it back on and Save: the bell is back and the reminder rings 1 h before.
- [ ] Same for a date-only item due tomorrow (no reminder at 19:00 when off).
- [ ] A new item saved with "Remind me" off never reminds.
- [ ] Turning it off after the reminder rang clears that notification.
- [ ] Removing the date and saving, then giving it a date again: the reminder is on.
- [ ] An item saved before this change still reminds; quiet survives closing the app and a widget refresh; sign-out and sign-in bring reminders back on.
- [ ] The switch looks right in light, dark and one patterned theme; Android back closes the sheet without saving.

## Clean

- [ ] `reminderLine` no longer builds a stub `TodoItem`; `TodoView` gets its line from `reminderLine`.
- [ ] Docs updated: `CLAUDE.md` to-do bullet, `Settings` comments, `plans/implan-todo/` reminder lines, `plans/README.md`.
- [ ] `pnpm check` and `pnpm e2e` green (or a failure shown to fail the same on `develop`).
