# Definition of Done

Method as in `CLAUDE.md`: core rules TDD in Vitest (Given / When / Then, zero → one → many, then boundaries); screens through Playwright against the web image; looks and Android-only behaviour by hand on emulator-5554.

## Core (`packages/core/src/todo.test.ts`)

- [ ] Nothing is New on a device that never looked (`seen` null).
- [ ] An open item above `mark`, not saved or opened here, is New; done items never are.
- [ ] An opened item is not New; a saved one is not New.
- [ ] An item in `unread` is New even if it's at or below `mark`, saved here, or was opened; not once it's done.
- [ ] `openedBy` adds the id and removes it from `unread`; `unreadBy` adds it to `unread`; neither records a negative id; both keep the other fields.
- [ ] `savedBy` keeps `opened` and `unread`.
- [ ] The baseline sets `mark` to the highest listed id, ignoring guesses, with empty lists.
- [ ] `pruneSeen` drops missing ids at or below the highest fetched id, keeps ids above it, drops done ids from `unread`, drops `saved` / `opened` ids at or below `mark`, keeps done ids in `opened`, and returns the same object when nothing changes.
- [ ] `newCount` and `todoList`'s `isNew` agree.
- [ ] `seenAfter` and its tests are gone.

## Settings (`apps/molly/src/storage/settings.test.ts`)

- [ ] A stored `{ mark, saved }` parses with `opened: []` and `unread: []`; the full shape round-trips; a malformed one falls back to null.

## Web flows (`e2e/tests/todo.spec.ts`, `pnpm e2e`)

- [ ] Tapping an item opens a read-only sheet with its text, label and date, and no text field.
- [ ] Edit in that sheet opens the edit sheet with the item's text, label and date; Save works as before.
- [ ] Closing the read-only sheet sends no write to Baby Buddy.
- [ ] The other parent's item stays New after leaving the list and coming back (badge still counts it).
- [ ] Opening it clears New and the badge drops by one; the subtitle reads "1 new" before.
- [ ] Mark unread closes the sheet; the item shows New and the badge counts it.
- [ ] An item added on this phone is never New; after Mark unread it is.
- [ ] The earlier tests that opened items by "Edit, …" pass through the read-only sheet.

## Manual (emulator-5554)

- [ ] Read-only sheet looks right in light, dark and one patterned theme; long text wraps; overdue in danger colour; bell line on a dated item.
- [ ] Photo in the sheet opens the viewer; closing the viewer returns to the sheet.
- [ ] The row's thumbnail opens the viewer and the item stays New.
- [ ] Android back closes the read-only sheet.
- [ ] Tick / untick from the sheet updates it in place.

## Clean

- [ ] No references left to `seenAfter`, the leave-to-mark effect, "since you last looked" or the "Edit, " row label (`grep`).
- [ ] Docs updated: `CLAUDE.md`, `plans/implan-todo/` New lines, `plans/README.md`.
- [ ] `pnpm check` and `pnpm e2e` green (or a failure shown to fail the same on develop).
