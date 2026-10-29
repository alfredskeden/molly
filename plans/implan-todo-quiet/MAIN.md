# Turning off an item's reminder on this phone

GitHub issue #36. Builds on the to-do list (`plans/implan-todo/`) and the read-only sheet from issue #30 (`plans/implan-todo-read-only/`). This branch is stacked on #30: see `NOTES.md` "Where this sits" before opening the PR. Decisions and their reasons: `NOTES.md` "Decided (2026-10-29)".

## Outcome

- In the edit sheet on Android, a dated item has a **"Remind me" switch** where the reminder line is today. On by default, so existing items keep their reminders. Off: the subtitle reads "No reminder on this phone", and after Save this phone sets no alarm, its list row has no bell and the read-only sheet says "No reminder".
- **Only this phone.** The other parent's phone still reminds. Nothing about the item changes in Baby Buddy; the date and time stay.
- Works for items with a time and for date-only items.
- Turning it on again brings the reminder back (1 h before, or 19:00 the evening before), as long as that moment is still ahead.
- The web is unchanged: no reminders, no switch.

## How it's stored

A device setting, **`settings.todoQuiet: number[]`**: the note ids this phone won't remind about. Same life as `settings.todoSeen`: default `[]`, a malformed value reads as `[]`, dropped on sign-out, lost on reinstall.

- `reminderAt(item, now, quiet)` returns null when `item.id` is in `quiet`, so every caller (the list's bell, both sheets, `todoReminderNotifications`) follows without its own check.
- Saving records it: the item's id goes in when the switch is off and the item has a date, and comes out otherwise. So removing the date forgets it. A new item is recorded once Baby Buddy returns its id; guesses (negative ids) never are.
- `pruneQuiet(items, quiet)` keeps the list small, run where `pruneSeen` runs: drops ids missing from the fetched list at or below its highest id, and ids listed without a date. Keeps done items, so unticking keeps the reminder off. Same array when nothing changes.
- `todoReminderNotifications` leaves quiet items out of `keep` as well as `schedule`, so a reminder that already rang here is cleared.

## Where it shows

| Place | Reminder on | Reminder off (this phone) |
| --- | --- | --- |
| Edit sheet (Android, a date chosen) | Switch on, subtitle "This phone reminds you … at …" or "Too late for a reminder" | Switch off, subtitle "No reminder on this phone" |
| Read-only sheet (Android) | Bell + the reminder line (as now) | Struck bell + "No reminder" (open, dated items) |
| List row (Android) | Bell while the reminder is ahead | No bell |
| Other parent's phone | Unchanged | Unchanged |
| Web | No switch, no line, no bell (as now) | Same |

## Pieces of code

- Core `packages/core/src/todo.ts`: `reminderAt(item, now, quiet)`, `quietFor(quiet, id, on)` (set or clear one id), `pruneQuiet`.
- Settings `apps/molly/src/storage/types.ts`: `Settings.todoQuiet`, default, parse, sign-out.
- `features/todo/queries.ts`: `useTodoQuiet()` (read + save, like `useTodoSeen`); `useTodoBadge` also prunes it; `useSyncTodoReminders` re-syncs when it changes.
- Sheet model `features/todo/sheet-model.ts`: `TodoDraftState.quiet`, `todoDraftOf(item, now, quiet)`, `reminderLine`.
- Sheets: `TodoSheet.tsx` (switch), `TodoView.tsx` (off line), `use-todo-writes.ts` (`TodoSave.quiet`, recorded after the save), the row bell in `app/(main)/todo.tsx`.
- Notifications: `notification/model.ts` `todoReminderNotifications(items, quiet, now)`; `syncTodoReminders(items, quiet)` in `sync.android.ts` and the web no-op `sync.ts`; the widget refresh passes `current.settings.todoQuiet`.
- Glyph: `notifications_off` in `apps/molly/src/theme/symbols.ts`.
- Theme rules as in `CLAUDE.md`: semantic classes, `Text` from `@/components/ui`, the existing `ToggleRow`.

## Steps

1. [x] **Core rule (refactor first, then TDD, `packages/core/src/todo.test.ts`).** Pull the bare reminder moment out of `reminderAt` (`reminderMoment(due, now)`), tests green. Then `reminderAt(item, now, quiet)`: null for a quiet timed and a quiet date-only item, unchanged for others (fix callers to pass `[]` for now so `pnpm typecheck` stays green). `quietFor`: adds once, removes, ignores guesses. `pruneQuiet`: the rules above, same array when nothing changes. Update `reminderAt`'s doc comment.
2. [x] **Settings (TDD, `apps/molly/src/storage/settings.test.ts`).** `todoQuiet` round-trips, a malformed value reads as `[]`, sign-out drops it. Update the `Settings` and `settingsAfterSignOut` doc comments.
3. [x] **Sheet model and notifications (TDD).** `sheet-model.test.ts`: `reminderLine` takes `{ due, quiet }` with no stub `TodoItem` (via `reminderMoment`); a new draft is on; `todoDraftOf` reads quiet from the ids; the quiet line is "No reminder on this phone", no line without a date. `notification/model.test.ts`: a quiet item is neither scheduled nor kept, others unaffected; update the doc comment.
4. [x] **Wiring.** `useTodoQuiet` in `queries.ts` (share the settings-field save with `useTodoSeen` if they stay alike); `useTodoBadge` prunes `todoQuiet`; `useSyncTodoReminders` and `widget/refresh.ts` pass it to `syncTodoReminders` (and the comments say so). `TodoSave.quiet`; `save` records `quietFor(quiet, id, quiet && due !== null)` after Baby Buddy answers. Row bell and `TodoView` pass the ids; `TodoView` uses `reminderLine` and shows `notifications_off` + "No reminder" for a quiet open dated item on Android. `TodoSheet`: on Android with a date, a `ToggleRow` "Remind me" with `reminderLine` as subtitle replaces the line. Add the `notifications_off` path (outlined, as `notifications`) to `symbols.ts`.
5. [x] **E2E (`e2e/tests/todo.spec.ts`).** Extend "…the web shows no reminder bells" (~378): the web edit sheet of a dated item has no "Remind me" switch and no reminder line. That's all the web can show; the rest is Vitest and the emulator.
6. [ ] **Emulator check** (emulator-5554 only, never the developer's phone): the checklist in `TEST_STRATEGY.md` "Manual".
7. [ ] **Wrap-up.** `CLAUDE.md` to-do bullet: Android reminders skip items in `settings.todoQuiet` (per device, "Remind me" in the edit sheet). In `plans/implan-todo/` point `MAIN.md:37` ("Reminder time") and `MENTAL_MODEL.md` "Reminders" at this plan. `plans/README.md` row to Done. Record what was confirmed in `NOTES.md`. `pnpm check` and `pnpm e2e` green. Run the cleanup sweep on the diff. Every box in `TEST_STRATEGY.md` ticked. Rebase onto `develop` once PR #39 is merged, then open the PR with `--base develop`.

## Out of scope

- Turning a reminder off for both phones (a shared tag): decided against.
- Choosing the reminder time (1 h before / 19:00 stay fixed).
- Due date and time pickers: issue #34.
- Reminders on the web, the widget or the lock-screen timer notification.
