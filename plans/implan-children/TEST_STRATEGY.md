# More than one child: Definition of Done

Done when every item below is true, apart from the look review and the device checks, run after handover. Method as in the root `CLAUDE.md`:
- Unit TDD for logic in `packages/core`, `src/storage/`, `src/widget/model.ts` and `src/notification/model.ts` (Vitest, Given / When / Then, zero → one → many, then boundaries and errors).
- Integration tests for `packages/api` against the Baby Buddy container.
- Playwright against the built web image for screens and flows.
- Emulator checks for Android-only behaviour (`emulator-5554`).
- Manual review for looks.

Specs that need several children create them ad hoc and delete them afterwards, as `dashboard.spec.ts` does today; `e2e/seed.py` keeps one child.

## Nothing regresses

- [x] `pnpm check` green; the web bundle still has no widget or notification-module code.
- [x] Every Playwright spec passes. The only ones changed are those whose behaviour this plan replaces: "Which child?" in `onboarding.spec.ts` and the Settings child switch in `dashboard.spec.ts`.
- [x] One child: dashboard, widgets, notifications and the Vitamin D reminder behave as before. The header shows the name, age and one avatar.
- [x] Settings stored by the current release (single `childId`, top-level `napWindow` / `bottle` / `vitaminDReminder`) open with the same child, nap window, bottle and reminder.

## Domain (unit, `packages/core`)

Age label:
- [x] Days old / weeks / months / "1 year 1 month" / "2 years 4 months"; singular and plural right; exactly on a birthday; birth date today.

Shown children and next child:
- [x] No prefs → every child shown, in Baby Buddy's order.
- [x] Hidden children left out; a child with no prefs counts as shown.
- [x] `nextChild` from the last wraps to the first; with one shown child, returns it.
- [x] Child on screen hidden or gone → the first shown child.

Defaults:
- [x] Default hue = position mod 4 (the fifth child gets the first colour).

Status line:
- [x] Sleep running → `Sleeping 42m`; awake with a last sleep → `Awake 1h 25m`; nothing logged → no status; hours and minutes at the boundaries (59m, 1h 00m).

Onboarding:
- [x] One child → picked without asking; several → ask; the picked set keeps Baby Buddy's order, and the first picked opens first.

## Settings and session (unit, `src/storage/`)

- [x] `children` prefs parse; broken entries fall back to defaults per field.
- [x] Old single-child shape migrates into `children[childId]`.
- [x] Sign-out drops `children` and `childId`, keeps theme, notifications, haptics, History filter.

## API (integration, container)

- [x] `listTimers({ name: 'molly:sleep' })` returns running sleep timers of two children at once, and nothing for a stopped one. Recorded in `implan-molly/NOTES.md`.

## Widget and notification models (unit)

- [x] The snapshot carries its child; a tap runs `runIntent` with the snapshot's child and that child's nap window and bottle, even after the app switched child.
- [x] Notification content: two children sleeping → two sleep notifications, each with its child and the child's name in the title. One shown child → no names. A hidden child → none.
- [x] A notification action runs with the child from its extras.
- [x] Vitamin D: a stop of child A with A's switch off and B's on → no check. With A's on → A's reminder only. Given now logs for the reminder's child. Refresh clears each child's reminder on its own.

Widgets pinned to a child (steps 8–9):
- [x] Pins parse (garbage → none; bad entries dropped). A widget with no pin or `follow` draws the app's child; a pin to a shown child draws that child's snapshot; a pin to a hidden or gone child draws the app's child.
- [x] The refresh fetches a snapshot per pinned, shown child besides the app's; none twice; none for a hidden child. An answer for a pinned child updates its snapshot. Caches without `pinned` load with none.
- [x] "Whose widget?" choices: Follow the app first, then every shown child; one shown child → no question.
- [x] Notification avatar: several shown children → each notification has its child's initial and colour; one child → none. Reminder: `Vitamin D` / `Ella · Vitamin D`, `Not given today`, Given now; pending and error lines still replace the text.

## Web flows (Playwright)

- [x] Two children: the header shows the first child's name and age. Tapping the stack opens the sheet with both, "Showing" on the current one. Picking the other switches the header, the hero and Recent, and the toast says "Showing <name>".
- [x] Pull (mouse drag down) on the stack past half → the next child. Less than half → springs back, no switch.
- [x] Three children: the stack shows three avatars; pulling steps through all three and back to the first.
- [x] Another child's sleep running (started through the API) → the strip shows "<name> is sleeping"; Switch shows that child with the sleep running in the hero.
- [x] Settings: Children card lists every child. Hiding one drops it from the stack and sheet. The last shown child can't be hidden. A different nap window on each child is kept per child (reload, switch, check).
- [x] Onboarding with two children: "Which children?" with both ticked. Unticking one and continuing → only the other in the stack, and the unticked one is Hidden in Settings. Unticking both → button disabled "Pick at least one".
- [x] Switching back to a child shows its data at once from the cache (no empty state while refetching).

## Emulator (`emulator-5554`, test Baby Buddy seeded, a second child created)

- [x] Both children sleeping → two sleep notifications with names. Stop on the second child's notification stops that child's timer in Baby Buddy, and the other keeps running.
- [x] The widget shows the app's child on screen with its badge. Switching child in the app redraws it. A widget Stop after switching in the app acts on the child the widget showed.
- [x] Vitamin D on for one child only → a stop of that child reminds, and a stop of the other doesn't. Given now logs for the right child.
- [x] Hiding a child with a running sleep removes its notification.
- [x] `adb shell dumpsys notification`: channels unchanged (`molly.timers`, `molly.reminders` at `IMPORTANCE_DEFAULT`, silent).

Pinned widgets (steps 8–10):
- [ ] Adding a widget with two children asks "Whose widget?"; pick Otto → it draws Otto whatever the app shows, and Start on it starts Otto's sleep. A Follow widget next to it switches with the app.
- [x] Long-press → reconfigure changes a widget's child. Hiding a pinned child makes its widget follow the app.
- [x] With one child, adding a widget doesn't ask.
- [x] Notifications show the child's initial as their icon with two children; newest timer on top. The reminder reads `Otto · Vitamin D` / `Not given today` with Given now / Later; Later removes it.

## Look (manual, web and emulator, day and night, largest font, two themes)

- [ ] Header, stack, strip, sheet and toast match the design. The stack animation is smooth, and the four child colours read well in day and night.
- [ ] Settings Children card, child screen and onboarding match the design and fit at the largest font.
- [ ] The widget badge and the notification titles with names read well.

## Wrap up

- [x] Root `CLAUDE.md` updated (Where things stand, Architecture). `implan-molly/MAIN.md` points the multi-child outline here.
- [x] `NOTES.md` has the findings and what's left.

## Device checks (a physical Android 16+ phone, after handover)

- [ ] Two children on a real Baby Buddy: switching, the strip, and two sleep notifications on the lock screen.
- [ ] Widget after switching child in the app.
