# Test strategy: done when every box is ticked

The change is Android only. Playwright runs against the web image and can't put Android in the background, so it can't check this. The rule and the has-changes rules are covered by unit tests (Vitest in `apps/molly`), and their effect on screens by hand on the emulator (`emulator-5554` only). The existing Playwright suites only show that the web is unchanged.

## The rule (unit tests, `features/return/model.test.ts`)

- [ ] Android: away less than 60 s → stay; 60 s or more → go live.
- [ ] Android: a marked trip keeps that one return at any length, and only that one.
- [ ] Android: the Tap log on screen keeps it at any length.
- [ ] Web: every return → show live (dashboard only), whatever the length or a trip.
- [ ] Away is measured from the first change away from `active`.
- [ ] A change to `active` with no leave before it does nothing.
- [ ] Going live asks for one "Changes not saved" toast when any reported draft has changes, none when none do.

## Has changes (unit tests)

- [ ] To-do sheet (`sheet-model.test.ts`): unchanged at opening, new or existing item → no; text, label, day, time, a new label, a picked or removed photo → yes; changed and changed back → no.
- [ ] Measurement sheet (`measurements/model.test.ts`): unchanged at opening → no; value, typed value, day, time, notes → yes; changed back → no.
- [ ] Add entry sheet (`add-model.test.ts`): unchanged at opening → no; switching the kind tab alone → no; a time, amount, method or notes → yes.
- [ ] Dashboard editor: the existing `isChanged` tests still pass.

## Android emulator

- [ ] Recent days, Home, wait over a minute, reopen from the launcher → live ring; Android back leaves the app.
- [ ] The same with the screen locked and unlocked.
- [ ] Settings, the child screen, a measurement screen, a development topic page, To-do and Help (from the dashboard), each over a minute away → live ring.
- [ ] A child's development page, over a minute away, reopened from the widget (`OPEN_APP`) → live ring.
- [ ] Settings, quick switch to another app and back (under a minute) → still Settings.
- [ ] Dashboard on yesterday's night: over a minute away → live ring; under a minute → still the past ring.
- [ ] Settings with a changed switch, over a minute away → live ring with "Changes not saved"; the change is gone when Settings is opened again. The same on the child screen.
- [ ] To-do "Add item" with text typed, over a minute away → live ring with "Changes not saved"; the draft is gone. "Add item" opened and untouched → live ring, no toast.
- [ ] Measurement sheet (child screen, and a measurement's screen) with a changed value, over a minute away → live ring with "Changes not saved". Untouched → no toast.
- [ ] Add entry sheet with a changed time, over a minute away → closed, live ring with "Changes not saved". Untouched → closed, no toast.
- [ ] Dashboard editor with a changed time, over a minute away → closed, live ring with "Changes not saved". An entry opened and untouched → closed, no toast.
- [ ] Settings with changes and a measurement sheet with changes on the child screen above it → one "Changes not saved".
- [ ] To-do "Add item", Camera, more than a minute in the camera, take the photo → back in the sheet with the photo.
- [ ] Development topic page, a source link, over a minute in the browser, back → still the topic page; the next long return → live ring.
- [ ] Settings, Notifications on, "Open Android settings", over a minute there, back → still Settings.
- [ ] Tap log, over a minute away → still the Tap log, with `app background` / `app active` lines.
- [ ] "Can't sign in" screen, over a minute away → unchanged.

## Web (unchanged)

- [ ] Existing Playwright suites pass, `ring.spec.ts` and `recent-days.spec.ts` in particular.
- [ ] By hand in a browser: a past ring, hide the tab and show it again → live ring; Settings, the same → still Settings; no "Changes not saved" on either.

## Wrap-up

- [ ] The dashboard has no `AppState` listener of its own; `SNAP_BACK_MS` isn't exported.
- [ ] `CLAUDE.md` describes the rule; `plans/implan-ring-day-nav/MAIN.md` line 40 is marked as replaced on Android; `plans/README.md` row status set.
- [ ] `pnpm check` green; `pnpm e2e` green.
