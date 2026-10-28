# Back to the live ring when the app comes back

GitHub issue #40. Decisions and verified facts are in [`NOTES.md`](NOTES.md) (six of them under "Decisions to confirm": read those first, the developer may have flipped one), the picture in [`MENTAL_MODEL.md`](MENTAL_MODEL.md), the Definition of Done in [`TEST_STRATEGY.md`](TEST_STRATEGY.md). Work on branch `plan/issue-40-live-on-return` (it holds this plan, cut from `develop`), PR with `--base develop`.

## Outcome

A parent who picks the phone up after a minute or more away sees the live ring, whatever screen Molly was left on. Recent days, Settings, a child screen, a measurement, the development guide, To-do or Help are gone from the stack (Android back then leaves the app), and the dashboard shows now with its editor, likely panel and pickers closed, as `showLive` does today.

What doesn't change:

- **A quick switch** (under a minute) leaves everything as it was, on the dashboard too.
- **Unsaved input** keeps the app as it was, however long the parent was away: Settings or a child screen with changes, an open to-do or measurement sheet, the Add entry sheet, the dashboard's editor with changes.
- **A trip Molly started** (camera or photo picker, a source link, Android's notification prompt or settings) keeps the app as it was on the return from it.
- **The Tap log** stays on screen.
- **Signed out** (onboarding, "Can't sign in", Help from either): not affected.

## The rule

On every `AppState` change to `active`, with `away` = time since the app last left `active`:

| | Goes live |
| --- | --- |
| `away` < 60 s | no |
| something holds (unsaved input, Tap log) | no |
| this return ends a trip Molly started | no |
| otherwise | yes: dismiss to the dashboard, then `showLive` |

"Leaving" is the first change away from `active` (`background`, or `inactive` where a platform reports it); later non-active changes don't move the time. A trip mark is set just before Molly sends the app out and is used up by the next return, whatever its length.

## Pieces

- **Return model** (`apps/molly/src/features/return/model.ts`, unit-tested, no React): `AWAY_MS = 60_000` and a small reducer over app-state changes that answers "go live?" from the last leave time, the current time, whether anything holds and whether a trip was marked. The app's other pure models (`widget/model.ts`, `features/todo/sheet-model.ts`) are the pattern.
- **Provider and hooks** (`apps/molly/src/features/return/`), mounted in `app/(main)/_layout.tsx` inside `ToastProvider`, so only the signed-in app has it:
  - `useKeepOnReturn(holding: boolean)`: a screen or sheet says it holds while mounted. Any mounted hold counts, so a dirty Settings under a child screen still keeps the stack.
  - `useOnLive(callback)`: the dashboard registers its `showLive`.
  - `leaveOnPurpose()`: a plain module function (not a hook), so `pickPhoto`, `openLink` and `turnOnNotifications` can call it right before they leave the app.
  - On "go live": dismiss every screen above the dashboard, including Help on the root stack, so the history is just the dashboard; then call the registered `showLive`. `router.dismissTo('/')` is the first thing to try; check on the emulator that back then leaves the app and that Help (root stack, outside `(main)`) goes too. If it doesn't, dismiss the root stack first, then `(main)`'s.
- **The dashboard** drops its own `AppState` listener and uses `useOnLive(showLive)`. Its 60 s glance timer on a past ring stays as it is.

## Steps

App unit tests in Vitest (`apps/molly`, Given / When / Then, zero → one → many, then boundaries). Screens through Playwright on the web image. Android-only behaviour by hand on the emulator (`emulator-5554`, never the developer's phone).

- [ ] **1. Return model (TDD, `features/return/model.test.ts`).**
  - Zero: no change since start → nothing to do.
  - One: away 60 s and back → go live. Away 59 s → stay. Exactly 60 s → go live.
  - A hold → stay at any length; the hold gone at the next return → go live again.
  - A trip mark → stay on that return, whatever the length; the mark is used up, the next long return goes live.
  - Several non-active changes in a row (`inactive` then `background`) → away counts from the first.
  - Back to `active` without a leave before it (start-up, a duplicate event) → stay.
- [ ] **2. Provider, hooks and the dashboard.** `ReturnProvider` with `useKeepOnReturn`, `useOnLive`, `leaveOnPurpose` as in Pieces, in `(main)/_layout.tsx`. Dashboard: remove the `AppState` listener (`index.tsx` ~353–358) and the `AppState` import; register `showLive` with `useOnLive`. Drop `SNAP_BACK_MS`'s `export` (no other user). Existing `ring.spec.ts` / `recent-days.spec.ts` still pass.
- [ ] **3. Holds.**
  - `SettingsForm` (`settings.tsx`): `useKeepOnReturn(dirty)`.
  - `ChildForm` (`child/[id]/index.tsx`): `useKeepOnReturn(dirty || adding !== null)`.
  - `MeasurementScreen`: while its `MeasurementSheet` is open.
  - `todo.tsx`: `useKeepOnReturn(editing !== null)` (the `TodoSheet`, new or edit; not the photo viewer or, once #30 is in, the read-only `TodoView`).
  - Dashboard: `useKeepOnReturn(askingAdd || (editing !== null && isChanged(editing.draft, editing.target)))`.
  - Tap log (`tap-log.tsx`): `useKeepOnReturn(true)`.
- [ ] **4. Trips.** `leaveOnPurpose()` just before leaving in `pickPhoto` (`features/todo/photo.native.ts`, both camera and library, after the camera permission check), `openLink` (`features/development/open-link.ts` and `.web.ts`), and `turnOnNotifications` (`notification/sync.android.ts`, before `ask()`). The web `photo.ts` and `sync.ts` fallbacks need nothing.
- [ ] **5. Playwright** (new `e2e/tests/live-on-return.spec.ts`). A helper `awayFor(page, duration)`: stub `document.visibilityState` as `hidden`, dispatch `visibilitychange`, `page.clock.fastForward(duration)`, stub `visible`, dispatch again. Scenarios as in `TEST_STRATEGY.md` (the issue's Gherkin). Install the clock before sign-in, as `ring.spec.ts` does.
- [ ] **6. Emulator checks** (`TEST_STRATEGY.md`, Android section): Home button and screen lock, real minutes, back leaves the app, widget and notification taps, the photo and settings trips, Tap log.
- [ ] **7. Docs.** `CLAUDE.md`: one bullet (or a sentence in the dashboard/architecture notes) on the return rule and where it lives (`features/return/`). `plans/implan-ring-day-nav/MAIN.md` line 40: mark "the app returning from the background still goes to now" as replaced by this plan (after a minute away). `plans/README.md` row status.
- [ ] **8. Wrap-up.** `implan-cleanup` wrap-up sweep on the diff, `pnpm check` and `pnpm e2e` green, every box in `TEST_STRATEGY.md` ticked, PR into `develop`, issue #40 updated with anything that changed during the work.

## Assumptions

- Android's `AppState` goes `active` → `background` on Home, screen lock, the camera, the photo picker and the notification prompt, and back to `active` on return. If a permission prompt turns out not to leave `active`, `leaveOnPurpose` there is harmless: the mark is used by the next real return. Then clear it on the next `active` regardless, so it can't linger (step 1's "used up" test covers this).
- JS timers pause in the background on Android, so the minute is measured with `Date.now()` at leave and return, never with a timer.
- Process death: if Android killed Molly while away, it starts fresh on the dashboard anyway.

## Out of scope

- Deep links from notifications to a screen (e.g. a to-do reminder opening To-do).
- The past ring's in-app 60 s glance timer.
- Closing the dashboard's other sheets (Today, children, Lock screen, Why) on return: `showLive` doesn't today, and still won't.
- iOS: the app ships for Android and the web only.
