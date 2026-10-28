# Notes

## Decisions to confirm

Planned without the developer at hand (2026-10-29). Each is the recommendation the plan is written around; the alternative says what changes if it's flipped. Flip one by editing it here and the matching lines in `MAIN.md`, `MENTAL_MODEL.md` and `TEST_STRATEGY.md`.

1. **Only after a minute away.** Back to the live ring when the app was away at least 60 s (`AWAY_MS`, the same length as the past ring's glance, `SNAP_BACK_MS`). A quicker switch (copying a phone number into a to-do, glancing at a message) leaves every screen as it was.
   - Alternative A: every return, as the dashboard does today. Simpler, but the issue's own worry (a quick app switch throws the parent out) comes true.
   - Alternative B: a longer wait (5 or 15 min). Fewer surprises mid-task, but a parent who glanced away for 3 min comes back to Settings instead of now.
2. **Unsaved input keeps the screen, and the whole stack under it.** The app stays exactly as it was (no navigation, no `showLive`) while any of these is true on any mounted screen:
   - Settings or the child screen has unsaved changes (their `dirty`, the same flag `useUnsavedToast` uses).
   - An edit sheet is open, changed or not: the to-do `TodoSheet` (new or edit), `MeasurementSheet` (child screen and measurement screen), the dashboard's `AddSheet`.
   - The dashboard's inline editor is open **with changes** (`isChanged` in `features/dashboard/editor-model.ts`). An unchanged editor is a glance at an entry and closes as today.
   - No time limit: a sheet left open overnight is still open in the morning.
   - Alternative A: sheets count only with changes, as the issue suggested. Needs a dirty flag in `TodoSheet` and `MeasurementSheet`, and a photo being taken for an untouched item would be lost unless decision 3 also covers it (it does, so this is a valid flip).
   - Alternative B: drafts are dropped; Settings and the child screen still say "Changes not saved" (their `beforeRemove` toast fires on the dismiss). Simplest, loses typing.
   - Alternative C: a cap, e.g. a held screen gives way after 30 min away.
3. **A trip Molly sent the parent on keeps the screen.** When Molly itself sends the app to the background, the next return never navigates, however long it took: the camera or photo picker (`pickPhoto`), a development source link (`openLink`), Android's notification prompt or settings (`turnOnNotifications`). Without this, reading a source page for two minutes would land the parent on the dashboard instead of the guide page they came from.
   - Alternative: no trips; only decision 2 holds. Source links and Android settings then return to the dashboard after a minute (the photo is still safe while its sheet counts as open).
4. **Screens: everything a signed-in parent reaches above the dashboard**: Recent days, Settings, the child screen, a measurement's screen, the development guide pages (index, ages, topic), To-do, and Help when it's open over the signed-in app.
   - **Not the Tap log**: it's the diagnostic screen that logs the app going and coming (`app background`, `fresh connections`); being thrown out of it would hide what it just recorded. It holds like decision 2.
   - Not affected: onboarding, the "Can't sign in" screen (`KeyRejected` at `/onboarding`), Help opened from either. The rule lives in the signed-in `(main)` layout, which isn't mounted for them.
   - Alternative: the Tap log returns too (drop its hold).
5. **The dashboard follows the same rule.** Its own every-return `AppState` listener goes; the shared rule calls its `showLive` instead. A quick switch now keeps a past ring, an open likely panel or picker, and the editor; after a minute away they close as today. The in-app 60 s glance timer on a past ring stays.
   - Alternative: the dashboard keeps snapping to now on every return (today's behaviour), and only the screens above it wait for the minute. Two rules for one gesture, and the editor's changes are still dropped on a quick switch.
6. **Web too.** The same code runs on the web, where `AppState` follows the tab's visibility (react-native-web listens to `visibilitychange`). Hiding the tab for a minute or more brings the dashboard back. This is also what makes the screens testable in Playwright.
   - Alternative: Android only (`Platform.OS` check). The web keeps today's behaviour (dashboard snaps on every return, other screens stay).

## Facts from the code (develop, 2026-10-29)

- Dashboard (`apps/molly/src/app/(main)/index.tsx`): `showLive` (~line 322) clears `viewKey` and `wantAt` and calls `closePanels` (editor, likely panel, picker → tiles). An `AppState` `change` listener (~line 353) calls `showLive` on every `active`. A past ring also snaps back after `SNAP_BACK_MS` = 60 s in the foreground (paused while the editor is open). `SNAP_BACK_MS` is exported but used nowhere else.
- Navigation: root `Stack` in `app/_layout.tsx` with `Stack.Protected` groups `(main)` (signed in) and `onboarding` (not), and `help` at the root outside both. `(main)/_layout.tsx` is a `Stack` with `unstable_settings = { anchor: 'index' }`, wrapped in `ToastProvider`. Screens above `index`: `recent-days`, `settings`, `todo`, `tap-log`, `child/[id]/index`, `child/[id]/[measure]`, `child/[id]/development/{index,ages,[topic]}`. Expo Router `~57.0.24`.
- Recent days opens a past ring with `router.navigate('/', { window })`; the dashboard clears its `window` / `edit` params once used.
- Drafts: Settings `SettingsForm` and `ChildForm` (`child/[id]/index.tsx`) hold `draft` + `dirty` and call `useUnsavedToast(dirty, 'Changes not saved')` (`features/settings/unsaved.ts`, on `beforeRemove`). To-do: `editing` state in `todo.tsx` opens `TodoSheet` (`draft`, `photoDraft`). Child screen: `adding` opens `MeasurementSheet`; `MeasurementScreen` opens it too. Dashboard: `editing` (inline editor; `isChanged`), `askingAdd` (`AddSheet`).
- Trips out of the app: `pickPhoto` (`features/todo/photo.native.ts`, camera / Android photo picker), `openLink` (`features/development/open-link.ts`, `Linking.openURL`; `.web.ts` opens a new tab), `turnOnNotifications` (`notification/sync.android.ts`: Android's prompt, or `MollyNotify.openSettings()`). All three put the app in the background on Android.
- Other `AppState` listeners, all unrelated and staying: widget sync (`app/_layout.tsx`), query focus + `freshConnections` (`lib/query.tsx`, native only), `useUpdatingOnReturn` (`features/dashboard/use-updating.ts`), `useNotificationState` (`notification/use-state.ts`), the Tap log (`tap-log/log.android.ts`).
- react-native-web `AppState`: `currentState` is `background` when `document.visibilityState` is `hidden`, and `change` fires on `visibilitychange`. Playwright can stub `document.visibilityState` and dispatch the event; `page.clock.fastForward` moves `Date.now()` (see `e2e/tests/ring.spec.ts`, "a past window snaps back to now after a minute").
- Widget and lock-screen notification taps use `OPEN_APP` with no route, so they land on whatever the app last showed: exactly the case this plan fixes.

## Parallel work

- Issue #30 (`plan/issue-30-todo-read-only`, not merged yet) adds a read-only `TodoView` sheet to `todo.tsx`. It holds no draft, so it doesn't hold (closed by the dismiss). Its `editing` → `TodoSheet` path is unchanged, so step 3's to-do hold applies the same either way; expect a merge conflict in `todo.tsx` only.
- Issues #34 (to-do pickers) and #36 (reminder off) change `TodoSheet` internals, not whether it's open.

## Cleanup sweep (planning)

- **Remove**: the dashboard's own `AppState` listener (`index.tsx` ~353–358), replaced by the shared rule (step 2). `AppState` drops from that file's `react-native` import.
- **Refactor**: `SNAP_BACK_MS` loses its `export` (no other user; route files should export only the screen and router config), or moves next to `AWAY_MS` if both are kept as one constant. Implementer's call.
- **Docs**: `plans/implan-ring-day-nav/MAIN.md` line 40 says "the app returning from the background still goes to now": mark it as replaced by this plan (after a minute away). `CLAUDE.md` has no word on returns yet; step 6 adds one.
- **Spotted, not in scope**: a to-do reminder notification opens the app with `OPEN_APP` like the rest, so it lands on the live ring, not the to-do list; a deep link there would be a separate issue.

## Open

- None besides the decisions above.
