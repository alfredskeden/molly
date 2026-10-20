# Notes: Live Updates

## Decisions (2026-09-28)

- Live Updates (Android 16 promoted ongoing notifications) instead of plain ongoing ones, for the sleep and feeding timer notifications.
- **No progress bar**: no style, card and chip only. `ProgressStyle` would need a target (likely wake, typical feed length) that Molly doesn't have.
- **Chip = the existing chronometer** (`setUsesChronometer` + `setWhen(start)`), not `setShortCriticalText`: ticks with no JS updates.
- **Live Updates off for Molly → hint in Settings** with a link to Android's setting. The notification itself falls back to plain.
- Flat plan, own folder.

## Defaults chosen during planning (overturn if they look wrong)

- Every notification state asks for promotion (running, pending, error, "Can't sign in"), so the card doesn't jump.
- Permission line wins over the Live Updates line in Settings.
- Plain wording in every theme.

## Facts found while planning

- Build is on `compileSdk` / `targetSdk` 36 (React Native 0.86.3's `libs.versions.toml`), so the API 36 calls compile.
- `emulator-5554` runs API 36 (Android 16). Whether its image draws the promoted UI (card, chip) is unknown: check in step 1.
- Gradle cache has `androidx.core:core` 1.17.0 and 1.18.0; `NotificationCompat.Builder.setRequestPromotedOngoing` is expected from 1.17.0. The version the module resolves isn't confirmed yet.
- `Notifier.kt` already meets the other rules: ongoing, title, no style, no custom layout, `setColor` without `setColorized`, no group.
- `Settings.ACTION_MANAGE_APP_PROMOTED_NOTIFICATIONS` is the expected per-app screen; confirm it resolves on the emulator.

## Open

None.

## Findings

- **`androidx.core` resolves to 1.13.1** for `:molly-notify` (`./gradlew :molly-notify:dependencies`), so `NotificationCompat.Builder.setRequestPromotedOngoing` isn't there. `Notifier.post()` sets the extra directly: `addExtras(Bundle { "android.requestPromotedOngoing" = true })` (`Notification.EXTRA_REQUEST_PROMOTED_ONGOING`'s value). Confirmed in `dumpsys notification --noredact`: both timer notifications carry `android.requestPromotedOngoing=Boolean (true)`.
- **The per-app screen is `Settings.ACTION_APP_NOTIFICATION_PROMOTION_SETTINGS`** (`android.settings.APP_NOTIFICATION_PROMOTION_SETTINGS`), not `ACTION_MANAGE_APP_PROMOTED_NOTIFICATIONS` (doesn't exist in the API 36 `android.jar`). `openLiveUpdateSettings` tries it and falls back to `ACTION_APP_NOTIFICATION_SETTINGS` on `ActivityNotFoundException` (not `resolveActivity`, which package visibility can hide).
- **`emulator-5554`'s image can't promote.** It's the first Android 16 build (`BE2A.250530.026.F3`, `system-images;android-36;google_apis`): `android.app.api_rich_ongoing` is on, but there is no `ui_rich_ongoing` flag, no per-app Live Updates screen (`cmd package resolve-activity -a android.settings.APP_NOTIFICATION_PROMOTION_SETTINGS` → "No activity found"), `canPostPromotedNotifications()` is false, and Android never sets `FLAG_PROMOTED_ONGOING`. So there: the notification stays plain as before, Settings shows "Live updates are off", `Open settings` lands on Molly's notification settings (the fallback path, checked).
- **Second emulator for promotion: AVD `molly-36.1`** (2026-09-28): `system-images;android-36.1;google_apis;arm64-v8a`, build `BE4B.251210.005`, same hardware profile as the `molly` AVD, runs as `emulator-5556`. Flags `api_rich_ongoing`, `ui_rich_ongoing`, `opt_in_rich_ongoing`, `api_rich_ongoing_permission` all on. Signed in to the test Baby Buddy as `parent_b` through `adb reverse tcp:4778 tcp:4778` and `http://localhost:4778`.
- **Checked on `molly-36.1`:**
  - Sleep and feeding both `flags=ONGOING_EVENT|ONLY_ALERT_ONCE|PROMOTED_ONGOING|SILENT`, in every state driven: running; pending tap (`Saving…`, no buttons; Baby Buddy paused with `docker pause` to hold it); error line (`Not saved: offline`, process killed and the adb reverse removed so the headless task can't connect). "Can't sign in" not driven (would mean breaking the test key); it goes through the same `Notifier.post()`, which sets the extra unconditionally.
  - Status-bar chip with the ticking chronometer (hidden while Molly is in front, as Android does for the foreground app); lock-screen card at the top with its action (Stop); shade cards at the top with Stop / Left / Right / Bottle. A Stop from the card drew the pending line, then the answer; the notification went away when saved.
  - Live Updates off in Android settings: notification still posted, plain (`PROMOTED_ONGOING` gone), Settings shows "Live updates are off"; `Open settings` opens `AppNotificationSettingsActivity` with the Live updates switch highlighted; on again and back: line gone, `PROMOTED_ONGOING` back.
  - A promoted card can still be swiped away in the shade, and stays away for that timer after the app syncs again.
  - Channel unchanged: `molly.timers`, importance 3 (DEFAULT), no sound. Android didn't refuse promotion over the channel.