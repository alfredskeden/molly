# Notes: read-only items, New until opened

## Decisions (2026-10-28)

- Spec: GitHub issue #30 (rewritten at the end of planning with the agreed answers).
- Mark unread works on items this phone saved: `unread` wins over `saved`.
- Button wording "Mark unread"; the pill stays "New".
- The row's photo thumbnail opens `PhotoViewer` directly and does **not** count as opening the item.
- Opening the edit sheet counts as opened. Opening is recorded when a sheet opens, never on close.
- No design file for the read-only sheet. Build it from `TodoSheet`'s header and `PhotoViewer`'s caption, then review by eye.
- Flat plan, no separate mental model (small change, same as `implan-todo-keyboard`).

## Code as found (develop at d91b0c8)

- Seen state: `TodoSeen = { mark, saved }`, `isNew`, `newCount`, `seenAfter`, `savedBy` in `packages/core/src/todo.ts` (lines ~56, 96, 136–150). Tests in `packages/core/src/todo.test.ts` "new items" (~340–395).
- Mark moves on leaving: `todo.tsx` `useFocusEffect` cleanup with a `listed` ref (~lines 56–68). Only other `useFocusEffect` user is the dashboard (`index.tsx:331`), unrelated.
- First-load baseline: `useTodoBadge` in `features/todo/queries.ts` (`seenAfter(items, null)` when `todoSeen` is null). Badge count: `index.tsx:1135`.
- Own items: `use-todo-writes.ts:107` calls `savedBy` after creating a note.
- Settings: `storage/types.ts` `isTodoSeen` (~194) requires `mark` + `saved` only; tests `storage/settings.test.ts` ~35, ~412, ~427.
- Row tap → `onEdit`; accessibility label "Edit, <text>, new, <when>". E2E relies on it: `e2e/tests/todo.spec.ts` ~208 and ~229; the New test ~110 expects "1 new since you last looked" and the badge gone after Back.
- `PhotoViewer` already has text, detail and Edit; it stays for full-screen photos.

## Cleanup sweep (planning)

Remove (in the step that replaces each):

- `seenAfter`'s mark-moving role and its two tests → step 1.
- `useFocusEffect` cleanup, `listed` ref + effect, their imports in `todo.tsx` → step 3.
- "since you last looked" copy (`todo.tsx:86`, e2e ~120) → steps 3 and 5.
- "Edit, " row label in app and e2e → steps 4 and 5.
- Stale docs: `todo.tsx:36-37`, `todo.ts` `TodoSeen` / `newCount` comments, `storage/types.ts:48`, `CLAUDE.md` to-do bullet, `plans/implan-todo/MAIN.md:35`, `MENTAL_MODEL.md:77` → steps 1, 3, 7.

No dependencies, assets or flags become unused. `plans/implan-todo/TEST_STRATEGY.md:40` is a ticked record of what was checked then; leave it.

## Open

- None.

## Implementation (2026-10-29)

- Core: `firstSeen` replaced `seenAfter`; `openedBy` / `unreadBy` return the same value for a guess or a null `seen` (a device that never loaded the list records nothing until the baseline lands), so `useTodoSeen().save` takes `TodoSeen | null`.
- Settings: `parseTodoSeen` replaces `isTodoSeen`; a malformed `opened` / `unread` drops the whole value (null, then the next load re-baselines).
- Read-only sheet (`TodoView`) is looked up by id from the listed items, so a tick from it shows at once. Edit (from it or the photo viewer) closes it and the viewer before opening `TodoSheet`.
- `pnpm e2e` 2026-10-29 ~00:10: every to-do test green. `pending.spec.ts` (2) and `solid-food.spec.ts` (2) fail the same on develop at d91b0c8 (run just after midnight); `children.spec.ts` and `dashboard.spec.ts` failed once and passed on rerun.
- Emulator (emulator-5554, release APK): Classic day, Night and Ribbon checked; thumbnail keeps New; photo → viewer → back returns to the sheet; Android back closes the sheet; tick / untick in place; Mark unread brings New and the badge back.
