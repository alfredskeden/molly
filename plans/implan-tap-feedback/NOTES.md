# Notes: tap feedback

## Decisions

- Covers all three surfaces: home-screen widget, lock-screen notification, in-app buttons that await the server.
- **Pending, then result**: the first redraw says the tap is being sent (`Starting…`, dimmed, buttons locked). No optimistic guess on the widget or notification.
- **Measure** where the widget's wait goes (JS start vs network) **on the emulator**. Native widget feedback isn't in this plan; it's decided after trying the finished work on a physical phone.
- **Device checks run on the emulator** (`emulator-5554`); the physical-phone checks run separately after the work is done.
- **Plain pending labels in every theme**, no design file. Checked in the manual look review.
- Flat plan, own folder.

## Defaults chosen during planning (overturn if they look wrong)

- The notification's pending draw is native (`ActionReceiver.kt`), since it's our own module and cheap: included without waiting for step 1.
- `PENDING_MS` = 30 s.
- After a confirmed write the widget draws the result from the write's `Outcome` before the full refresh (`applyOutcome`), so the wait after the pending draw is one round-trip shorter to the eye.

## Facts found while planning

- Earlier timings (`../implan-molly/NOTES.md`): notification action from a killed process reached JS in ~0.5 s and finished the write in ~1.1 s on a physical Android phone; ~4 s on the emulator including React cold start.
- The widget handler already draws twice (cached, then final); the cached draw looks identical to before the tap.
- Edit screen Save / Delete aren't disabled while saving (double tap sends twice).

## Findings

### Step 1: where the wait goes (emulator-5554, release APK, test Baby Buddy on the dev machine)

Milliseconds between log lines, three runs each. "Killed": the process was killed with `su 0 kill -9` (not `am kill`, which left it running, and not `force-stop`, which puts the app in the stopped state). Widget: the `Both` diaper button on the 4×3 Molly widget. Notification: `Stop` on a running sleep, from the pulled-down shade (the emulator has no screen lock).

| Path | tap → process start | → JS handler start | handler → write done | write → refresh done |
| --- | --- | --- | --- | --- |
| Widget, killed | 215 / 138 / 313 | 419 / 317 / 495 (from tap) | 1016 / 926 / 1060 | 69 / 61 / 70 |
| Widget, warm | – | 165 / 218 / 106 (from tap) | 811 / 742 / 905 | 72 / 64 / 74 |
| Notification, killed | 136 / 140 / 142 | receiver 214 / 204 / 198, JS task +100 / +104 / +98 | 1008 / 1064 / 783 | 60 / 60 / 55 |
| Notification, warm | – | receiver 74 / 106 / 65, JS task +63 / +14 / +68 | 44 / 36 / 41 | 39 / 48 / 39 |

- **JS start is not the big share on the emulator any more**: from a killed process the widget handler runs 0.3–0.5 s after the tap (the ~4 s in `../implan-molly/NOTES.md` was from before; this emulator is faster now).
- **Widget, warm: ~0.8 s between handler start and "write done", while the notification's warm write takes ~40 ms** against the same server. The difference is the widget handler's work before the write: loading settings and the cache and drawing the cached state (`renderWidget` with both day and night trees). That draw runs on the JS thread and holds up the write. So the pending draw of step 3 will itself take a share of that time; measured again after step 3.
- From a killed process the first request adds ~0.8–1 s on both paths (fresh JS, first fetch).
- The refresh (six requests, parallel) is 40–75 ms against the local test server; on a phone over the LAN or internet it will be longer.
- The Kotlin receiver runs 65–215 ms after the tap, before JS in every case: the native pending draw (step 4) comes first.

**Where the logs went (to repeat on a physical phone):** removed from the code. To measure again, add `console.log('[molly-timing] <step>')` at the first line of `widgetTaskHandler` (`src/widget/task-handler.android.tsx`) and of `notificationActionTask` (`src/notification/task.android.ts`), and in `runWidgetIntent` (`src/widget/refresh.ts`) after the pending `drawSafely`, after `await write` (with `outcome.type`), after the answered `drawSafely`, and after `refreshWidget`; in Kotlin, `Log.d("MollyTiming", "receiver ${intent.action}")` first in `ActionReceiver.onReceive` and `Log.d("MollyTiming", "pending posted")` after `Notifier.showPending` (both need `import android.util.Log` and a rebuild). Tap time: `adb shell "log -t MollyTiming tap; input tap X Y"` (or tap by hand and read the first log line). Read with `adb logcat -v time | grep -E "MollyTiming|molly-timing|Start proc.*molly"`. Kill with `adb shell su 0 kill -9 $(adb shell pidof se.skedeback.molly)` (needs root; on a phone, swipe Molly away from recents and wait). To hold a write open long enough to see pending, pause the server (`docker pause molly-test-babybuddy-1`, then `unpause`): the emulator's `emu network delay` didn't slow the requests.

### After steps 3–4 (same setup, with the logs above)

- **Widget:** the pending draw lands 65–105 ms after the handler starts, 0.2–0.4 s after the tap (warm), on every widget (checked with the 4×3 Molly and the 1×1 Sleep widget). The answer is drawn 5–85 ms after the write returns, the refresh follows 0.2–0.7 s later.
- **Notification:** from a killed process the receiver posts the pending line 270 ms after the tap, 130 ms before the JS task starts; JS then draws the widgets pending. SystemUI shows the new content a moment after the post (a screenshot at +0.5 s still had the pressed button).
- Checked on the emulator: diaper, sleep start, sleep stop (widget and notification), feeding stop (notification, widgets pending too); a second tap while pending is dropped; airplane mode → pending, then `Not saved: offline`, next tap runs; a task killed mid-write leaves the widget showing `Logging…` until the first tap after 30 s, which runs.
- **Found and fixed:** the pending row kept showing the previous tap's note (`Not saved: offline` beside `Logging…`): a row's note is now hidden while its row is pending. Pending labels were clipped in the 4×3's single-button column (58 dp: `Stoppi…`) and on the 1×1 (`Stopp…`): the pending label is 12 px (11 px, body face, 10 dp side padding on the 1×1), and the 4×3's single-button column is 72 dp, as on the 4×2. Nunito Black `Stopping…` is about 5.1 em.
- **Found, not fixed (library behaviour):** after the process was killed mid-write, WorkManager ran the killed widget task again when the next widget tap came in (both handlers started in the same millisecond, ~33 s later). The retry took the pending slot, so the new tap was dropped, and the retried write can log twice if the first request did reach Baby Buddy (it did here: the server was only paused). Before this plan the retry ran too, alongside the new tap. Rare (a process killed mid-write); the physical-phone check will say if it matters.
- The buttons of a row share its width by content in RemoteViews, so while `Logging…` shows, `Wet` and `Dirty` get narrower: part of the look review.
- If a notification tap is dropped in JS (another tap still pending), the notification is synced back from the cache, so the native `Stopping…` doesn't stay without buttons.
- A write that throws something other than a Baby Buddy error (a bug) clears the pending tap before the error propagates, so the buttons don't stay locked for 30 s.
- `applyOutcome(snapshot, intent, outcome)` has no `userId` (the plan's sketch had one): only this parent's tap can start a timer, so `byMe` is always true.

- On the final build (logs removed): the 4×3 and the 1×1 show `Stopping…` in full; a widget tap from a killed process (`Start proc … for broadcast … widget.Molly`) showed `Logging…` and then `Saved`.
- Not from this plan: stopping a sleep timer older than 24 h ends in `Not saved: server error`, because Baby Buddy refuses it (`validate_duration`, "Duration too long."; seen with a 25 h timer left by the e2e seed). The note calls a validation refusal a server error.

### Step 5: in-app audit

Buttons that await Baby Buddy with no optimistic update, all now on the shared pending look (spinner in the label colour, pending words, disabled but not dimmed, `busy` for screen readers):

- Edit screen `Save` → `Saving…` and `Delete` (second tap) → `Deleting…`; one write at a time (a ref drops a second tap that lands before the pending state renders), the other button disabled meanwhile.
- Adjust-time sheet `Set time` → `Saving…` (its own look kept: spinner and words added, a ref guard added).
- `Connect` → `Checking…`, History and Days `Load earlier` → `Loading…`: now the shared pending look.
- `Retry` on the "Can't reach Baby Buddy" banner was a candidate from the audit, but it already answers at once: the banner disappears within 60 ms of the tap, as soon as the refetch starts (checked in Playwright with Baby Buddy's answers held for 4 s), and comes back only if the refetch fails. A pending state there would never be seen, so it stays as it is.
- Not changed: the dashboard's tracker, cancel, medication, skip / undo-skip and moved-start writes (optimistic), Settings (local writes; its widget sync isn't tied to a button's answer), the QR scan screen (`Checking…` is a status line, not a button), the lock-screen sheet (Android permission).
### Widget taps that do nothing (emulator, not caused by this plan)

- Seen again while measuring: some widget buttons stop working, the launcher logs `ActivityNotFoundException` from `RemoteViews.startPendingIntent` (the "not solved" item in `../implan-molly/RETRO.md`). A redraw makes them work again; the last button drawn (`Both`) always worked while `Wet` was dead.
- Likely cause, from `react-native-android-widget`'s `RNWidget.registerClickTask`: every click gets `PendingIntent.getBroadcast(context, (int) System.currentTimeMillis(), intent, FLAG_CANCEL_CURRENT | FLAG_MUTABLE)`. The intents differ only in extras, which don't count for `PendingIntent` matching, so two buttons of the same widget drawn in the same millisecond share a request code and the later one cancels the earlier. Not proven, not fixed here (out of scope). If a physical phone shows dead buttons, a patch using a counter for the request code is the likely fix: a separate plan.

## Open

- None.
