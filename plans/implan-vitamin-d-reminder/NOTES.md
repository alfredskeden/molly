# Vitamin D reminder: notes

## Decisions

- Trigger: only the phone that stopped the sleep (option A of three; late discovery on refresh and background polling were turned down).
- Notification: silent channel `molly.reminders`, `IMPORTANCE_DEFAULT`; buttons Given now / Dismiss; goes away when Vitamin D is logged.
- Name match: trimmed, case-insensitive `vitamin d` followed by nothing, a space or a digit (`Vitamin D3` counts, decided).
- Setting off by default, Settings' Notifications card, Android only, kept on sign-out.
- Every sleep end checks again, Dismiss included.
- Cycle `[dayWindow.wake, +24 h)`; nap-window start when no wake is logged.
- A reminder already showing clears on this phone's next refresh after the other parent logs a dose (up to ~30 min).

## Facts from the code

- Notification ids in use: sleep 1, feeding 2, "Saving…" work notification 3 (`Notifier.kt`).
- `byClock` in `day-window.ts` sets `wake` to the window's start, which at night is the evening: hence the nap-window-start rule for `clock: true`.
- Stop sites: `SLEEP_STOP` in `runIntent` (`src/widget/model.ts`, run by `runWidgetIntent`), and `stopSleep` in `src/app/(main)/index.tsx`.

## Implementation

- Notification id **4** (`Notifier.REMINDER`, tracker `"reminder"`); channel `molly.reminders` "Reminders", `IMPORTANCE_DEFAULT`, sound null, vibration off, lock-screen public, no badge. Checked with `dumpsys notification` on `emulator-5554` (Android 16): `mImportance=3, mSound=null, mVibrationEnabled=false`. Category `reminder`, not ongoing, no promotion extra.
- The reminder is drawn from the widget cache like the timers: `WidgetCache.reminder = { cycleStart, lastGiven, at }`, and `syncNotifications` shows or cancels it on every sync (`vitaminDNotification` in `src/notification/model.ts`). `at` (the check's time) is the native key: a swipe or Dismiss is remembered against it, so later syncs don't bring it back, and the next stop's check posts a new one.
- Dismiss is a native broadcast (`ACTION_DISMISS`): cancel + remember, no JS. Given now goes through `ACTION_RUN` → `showPending` ("Saving…", no buttons) → `runWidgetIntent('VITAMIN_D_GIVEN')`; its note row is `medication` (no widget draws it).
- Check after a stop: `remindedCache` (widget `model.ts`), called from `runWidgetIntent` and from the app's `run()` (`remindAfterAppWrite`) before the refresh. Fetches sleeps (`end_min` 2 midnights back) and medication (`date_min` 3 midnights back) in parallel; a `BabyBuddyError` leaves the cache as it was.
- The refresh re-checks a showing reminder with one `listEntries('medication', { date_min: cycleStart })`, in parallel with the snapshot; none when no reminder. While the setting is off, `refreshWidget` drops the cached reminder, so turning the setting on again doesn't bring back an old one (found on the emulator).
- Settings' permission line (`notificationCardLine`) now also shows with only the reminder on, headed "Vitamin D reminder"; the Live Updates line stays the timer's.
- `settingsAfterSignOut` in `storage/types.ts` (unit-tested) now holds the keep-on-sign-out list; `vitaminDReminder` is on it.
- Emulator (`emulator-5554`, test Baby Buddy): app Stop, lock-screen Stop and widget Stop each posted it; with a dose in the cycle the lock-screen Stop posted nothing; Given now → "Saving…" → `Vitamin D` at Baby Buddy's time in Recent, reminder gone; Dismiss stayed dismissed across a foreground refresh and the next Stop posted it again; one-tap Vitamin D cleared it at once; setting Off cancelled it (timer notification kept). Icon tinted `med-mid`; grouped by Android with the timer notifications in the shade.
- **Offline Given now**: in airplane mode the request hung (no fetch timeout) until the headless task's 30 s limit; the notification stayed on "Saving…" until the network changed, then showed `Not saved: offline` with its buttons back. Same path as every lock-screen tap, not new here; the tap-feedback plan saw a fast failure instead, so it depends on how the emulator's network drops.

## Open

- Not checked on the emulator yet: the other parent logging Vitamin D clearing it on the next refresh, and sign-out cancelling it (both unit-covered: refresh clears on a dose; signed-out sync cancels). Needs the other seeded parent's key.
- Manual look review (day / night, largest font, a playful theme) and the physical-phone checks.
