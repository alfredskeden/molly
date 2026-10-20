# Instant taps

Context: the Molly system plan in [`../implan-molly/MAIN.md`](../implan-molly/MAIN.md) and the pending states built in [`../implan-tap-feedback/MAIN.md`](../implan-tap-feedback/MAIN.md). Facts and decisions are in [`NOTES.md`](NOTES.md), the picture in [`MENTAL_MODEL.md`](MENTAL_MODEL.md), the Definition of Done in [`TEST_STRATEGY.md`](TEST_STRATEGY.md).

**Outcome:** every tap shows at once that it landed, even when JS is slow to start or busy, and buttons stop dying. Prompted by two symptoms seen on a physical Android 16+ phone (latest build, with the fresh-connections fix `155c594`):

1. **Widget after idle:** a tap shows nothing for several seconds, then runs. The pending state (`Starting…`) exists but JS draws it, and after idle JS starts late.
2. **App after returning:** the hero's Stop doesn't react at all (no press scale, no haptic) while scrolling still works, and stays that way until the app is closed and reopened.

"Pending, then Baby Buddy's answer" from `implan-tap-feedback` stays as it is. This plan adds a layer underneath it that needs no JS, and fixes what makes taps die.

## Why taps look dead

**Widget.** Tap → launcher fires the button's `PendingIntent` → `RNWidgetProvider.onReceive` (native, immediate) → expedited WorkManager job → headless JS (cold React start if the process was killed) → `widgetTaskHandler` draws pending. After idle, every arrow after `onReceive` can be slow: Doze and low standby buckets turn expedited work into deferrable work, and the process is usually dead. Separately, some buttons never fire at all. See the request-code bug in `NOTES.md`.

**App.** The press scale (`active:scale-[0.96]`) and `onPress` both need the JS thread. Scrolling doesn't, on Android. So "scrolls but the button is dead until restart" points at a JS thread that is blocked or spinning after the app comes back. The cause isn't known yet: step 1 finds it.

## Widget

**Patch `react-native-android-widget`** with `pnpm patch` (root `package.json` `pnpm.patchedDependencies`, committed patch file). Check that `expo prebuild --clean` and `pnpm android:release` build with it, and write how to update the patch in `docs/android-build.md`.

The patch does three things:

1. **Unique request codes.** In `RNWidget.registerClickTask`, replace `(int) System.currentTimeMillis()` with a process-wide counter (seeded from the time once, so codes from an earlier process don't line up). Every button keeps its own `PendingIntent`.
2. **Bounds in the click.** Put the clickable's bounds (left, top, width, height in px, from `offsetViewBounds`) and its corner radius into the click intent's extras.
3. **Native pressed draw.** In `RNWidgetProvider.onReceive`, for a `WIDGET_CLICK` whose `clickAction` isn't `OPEN_APP` / `OPEN_URI`, before `handleWidgetClick` enqueues the work: `AppWidgetManager.partiallyUpdateAppWidget` with
   - both bitmap `ImageView`s dimmed (`setAlpha`), and
   - a non-clickable overlay view added at the tapped button's bounds: a translucent rounded rect, light on dark and dark on light (a small drawable plus a layout in the patch).

   A partial update keeps the clickable areas, so the widget stays tappable. JS's next full draw (pending, then the answer) replaces the overlay and the dimming.

**JS must always redraw after a tap**, or the native overlay stays. Today a tap dropped because another one is still pending draws nothing (`runWidgetIntent` in `src/widget/refresh.ts` returns `null`, the task handler returns). Change: a dropped widget tap draws the cache as it is (it shows the other tap's pending state). The same for a tap with no session, and for a tap the handler can't parse.

**If JS never runs** (task killed before it draws), the overlay stays until the next draw: the next tap, the next periodic update, or the app's own widget sync. The widget stays tappable meanwhile. Acceptable; note in `NOTES.md` how often you saw it.

**Look:** the overlay must read as "pressed" in every theme, day and night, on the 4×3, 4×2, 2×2 and 1×1 widgets. If B's overlay can't be made to line up (bounds off on some launchers, scaling), fall back to dimming only (option A), and record why in `NOTES.md`.

## Faster widget taps (gated)

Run only if step 1's numbers show the WorkManager hop (from `onReceive` to the worker starting) takes more than about 1 s in Doze or the `rare` bucket. Then, in the same patch, start the widget's headless task for a click without WorkManager deferral. Android 12+ lets an app start a foreground service from a widget tap. Options: a `HeadlessJsTaskService` started as a foreground service for clicks only, or WorkManager with `setForegroundAsync` / `getForegroundInfo` so expedited work isn't dropped to ordinary work. Pick from what the measurement shows, keep periodic updates on WorkManager, and keep the notification path (`ActionReceiver.kt` → `ActionWorker.kt`) on whatever it already uses unless the same numbers show it deferred too. Record the decision and numbers in `NOTES.md`; if the hop is small, write that down and skip.

## App

**Find and fix the freeze (step 1, then step 2).** Reproduce on the emulator: start a sleep, background the app, make the phone "idle" (Doze, `rare` bucket, clock moved forward a few hours; recipes in `NOTES.md`), bring the app back, tap Stop. Add a temporary JS-thread stall logger: an interval that logs when it fires late by more than 200 ms, with what was running if you can tell. Profile the JS thread on return (Hermes sampling profiler via React Native DevTools, or `console.time` around the suspects listed in `NOTES.md`). Fix the cause where it lives. If it's in `packages/core` (a loop that spins on a far-away `now`, say), the fix is unit TDD there, with a test that reproduces the input. Remove the logger afterwards and write in `NOTES.md` how to add it back.

If the freeze can't be reproduced on the emulator, keep the stall logger in the release build, writing to a small ring buffer that can be read on the device. Put it in Settings under a hidden "Tap log" (long-press on the version line). Then wait for a log caught on a physical phone.

**Native press feedback.** In the shared `Pressable` (`src/components/pressable.tsx`): `android_ripple` on Android, bounded, colour from the theme's ink at low alpha. The ripple draws on the UI thread, so a press shows even when JS is late. Keep the press scale and the Remove-animations rule. Check that the ripple follows each theme's corners (`rounded-button` and the like) and isn't drawn on non-button pressables where it looks wrong (scrim, links, list rows). An opt-out prop is fine for those.

**Stuck gesture, if step 1 points there:** the avatar stack's pan (`features/children/AvatarStack.tsx`) must end on cancel / finalize, not only `onEnd`.

## Shape

```
package.json, patches/react-native-android-widget@0.22.1.patch   request codes, bounds extras, native pressed draw (+ fast path if gated in)
docs/android-build.md                         how to update the patch
apps/molly/src/widget/refresh.ts, task-handler.android.tsx   a dropped / sessionless tap still redraws
apps/molly/src/components/pressable.tsx       android_ripple
wherever step 1 finds the freeze              its fix (core: TDD)
```

## Steps

Work through them in order. Each lands on its own. Mark a step `[x]` when it's fully done, and record findings in [`NOTES.md`](NOTES.md). Rebuild with `pnpm android:release` after native changes.

- [x] **1. Reproduce and measure on the emulator.** App freeze: reproduce, find what blocks the JS thread, record it. Widget: timing logs (recipe in `NOTES.md`) for tap → `onReceive` → worker start → JS handler → pending draw, three runs each, warm vs killed, normal vs `force-idle` vs `rare` bucket. Numbers into `NOTES.md`, including whether the WorkManager hop passes the ~1 s gate.
- [ ] **2. Fix the app freeze.** Fix the cause from step 1 (TDD if it's in `packages/core`). Emulator check: the step 1 reproduction no longer freezes. If step 1 couldn't reproduce it, ship the Tap log instead. *Tap log shipped (not reproduced on the emulator, see `NOTES.md`); waiting for a Tap log from a physical phone.*
- [ ] **3. Native ripple in the app.** Shared `Pressable`, opt-outs where it looks wrong. Emulator check with JS held up (a temporary `while` loop of a few seconds behind a dev button, removed afterwards): the hero's Stop ripples at once.
- [ ] **4. Widget patch: request codes, bounds, pressed draw.** *(Request codes done early, in step 1.)* Plus the "always redraw after a tap" change in `refresh.ts` / the task handler (unit test in `refresh` or `model` tests if a pure piece falls out). Emulator check: every button of every widget size fires (tap each one ten times across redraws, no `ActivityNotFoundException` in `adb logcat`); the overlay shows within ~100 ms of the tap in Doze with the process killed; a dropped tap clears its overlay.
- [ ] **5. Faster widget taps (gated by step 1).** Implement or record the skip.
- [ ] **6. Wrap up.** Update this plan's row in `plans/README.md`, tick `TEST_STRATEGY.md`, hand over the physical-phone checklist.

## Out of scope

- Changing what the pending and result states say or how they look (`implan-tap-feedback`), and the dashboard's optimistic writes and shared `busy` flag.
- Fewer requests per tap, a faster Baby Buddy.
- Native drawing of the full widget (text, labels) without JS: only the overlay and dimming are native.
- The lock-screen notification's native pending draw (already done); it changes only if step 5 moves its path.
- Testing on a physical phone (the checklist in `TEST_STRATEGY.md` covers that).

## Assumptions

- `partiallyUpdateAppWidget` with `addView` into the existing root keeps the library's clickable areas, and a later full `updateAppWidget` from JS replaces the partial changes. Verify in step 4 before building the overlay's look.
- Clickable bounds from `offsetViewBounds` are in the same coordinate space as the widget's root layout on the launcher. If not, scale by the widget's size options.
- `pnpm patch` works with `node-linker=hoisted` and the Expo autolinked Android build.
