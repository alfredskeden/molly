# Read-only items, New until opened, Mark unread

GitHub issue #30 (merged from #31 and #32). Builds on the to-do list from `plans/implan-todo/`.

## Outcome

- **Tapping an item opens it read-only.** A sheet shows its full text, label, date, reminder, photo and done state. From there, **Edit** opens today's `TodoSheet`, the tick button ticks or unticks it, and **Mark unread** makes it New again. "Add item" still opens `TodoSheet` directly.
- **New lasts until the item is opened on this phone.** Leaving the list no longer clears New. Opening an item in the read-only sheet (or its edit sheet) does, and the header badge drops by one.
- **Mark unread** makes an open item New again on this phone only, including items this phone added itself.

## How "New" works now

`TodoSeen` (per device, `settings.todoSeen`, dropped on sign-out as today) becomes:

```ts
type TodoSeen = { mark: number; saved: number[]; opened: number[]; unread: number[] };
```

An item is New when it's open and **either** its id is in `unread`, **or** its id is above `mark` and not in `saved` or `opened`.

- `mark` is now only the fresh-install baseline: the first load on a device without `todoSeen` sets it to the highest listed id, so a fresh install has nothing New. It never moves after that.
- `saved`: ids this phone created (`savedBy`, as today). Own items never start out New.
- `opened`: ids opened in the read-only sheet or the edit sheet here. Opening also removes the id from `unread`.
- `unread`: ids marked unread here. Wins over `saved` and `opened`, so a parent can flag their own item for later.

## Decisions

- **Mark unread works on any open item**, own ones too (`unread` beats `saved`). Not offered on done items, since done items are never New.
- **Wording: "Mark unread"** on the button. The list's pill stays "New". Subtitle: "N new" while anything is New (was "N new since you last looked"), otherwise the shared line as today.
- **Opening is recorded when the sheet opens**, not when it closes. So closing after Mark unread doesn't count as another opening, and the badge drops as soon as the item is on screen.
- **Opening the edit sheet counts as opened** (from the read-only sheet, or from the photo viewer's Edit).
- **The row's photo thumbnail still opens `PhotoViewer` directly, and that does not count as opened.** The photo inside the read-only sheet opens `PhotoViewer` too; closing the viewer goes back to the read-only sheet.
- **Ticking from the read-only sheet keeps the sheet open** and shows the new state (struck text, "Done today"). Mark unread hides once it's done.
- **Optimistic guesses (negative ids) are never recorded** as opened or unread. Their sheet can open; it records nothing.
- **Pruning** keeps the lists small and never races a save: only ids **at or below the highest fetched id** that are missing from the fetched list are dropped (an id above it may be a save the list hasn't fetched yet). `unread` also drops ids that are done. `saved` and `opened` drop ids at or below `mark` (the mark already covers them). Done items stay in `opened`, so unticking an opened item doesn't make it New again. Pruning returns the same object when nothing changed, so it never writes in a loop.
- **Old settings upgrade in place**: a stored `{ mark, saved }` parses as `{ mark, saved, opened: [], unread: [] }`. Its `mark` is where that phone last left the list, so items since then show New until opened. That's correct under the new rule.

## Pieces of code

- Core (`packages/core/src/todo.ts`): the `TodoSeen` shape and `isNew` rule above; `openedBy(seen, id)`, `unreadBy(seen, id)`, `savedBy` (keeps the new fields), `pruneSeen(items, seen)`, and the baseline that replaces `seenAfter` (see Steps).
- Settings (`apps/molly/src/storage/types.ts`): `isTodoSeen` accepts the old shape; `parseSettings` fills the missing arrays.
- App: a read-only sheet `apps/molly/src/features/todo/TodoView.tsx` on the shared `Sheet` (`components/sheet.tsx`), styled like `TodoSheet`'s header and `PhotoViewer`'s caption. `todo.tsx` gets a `reading` state next to `editing` and `viewing`. Recording opened / unread goes through `useTodoSeen().save`. Pruning runs where the first-load baseline runs today (`useTodoBadge`, `features/todo/queries.ts`); the dashboard stays mounted under the list, so it runs while the list is open too.
- Theme: semantic classes and `Text` from `@/components/ui` only (see `CLAUDE.md`, Theme).

## Steps

1. [x] **Core rule (TDD, `packages/core/src/todo.test.ts`).** New `TodoSeen` shape and `isNew`. Then `openedBy`, `unreadBy`, `savedBy` with the new fields, `pruneSeen`. Replace `seenAfter` with a baseline-only function (`firstSeen(items)` or similar: highest listed id, ignoring guesses, empty arrays) and delete `seenAfter` and its two tests ("moves the mark…", "forgets saved ids…"); rewrite the "counts open items above the seen mark…" test for the new rule. Update the `TodoSeen` doc comment and `newCount`'s ("since this device last left the list" → "not opened here").
2. [x] **Settings upgrade.** `isTodoSeen` / `parseSettings` accept and fill the old shape; test in `apps/molly/src/storage/settings.test.ts` next to the existing `todoSeen` cases (around line 412). Update the `todoSeen` doc comment in `storage/types.ts`.
3. [x] **Stop moving the mark on leaving.** In `todo.tsx` remove the `useFocusEffect` cleanup, the `listed` ref and its `useEffect`, and the `useFocusEffect` / `seenAfter` imports. `useTodoBadge` uses the new baseline and runs `pruneSeen`. Fix the screen's doc comment ("leaving moves that mark") and the subtitle copy ("N new").
4. [x] **Read-only sheet.** `TodoView` with text, label · due (overdue in `text-danger`), reminder line with bell on Android (as the row and `TodoSheet` decide it: `reminderAt`, `hasNotifications`), photo (tap → `PhotoViewer`, back to the sheet on close), done state; actions tick / untick, Edit, Mark unread (open items only). Android back closes it (the `Sheet` already handles back; check). Row tap opens it; the row's accessibility label starts "Open, …" instead of "Edit, …". Record `openedBy` on open, `openedBy` when the edit sheet opens, `unreadBy` + close on Mark unread.
5. [x] **E2E (`e2e/tests/todo.spec.ts`).** Update the tests that click `^Edit, ` (lines ~208, ~229) to open the item and tap Edit. Rewrite "…marked New until the list is left" (line ~110) into the issue's scenarios: leaving keeps New; opening clears it and the badge; Mark unread brings it back; own items never New; Mark unread on an own item; closing the read-only sheet saves nothing. Seeded `todoSeen` in `openList` and the New test gets `opened: [], unread: []`.
6. [x] **Emulator check** (emulator-5554 only, never the developer's phone): read-only sheet in light, dark and one patterned theme; photo → viewer → back to the sheet; Android back closes the sheet; thumbnail in the row doesn't clear New; tick from the sheet.
7. [x] **Wrap-up.** `CLAUDE.md` to-do bullet: "New" is per device until opened (`settings.todoSeen`: baseline mark, saved, opened, unread). In `plans/implan-todo/` mark the "New" lines in `MAIN.md` (line 35) and `MENTAL_MODEL.md` (line 77) as replaced by this plan, so they don't read as current. `plans/README.md` row. `pnpm check` and `pnpm e2e` green. Run the cleanup sweep on the diff. Every box in `TEST_STRATEGY.md` ticked.

## Out of scope

- Due date and time pickers: issue #34.
- Turning off one item's reminder: issue #36. The read-only sheet only shows the reminder line.
- Syncing New between phones: it stays per device.
- Showing New in the widget or notifications (the to-do list isn't in them).
