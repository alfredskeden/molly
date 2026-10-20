# Likely sleep panel: Definition of Done

Done when every item below is true, apart from the physical-phone checks at the end, run after handover. Method per the root `CLAUDE.md`: unit TDD for pure logic in `packages/core` and the app's model files (Vitest, Given / When / Then, zero → one → many, then boundaries and errors); Playwright against the web image for the panel flow; emulator checks for Android-only behaviour (`emulator-5554`, test Baby Buddy seeded); manual review for looks.

## Nothing regresses

- [x] `pnpm check` is green; the web bundle has no widget or notification-module code (the reminder's native wrapper is `.android.ts` with a no-op sibling).
- [ ] Every existing Playwright spec passes, updated only where the window row's tap now opens the panel instead of the Why sheet.
- [x] Tapping a logged sleep, feed or mark still opens the editor; the editor and the panel never show together.
- [x] The Vitamin D reminder still posts, cancels and logs as before; a nap reminder for the same child never replaces it.
- [ ] Widgets, the timer notifications and Live Updates are unchanged.

## Panel content (unit, `packages/core`)

- [x] Next nap → title number matches `windowRow`'s (`napsSoFar` + 1, a running nap counted); bedtime → bedtime.
- [x] Range and when-words: before (`in 1h 16m`), open (`20m left`), past (`14m ago`), same as the row.
- [x] Yesterday / Usually for a nap: start clock and length of the same slot; Usually is the median start and median length; bedtime gives start only.
- [x] Zero past days → no Yesterday, no Usually; slot missing yesterday but present earlier → Usually only.
- [x] Later list: the unskipped sleeps after the chosen one, in order; chosen is the last → empty; skipped ones left out.
- [x] A later ghost chosen (nap 3) → its own number, and only bedtime after it.

## Theme words (unit, `apps/molly`)

- [x] Every theme in `COPY` has every panel label; Classic reads as design 2b and Terminal as frame 3a word for word.
- [x] `{n}` and `{t}` fill in for every theme; no label contains a time or duration of its own.
- [x] Playful labels off → Classic words in every theme; the spoken label is always Classic's.

## Reminder rule (unit)

- [x] No stored reminder → nothing scheduled.
- [x] Stored for nap 2, plan still has nap 2 → scheduled at its start; nap 2's start moved after a log → the new start.
- [x] Any sleep running or started for that child since it was set → cancelled.
- [x] That nap skipped, or no longer in the plan, or the day window it was set in is over → cancelled.
- [x] Start already passed when set → not allowed (bell disabled).
- [x] Setting a reminder on another sleep of the same child replaces the first; reminders of two children are independent.
- [x] Notifications not allowed → nothing scheduled, stored reminder cleared.

## Panel flow (Playwright, web)

- [x] Window row tap → panel for the next sleep, tiles gone, row gone.
- [x] Tapping a later ghost → panel for that sleep, its ghost filled.
- [x] ✕, tapping the same ghost, and opening Today / Add each bring the tiles back.
- [x] Why › opens the Why sheet (next sleep only; absent for a later one).
- [x] Skip from the panel skips the next nap, toast with Undo, panel closes; no Skip on bedtime or a later sleep.
- [x] Start sleep from the panel starts the sleep and closes the panel.
- [x] No bell on web.

## Emulator (`emulator-5554`)

- [x] Android Back closes the panel before anything else.
- [x] Bell with notifications allowed → set (filled); tapped again → removed.
- [x] Bell with notifications not allowed → the permission prompt; allowed → set; refused → nothing set, bell off.
- [ ] Reminder fires near the window start (set one a few minutes ahead) on `molly.reminders`, silent, on the lock screen, plain words, child's initial with several shown children.
- [ ] Start sleep from the reminder → pending line, sleep running in Baby Buddy and the app; Dismiss closes it.
- [x] A logged nap that moves the window → the reminder moves (checked via `adb shell dumpsys alarm`).
- [ ] Starting a sleep (app, widget, lock screen) or skipping the nap → reminder cancelled; sign-out and hiding the child → cancelled.
- [x] `adb shell dumpsys notification`: no new channel exists.

## Look (manual, web and emulator, all six themes, day and night, largest font)

- [ ] Panel matches design 2b in Classic; themed labels fit without clipping, bell and Start sleep in one row (themed bell `1fr 1.4fr`).
- [ ] Filled ghost and dimmed ring match the editor's selected look.
- [ ] Skip and Why reachable and 48 dp at the largest font.

## Wrap up

- [x] Root `CLAUDE.md` "Where things stand" lists this plan.
- [x] `NOTES.md` records the reminder's notification id, the alarm approach and anything learned.
- [x] The physical-phone checklist below has been handed over.

## Physical-phone checks (Android 16+, after handover)

- [ ] A reminder set during the day shows on the lock screen when the window opens (within 10 minutes; later only in deep Doze), silent.
- [ ] Start sleep from the reminder works with the phone locked.
- [ ] A reminder set before a nap shifted by the other parent's log lands at the new time after the next refresh.
