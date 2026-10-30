# Notes

## Decided (2026-10-29)

Answered by the developer after a first draft with recommendations.

1. **Only after a minute away (60 s, `AWAY_MS`)**, the same length as the past ring's glance (`SNAP_BACK_MS`). A quicker switch leaves every screen as it was, the dashboard included.
2. **Unsaved input is not kept, and "Changes not saved" says so everywhere.** After a minute away Molly goes live anyway and the draft is dropped. Settings and the child screen show their existing toast (`useUnsavedToast` fires on `beforeRemove`, which the dismiss triggers). The to-do, measurement and Add entry sheets and the dashboard's editor toast too, when the return closes them **with changes**; open without changes they close silently. One toast however many drafts were dropped. Going live also closes the Add entry sheet (`showLive` alone doesn't). Web: no toast, unchanged. (Rejected: keeping the screen while a form is dirty or an edit sheet is open; toasting only on Settings and the child screen.)
3. **A trip Molly started keeps the screen on that one return**, however long: camera or photo picker (`pickPhoto`), a development source link (`openLink`), Android's notification prompt or settings (`turnOnNotifications`). The mark is used up by the next return.
4. **The Tap log stays open** (excluded): it logs the app going and coming, and being thrown out would hide that. Checked by route (`/tap-log`), the only thing that holds. Not affected either: onboarding, "Can't sign in" (`KeyRejected` at `/onboarding`), Help opened from them; the rule lives in the signed-in `(main)` layout. Covered screens: Recent days, Settings, the child screen, a measurement's screen, the development guide pages, To-do, and Help over the signed-in app.
5. **The dashboard follows the same minute rule on Android.** Its own every-return listener goes; the shared listener calls its `showLive`. A quick switch keeps a past ring, the likely panel, pickers and the editor. The in-app 60 s glance timer stays.
6. **Android only.** The web keeps today's behaviour: every return (tab shown again) calls the dashboard's `showLive`, screens above it stay, no minute, no dismiss. Done through the same shared listener (the model answers `showLive` on the web), so the dashboard's own listener can still go without changing the web. Playwright can't drive Android's background, so coverage is the Vitest model tests plus the emulator checklist; the existing Playwright suites only guard that the web is unchanged.

## Facts from the code (develop, 2026-10-29)

- Dashboard (`apps/molly/src/app/(main)/index.tsx`): `showLive` (~line 322) clears `viewKey` and `wantAt` and calls `closePanels` (editor, likely panel, picker → tiles). An `AppState` `change` listener (~line 353) calls `showLive` on every `active`. A past ring also snaps back after `SNAP_BACK_MS` = 60 s in the foreground (paused while the editor is open). `SNAP_BACK_MS` is exported but used nowhere else.
- Navigation: root `Stack` in `app/_layout.tsx` with `Stack.Protected` groups `(main)` (signed in) and `onboarding` (not), and `help` at the root outside both. `(main)/_layout.tsx` is a `Stack` with `unstable_settings = { anchor: 'index' }`, wrapped in `ToastProvider`. Screens above `index`: `recent-days`, `settings`, `todo`, `tap-log`, `child/[id]/index`, `child/[id]/[measure]`, `child/[id]/development/{index,ages,[topic]}`. Expo Router `~57.0.24`.
- Recent days opens a past ring with `router.navigate('/', { window })`; the dashboard clears its `window` / `edit` params once used.
- Drafts (dropped on going live with a toast, see Decided 2): Settings `SettingsForm` and `ChildForm` (`child/[id]/index.tsx`) hold `draft` + `dirty` and call `useUnsavedToast(dirty, 'Changes not saved')` (`features/settings/unsaved.ts`, on `beforeRemove`). To-do: `editing` state in `todo.tsx` opens `TodoSheet` (`draft`, `photoDraft`). Child screen: `adding` opens `MeasurementSheet`; `MeasurementScreen` opens it too. Dashboard: `editing` (inline editor; `isChanged`, tested in `editor-model.test.ts`), `askingAdd` (`AddSheet`, form from `newDraft(kind, now)` in `features/add/add-model.ts`). `MeasurementSheet` keeps value, typed, day choice, picked date, clock, clock typed and notes in separate `useState`s, starting from `sheetStart(kind, lists, now)`. `TodoSheet`: `draft` from `todoDraftOf` / `newTodoDraft`, `photoDraft` (`keep` at opening), `added` labels. None of the three sheets has a has-changes rule yet. The toast (`features/toast/toast.tsx`) shows one at a time; a new one replaces the shown one.
- Trips out of the app: `pickPhoto` (`features/todo/photo.native.ts`, camera / Android photo picker), `openLink` (`features/development/open-link.ts`, `Linking.openURL`; `.web.ts` opens a new tab), `turnOnNotifications` (`notification/sync.android.ts`: Android's prompt, or `MollyNotify.openSettings()`). All three put the app in the background on Android.
- Other `AppState` listeners, all unrelated and staying: widget sync (`app/_layout.tsx`), query focus + `freshConnections` (`lib/query.tsx`, native only), `useUpdatingOnReturn` (`features/dashboard/use-updating.ts`), `useNotificationState` (`notification/use-state.ts`), the Tap log (`tap-log/log.android.ts`).
- react-native-web `AppState`: `currentState` is `background` when `document.visibilityState` is `hidden`, and `change` fires on `visibilitychange`. That's how the dashboard's snap-back works on the web today; it isn't covered by a Playwright test, and this plan doesn't add one (the web is unchanged).
- Widget and lock-screen notification taps use `OPEN_APP` with no route, so they land on whatever the app last showed: exactly the case this plan fixes.

## Parallel work

- Issue #30 (`plan/issue-30-todo-read-only`, not merged yet) adds a read-only `TodoView` sheet to `todo.tsx`. This plan doesn't touch `todo.tsx`, so no conflict is expected; the read-only sheet simply closes with the dismiss.
- Issues #34 (to-do pickers) and #36 (reminder off) change `TodoSheet` internals, not whether it's open.

## Cleanup sweep (planning)

- **Remove**: the dashboard's own `AppState` listener (`index.tsx` ~353–358), replaced by the shared rule (step 2). `AppState` drops from that file's `react-native` import. The web keeps its behaviour through the shared listener.
- **Refactor**: `SNAP_BACK_MS` loses its `export` (no other user; route files should export only the screen and router config), or moves next to `AWAY_MS` if both are kept as one constant. Implementer's call.
- **Docs**: `plans/implan-ring-day-nav/MAIN.md` line 40 says "the app returning from the background still goes to now": mark it as replaced by this plan (after a minute away). `CLAUDE.md` has no word on returns yet; step 5 adds one.
- **Spotted, not in scope**: a to-do reminder notification opens the app with `OPEN_APP` like the rest, so it lands on the live ring, not the to-do list; a deep link there would be a separate issue.

## During the work (2026-10-29)

- **Stacked on #30**: the plan branch was cut from `develop`; `plan/issue-30-todo-read-only` (PR #39, not merged yet) is merged into it so the PR can target that branch. GitHub retargets it to `develop` once #39 merges.
- **The model** (`features/return/model.ts`) keeps only the leave time; `onAppState(state, status, now, { platform, tapLog, trip })` answers `stay | showLive | goLive`, and `toastOnReturn(answer, drafts)` says whether to show "Changes not saved". Anything not `web` counts as Android (no iOS build).
- **Trips** live in their own module (`features/return/trip.ts`), not in the provider, so `notification/sync.android.ts` (also loaded by headless tasks) and `photo.native.ts` import no React. Every `AppState` change goes through `tripOnAppState(status)`.
- **Found on the emulator: Android flickers before the camera opens.** Tapping Camera in the to-do sheet logged `app background`, `active`, `background`, `active`, `background` within 400 ms (Tap log), then the real `active` 79 s later. The first plan (a one-shot mark used up by the next return) lost the mark on the flicker, and the camera's return went live with "Changes not saved". So there are two kinds of trip:
  - `awayOnPurpose(action)` for an action that leaves and settles once back (`pickPhoto`, camera prompt included; `PermissionsAndroid.request` in `ask()`): every return while it runs is the trip's; when it settles the trip ends, or, if the app is still away then (the result can arrive before Android's resume), with the next return.
  - `leaveOnPurpose()` for a fire-and-forget leave (`openLink`, `MollyNotify.openSettings()`, and `openLiveUpdateSettings()`, which the plan missed): the next return is the trip's.
  This replaces step 4's "before `ask()`": an `ask()` that answers without a prompt never leaves, so it marks nothing.
- **Keyboard**: going live from the to-do sheet once left Android's keyboard up over the dashboard (the focused field unmounted); `Keyboard.dismiss()` on going live.
- **The provider's registry** is a closure from `useState(newRegistry)` (React Compiler's lint refuses writing to a ref from context). `useOnLive` registers the dashboard's callback; `useUnsavedOnReturn(changed)` keeps one flag per mounted draft (by `useId`) and drops it on unmount.
- **Has-changes rules**: `todoChanged(opened, draft, { photo, added })` compares the trimmed text, label, day, the Other day only when picked, and the time only with a date and "At a time"; any picked or removed photo or new label counts. `measurementChanged(kind, opened, sheet)` counts typed text only when it reads as a different value (`typedMeasurement`), a typed clock only when it differs, notes trimmed. `addChanged(opened, draft)` compares every field but the kind (switching the tab alone isn't a change; `note` is reset by the switch, as at opening). A half-typed clock in Add's time field (local `typed` state) isn't counted: the field's draft time only moves once it reads as a time.
- **Going live**: the toast first, then `router.dismissTo('/')` when `router.canDismiss()`, then the dashboard's callback (`showLive`, and `setAskingAdd(false)`).

## Emulator checks (emulator-5554, release APK, 2026-10-29)

Passed: Recent days → Home 62 s → live ring, back leaves the app; Settings with a changed switch → screen lock 63 s → live ring + "Changes not saved", the change gone on reopening; Settings quick switch (20 s) → still Settings; Settings' Live Updates "Open settings" 60 s in Android settings → back on Settings, and the next long return (from the child screen) → live ring; measurement sheet untouched → live, no toast; Settings changed + child screen + measurement sheet changed → one "Changes not saved"; To-do "Add item" untouched → live, no toast; with text → live + toast, keyboard closed (after the fix); Add entry: kind tab switched only → closed, no toast; start −5 → closed + toast; editor untouched → closed, no toast; start −5 → closed + toast; yesterday's night: 20 s away → still the past ring, 62 s → live; development topic page, a source link with 60 s in Chrome → still the topic page, next long return → live; Help (deep link `molly://help`) → live ring, back leaves the app; Tap log 62 s → still the Tap log; the development page, 60 s, widget title tap (`OPEN_APP`) → live ring, back leaves the app; To-do "Add item", Camera, 62 s in the camera, photo taken → back in the sheet with the photo (after the trip fix).

Not run, open for the developer: Android's notification prompt and "Open Android settings" from "Notifications are off" (the emulator already allows notifications; the Live Updates settings trip, the same `leaveOnPurpose` path, was run instead, and the prompt's path is `awayOnPurpose` like the camera); "Can't sign in" (would need a broken key on the shared test Baby Buddy; the provider only exists in the signed-in layout); a measurement's own screen (the sheet on the child screen was run); the web by hand (hide and show the tab: dashboard on a past ring → live, Settings stays, no toast). A widget feed was logged by a stray tap during the checks (test Baby Buddy only).

## Cleanup sweep (wrap-up)

- Done as planned: the dashboard's own `AppState` listener and its import are gone; `SNAP_BACK_MS` is no longer exported (no other user). No other code, copy, tests or docs described the old every-return snap-back (`grep` for `AppState`, "back to now", "comes back" in `apps/molly/src`, `e2e/tests`, `docs`); the remaining `AppState` listeners are unrelated (widget sync, query focus, "Updating…", notification state, Tap log).
- Not merged: `SNAP_BACK_MS` and `AWAY_MS` are both 60 s but mean different things (a glance on screen, time away); kept apart.
- Spotted, not in scope: still the to-do reminder deep link (above).

## Open

- None besides the decisions above.
