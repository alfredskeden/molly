# Shared to-do list

GitHub issue #22 (the agreed spec, in Gherkin). Design: "Molly To-do" (`Molly To-do.dc.html`, Android and Web variants; private design source). Branch `feature/todo` from `develop`, PR with `--base develop`.

## Outcome

Both parents keep one shared list of things to buy, appointments and anything else that needs doing, in the Android app and on the web. Items are grouped by labels the family creates; Buy and Appointments are always there, unlabelled items go under Other. An item can have a date (and a time), a photo, and an Android reminder. Ticking an item off strikes it through until midnight, then it hides. New items from the other parent are marked, and the header's To-do button counts them.

Not in the widget or the lock-screen timer notification. No backend: everything is Baby Buddy notes and tags.

## The data model

Every item is one Baby Buddy note (`/api/notes/`), saved on the child on screen when it was added. The list ignores the child: it is the family's.

| Molly | Note |
| --- | --- |
| Text | `note` |
| Open item | tag `molly-todo` |
| Done | tags `molly-todo-done` + `molly-done-YYYY-MM-DD` (the ticking phone's local date) instead of `molly-todo` |
| Label | tag `To-do: <label>` (listed via `/api/tags/`); none = Other |
| Date and time | tag `molly-todo-due`, `time` = the due moment |
| Date only | tag `molly-todo-day`, `time` = 12:00 local on that day |
| No date | neither tag; `time` = when it was added (unused) |
| Photo | `image`, uploaded as `<random>.jpg`, downscaled |
| Order of undated items, "New" | the note `id` (grows with every note) |

Rules that follow from it:

- **One fetch** gives the whole list: `listNotes({ tags: 'molly-todo,molly-todo-done' })`, no child, no date filter (OR filter, confirmed).
- **Labels are Baby Buddy tags named `To-do: <label>`**, listed with `GET /api/tags/` (filtered to that prefix in Molly). Listing needs `core.view_tag` (admins have it); `docs/setup.md` and the onboarding checklist ask for it. Without it (403) the sheet's chips are only Buy and Appointments, with a one-line hint naming the permission, and no permission toast.
- **A new label is created on Save**, by saving the note with the new tag name (as `molly-skip` is created); a cancelled sheet leaves nothing behind. Baby Buddy allows `To-do: Pharmacy` and `To-do: pharmacy` side by side, so a typed label reuses an existing one case-insensitively. "Other" can't be created.
- **Cards**: Buy and Appointments always ("Nothing yet"); a family label only while it has open items or items done today; Other only when it has items. Cards come from the items, so an item's label shows even if the tags list is out of date. The sheet's chips show every listed label.
- **Done hides** when its `molly-done-` day is before today (local). Unticking restores `molly-todo` and drops both done tags; the date, label and photo stay.
- **Overdue**: an open item whose due moment (date only: the end of that day) has passed. Shown in the danger colour until ticked; Molly never changes it.
- **New** (per device, AsyncStorage): the highest note id seen when this device last left the list, plus the ids this device saved since. New = an open item with a higher id that this device didn't save. Edits by the other parent are not "new".
- **Photo URL**: Baby Buddy returns an absolute URL built from its request host, which may be wrong behind a proxy (`http` vs `https`). Molly keeps only the path from `/media/` and joins it to the session's base URL.
- **Reminder time**: with a time, 1 h before; date only, 19:00 the day before. A reminder whose time has passed is not set, and the item has no bell. Done items have none.

## Decisions and why

- Ticking retags rather than deletes: parents can't `DELETE` notes (403), same as skip Undo.
- The done day is a tag so both phones hide an item after the same midnight with no clock agreement needed. Cost: one tag per day with a tick.
- Photos are public by URL on Baby Buddy (its nginx serves `/media/` with no auth). A random file name keeps the URL unguessable; downscaling keeps uploads small. A removed photo's file stays on the server; the docs say so.
- Reminders are scheduled by each phone from the list it last fetched (the app's to-do query and the widget's background refresh), so both parents get them and a tick by the other parent drops the reminder on the next refresh. Own channel `molly.todo`, so it can be turned off apart from timers and nap reminders.
- Writes are optimistic like the trackers' (`src/features/dashboard/optimistic.ts`): ticks and text-only saves show at once with a negative-id guess and are undone with a toast on failure. A save with a new photo waits for the upload (Save shows it's saving). To-do writes don't go through the tap log.

## Assumptions

- Both phones are in the same time zone (done days and "Today" are local dates).
- A family has at most a few hundred to-do notes a year, so fetching them all (paged by the client's collector) stays cheap.
- Parents are admins, or have the setup's permissions plus the new `core.view_tag` (`add_note`, `change_note`, `add_tag`, `change_tag` are already asked for).
- `packages/core` and `packages/api` stay free of React, Expo and `apps/` (the widget refresh reuses them).

## Steps

TDD where the project uses it: `packages/core` unit tests (Given / When / Then, zero → one → many, then boundaries and errors), `packages/api` integration tests against the test Baby Buddy (`pnpm bb:up && pnpm bb:seed`). Screens: Playwright against the web image. Visuals and Android-only behaviour: manual, on `emulator-5554`. Fixtures are made up.

- [x] **1. Notes client (refactor-first, then new).** `packages/api`, integration tests in `notes.int.test.ts`.
  - `Note` gains `image: string | null`; `NoteQuery.child` becomes optional and `tags` documents the comma OR list.
  - `listTags()` (`/api/tags/`, paged; `Tag = { slug, name, color, last_used }`).
  - `e2e/seed.py`: both parents get `core.view_tag`.
  - Replace `updateNoteTags(id, tags)` with `updateNote(id, patch)` (`note`, `time`, `tags`, `image: null`); move its one caller, skip Undo (`apps/molly/src/app/(main)/index.tsx:460`).
  - `createNote` / `updateNote` send multipart when an image is given (`NoteImage`: `{ name, blob }`, a web `Blob` or on Android an `expo-file-system` `File`, since Expo's fetch can't send `{ uri }` parts; appended to `FormData` with tags repeated); JSON otherwise.
  - Tests: `listTags` returns a tag a note created; future `time` round-trips; OR filter without `child` returns two children's notes; image upload returns a `/media/notes/images/` URL; `image: null` removes it; a JSON tag patch keeps it; a non-image is `validation`.
- [x] **2. To-do rules** (`packages/core/src/todo.ts`, unit-tested). Pure functions over notes and `now`:
  - `todoItems(notes)`: note → item (text, label, due kind and moment, done day, image path, id, child).
  - `todoList(items, now, seen)`: label cards in order (Buy, Appointments, family labels A–Z, Other), hidden done items dropped, each card's open count; within a card dated first by due moment, then undated by id descending; done items stay in place struck.
  - `todoLabels(tags)`: the `To-do: ` tags as chips (Buy and Appointments first, then A–Z, case-insensitive duplicates merged); `labelFor(typed, labels)` reuses case-insensitively, refuses "Other" and blank.
  - `todoTags(...)` for save, tick (with today's done tag) and untick.
  - `dueText(item, now)`: "Today 14:30", "Tomorrow", "in 5 days", "Yesterday 10:00 · overdue".
  - `reminderAt(item, now)` (1 h before / 19:00 the day before / none) and `newCount(items, seen)`.
  - `photoUrl(baseUrl, image)`: the `/media/…` path joined to the base URL.
- [ ] **3. Shared alarms (refactor-first) and to-do reminders, native.** In `Notifier.kt`, pull the two-alarm scheduling and "rang" key out of `scheduleNapReminder` into a helper keyed by (kind, id); nap reminders keep working unchanged (re-check on the emulator). Then add `scheduleTodoReminders(list)` / keep-only by note id, notification id 6 tagged with the note id, channel `molly.todo` (`IMPORTANCE_DEFAULT`, no sound, like `molly.reminders`), content "Molly · To-do · 13:30" / "<text> · 14:30" / "<label>", tap opens `molly://todo`. Content built in `src/notification/` (unit-tested model), web no-op sibling.
- [ ] **4. Header button, query, list screen.** `useTodoNotes` (family-wide, polled like `useSkipNotes`, persisted with the query cache); `IconButton` `checklist` first in `Header.tsx` with the ink badge and "To-do, 2 new"; route `src/app/(main)/todo.tsx` with back arrow, subtitle, label cards, rows (tick circle 48 px target, text, New pill, date line, overdue, bell on Android when `reminderAt` is set, thumbnail), Add item. Leaving the list stores the new "seen" mark. Tick and untick optimistic.
- [ ] **5. Add / edit sheet.** `useTodoLabels` (`listTags`, refetched after a save that made a new label). One sheet ("New item" / "Edit item"): text with the keyboard open, label chips with "+ New label" (the tag is made on Save; without `view_tag` only built-in chips and the hint), date segments (No date / Today / Tomorrow / Other with −1 d / +1 d), time (Any time / At a time, ±15 min), the Android reminder line, Save disabled without text, toast "Saved · <text>", no Delete.
- [ ] **6. Photos.** `npx expo install expo-image-picker expo-image-manipulator`; Android Camera and Library, web "Choose a photo"; downscale to 1600 px on the long edge, JPEG 0.8, random file name; 72 px thumbnail with Replace / Remove in the sheet, 52 px in the row; full photo over the list (dark background, fitted, pinch zoom with Gesture Handler + Reanimated, `style` not `className`), text, label, date and Edit; spinner on stripes while loading. Web: `img-src` in `docker/nginx.conf.template` gains `${BABY_BUDDY_ORIGIN}`.
- [ ] **7. Reminders wired.** The app syncs to-do reminders when the to-do query's data changes; the widget refresh (`src/widget/model.ts`) fetches the to-do notes too and syncs, so a tick by the other parent drops this phone's reminder. Permission as for the Vitamin D reminder (ask when the first dated item is saved on Android, only if not allowed). Deep link opens the list.
- [ ] **8. Docs and wrap-up.** `docs/setup.md`: `core.view_tag` in the parent permissions (step 10) and the onboarding checklist note; Access bypass for `/media/notes/images/*` next to `/api/*`, photos are public by URL and removed photos stay on the server. `CLAUDE.md` architecture bullet for To-do; `plans/README.md` row; Baby Buddy facts from `NOTES.md` into `plans/implan-molly/NOTES.md`. Run the `implan-cleanup` wrap-up sweep. Rewrite issue #22 with what shipped.

## Boundaries

- Not in the widget UI or the lock-screen timer notification (the widget refresh only schedules reminders).
- No author, no push between phones, no several labels per item, no recurring items, no quantities field, no delete, no renaming or deleting labels.
- Web has no reminders and no bells.
