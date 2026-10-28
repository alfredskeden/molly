# Turning off an item's reminder

GitHub issue #36. Builds on the to-do list (`plans/implan-todo/`) and the read-only sheet from issue #30 (`plans/implan-todo-read-only/`). This branch is stacked on #30: see `NOTES.md` "Where this sits" before opening the PR.

The answers below are recommendations still waiting for the developer: `NOTES.md` "Decisions to confirm". If one changes, update this file, `MENTAL_MODEL.md` and `TEST_STRATEGY.md` together.

## Outcome

- In the edit sheet on Android, a dated item has a **"Remind me" switch** where the reminder line is today. On by default, so existing items keep their reminders. Off: the subtitle reads "No reminder on either phone", and after Save neither phone sets the alarm, the list row has no bell and the read-only sheet says "No reminder".
- The date and time stay as they were. Only the reminder goes.
- Works for items with a time and for date-only items.
- Turning it on again brings the reminder back (1 h before, or 19:00 the evening before), as long as that moment is still ahead.

## How it's stored

A tag on the note, **`molly-todo-quiet`**, next to `molly-todo-due` / `molly-todo-day`. Shared: both phones read it from the list they fetch, so both go quiet, and it survives a reinstall. Baby Buddy creates the tag the first time a parent saves a quiet item (parents have `core.add_tag`).

- `todoItems` reads it into `TodoItem.quiet: boolean`.
- `reminderAt` returns null for a quiet item, so every caller (the list's bell, the sheets, `todoReminderNotifications`) follows without its own check.
- `saveTags` writes it only when the draft is quiet **and** has a date; otherwise it drops it. Removing the date therefore resets the reminder to on.
- `tickTags` / `untickTags` keep it (they keep every non-state tag already).
- `todoReminderNotifications` leaves quiet items out of `keep` as well as `schedule`, so a reminder that already rang is cleared when the item goes quiet.

## Where it shows

| Place | Reminder on | Reminder off |
| --- | --- | --- |
| Edit sheet (Android, a date chosen) | Switch on, subtitle "This phone reminds you … at …" or "Too late for a reminder" | Switch off, subtitle "No reminder on either phone" |
| Read-only sheet (Android) | Bell + the reminder line (as now) | Struck bell + "No reminder" (only on a dated, open item) |
| List row (Android) | Bell while the reminder is ahead | No bell |
| Web | No switch, no line, no bell (as now) | Same; a web edit keeps the quiet tag |

## Pieces of code

- Core `packages/core/src/todo.ts`: `QUIET_TAG`, `TodoItem.quiet`, `TodoDraft.quiet`, `todoItems`, `saveTags`, `reminderAt`.
- Sheet model `apps/molly/src/features/todo/sheet-model.ts`: `TodoDraftState.quiet`, `todoDraftOf`, `reminderLine`.
- Sheets: `TodoSheet.tsx` (switch), `TodoView.tsx` (off line), `use-todo-writes.ts` (`TodoSave.quiet` into `saveTags`).
- Notifications: `apps/molly/src/notification/model.ts` `todoReminderNotifications`.
- Glyph: `notifications_off` in `apps/molly/src/theme/symbols.ts`.
- Theme rules as in `CLAUDE.md`: semantic classes, `Text` from `@/components/ui`, the existing `ToggleRow`.

## Steps

1. [ ] **Core rule (TDD, `packages/core/src/todo.test.ts`).** `QUIET_TAG = 'molly-todo-quiet'`; `todoItems` sets `quiet` (false without the tag); `reminderAt` is null for a quiet timed item and a quiet date-only item, unchanged otherwise; `saveTags` with `quiet: true` and a date adds the tag once, with `quiet: false` or no date drops a tag the item had; `tickTags` / `untickTags` keep it. Update `reminderAt`'s doc comment.
2. [ ] **Sheet model (refactor first, then TDD, `features/todo/sheet-model.test.ts`).** Refactor `reminderLine` to take `{ due, quiet }` without building a stub `TodoItem` (tests green), and make `TodoView` use it instead of `reminderAt` + `reminderLine`. Then: `TodoDraftState.quiet` (false for a new item), `todoDraftOf` reads it from the item, and `reminderLine` returns "No reminder on either phone" for a quiet draft with a date (still null without one).
3. [ ] **Notifications (TDD, `notification/model.test.ts`).** A quiet item is neither scheduled nor kept; the doc comment says "every open dated item with its reminder on".
4. [ ] **Sheets.** `TodoSave` carries `quiet`; `save` passes it to `saveTags`, and the optimistic copy gets the same tags. `TodoSheet`: on Android with a date, a `ToggleRow` "Remind me" with `reminderLine` as subtitle replaces the line; the web shows nothing new but saves the draft's `quiet`. `TodoView`: for a quiet open dated item on Android, the `notifications_off` glyph and "No reminder". Add the `notifications_off` path (outlined, 0 fill, as `notifications`) to `symbols.ts`.
5. [ ] **E2E (`e2e/tests/todo.spec.ts`).** An item seeded with `molly-todo-quiet` and a date keeps the tag after its text is edited on the web; removing its date on the web drops the tag; the web edit sheet has no "Remind me" switch.
6. [ ] **Emulator check** (emulator-5554 only, never the developer's phone): the checklist in `TEST_STRATEGY.md` "Manual".
7. [ ] **Wrap-up.** `CLAUDE.md` to-do bullet: reminders skip items tagged `molly-todo-quiet`. In `plans/implan-todo/` point `MAIN.md:37` ("Reminder time") and `MENTAL_MODEL.md` "Reminders" at this plan. `plans/README.md` row to Done. Record what was confirmed in `NOTES.md` (and Baby Buddy facts in `plans/implan-molly/NOTES.md` if anything new turns up). `pnpm check` and `pnpm e2e` green. Run the cleanup sweep on the diff. Every box in `TEST_STRATEGY.md` ticked. Rebase onto `develop` once PR #39 is merged, then open the PR with `--base develop`.

## Out of scope

- A per-phone reminder choice (see decision 1 in `NOTES.md`).
- Choosing the reminder time (1 h before / 19:00 stay fixed).
- Due date and time pickers: issue #34.
- Reminders on the web, the widget or the lock-screen timer notification.
