# Live Updates

Context: the Molly system plan in [`../implan-molly/MAIN.md`](../implan-molly/MAIN.md) (architecture, notification path) and the lock-screen notification as it stands after [`../implan-tap-feedback/`](../implan-tap-feedback/MAIN.md). Decisions are in [`NOTES.md`](NOTES.md), the picture in [`MENTAL_MODEL.md`](MENTAL_MODEL.md), the Definition of Done in [`TEST_STRATEGY.md`](TEST_STRATEGY.md).

**Outcome:** on Android 16+ the running sleep and feeding notifications are **Live Updates** (promoted ongoing notifications): the lock-screen card at the top and a status-bar chip with the ticking timer, the way Napper's does. Molly's looks like a plain ongoing notification today.

Below Android 16, or when the parent has turned Live Updates off for Molly, the notification stays exactly as it is today. When they're off, Settings says so and links to Android's setting.

## What Android needs for promotion

A Live Update is still a normal notification that asks to be promoted and meets every rule:

- Manifest permission `android.permission.POST_PROMOTED_NOTIFICATIONS` (normal, install-time; no prompt).
- `setRequestPromotedOngoing(true)` (sets `Notification.EXTRA_REQUEST_PROMOTED_ONGOING`).
- `setOngoing(true)` and a content title. Molly already has both.
- Style: none, `BigTextStyle`, `CallStyle` or `ProgressStyle`. No custom `RemoteViews`. Molly uses no style: keep it that way.
- Not colorized (`setColorized`), not a group summary. Molly's `setColor` only tints the icon and accent; it isn't colorizing.
- Chip text: `setShortCriticalText`, or the chronometer (`setUsesChronometer(true)` + `setWhen(start)`). Molly already ticks a chronometer from the timer's start: the chip uses that.

Android can still decline (user setting, or the notification fails a rule). `Notification.hasPromotableCharacteristics()` and `NotificationManager.canPostPromotedNotifications()` (both API 36) tell you which.

## Native change

All in `apps/molly/modules/molly-notify/android/`:

- `AndroidManifest.xml`: add the permission.
- `Notifier.kt` `post()`: request promotion on every notification it builds, in every state (running, pending tap, error line, "Can't sign in"), so a card never drops back to plain mid-timer. Use `NotificationCompat.Builder.setRequestPromotedOngoing(true)` if the resolved `androidx.core` has it (1.17.0+); otherwise put `Notification.EXTRA_REQUEST_PROMOTED_ONGOING` into the builder's extras. Harmless below API 36 (the extra is ignored). Leave `working()` (the API < 31 foreground stub) alone.
- Keep everything else: chronometer, `when`, category, actions, delete intent, channel `molly.timers` (`IMPORTANCE_DEFAULT`, silent).
- `MollyNotifyModule.kt`: two new functions.
  - `liveUpdates()`: `"unsupported"` below API 36, else `"on"` / `"off"` from `canPostPromotedNotifications()`.
  - `openLiveUpdateSettings()`: Android's per-app Live Updates screen (`Settings.ACTION_MANAGE_APP_PROMOTED_NOTIFICATIONS` with `EXTRA_APP_PACKAGE`, API 36); fall back to `ACTION_APP_NOTIFICATION_SETTINGS` if that intent can't be resolved.

Needs a rebuild (`pnpm android:release`, see `docs/android-build.md`).

## Settings hint

In the Notifications card (`NotificationCard` in `src/app/(main)/settings.tsx`), when the Lock-screen timer is on, notifications are allowed, and Live Updates are `off`: a line like the existing blocked one, "Live updates are off" with an `Open settings` button calling `openLiveUpdateSettings`. Nothing when `on` or `unsupported`, nothing on web.

- JS surface: `liveUpdatesState()` and `openLiveUpdateSettings()` in `src/notification/sync.android.ts`, with the plain `sync.ts` sibling returning `"unsupported"` / no-op (same file-suffix pattern as the rest).
- `useNotificationState` (`src/notification/use-state.ts`) also reads the Live Updates state on mount and on every return to the app, like the permission.
- Which line to show is a pure function in `src/notification/model.ts` next to `lockScreenPrompt`, unit-tested. The permission line wins over the Live Updates line (without notifications there's nothing to promote).

Plain wording, not from `copy.ts`'s playful sets; exact words are the implementer's call, checked in the look review.

## Shape

```
apps/molly/modules/molly-notify/android/src/main/AndroidManifest.xml      permission
apps/molly/modules/molly-notify/android/src/main/java/…/Notifier.kt       request promotion
apps/molly/modules/molly-notify/android/src/main/java/…/MollyNotifyModule.kt  liveUpdates(), openLiveUpdateSettings()
apps/molly/src/notification/model.ts        which Settings line to show
apps/molly/src/notification/sync.android.ts, sync.ts, use-state.ts   Live Updates state + open settings
apps/molly/src/app/(main)/settings.tsx      the hint
```

## Steps

Work through them in order. Each lands on its own. Mark a step `[x]` when it's fully done, and record findings in [`NOTES.md`](NOTES.md).

- [x] **1. Promote the notification.** Manifest, `Notifier.kt`, the two module functions. Rebuild, install on `emulator-5554` (API 36). Check with `adb shell dumpsys notification --noredact` that Molly's notifications carry the promoted flag, and look at the lock screen / shade / status bar. If the emulator's system image doesn't draw the promoted UI (the chip came with a later Android 16 release), record that in `NOTES.md`, rely on the dumpsys flag, and leave the look to a check on a physical Android 16+ phone. Record the resolved `androidx.core` version and which API you used.
- [x] **2. Settings hint.** Unit TDD for the line choice in `notification/model.test.ts`. Wire `sync`, `use-state`, `settings.tsx`. Emulator check: turn Live Updates off for Molly in Android settings, return to Molly, see the line, tap `Open settings`, turn them on, return, line gone and the running timer's notification promoted again.
- [x] **3. Wrap up.** Update "Where things stand" in the root `CLAUDE.md`. Tick `TEST_STRATEGY.md`, with a physical-phone checklist at its end.

## Out of scope

- `ProgressStyle` and any progress bar (would need a "likely wake" or "typical feed length" rule).
- `setShortCriticalText` chip text (would need periodic updates; the chronometer ticks by itself).
- Promotion for anything other than the two timer notifications.
- Widget changes, notification wording or action changes.
- Testing on a physical phone: the checklist in `TEST_STRATEGY.md`, run separately afterwards.

## Assumptions

- Promotion keeps the existing actions (Stop, Left / Right / Bottle) and the tap-feedback pending draw working; Live Updates allow actions.
- Promoted notifications on the existing `IMPORTANCE_DEFAULT` channel are fine; no new channel is needed. If Android refuses promotion because of the channel, record it in `NOTES.md` and stop to ask: a new channel id is a visible change (importance is fixed once a channel exists).
- The `when` / chronometer that already drives the notification is what the chip shows.
