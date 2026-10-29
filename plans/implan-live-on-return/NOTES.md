# Notes

## Decided (2026-10-29)

Answered by the developer after a first draft with recommendations.

1. **Only after a minute away (60 s, `AWAY_MS`)**, the same length as the past ring's glance (`SNAP_BACK_MS`). A quicker switch leaves every screen as it was, the dashboard included.
2. **Unsaved input is not kept.** After a minute away Molly goes live anyway and the draft is dropped. Settings and the child screen show the existing "Changes not saved" toast (`useUnsavedToast` fires on `beforeRemove`, which the dismiss triggers). The to-do, measurement and Add entry sheets and the dashboard's editor have no such toast today and close silently; adding one is out of scope. (Rejected: keeping the screen while a form is dirty or an edit sheet is open.)
3. **A trip Molly started keeps the screen on that one return**, however long: camera or photo picker (`pickPhoto`), a development source link (`openLink`), Android's notification prompt or settings (`turnOnNotifications`). The mark is used up by the next return.
4. **The Tap log stays open** (excluded): it logs the app going and coming, and being thrown out would hide that. Checked by route (`/tap-log`), the only thing that holds. Not affected either: onboarding, "Can't sign in" (`KeyRejected` at `/onboarding`), Help opened from them; the rule lives in the signed-in `(main)` layout. Covered screens: Recent days, Settings, the child screen, a measurement's screen, the development guide pages, To-do, and Help over the signed-in app.
5. **The dashboard follows the same minute rule on Android.** Its own every-return listener goes; the shared listener calls its `showLive`. A quick switch keeps a past ring, the likely panel, pickers and the editor. The in-app 60 s glance timer stays.
6. **Android only.** The web keeps today's behaviour: every return (tab shown again) calls the dashboard's `showLive`, screens above it stay, no minute, no dismiss. Done through the same shared listener (the model answers `showLive` on the web), so the dashboard's own listener can still go without changing the web. Playwright can't drive Android's background, so coverage is the Vitest model tests plus the emulator checklist; the existing Playwright suites only guard that the web is unchanged.

## Facts from the code (develop, 2026-10-29)

- Dashboard (`apps/molly/src/app/(main)/index.tsx`): `showLive` (~line 322) clears `viewKey` and `wantAt` and calls `closePanels` (editor, likely panel, picker → tiles). An `AppState` `change` listener (~line 353) calls `showLive` on every `active`. A past ring also snaps back after `SNAP_BACK_MS` = 60 s in the foreground (paused while the editor is open). `SNAP_BACK_MS` is exported but used nowhere else.
- Navigation: root `Stack` in `app/_layout.tsx` with `Stack.Protected` groups `(main)` (signed in) and `onboarding` (not), and `help` at the root outside both. `(main)/_layout.tsx` is a `Stack` with `unstable_settings = { anchor: 'index' }`, wrapped in `ToastProvider`. Screens above `index`: `recent-days`, `settings`, `todo`, `tap-log`, `child/[id]/index`, `child/[id]/[measure]`, `child/[id]/development/{index,ages,[topic]}`. Expo Router `~57.0.24`.
- Recent days opens a past ring with `router.navigate('/', { window })`; the dashboard clears its `window` / `edit` params once used.
- Drafts (dropped on going live, see Decided 2): Settings `SettingsForm` and `ChildForm` (`child/[id]/index.tsx`) hold `draft` + `dirty` and call `useUnsavedToast(dirty, 'Changes not saved')` (`features/settings/unsaved.ts`, on `beforeRemove`). To-do: `editing` state in `todo.tsx` opens `TodoSheet` (`draft`, `photoDraft`). Child screen: `adding` opens `MeasurementSheet`; `MeasurementScreen` opens it too. Dashboard: `editing` (inline editor; `isChanged`), `askingAdd` (`AddSheet`).
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

## Open

- None besides the decisions above.
