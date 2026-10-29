# Back to the live ring when the app comes back

GitHub issue #40. Decisions (under "Decided", 2026-10-29) and verified facts are in [`NOTES.md`](NOTES.md), the picture in [`MENTAL_MODEL.md`](MENTAL_MODEL.md), the Definition of Done in [`TEST_STRATEGY.md`](TEST_STRATEGY.md). Work on branch `plan/issue-40-live-on-return` (it holds this plan, cut from `develop`), PR with `--base develop`.

## Outcome

On Android, a parent who picks the phone up after a minute or more away sees the live ring, whatever screen Molly was left on. Recent days, Settings, a child screen, a measurement, the development guide, To-do or Help are gone from the stack (Android back then leaves the app), and the dashboard shows now with its editor, likely panel and pickers closed, as `showLive` does today.

What doesn't change, or changes on purpose:

- **A quick switch** (under a minute) leaves everything as it was, on the dashboard too.
- **Unsaved input is dropped** after a minute away, like any other screen. Settings and the child screen say "Changes not saved" as they already do when left with changes (`useUnsavedToast`, on `beforeRemove`). The to-do, measurement and Add entry sheets and the dashboard's editor close without a word, as they do today when closed any other way.
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
  - One `AppState` listener feeding the model. The Tap log check is the current route (`usePathname() === '/tap-log'`); nothing else needs to register.
  - `useOnLive(callback)`: the dashboard registers its `showLive`.
  - `leaveOnPurpose()`: a plain module function (not a hook), so `pickPhoto`, `openLink` and `turnOnNotifications` can call it right before they leave the app. Native files only; the web never needs it.
  - On "go live": dismiss every screen above the dashboard, including Help on the root stack, so the history is just the dashboard; then call the registered `showLive`. `router.dismissTo('/')` is the first thing to try; check on the emulator that back then leaves the app, that Help (root stack, outside `(main)`) goes too, and that Settings with changes still shows its toast. If `dismissTo` doesn't reach Help, dismiss the root stack first, then `(main)`'s.
- **The dashboard** drops its own `AppState` listener and uses `useOnLive(showLive)`. On the web that gives the same every-return snap-back as today; on Android it now waits for the minute. Its 60 s glance timer on a past ring stays as it is.

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
- [ ] **3. Trips.** `leaveOnPurpose()` just before leaving in `pickPhoto` (`features/todo/photo.native.ts`, camera and library, after the camera permission check), `openLink` (`features/development/open-link.ts`, the native one; `.web.ts` unchanged), and `turnOnNotifications` (`notification/sync.android.ts`, before `ask()`).
- [ ] **4. Emulator checks** (`TEST_STRATEGY.md`, Android section): Home and screen lock with real minutes, back leaves the app, each screen, the "Changes not saved" toast, widget taps, the camera, source link and settings trips, Tap log, "Can't sign in".
- [ ] **5. Docs.** `CLAUDE.md`: one bullet on the return rule (Android only, a minute away, trips, Tap log; the web snaps the dashboard back on every return) and where it lives (`features/return/`). `plans/implan-ring-day-nav/MAIN.md` line 40: mark "the app returning from the background still goes to now" as replaced by this plan on Android (after a minute away). `plans/README.md` row status.
- [ ] **6. Wrap-up.** `implan-cleanup` wrap-up sweep on the diff, `pnpm check` and `pnpm e2e` green, every box in `TEST_STRATEGY.md` ticked, PR into `develop`, issue #40 updated with anything that changed during the work.

## Assumptions

- Android's `AppState` goes `active` → `background` on Home, screen lock, the camera, the photo picker and the notification prompt, and back to `active` on return. If a permission prompt turns out not to leave `active`, the mark is used up by the next `active` anyway (step 1's "used up" test), so it can't linger.
- JS timers pause in the background on Android, so the minute is measured with `Date.now()` at leave and return, never with a timer.
- Process death: if Android killed Molly while away, it starts fresh on the dashboard anyway.

## Out of scope

- The web: no change beyond moving the dashboard's snap-back into the shared listener.
- Keeping unsaved input, or warning about dropped sheets that don't warn today.
- Deep links from notifications to a screen (e.g. a to-do reminder opening To-do).
- The past ring's in-app 60 s glance timer.
- Closing the dashboard's other sheets (Today, children, Lock screen, Why) on return: `showLive` doesn't today, and still won't. They belong to the dashboard, which stays mounted under the dismissed screens, so they stay open.
- iOS: the app ships for Android and the web only.
