# Test strategy: done when every box is ticked

The rule itself is unit-tested (Vitest in `apps/molly`). Screens are covered by Playwright on the web image, where a hidden tab stands for the app in the background (`awayFor` in `e2e/tests/live-on-return.spec.ts`). Android-only behaviour (Home, screen lock, the camera, Android settings, widget taps) is checked by hand on the emulator (`emulator-5554` only).

## The rule (unit tests, `features/return/model.test.ts`)

- [ ] Away less than 60 s → stays; 60 s or more → goes live.
- [ ] A hold keeps it at any length; once the hold is gone, the next long return goes live.
- [ ] A marked trip keeps that one return at any length, and only that one.
- [ ] Away is measured from the first change away from `active`.
- [ ] A change to `active` with no leave before it does nothing.

## Web (Playwright)

- [ ] Recent days, away 2 min → the dashboard with the live ring (`Today · <date>`, no "Back to now"); the browser's back doesn't return to Recent days.
- [ ] Settings, the child screen, a development topic page, a measurement screen, To-do, and Help opened from the dashboard, each away 2 min → the live ring.
- [ ] Recent days, away 30 s → still Recent days.
- [ ] Dashboard on yesterday's night (a mini ring from Recent days), away 2 min → live ring; away 30 s → still the past ring.
- [ ] Dashboard editor with a changed time, away 2 min → the editor still open with the change; an unchanged editor, away 2 min → closed, live ring.
- [ ] To-do "Add item" with text typed, away 2 min → the sheet still open with the text.
- [ ] Settings with a changed switch, away 2 min → still Settings with the change, no "Changes not saved" toast.
- [ ] Settings with no changes, away 2 min → the dashboard, no toast.
- [ ] A development source link opened (new tab), the Molly tab back after 2 min → still the development page.
- [ ] Onboarding (signed out), away 2 min → still the same onboarding step.
- [ ] Existing `ring.spec.ts`, `recent-days.spec.ts`, `settings.spec.ts`, `children.spec.ts`, `todo.spec.ts`, `development.spec.ts`, `measurements.spec.ts` pass unchanged.

## Android emulator

- [ ] Recent days, Home, wait over a minute, reopen from the launcher → live ring; Android back leaves the app.
- [ ] The same with the screen locked and unlocked.
- [ ] A child's development page, then over a minute away, reopened from the widget (`OPEN_APP`) → live ring.
- [ ] Settings, quick switch to another app and back (under a minute) → still Settings.
- [ ] To-do "Add item", Camera, more than a minute in the camera, take the photo → back in the sheet with the photo.
- [ ] Settings, Notifications on, "Open Android settings", over a minute there, back → still Settings.
- [ ] Tap log, over a minute away → still the Tap log, with `app background` / `app active` lines.
- [ ] "Can't sign in" screen, over a minute away → unchanged.

## Wrap-up

- [ ] The dashboard has no `AppState` listener of its own; `SNAP_BACK_MS` isn't exported.
- [ ] `CLAUDE.md` describes the rule; `plans/implan-ring-day-nav/MAIN.md` line 40 is marked as replaced; `plans/README.md` row status set.
- [ ] `pnpm check` green; `pnpm e2e` green.
