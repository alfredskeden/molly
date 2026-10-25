# Test strategy: done when every box is ticked

Tests first for `packages/core` (Vitest, Given / When / Then, zero → one → many, then boundaries and errors) and `packages/api` (integration against the test Baby Buddy, `pnpm bb:up && pnpm bb:seed`). Screens by Playwright against the built web image. Looks and Android-only behaviour by hand on `emulator-5554` (never the developer's own phone). Fixtures are made up.

## Integration (`packages/api`, `notes.int.test.ts`)

- [ ] A note with a future `time` saves and reads back the same moment.
- [ ] `listNotes({ tags: 'molly-todo,molly-todo-done' })` without a child returns open and done notes of two children.
- [ ] `listTags()` returns a `To-do: …` tag that a saved note created; a seeded parent (with `core.view_tag`) can list.
- [ ] A note saved with an image returns an image URL under `/media/notes/images/`, fetchable without a token.
- [ ] `updateNote` with `image: null` removes the photo; a tags-only update keeps it; a new image replaces it.
- [ ] A non-image upload fails as `validation`.
- [ ] Skip Undo still retags through `updateNote` (existing skip tests green).

## Unit (`packages/core`, `todo.test.ts`)

- [ ] No notes: Buy and Appointments, both empty, no Other.
- [ ] One open item under Buy: in Buy, count 1.
- [ ] An item with an unknown family label gets its own card; family cards sort A–Z after Appointments; Other comes last, only with items.
- [ ] A family label whose items are all hidden has no card.
- [ ] Within a card: dated items soonest first, then undated by newest id.
- [ ] Ticked today: shown struck, not counted; ticked yesterday: hidden. Untick tags restore `molly-todo` and keep label, date and photo.
- [ ] Tick tags carry the local date (`molly-done-YYYY-MM-DD`), including just before midnight.
- [ ] Due text: "Today 14:30", "Tomorrow", "in 5 days", "Yesterday 10:00 · overdue"; a date-only item is overdue only after its day ends.
- [ ] Date-only items save at 12:00 local and read back as that day.
- [ ] Reminder: 13:30 for 14:30; 19:00 the evening before for a date only; none when that moment has passed, for done items, or for undated ones.
- [ ] New: ids above the seen mark count, ids this device saved don't, done items don't.
- [ ] Labels: `To-do: ` tags only, Buy and Appointments first, case duplicates merged; "pharmacy" reuses "Pharmacy"; "Other" and blank refused.
- [ ] Photo URL: an `http://other-host/media/…` URL becomes the base URL plus `/media/…`.

## Unit (`apps/molly/src/notification`)

- [ ] To-do notification content: "Molly · To-do · 13:30", "<text> · 14:30", the label (Other when none); one per item, keyed by note id.

## Playwright (`e2e/tests/todo.spec.ts`)

- [ ] The header's first button is To-do; no badge with nothing new.
- [ ] Empty list: Buy and Appointments with "Nothing yet", no Other, the "Shared with everyone…" subtitle, Add item.
- [ ] Add "Diapers size 3" under Buy: shown under Buy, toast "Saved · Diapers size 3", saved as a note with `molly-todo` and `To-do: Buy`.
- [ ] A note added by the other parent (seeded through the API): badge 1, "New" pill, "1 new since you last looked"; leaving and coming back clears the badge.
- [ ] Switching child keeps the same list.
- [ ] Save is disabled with no text; the sheet has no Delete.
- [ ] New label "Pharmacy" while adding: chip selected, card appears after save, tag listed by `/api/tags/`.
- [ ] No label: under Other, after the family labels.
- [ ] Tomorrow 14:30 under Appointments: top of the card as "Tomorrow 14:30"; edit to 15:00 shows "Tomorrow 15:00".
- [ ] Dated order: tomorrow, in 5 days, then undated.
- [ ] Overdue item: "Yesterday · overdue" in the danger colour, no bell.
- [ ] Tick: struck through, note retagged `molly-todo-done` + today's done tag; untick: open again.
- [ ] Done yesterday (seeded): not shown, not counted.
- [ ] Photo on the web: only "Choose a photo"; the row gets a thumbnail; tapping it opens the full photo with text, label and Edit; Remove + save drops the thumbnail; a row without a photo has no empty slot.
- [ ] Web shows no bells.
- [ ] A user without `core.view_tag` sees only Buy and Appointments chips and the hint, with no error toast.
- [ ] The web image's CSP lets the photo load (no CSP error in the console).
- [ ] Existing specs pass (skip/day-plan, dashboard header, accessibility).

## Manual (emulator-5554, Android)

- [ ] Camera and Library both attach a photo; the upload is downscaled (≤1600 px, JPEG) under a random name.
- [ ] Pinch to zoom on the full photo; back closes it.
- [ ] A reminder an hour before an item with a time, and at 19:00 the evening before a date-only item, on channel `molly.todo` (`dumpsys notification`: importance 3, no sound); a tap opens To-do.
- [ ] Bell shows on dated, open items whose reminder is ahead; none on done or overdue items.
- [ ] Ticking the item off from another account: after the next refresh (app or widget) the alarm is gone (`dumpsys alarm`).
- [ ] Nap reminders still ring after the alarm refactor.
- [ ] Look review in every theme, light and dark: list, sheet, full photo, badge.

## Wrap-up

- [ ] `updateNoteTags` is gone (no references); `pnpm check` and `pnpm e2e` green; the web bundle check passes.
- [ ] `implan-cleanup` wrap-up sweep run; findings applied or noted.
- [ ] `docs/setup.md` (`core.view_tag`, `/media/notes/images/*` bypass, photos public by URL and kept after removal), onboarding checklist, `CLAUDE.md`, `plans/README.md`, `plans/implan-molly/NOTES.md` updated.
- [ ] PR open against `develop`; issue #22 updated with anything that changed during the work.
