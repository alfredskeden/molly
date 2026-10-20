# Notes: instant taps

## The report from a physical phone (latest build with `155c594`)

- **Widget, after the phone has sat unused:** a tap shows nothing for several seconds, then it runs. `Starting…` and the other pending states from `implan-tap-feedback` arrive late, because JS draws them.
- **App, after opening it again:** the hero's Stop sometimes doesn't react at all. No press scale, no haptic, nothing dims. Scrolling still works. It never recovers; closing and reopening the app fixes it. Other buttons weren't tried at that moment (stopping the timer was the only goal).
- Wish: every button always shows that the tap landed.

## Decisions

- **Widget: native pressed state (option B).** Overlay on the tapped button, rest of the widget dimmed, drawn in the click receiver before any JS runs. The two alternatives were dimming the whole widget (A, the fallback if B's patch proves too fragile) and a native `Sending…` label (C, too much for the gain).
- **Fix the dead-button bug in the same library patch** (request codes, see below).
- **Faster widget taps are in scope, gated on measurement**: any improvement is welcome, so step 5 runs if the numbers show WorkManager deferral is a real share of the wait.
- **Device checks run on the emulator**: `emulator-5554` (or `emulator-5556` / AVD `molly-36.1` where Android 16 QPR2 matters). The physical-phone checklist in `TEST_STRATEGY.md` is run separately.
- Flat plan, own folder.

## Facts found while planning

### Widget click path (`react-native-android-widget` 0.22.1, `node_modules/react-native-android-widget/android/src/main/java/com/reactnativeandroidwidget/`)

- The widget is drawn as **one bitmap** (`rn_widget_image_light` / `rn_widget_image_dark` in `res/layout/rn_widget.xml`) with transparent clickable areas laid over it (`rn_widget_clickable.xml`, `selectableItemBackground`: the short ripple is the only feedback today). Containers: `rn_widget_clickable_container`, `rn_widget_collection_container`.
- `RNWidget.registerClickTask` (around line 202): every clickable gets `PendingIntent.getBroadcast(ctx, (int) System.currentTimeMillis(), intent, FLAG_CANCEL_CURRENT | FLAG_MUTABLE)`. Intents differ only in extras, which don't count for `PendingIntent` matching, so **buttons registered in the same millisecond share a request code and each one cancels the one before**: dead buttons, launcher logs `ActivityNotFoundException` from `RemoteViews.startPendingIntent`. Seen on the emulator (`../implan-tap-feedback/NOTES.md`, `../implan-molly/RETRO.md`). A faster phone draws more buttons within one millisecond.
- The clickable's bounds are known at registration (`offsetViewBounds` in `addClickableArea`, around line 175), so they can go into the click intent's extras.
- `RNWidgetProvider.onReceive` handles `.WIDGET_CLICK` at once (no JS) and calls `RNWidgetJsCommunication.startBackgroundTask`: a `OneTimeWorkRequest` with `setExpedited(RUN_AS_NON_EXPEDITED_WORK_REQUEST)` on Android 12+. In Doze or a low standby bucket the expedited quota can run out and the work becomes ordinary, deferrable work.
- No patch mechanism in the repo yet (no `patchedDependencies` in the root `package.json`).

### App press path

- Every Pressable goes through `apps/molly/src/components/pressable.tsx` (strips the press scale under Remove animations). The press scale `active:scale-[0.96]` is a NativeWind state, so it needs JS. `android_ripple` would draw on the UI thread.
- Dashboard writes share one `busy` flag (`src/app/(main)/index.tsx`, `run`): every button disabled and dimmed until the answer. Not the reported bug: in that case the press would show and the buttons would dim.
- Scrolling is native on Android and keeps working while the JS thread is blocked. A transparent `Modal` left behind (`StartPopup.tsx` is the only RN `Modal`) would block scrolling too. So the leading suspect is a **blocked or spinning JS thread after the app returns**. Candidates to check: the refetch burst on return (`useUpdatingOnReturn`, persisted-cache restore), `dayPlan` / `nextSleep` / `accuracySummary` / Days rows recomputed with a `now` hours later, `useNow` intervals catching up. A stuck gesture (avatar stack pull, `features/children/AvatarStack.tsx`) is a weaker suspect: it only exists with two or more children shown.

### Emulator tools for "idle"

- Doze: `adb shell dumpsys deviceidle force-idle` (undo `dumpsys deviceidle unforce`). Standby bucket: `adb shell am set-standby-bucket se.skedeback.molly rare` (or `restricted`), read with `am get-standby-bucket`.
- Kill without the stopped state: `adb shell su 0 kill -9 $(adb shell pidof se.skedeback.molly)` (from `../implan-tap-feedback/NOTES.md`).
- Timing logs: the recipe under "Where the logs went" in `../implan-tap-feedback/NOTES.md`.
- Hours away can be simulated by moving the clock forward (`adb root`, `adb shell settings put global auto_time 0`, `adb shell date <MMDDhhmmYYYY.ss>`) with the app in the background.

## Findings

### Step 1: app freeze (emulator-5554, release build)

**Not reproduced.** A temporary logger (JS-thread stall interval, touches at the root, every Pressable press, pager responder, `freshConnections` timing) was in the build; every scenario below ended with Stop working on the first tap, the JS thread free within ~0.4 s of coming back.

- Seeded 21 days of realistic history for child 1 (3 naps, bedtime 19:30, feeds, diapers; script kept out of the repo), two children shown.
- Start sleep → Home → `rare` bucket → screen off → `force-idle` → clock moved forward (`adb shell date`), 20–30 s, back, tap Stop at +1.5 s: clock +3 h (day), to 21:05 (bedtime → Tonight), to 02:15 next day (past midnight), to 08:05 next day (next morning). All fine.
- Dark theme switched while away (`cmd uimode night yes`; Molly has `uiMode` in `configChanges`, so it gets a live scheme change): fine.
- Opened from the sleep notification instead of the launcher: fine.
- A silently dead HTTPS / HTTP/2 connection in the pool (an `expo/fetch` to `https://1.1.1.1`, then `iptables` DROP both ways, then back): `freshConnections()` took 49 ms. It's a synchronous Expo `Function`, so it runs on the JS thread on every return and at the start of widget and notification tasks; still the leading suspect for the physical phone (a tunnel with TLS + HTTP/2, a reader thread parked in `read`, real network instead of the emulator's), not proven.
- A swipe on the Today card whose finger-up never comes (injected `motionevent DOWN` / `MOVE`, then Home): the next tap after return was lost, the one after worked. Artifact of the injection: InputDispatcher still held the injected pointer down. A real finger always ends.
- Ruled out by reading: a stuck `busy` (`run` in `index.tsx`) dims every button (`opacity-50`), which wasn't seen in the report; Gesture Handler's root intercepting (`RNGestureHandlerRootHelper.shouldIntercept`) would stop scrolling too; `dayPlan`'s `while` loop ends (past the slots in history the age guide always moves the wake forward).
- Worth knowing: when the app's process is alive, the widget's and the notification's headless tasks run in the **app's JS runtime**. A JS thread blocked after idle would explain both reported symptoms (dead Stop in the app, a widget tap that shows nothing for seconds).

**So step 2 ships the Tap log** (below), to catch the freeze on a physical phone.

### Step 1: widget timing (emulator-5554, 4×3 widget, `Wet`, release build)

Tap = `adb shell "log -t MollyTiming tap; input tap …"`; `onReceive` and worker start from temporary `Log.d` in the patched library; handler start and pending drawn from `console.log`. Milliseconds after the tap, three runs each (`idle` = `dumpsys battery unplug` + `deviceidle force-idle`; `killed` = `kill -9` of the process 2 s before):

| | onReceive | worker start | JS handler | pending drawn |
| --- | --- | --- | --- | --- |
| warm, normal | 68–173 | 115–197 | 116–200 | 217–319 |
| warm, force-idle | 38–238 | 115–322 | 116–322 | 214–430 |
| warm, `rare` | 76–150 | 111–161 | 112–161 | 202–275 |
| killed, normal | 180–226 | 190–239 | 292–338 | 405–452 |
| killed, force-idle | 194–223 | 207–231 | 309–338 | 418–474 |
| killed, `rare` | 182–275 | 190–285 | 292–404 | 405–514 |
| killed, `restricted` | 171–233 | 178–243 | 279–364 | 422–503 |

- **The WorkManager hop (onReceive → worker start) is 7–85 ms everywhere: far under the ~1 s gate.** On the emulator step 5 would be skipped; the Tap log now measures the same hop on a physical phone (`widget WIDGET_CLICK …, N ms after the tap`, from `receivedAt`), so step 5 waits for those numbers.
- On the emulator the widget's pending state is never late, so the phone's "seconds of nothing" isn't the WorkManager path in these conditions. Either the phone defers it (quota, OEM) or the JS thread is busy (see above); the Tap log tells which.
- **Dead buttons reproduced and fixed.** Before the patch, after the first measured tap every later `Wet` tap did nothing: no `onReceive`, the launcher logged `ActivityNotFoundException` at `RemoteViews.startPendingIntent`. With the request-code counter (step 4's first item, done early because the measurement needed live buttons) all 30 measured taps fired.

### Patch (`pnpm patch`)

- pnpm 10.12 writes `patchedDependencies` into `pnpm-workspace.yaml`, not the root `package.json` as the plan expected. The patch file is `patches/react-native-android-widget@0.22.1.patch`. Works with `node-linker=hoisted`; `pnpm android:release` (clean prebuild) builds with it. How to change it: `docs/android-build.md`, "Patched widget library".
- Editing `node_modules` in place is refused by the agent's permissions; `pnpm patch --edit-dir <dir>` + `pnpm patch-commit <dir>` is the route (a second `pnpm patch` starts from the current patch).
- In the patch so far: request codes from a process-wide `AtomicInteger` seeded once from the clock (`RNWidget.registerClickTask`); `receivedAt` (`System.currentTimeMillis()` in `RNWidgetProvider.handleWidgetClick`) added to the click's `clickActionData`.

### Tap log (step 2)

- Hidden: Settings now ends with a `Molly 1.0.0` line (from `expo-constants`); long-press it on Android → `/tap-log`: the log as text (monospace, selectable), Share (system share sheet, plain text), Clear.
- `src/tap-log/`: `model.ts` (pure, tested: ring of 600 lines, which late ticks count as stalls, text), `log.android.ts` (runtime), `log.ts` (web no-op). Started in `src/widget/register.android.ts`, so a headless task that starts the JS runtime on its own logs too.
- Each line is sent to AsyncStorage at once (`molly.tap-log`), no batching: if the JS thread then blocks for good, what was logged just before still gets written natively.
- Logged: `app active` / `background`; `stall N ms` (a 100 ms watcher tick more than 200 ms late, while the app is on screen or a headless task runs; gaps of 10 min+ are a frozen process and skipped; React Native pauses timers while the app is away, so the tick right after coming back doesn't count); `touch start / end / cancel` at the root (a cancel is a native scroll taking the touch); `press in <name>` / `press <name>` from the shared `Pressable` (`logName` = a `Button`'s label, else its accessibility label); pager swipe start / end / cancelled; avatar pull end / cancelled; `fresh connections` and `… done in N ms`; `widget <action> <intent>, N ms after the tap`, `<intent> pending drawn`, `<intent> answered: <outcome>`, `<intent> dropped: …`; `notification <intent>`.
- What a freeze would look like in it: `app active`, then `fresh connections` without `done` (the native call blocks), or a long `stall` with no presses after touches (JS busy), or `touch start` / `end` lines with no `press` (responder stuck), or no touch lines at all (touches never reach JS).
- Not cleared on sign-out: it holds labels (a child's first name in the avatar's label), no tokens or data.
- Seen on the emulator while Gradle built in the background: stall lines of 0.2–10 s, the emulator starved of CPU. Lines from such a time say nothing about the app.

## JS-thread load fixes from `implan-expo-review`

Landed there (steps 2, 3, 5), so step 2 here starts from a lighter JS thread: the dashboard re-renders once a minute instead of every second (only the ring centre and a running tile tick, on one shared clock); polls pause while a write is in progress; a tap refetches only what's on screen (no `history`, `past` / `days` only when showing, one sleeps list instead of two); cancelled queries abort their requests; 4xx is never retried; the notification module's `show` / `keepOnly` / `showReminder` / `keepOnlyReminders` / `liveUpdates` are `AsyncFunction`s, awaited in order by `syncNotifications`. `ActionWorker` no longer loses a tap when React finishes starting between its check and its listener, and a notification left on "Stopping…" gets its buttons back when the work ends, fails or times out. Details in `../implan-expo-review/NOTES.md`.

## Open

- **A Tap log from a physical phone** (step 2): a freeze (and a slow widget tap) caught with this build. That decides the step 2 fix and whether step 5 runs.
