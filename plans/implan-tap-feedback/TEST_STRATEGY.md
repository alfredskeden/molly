# Tap feedback: Definition of Done

Done when every item below is true, apart from the physical-phone checks at the end, run after the work is handed over. The method follows the root `CLAUDE.md`: unit TDD for logic in `src/widget/model.ts` and `src/notification/model.ts` (Vitest, Given / When / Then, zero → one → many, then boundaries and errors), Playwright on the web image for app screens, emulator checks (`emulator-5554`) for Android-only behaviour, manual review for looks.

## Nothing regresses

- [x] `pnpm check` is green (boundaries, typecheck, lint, all Vitest, web-bundle check), and the web bundle still has no widget code.
- [x] Every existing Playwright spec passes, changed only where a label now reads as pending.
- [x] Every widget intent still writes the same thing to Baby Buddy and ends with the same note (`Started`, `Saved`, `Already running since …`, `Not saved: offline`, …).
- [x] The dashboard's optimistic tracker buttons behave as before.

## Measurement (emulator)

- [x] `NOTES.md` has the emulator split for a widget tap and a notification tap, killed and warm process, three runs each: tap → JS start, → write done, → refresh done. It also says where the timing logs went, so it can be repeated on a physical phone. The logs aren't left in the code.

## Widget pending (unit TDD)

- [x] A cache written before `pending` existed loads with no pending; everything else in it is kept.
- [x] A fresh pending marks its row: the tapped button shows its pending label (per the table in `MAIN.md`), and the row's other buttons are dimmed.
- [x] A pending older than 30 s is ignored: buttons draw normally and a tap runs.
- [x] A tap that arrives while a fresh pending is set is dropped, with no write.
- [x] A confirmed answer updates the snapshot: `started` sets the timer with Baby Buddy's start, `stopped` clears it and moves the last time, `logged` moves the last diaper time. Answers that change nothing (`alreadyRunning`, `alreadyStopped`, `permissionNeeded`, `failed`) leave the snapshot and only set the note.
- [x] A plain refresh keeps a fresh pending and drops an expired one.

## Widget on the emulator

- [x] Each button kind (start, stop sleep, stop feeding, diaper) shows its pending label on the first redraw, then the result from the answer, then fresh data. (Feeding stop tapped from the notification, where the widgets showed `Saving…`; a widget feeding-stop tap runs the same `runWidgetIntent`.)
- [x] With the app process killed, a tap still shows pending before the result.
- [x] With networking off, a tap shows pending, then `Not saved: offline`, and the buttons work again.
- [x] With two widgets placed, a tap on one shows pending on both.
- [x] Tapping other buttons while pending does nothing.
- [x] After a task is killed mid-write, the first tap more than 30 s later runs normally.

## Notification

- [x] Unit: with a fresh pending for its tracker, the notification's content has the pending line and no actions; without it, the usual actions come back.
- [x] Emulator, from the lock screen with the process killed: tapping an action swaps the notification to the pending line with no buttons before JS starts (it shows up in logcat before the JS task's first line), keeps the chronometer, then shows the result. (The emulator has no screen lock: checked in the pulled-down shade.)
- [x] A notification tap also shows pending on the home-screen widgets.
- [x] The `molly.timers` channel keeps `IMPORTANCE_DEFAULT` with no sound.

## In-app (Playwright, Baby Buddy responses delayed with `page.route`)

- [x] Edit screen `Save` shows a spinner and `Saving…`, is disabled, and a second tap sends nothing; `Delete` does the same with `Deleting…`.
- [x] Adjust-time `Set time` shows `Saving…` and ignores a second tap.
- [x] `Connect` and `Load earlier` use the same pending look as the rest.
- [x] Every other button found by the audit (listed in `NOTES.md`) shows pending while it waits.
- [x] A pending button is reported as busy to screen readers.

## Look (manual, web and emulator, both day and night, largest font, every theme)

- [ ] Pending labels fit the widget buttons in every layout (1×1 up to 4×3) without clipping.
- [ ] The dimmed state reads as "working", not "disabled forever", in every theme.
- [ ] The in-app spinner uses the button's ink colour and the button doesn't change size between idle and pending.

## Wrap up

- [x] Root `CLAUDE.md` "Where things stand" lists this plan.
- [x] The physical-phone checklist below has been handed over.

## Physical-phone checks (Android 16+, after hand-over)

- [ ] A widget tap from a killed process and from a warm one feels answered straight away.
- [ ] A lock-screen action shows `Stopping…` / `Saving…` straight away.
- [ ] Optionally, the timing logs from `NOTES.md` rerun on a physical phone, to decide on native widget feedback (a separate plan).
