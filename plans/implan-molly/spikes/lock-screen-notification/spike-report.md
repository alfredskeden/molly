# Spike: lock-screen notification mechanism

Date: 2026-09-25
Implan: implan-molly (redesign phase, step 1)

## Goal

Can Molly show an ongoing lock-screen notification with a system chronometer, whose action buttons run headless JavaScript with the app process killed (reading SecureStore and writing to Baby Buddy)? Can both the app and the widget task handler update and remove it? Which mechanism should it use: a maintained library, or a small local Expo module?

## Outcome

**Confirmed, for both candidates.** Recommendation: **the local Expo module.**

## Verification list

| # | Check | Local module | notify-kit |
| --- | --- | --- | --- |
| 1 | Ongoing notification whose chronometer counts from a given start and ticks on the lock screen | ✅ emulator (Android 16) and a physical Android 16+ phone | ✅ both |
| 2 | Action with the process killed (`am kill`, no pid) runs JS headless, reads SecureStore and writes to Baby Buddy (`POST /api/notes/`), then updates or clears the notification, with no activity opened | ✅ emulator: notes #5 and #8, verified in the DB. Phone: note #7 from the lock screen without unlocking | ✅ emulator: notes #6 and #7 from a cold start. Phone: note #8 from the lock screen (process already warm) |
| 3 | Show, update and cancel from app JS and from the widget task handler | ✅ | ✅ |

## Findings

- **Library survey.** `@notifee/react-native` was archived on 2026-04-07. `expo-notifications` (SDK 57) has no chronometer or `when` field, and it has open issues with background action tasks. `react-native-notify-kit` 10.7.2 is a maintained Notifee fork: New Architecture only, it has an Expo config plugin, and it works on RN 0.86 / SDK 57 unchanged, although it's developed against 0.85.3.
- **The local module reuses a pattern we already depend on.** `react-native-android-widget` runs headless JS from a WorkManager `ListenableWorker`, not a `HeadlessJsTaskService`. The module does the same: action `PendingIntent` (immutable broadcast) → `BroadcastReceiver` → expedited `OneTimeWorkRequest` → the worker starts the `ReactHost` if needed → `HeadlessJsTaskContext.startTask("MollyNotifyAction")`. This avoids Android 12+'s ban on starting a foreground service from the background. It's about 150 lines of Kotlin across four files, with no new dependencies beyond `androidx.work` and `androidx.concurrent:concurrent-futures` (both already pulled in by the widget library):
  - the Expo `Module` exposes `show(id, title, text, startMs, actionIds, labels)`, `cancel(id)` and `enabled()`;
  - `Notifier` builds the notification with `NotificationCompat`: `setWhen(startMs)`, `setShowWhen(true)`, `setUsesChronometer(true)`, `setOngoing(true)`, `setOnlyAlertOnce(true)`, `CATEGORY_STOPWATCH`, `VISIBILITY_PUBLIC`, a launch-app content intent, and one immutable broadcast `PendingIntent` per action, with extras for notification id, action and start;
  - `ActionReceiver` is declared in the module's manifest with `exported="false"`;
  - `ActionWorker` is a Kotlin port of `node_modules/react-native-android-widget/android/src/main/java/com/reactnativeandroidwidget/oss/HeadlessJsTaskWorker.java`, with a 30 s timeout and `allowedInForeground: true`.

  Local Expo modules under `modules/` are autolinked with no config, next to libraries resolved from the hoisted `node_modules`. The spike code was deleted after the spike.
- **Timing.** From a killed process on the phone: action tap → JS running in about 0.5 s, and the Baby Buddy write finished about 1.1 s after the tap. With a warm process: about 0.1 s to JS. On the emulator, a cold start took about 40 ms to JS for the local module and about 0.5 s for notify-kit (it initialises its own ReactContext path).
- **SecureStore and `fetch` work in the headless task**, as they already do for the widget.
- **Lock-screen actions don't require unlocking.** Broadcast actions ran with `isKeyguardShowing=true`.
- **Surprise: a low-importance channel is invisible on the lock screen.** `IMPORTANCE_LOW` counts as "silent", and Pixel hides silent notifications on the lock screen by default (`lock_screen_show_silent_notifications` unset). Use `IMPORTANCE_DEFAULT` with `setSound(null, null)` and `enableVibration(false)`: it shows on the lock screen and still makes no noise. Channel importance can't change after the channel is created, so the channel id must be right from the first release, or be renamed.
- **Pixel's compact lock screen** shows the notification as an icon pill under the clock, and tapping the pill expands it. The small icon was the launcher icon, which renders as a white square. It needs a real monochrome drawable.
- **Ongoing notifications can be swiped away on Android 14+** (confirmed on the phone for both). The next update re-posts the notification. notify-kit reports a `DISMISSED` event; the local module needs a `deleteIntent` to learn about it.
- **Updating with the same `when` keeps the chronometer's start.** Only the text changes, and nothing resets.
- **Testing note:** `uiautomator dump` fails ("could not get idle state") while a chronometer is on screen. Use screenshots and coordinates, or logcat.

## Why the local module over notify-kit

Both pass. The local module wins on fit:
- Molly needs only a small surface: show, update and cancel one notification per timer, with up to three actions. notify-kit brings a whole notification framework (Fresco, Guava, FCM mode, iOS extension tooling, extra headless tasks for `DELIVERED` events) maintained by one person against RN 0.85.
- The mechanism is the one the widget already relies on, so an RN headless API change hits both in the same place, and we already know how to read that code.
- Full control over the channel, `deleteIntent`, the icon, and later Android 16 promoted "Live Updates" (not tested).

What notify-kit would still offer: a ready-made dismiss event, permission helpers, and no Kotlin to own. Choose it instead if owning Kotlin isn't wanted.

## Recommendations for the Implan

- `NOTES.md` "Redesign": record the choice (local Expo module under `apps/molly/modules/`, WorkManager-headless pattern) and the facts above: the lock-screen channel importance, dismissible ongoing notifications on 14+, and the timings.
- Step 8 needs:
  - a `DEFAULT`-importance, silent channel;
  - a monochrome small icon;
  - a `deleteIntent` so a user dismissal is remembered until the timer state next changes, and the notification isn't re-posted on every refresh (or decide that re-posting on refresh is fine);
  - the notification action payload carrying the intent and the timer id, going through `runIntent` as planned.
- Step 8 permission prompt: `POST_NOTIFICATIONS` is needed on 13+. The spike granted it with `pm grant`, so the prompt flow itself is untested.
- The device checklist should add: the notification is visible on the lock screen with the phone's default settings, and an action works while locked.

## Risks and unknowns

- Expedited work on API < 31 calls `getForegroundInfo`. The spike didn't implement it, and both devices are API 36+. Implement it if `minSdk` is below 31, or fall back to non-expedited work there.
- Battery optimisation and OEM process killers (not Pixel) weren't tested. WorkManager is the most robust option available, but a delay is possible.
- The permission prompt, the behaviour when the permission is denied, and Android 16 promoted Live Updates weren't tested.
- notify-kit's cold start on the phone wasn't isolated, because the local action warmed the process first. It was proven cold on the emulator.

## Shortcuts and limits

- Throwaway app `app/` (`se.skedeback.molly.spike`). It resolves packages from the repo root's hoisted `node_modules`; notify-kit was unpacked from its npm tarball into `app/node_modules`. Release build, debug-signed, arm64 only.
- The write was a Baby Buddy note, not a timer stop, to leave timers and totals alone: on the test container (emulator) and on a dummy LAN instance (`192.0.2.10:4779`, phone). A cold-start write is the same code path as a stop.
- The process was killed with `am kill` (the system's low-memory kill), not `force-stop`, which disables receivers and isn't what happens in real use.
- The spike app was deleted and uninstalled after the spike. Only this report remains.
