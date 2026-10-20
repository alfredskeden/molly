# Tap feedback

Context: the Molly system plan in [`../implan-molly/MAIN.md`](../implan-molly/MAIN.md) (architecture, widget and notification paths). Decisions are in [`NOTES.md`](NOTES.md), the picture in [`MENTAL_MODEL.md`](MENTAL_MODEL.md), the Definition of Done in [`TEST_STRATEGY.md`](TEST_STRATEGY.md).

**Outcome:** every tap that waits on Baby Buddy shows at once that it was heard, then shows the result. The problem: on the widget especially, a tap looks like nothing happened for 2–3 s.

Three surfaces:

1. **Home-screen widget.** The tapped button turns pending (`Starting…`, dimmed) and every button stops taking taps, until the write's answer is in.
2. **Lock-screen notification.** The tapped action swaps the notification to a pending line with no buttons, drawn natively before JS starts.
3. **In-app buttons** that await the server (the dashboard's tracker buttons are already optimistic and stay as they are) show a pending state: spinner, pending label, disabled.

Pending means "your tap is being sent", never a guessed result. The result is drawn only from Baby Buddy's answer.

## Why a tap feels dead today

Widget tap (`src/widget/task-handler.android.tsx`):

1. Android starts the headless JS task (process may be killed: React cold start).
2. The handler draws the cached state. It looks the same as before the tap.
3. `runWidgetIntent` (`src/widget/refresh.ts`): server check + write (`runIntent` in `src/widget/model.ts`).
4. `refreshWidget`: a full snapshot fetch (`fetchSnapshot`, six requests).
5. Final draw with the note (`Started`, `Saved`, errors).

Nothing visible changes until step 5. Notification actions take the same path after `ActionReceiver.kt` → WorkManager → `ActionWorker.kt` → `notificationActionTask` (`src/notification/task.android.ts`), and today don't redraw anything until the end either.

## Widget

**Pending in the widget cache.** `WidgetCache` (`src/widget/model.ts`) gains `pending: { intent: WidgetIntent; at: string } | null`. It lives in the cache, not in the task's memory, so every widget instance, the notification and a second tap all see it.

- **Parse it backward-compatibly** in `parseWidgetCache` (missing → `null`), as earlier fields were added.
- **It expires** after `PENDING_MS` (30 s): a task killed mid-write must not leave the widget stuck. Past that, the view ignores it.
- **The view shows it.** `widgetView` marks the pending intent's row: that button's label becomes its pending label, dimmed, and the row's other buttons dim. While anything is pending, the task handler drops button taps (see the tap flow). Buttons keep their `clickAction`: a widget can't redraw itself when a pending expires, so if a task dies mid-write, a widget without click actions would stay locked until the next periodic update (30 min or more). With them, the next tap after expiry simply goes through.
- **Pending labels, plain in every theme** (not from `copy.ts`'s playful sets): start → `Starting…`, sleep stop → `Stopping…`, feeding stops → `Saving…`, diapers → `Logging…`. Keep them in `model.ts` next to `ROW_OF`, one per intent.

**Draw the result from the write's answer, before the refresh.** A confirmed `Outcome` (`src/actions/trackers.ts`) already carries what changed: `started` has the timer's start, `stopped` / `logged` the created entry. Add a pure `applyOutcome(snapshot, intent, outcome, userId)` in `model.ts` that updates the snapshot from it (timer set or cleared, `lastSleep` / `lastFeeding` / `lastChange` moved). The refresh that follows replaces it with Baby Buddy's full view. Outcomes that change nothing (`alreadyRunning`, `failed`, …) leave the snapshot as it is and only set the note.

**New tap flow** (`task-handler.android.tsx`, `refresh.ts`):

1. Load cache. If a fresh `pending` is set, the tap is dropped (no write, no redraw). Otherwise (none, or an expired one) write `pending`, draw every widget (`drawWidgets` in `sync.android.tsx`, so all instances agree) and sync the notification.
2. Run the intent.
3. Clear `pending`, apply the outcome, set the note, save, draw.
4. Refresh and draw as today.

A plain refresh (no click) keeps a fresh `pending` it finds and drops an expired one.

**Rendering constraint:** widgets are RemoteViews. `react-native-android-widget` has no spinner or animation, so pending is a label and dimming only.

## Lock-screen notification

**Native pending draw.** In `ActionReceiver.kt`, on `ACTION_RUN`, before enqueueing the worker: rebuild that tracker's notification with a pending line (`Stopping…` / `Saving…`, the same wording as the widget, passed in the action's extras when the notification is built, since Kotlin shouldn't own the words) and no action buttons. Keep chronometer and `when` so it doesn't jump. `Notifier.kt` builds notifications; add what it needs there.

**JS side.** `notificationActionTask` goes through the same tap flow as the widget (steps 1–4 above), so the widgets also show pending when the tap came from the lock screen. `timerNotifications` (`src/notification/model.ts`) draws a fresh `pending` for its tracker the same way the native side did (pending line, no actions), so a JS redraw during the write doesn't bring the buttons back.

**Native change needs a rebuild** (`pnpm android:release`, see `docs/android-build.md`).

## Widget native feedback (later, not in this plan)

Before JS runs, nothing can draw the widget pending. Step 1 measures the share on the emulator. If a physical-phone test after this work still feels slow because of JS start, a follow-up plan could draw a pressed state natively first (for example a click receiver of our own ahead of the library's, or a patch of `react-native-android-widget`). Leave the emulator numbers and the idea in `NOTES.md` for that decision.

## In-app

`Button` in `src/components/ui.tsx` gains `pending?: boolean` (with optional `pendingLabel`): a small `ActivityIndicator` in the button's ink colour next to the label, disabled, `accessibilityState={{ busy: true }}`. Use it wherever a tap awaits the server with no optimistic update. Known today:

- Edit screen Save and Delete (`src/app/(main)/entry/[kind]/[id].tsx`, `write`): no pending state and not disabled, so a double tap sends twice. `Saving…` / `Deleting…`.
- Adjust-time sheet `Set time` (`src/features/toast/toast.tsx`, `AdjustSheet`): only dims. `Saving…`.
- Onboarding `Connect` (`ConnectForm.tsx`, already `Checking…`) and `Load earlier` (History, Days, already `Loading…`): switch to the shared pending state so they look the same.

Audit for others (sheets in `features/dashboard/`, toast actions, Settings) and list what you found in `NOTES.md`. The dashboard's optimistic buttons keep their `busy` behaviour.

## Shape

```
apps/molly/src/widget/model.ts               pending in WidgetCache, parse, PENDING_MS, pending labels, view, tap allowed, applyOutcome
apps/molly/src/widget/refresh.ts             tap flow (pending → write → result → refresh)
apps/molly/src/widget/task-handler.android.tsx  uses the tap flow
apps/molly/src/widget/MollyWidget.android.tsx   pending label, dimming
apps/molly/src/notification/model.ts         pending notification content
apps/molly/src/notification/task.android.ts  same tap flow
apps/molly/modules/molly-notify/…/ActionReceiver.kt, Notifier.kt   native pending draw
apps/molly/src/components/ui.tsx             Button pending
apps/molly/src/app/(main)/entry/[kind]/[id].tsx, features/toast/toast.tsx, …   use it
```

## Steps

Work through them in order. Each lands on its own. Mark a step `[x]` when it's fully done, and record findings in [`NOTES.md`](NOTES.md).

- [x] **1. Measure on the emulator.** Timing logs (`console.log` with `Date.now()`, read in `adb logcat` under `ReactNativeJS`; Kotlin `Log.d` for the receiver) on `emulator-5554`, for a widget tap and a notification tap, process killed and warm: tap → JS handler start, → write done, → refresh done. Three runs each. Numbers into `NOTES.md`. The emulator's cold start is slower than a phone's (~4 s vs ~1 s earlier), so read the split between JS start and network, not the totals. Remove the logs afterwards, and write down in `NOTES.md` where they went so the measurement can be repeated on a physical phone after the work is done.
- [x] **2. Pending in the widget model.** Unit TDD in `model.test.ts`: `pending` parse (old caches → `null`), expiry, the pending row's label and dimming, whether a tap may run (dropped while a fresh pending is set), `applyOutcome` per outcome kind.
- [x] **3. Widget tap flow.** Wire `refresh.ts`, `task-handler.android.tsx`, `MollyWidget.android.tsx`. Emulator check: tap each button kind, see pending then result; kill the process and tap; turn networking off and tap (pending, then `Not saved: offline`); a task killed mid-write clears after 30 s.
- [x] **4. Notification.** Unit TDD for the pending content in `notification/model.test.ts`. Native pending draw in `ActionReceiver.kt` / `Notifier.kt`, the JS task through the same flow. Rebuild, emulator check from the lock screen with the process killed.
- [x] **5. In-app pending.** `Button` pending, the uses listed above plus what the audit finds. Playwright (slow the Baby Buddy route with `page.route` delay): edit Save shows `Saving…` and ignores a second tap; `Set time` likewise.
- [x] **6. Wrap up.** Update "Where things stand" in the root `CLAUDE.md`. Tick `TEST_STRATEGY.md`. Hand over the physical-phone checklist from `TEST_STRATEGY.md`.

Native widget feedback isn't a step here: it's decided after trying the finished work on a physical phone. If it's wanted, it's a new plan.

## Out of scope

- Making the network itself faster (dropping the server check, fewer refresh requests).
- Native widget feedback before JS starts (see above), and testing on a physical phone (the checklist in `TEST_STRATEGY.md`, run afterwards).
- Optimistic widget or notification results (showing the outcome before Baby Buddy answers).
- Themed pending wording.
- Changes to the dashboard's optimistic tracker buttons.
- A design file.

## Assumptions

- `react-native-android-widget`'s `renderWidget` can be called more than once per task and each call reaches the launcher (the handler already draws twice).
- Two headless tasks can overlap (two quick taps before the pending draw lands). Each intent is server-checked, so the worst case is a harmless `Already running` note.
- `ActionReceiver` may update the notification synchronously in `onReceive`; it's our own notification and needs no JS.
