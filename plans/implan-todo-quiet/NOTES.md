# Notes: turning off an item's reminder

## Where this sits

- Spec: GitHub issue #36. Builds on the to-do list (`plans/implan-todo/`) and on issue #30's read-only sheet (`plans/implan-todo-read-only/`, PR #39).
- **Stacked on #30.** This branch (`plan/issue-36-todo-quiet`) starts from `plan/issue-30-todo-read-only`, which wasn't in `develop` when this plan was written. The code it changes (`TodoView`, the row's `Open, …` label) only exists there. Wait for PR #39 to merge, then rebase onto `develop` before opening this plan's PR (`gh pr create --base develop`).

## Decisions to confirm

Recommended answers, taken so the plan could be written without the developer. Each says the alternative; change the plan if the developer picks it.

1. **Shared, as a tag on the note** (`molly-todo-quiet`): both phones go quiet, it survives reinstall and shows the same on the web. Reason: matches "this item has no reminder", needs no per-device storage or pruning, and fits how every other to-do state (done, due, label) is kept.
   *Alternative:* per phone, a device setting (`settings.todoQuiet: number[]`, pruned like `todoSeen`), so one parent can still be reminded. Then the tag work below goes away and the control's copy becomes "This phone won't remind you".
2. **Timed and date-only items alike.** One tag, one switch; `reminderAt` returns null for a quiet item of either kind. Splitting by kind would only add a rule to explain.
   *Alternative:* timed items only (as the issue first asked); date-only items keep their 19:00 reminder and show no switch.
3. **Control: a "Remind me" switch (`ToggleRow` from `components/ui.tsx`) in the edit sheet, replacing the reminder line**, shown on Android when a date is chosen. Subtitle: the current line when on ("This phone reminds you today at 14:00", or "Too late for a reminder"), "No reminder on either phone" when off. Saved with Save, like the date.
   The read-only sheet (`TodoView`) shows the state but has no switch: "No reminder" with a struck bell for a quiet dated item.
   *Alternatives:* an × on the reminder line (smaller, but no way back on without a second control); or the switch in the read-only sheet too, saved at once like the tick.
4. **The web has no switch**, as it has no reminder line today (`hasNotifications` is false), but a web edit **keeps** the item's quiet state, since the sheet's draft carries it.
   *Alternative:* show the switch on the web too (it would change the Android phones' reminders from the web).
5. **Removing the date drops the quiet tag.** "No reminder" belongs to the date; giving the item a date again later starts with the reminder on.
   *Alternative:* keep the tag through undated edits.
6. **No new `packages/api` integration test.** No new client call; a new tag name on a note PATCH is already confirmed (see below), and Playwright checks the round trip through a real Baby Buddy.
   *Alternative:* add a `notes.int.test.ts` case for `molly-todo-quiet` anyway.

## Baby Buddy facts this relies on

From `plans/implan-molly/NOTES.md` "Confirmed against the live API" and `plans/implan-todo/NOTES.md`:

- A tag name that doesn't exist yet is created by naming it on a note (needs `core.add_tag`, which parents get in setup step 10, `docs/setup.md`). The daily `molly-done-YYYY-MM-DD` tags already rely on this, so `molly-todo-quiet` needs no setup change.
- Tags are sent and returned as names; a JSON PATCH of `tags` keeps the photo.
- `?tags=molly-todo,molly-todo-done` is an OR filter: a quiet item still has `molly-todo` or `molly-todo-done`, so it still lists.
- Tag names are case-sensitive: always write `molly-todo-quiet` exactly.

## Code as found (branch `plan/issue-30-todo-read-only` at dbbfff4)

- Core `packages/core/src/todo.ts`: `todoItems` (tags → `TodoItem`), `saveTags({ label, due }, before)` (rebuilds state, label and due tags, keeps others: an unknown `molly-todo-quiet` would currently be kept forever, even after an undated save), `reminderAt(item, now)` (~line 265). Tests `todo.test.ts` "reminders" (~303) and `saveTags` (~205–225).
- `TodoDraft` (core) is `{ label, due }`; the app's `TodoSave` (`features/todo/use-todo-writes.ts:23`) passes it to `saveTags` (line 83).
- Sheet model `features/todo/sheet-model.ts`: `TodoDraftState` and `todoDraftOf`, and `reminderLine(due, now)`, which builds a stub `TodoItem` to call `reminderAt`. Tests `sheet-model.test.ts` (~81).
- Callers of the reminder rule: `TodoSheet.tsx:83` (`reminderLine`), `TodoView.tsx:40` (`reminderAt` then `reminderLine`), the row's bell `app/(main)/todo.tsx:222`, `todoReminderNotifications` (`notification/model.ts:218`, tests `model.test.ts` ~725–780) → `syncTodoReminders` (`notification/sync.android.ts:119`).
- `todoReminderNotifications` returns `keep` = every open dated item; the native side keeps an already rung reminder for those. A quiet item must leave `keep` too, so turning the reminder off also clears one that has already rung.
- Glyphs: `theme/symbols.ts` has `notifications` (filled and outlined) but no `notifications_off`; add the Material Symbols path.
- E2E `e2e/tests/todo.spec.ts`: `seed(note, tags, time)` and `todoNotes()` helpers talk to Baby Buddy directly; "a row without a photo has no photo slot, and the web shows no reminder bells" (~378). The e2e cleanup deletes only `To-do: ` tags; `molly-*` tags stay, like the done-day ones.

## Cleanup sweep (planning)

- **Refactor first:** one reminder line for every caller. `reminderLine` takes the item's due and quiet state (no stub `TodoItem`), and `TodoView` uses it instead of calling `reminderAt` itself → step 2.
- **Fix with the change:** `saveTags` must drop `molly-todo-quiet` unless the draft says quiet (today it would keep it as a foreign tag) → step 1.
- **Stale docs/comments:** `reminderAt`'s and `todoReminderNotifications`' doc comments ("every open dated item"); `CLAUDE.md` to-do bullet; `plans/implan-todo/MAIN.md:37` and `MENTAL_MODEL.md` "Reminders" (point to this plan) → steps 1, 3, 6.
- Nothing becomes unused: no dependency, flag, asset or setting goes away.
- Spotted, not in scope: the e2e cleanup never deletes `molly-*` tags, so they pile up in the test Baby Buddy (harmless, it's wiped by `pnpm bb:down`).

## Open

- The six decisions above, until the developer confirms them.
