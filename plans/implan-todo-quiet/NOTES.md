# Notes: turning off an item's reminder on this phone

## Where this sits

- Spec: GitHub issue #36. Builds on the to-do list (`plans/implan-todo/`) and on issue #30's read-only sheet (`plans/implan-todo-read-only/`, PR #39).
- **Stacked on #30.** This branch (`plan/issue-36-todo-quiet`) starts from `plan/issue-30-todo-read-only`, which wasn't in `develop` when this plan was written. The code it changes (`TodoView`, `pruneSeen`, the row's `Open, …` label) only exists there. Wait for PR #39 to merge, then rebase onto `develop` before opening this plan's PR (`gh pr create --base develop`).

## Decided (2026-10-29)

1. **Per phone, not shared.** Which items are quiet is a device setting, `settings.todoQuiet: number[]` (note ids), next to `settings.todoSeen`. The other parent's phone still reminds ("I don't need reminding, my partner does"). Nothing changes in Baby Buddy: no tag, `saveTags` untouched. Gone with sign-out (the ids belong to one Baby Buddy) and with a reinstall.
2. **All dated items**, with a time and date-only alike.
3. **A "Remind me" switch in the edit sheet**, saved with Save, Android only, shown when a date is chosen. Subtitle: the current line when on ("This phone reminds you today at 14:00" / "Too late for a reminder"), **"No reminder on this phone"** when off. The read-only sheet shows "No reminder" (struck bell) for a quiet open dated item; no switch there.
4. **No switch on the web** (the web has no reminders). The web's own `todoQuiet` stays empty; nothing the web does touches a phone's setting.
5. **Removing the date forgets the quiet state**: saving an item with no date drops its id from `todoQuiet`. Pruning also drops ids of items that are listed without a date (the other parent removed it).
6. No `packages/api` integration test: no API change at all.

## Design choices made while planning (not asked; change if wrong)

- `reminderAt(item, now, quiet)` takes the quiet ids as a required argument, so `tsc` finds every caller. `reminderLine` gets a `quiet` flag.
- The id is recorded after Baby Buddy returns it, as `savedBy` does for a new item, so a new item can be saved quiet. Guesses (negative ids) are never recorded.
- Pruning keeps done items (unticking brings the quiet state back, like `opened` in `pruneSeen`) and never drops an id above the highest fetched one (a save the list hasn't fetched yet).
- The app re-syncs the alarms when `todoQuiet` changes, not only when the list does, so Save takes effect without waiting for a fetch.

## Code as found (branch `plan/issue-30-todo-read-only` at dbbfff4)

- Core `packages/core/src/todo.ts`: `reminderAt(item, now)` (~line 265); `TodoSeen`, `savedBy`, `openedBy`, `pruneSeen` show the per-device pattern to copy (`topId`, same object when nothing changes). Tests `todo.test.ts` "reminders" (~303).
- Settings `apps/molly/src/storage/types.ts`: `Settings.todoSeen` and its doc comment (~48), `DEFAULT_SETTINGS`, `parseSettings` (`parseTodoSeen` ~198, `isIds`), `settingsAfterSignOut` (spreads `DEFAULT_SETTINGS`, so a new field is dropped on sign-out without code; only its comment and test change). Tests `storage/settings.test.ts` "the to-do seen mark" (~409) and "signing out" (~438).
- `features/todo/queries.ts`: `useTodoSeen` (settings read + `updateSettings` + `setQueryData(['settings'])`), `useTodoBadge` (first load + `pruneSeen`), `useSyncTodoReminders` (syncs on `items` only).
- Sheet model `features/todo/sheet-model.ts`: `TodoDraftState`, `todoDraftOf`, and `reminderLine(due, now)`, which builds a stub `TodoItem` to call `reminderAt`. Tests `sheet-model.test.ts` (~81).
- Callers of the reminder rule: `TodoSheet.tsx:83`, `TodoView.tsx:40` (`reminderAt` then `reminderLine`), row bell `app/(main)/todo.tsx:222`, `todoReminderNotifications(items, now)` (`notification/model.ts:218`, tests `model.test.ts` ~725–780) → `syncTodoReminders(items)` (`notification/sync.android.ts:119`, web no-op `sync.ts:13`) ← `useSyncTodoReminders` and the widget refresh `widget/refresh.ts:44` (has `current.settings`).
- `todoReminderNotifications` returns `keep` = every open dated item; the native side keeps an already rung reminder for those. A quiet id must leave `keep` too, so turning it off clears one that already rang.
- Writes: `use-todo-writes.ts` `save(TodoSave, item?)` calls `saveSeen(savedBy(…, saved.id))` after a new item; the quiet setting is written the same way.
- Glyphs: `theme/symbols.ts` has `notifications` but no `notifications_off`; add the Material Symbols path.
- E2E `e2e/tests/todo.spec.ts` ~378: "a row without a photo has no photo slot, and the web shows no reminder bells".

## Cleanup sweep (planning, per-phone design)

- **Refactor first:** one reminder line for every caller. Core gets the bare moment (`reminderMoment(due, now)` or similar) and `reminderAt` builds on it; `reminderLine` uses that instead of a stub `TodoItem`, and `TodoView` uses `reminderLine` instead of `reminderAt` + `reminderLine` → step 1/3.
- **Duplication to avoid:** `useTodoQuiet` would repeat `useTodoSeen`'s read-and-update body. Share one small settings-field helper in `queries.ts` if both stay that alike; otherwise leave them → step 4.
- **Stale docs/comments:** `reminderAt`, `todoReminderNotifications` and `syncTodoReminders` doc comments; `Settings` doc comment and `settingsAfterSignOut`'s ("the to-do seen mark"); `widget/refresh.ts` `refreshTodoReminders` comment; `CLAUDE.md` to-do bullet; `plans/implan-todo/MAIN.md:37` and `MENTAL_MODEL.md` "Reminders" (point here) → steps 1, 2, 4, 7.
- Nothing becomes unused: no dependency, flag, asset or setting goes away. The earlier shared-tag draft's `saveTags` fix is not needed (no tag).
- Spotted, not in scope: none.

## Built (2026-10-29)

- Core: `reminderMoment(due, now)` is the bare rule; `reminderAt(item, now, quiet)` adds done/undated/quiet. `quietFor(quiet, id, on)` and `pruneQuiet(items, quiet)` return the same array when nothing changes.
- `reminderLine({ due, quiet }, now)` uses `reminderMoment`, no stub `TodoItem`. `TodoView` keeps its `reminderAt` gate (no line once the moment passed, as before) and shows the struck bell + "No reminder" for a quiet open dated item.
- `useTodoSeen` and `useTodoQuiet` share one `useSaveSetting(key)` in `queries.ts`.
- `todoReminderNotifications(items, quiet, now)` filters quiet ids out of `open`, so they leave `keep` too.
- Save records `quietFor(current, saved.id, quiet && due !== null)` after Baby Buddy answers, for edits and new items alike (a guess never reaches it: `write` returns Baby Buddy's note).
- Small extra: saving with "Remind me" off doesn't trigger the notification permission prompt (`todo.tsx` `onSave`), since nothing will ring.
- Glyph `notifications_off`: outlined rounded path from `@material-symbols/svg-400@0.47.6/rounded/notifications_off.svg` (the same package's `notifications.svg` matches the existing outlined path).
- `pnpm test` at the root includes `packages/api`'s integration suite, which needs the shared Baby Buddy on :4778.

## Confirmed (2026-10-29)

- `pnpm check` green (boundaries, typecheck, lint, core 1252 + app 1342 Vitest, `packages/api` 111 against Baby Buddy v2.11, web bundle). `pnpm e2e`: 255 passed.
- Emulator-5554, release APK, test Baby Buddy, Ribbon theme in Night and Day:
  - New "Vaccination" today 11:45 with "Remind me" off: subtitle "No reminder on this phone"; no permission prompt; no bell on the row; read-only sheet shows the struck bell + "No reminder"; the date stays. A control "Checkup" at the same time kept its bell and rang at 10:45; "Vaccination" never rang.
  - Both notes in Baby Buddy have the same tags (`molly-todo`, `To-do: Appointments`, `molly-todo-due`): nothing shared changed.
  - Turning "Remind me" off on "Checkup" after it rang (subtitle then "Too late for a reminder") cleared the notification on Save.
  - Date-only "Pharmacy" tomorrow, off: no alarm (`dumpsys alarm`); on again: the 19:00 alarm is back. Each reminder is a pair of `TODO_ALARM` alarms (exact + windowed).
  - Quiet, then "No date" and Save, then Tomorrow again: the switch is on.
  - Quiet survives a force-stop and relaunch (the foreground refresh set no alarm; "No reminder" still shown). Android back closes the edit sheet without saving.
  - Not run on the emulator: sign-out and sign-in bringing reminders back (Vitest covers `settingsAfterSignOut`; signing out the shared emulator session was avoided).
- PR: opened stacked on `plan/issue-30-todo-read-only` (PR #39 not merged yet) instead of rebasing onto `develop`; GitHub retargets it to `develop` when #39 merges.

## Cleanup sweep (wrap-up)

- Nothing to remove: no flag, setting, asset or dependency became unused. The planned refactors are in (`reminderMoment`, no stub item, shared settings save).
- Spotted, not in scope: none.

## Open

- None.
