# Back to the live ring when the app comes back

GitHub issue #40. Decisions (under "Decided", 2026-10-29) and verified facts are in [`NOTES.md`](NOTES.md), the picture in [`MENTAL_MODEL.md`](MENTAL_MODEL.md), the Definition of Done in [`TEST_STRATEGY.md`](TEST_STRATEGY.md). Work on branch `plan/issue-40-live-on-return` (it holds this plan, cut from `develop`), PR with `--base develop`.

## Outcome

On Android, a parent who picks the phone up after a minute or more away sees the live ring, whatever screen Molly was left on. Recent days, Settings, a child screen, a measurement, the development guide, To-do or Help are gone from the stack (Android back then leaves the app), and the dashboard shows now with its editor, likely panel and pickers closed, as `showLive` does today.

What doesn't change, or changes on purpose:

- **A quick switch** (under a minute) leaves everything as it was, on the dashboard too.
- **Unsaved input is dropped** after a minute away, and Molly says so: one "Changes not saved" toast over the live ring whenever anything with changes was closed. That covers Settings and the child screen (as today when left with changes), the to-do sheet, the measurement sheet, the Add entry sheet and the dashboard's editor. A sheet or editor that was open without changes closes silently.
- **A trip Molly started** (camera or photo picker, a source link, Android's notification prompt or settings) keeps the app as it was on the return from it, however long it took.
- **The Tap log** stays on screen.
- **Signed out** (onboarding, "Can't sign in", Help from either): not affected.
- **The web** keeps today's behaviour: every return (the tab shown again) puts the dashboard back on the live ring; screens above it stay.

## The rule

On every `AppState` change to `active`, with `away` = time since the app last left `active`:

| Platform | Condition | Action |
| --- | --- | --- |
| Android | `away` < 60 s | stay |
| Android | this return ends a trip Molly started | stay |
| Android | the Tap log is on screen | stay |
| Android | otherwise | **go live**: dismiss to the dashboard, then `showLive` |
| web | any return | **show live**: `showLive` on the dashboard only, no dismiss (today's behaviour) |

"Leaving" is the first change away from `active` (`background`, or `inactive` where a platform reports it); later non-active changes don't move the time. A trip mark is set just before Molly sends the app out and is used up by the next return, whatever its length.

## Pieces

- **Return model** (`apps/molly/src/features/return/model.ts`, unit-tested, no React): `AWAY_MS = 60_000` and a small reducer over app-state changes that answers `stay | showLive | goLive` from the platform, the last leave time, the current time, whether the Tap log is on screen and whether a trip was marked. The app's other pure models (`widget/model.ts`, `features/todo/sheet-model.ts`) are the pattern.
- **Provider and hooks** (`apps/molly/src/features/return/`), mounted in `app/(main)/_layout.tsx` inside `ToastProvider`, so only the signed-in app has it:
  - One `AppState` listener feeding the model. The Tap log check is the current route (`usePathname() === '/tap-log'`).
  - `useUnsavedOnReturn(changed: boolean)`: each sheet or editor that can hold a draft reports whether it has changes while it's mounted. On "go live", if any reports `true`, the provider shows one "Changes not saved" toast (`tone: 'danger'`, the same text and tone as `useUnsavedToast`). Settings and the child screen keep their `beforeRemove` toast; the toast shows one at a time and replaces the previous, so the same text twice shows once.
  - `useOnLive(callback)`: the dashboard registers its `showLive`.
  - `leaveOnPurpose()`: a plain module function (not a hook), so `pickPhoto`, `openLink` and `turnOnNotifications` can call it right before they leave the app. Native files only; the web never needs it.
  - On "go live": dismiss every screen above the dashboard, including Help on the root stack, so the history is just the dashboard; then call the registered live callback. `router.dismissTo('/')` is the first thing to try; check on the emulator that back then leaves the app, that Help (root stack, outside `(main)`) goes too, and that Settings with changes still shows its toast. If `dismissTo` doesn't reach Help, dismiss the root stack first, then `(main)`'s.
- **The dashboard** drops its own `AppState` listener and registers with `useOnLive`. On "show live" (web) that's `showLive` alone, the same every-return snap-back as today, with no toast. On "go live" (Android) it's `showLive` plus closing the Add entry sheet (`askingAdd`), which `showLive` leaves open; its other sheets (Today, children, Lock screen, Why) hold no draft and stay as today.
- **Has-changes rules**, pure and unit-tested, one per draft: the editor's existing `isChanged` (`features/dashboard/editor-model.ts`); a new one for the to-do sheet in `features/todo/sheet-model.ts` (text, label, date and time against what the sheet opened with, a new label added, a photo picked or removed); the measurement sheet in `features/measurements/model.ts` (value, typed value, day, time or notes against the sheet's start); the Add entry sheet in `features/add/add-model.ts` (the form against `newDraft` for its kind at opening, so switching the kind tab alone isn't a change). Its 60 s glance timer on a past ring stays as it is.

## Steps

App unit tests in Vitest (`apps/molly`, Given / When / Then, zero → one → many, then boundaries). Android-only behaviour by hand on the emulator (`emulator-5554`, never the developer's phone). Playwright can't drive Android's background, so it only guards that the web is unchanged.

- [ ] **1. Return model (TDD, `features/return/model.test.ts`).**
  - Zero: no change since start → stay.
  - Android, one: away 60 s and back → go live. Away 59 s → stay. Exactly 60 s → go live.
  - Android, trip: a trip mark → stay on that return, whatever the length; the mark is used up, the next long return goes live.
  - Android, Tap log on screen → stay at any length.
  - Web: any return, short or long, trip or not → show live.
  - Several non-active changes in a row (`inactive` then `background`) → away counts from the first.
  - Back to `active` without a leave before it (start-up, a duplicate event) → stay.
- [ ] **2. Provider, hooks and the dashboard.** `ReturnProvider` with `useOnLive` and `leaveOnPurpose` as in Pieces, in `(main)/_layout.tsx`. Dashboard: remove the `AppState` listener (`index.tsx` ~353–358) and the `AppState` import; register `showLive` with `useOnLive`. Drop `SNAP_BACK_MS`'s `export` (no other user). Existing Playwright suites still pass (the web behaves as before).
- [ ] **3. "Changes not saved" for sheets and the editor.**
  - TDD the three new has-changes rules (`sheet-model.test.ts`, `measurements/model.test.ts`, `add-model.test.ts`): unchanged at opening → false (new and existing to-do item); each field changed → true; changed and changed back → false. `isChanged` already has tests.
  - `useUnsavedOnReturn` in the provider, called from `TodoSheet`, `MeasurementSheet`, `AddSheet` and the dashboard (editor open and `isChanged`). The dashboard's go-live callback also closes the Add entry sheet.
  - Unit-test the provider's decision if it's more than "any reported true" (keep it in the model, e.g. `goLive` returns whether to toast from the reported flags).
- [ ] **4. Trips.** `leaveOnPurpose()` just before leaving in `pickPhoto` (`features/todo/photo.native.ts`, camera and library, after the camera permission check), `openLink` (`features/development/open-link.ts`, the native one; `.web.ts` unchanged), and `turnOnNotifications` (`notification/sync.android.ts`, before `ask()`).
- [ ] **5. Emulator checks** (`TEST_STRATEGY.md`, Android section): Home and screen lock with real minutes, back leaves the app, each screen, the "Changes not saved" toast for each draft, widget taps, the camera, source link and settings trips, Tap log, "Can't sign in".
- [ ] **6. Docs.** `CLAUDE.md`: one bullet on the return rule (Android only, a minute away, drafts dropped with "Changes not saved", trips, Tap log; the web snaps the dashboard back on every return) and where it lives (`features/return/`). `plans/implan-ring-day-nav/MAIN.md` line 40: mark "the app returning from the background still goes to now" as replaced by this plan on Android (after a minute away). `plans/README.md` row status.
- [ ] **7. Wrap-up.** `implan-cleanup` wrap-up sweep on the diff, `pnpm check` and `pnpm e2e` green, every box in `TEST_STRATEGY.md` ticked, PR into `develop`, issue #40 updated with anything that changed during the work.

## Assumptions

- Android's `AppState` goes `active` → `background` on Home, screen lock, the camera, the photo picker and the notification prompt, and back to `active` on return. If a permission prompt turns out not to leave `active`, the mark is used up by the next `active` anyway (step 1's "used up" test), so it can't linger.
- JS timers pause in the background on Android, so the minute is measured with `Date.now()` at leave and return, never with a timer.
- Process death: if Android killed Molly while away, it starts fresh on the dashboard anyway.

## Out of scope

- The web: no change beyond moving the dashboard's snap-back into the shared listener.
- Keeping unsaved input.
- A toast on the web or when a sheet is closed any other way (back, scrim): only the return says "Changes not saved".
- Deep links from notifications to a screen (e.g. a to-do reminder opening To-do).
- The past ring's in-app 60 s glance timer.
- Closing the dashboard's other sheets (Today, children, Lock screen, Why) on return: they hold no draft, `showLive` doesn't close them today, and still won't. Only the Add entry sheet is closed on going live.
- iOS: the app ships for Android and the web only.
