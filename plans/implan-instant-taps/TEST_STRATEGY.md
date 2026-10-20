# Definition of Done: instant taps

The project's methods (root `CLAUDE.md`): unit TDD for pure logic in `packages/core` and `src/widget/model.ts` / `refresh` (Given / When / Then, zero → one → many, then boundaries and errors). Native and visual behaviour: emulator checks on `emulator-5554` (`emulator-5556` / AVD `molly-36.1` for Android 16 QPR2); a physical phone only for the checklist at the end. `pnpm check` green at every step.

Done when every box is ticked.

## Measurement and cause

- [x] `NOTES.md` has the step 1 numbers: tap → `onReceive` → worker → JS handler → pending draw, warm / killed, normal / `force-idle` / `rare`, three runs each.
- [x] `NOTES.md` names what blocked the JS thread after return, with the reproduction steps. Or, if it couldn't be reproduced, the Tap log ships to catch it on a physical phone.

## App

- [ ] The step 1 reproduction no longer freezes: after idle and return, the hero's Stop works on the first tap.
- [ ] If the fix is in `packages/core`, a unit test with the freezing input fails before and passes after.
- [ ] Every button ripples on press on Android, in all six themes, day and night, following its corners. No ripple where it looks wrong (scrim, links, rows that opt out).
- [ ] With the JS thread held up for a few seconds, Stop still ripples at once (then runs once JS frees).
- [ ] Remove animations still drops the press scale; the ripple stays (it isn't motion-heavy). If it looks wrong, record the call in `NOTES.md`.
- [ ] Web unchanged (no ripple prop leaks into the web bundle's behaviour); Playwright suite green.

## Widget

- [ ] The patch applies on a clean install (`pnpm install`), and `pnpm android:release` builds from a clean prebuild. `docs/android-build.md` says how to update it.
- [ ] No dead buttons: on each widget size (4×3, 4×2, 2×2, 1×1), every button fires, ten taps each across several redraws, no `ActivityNotFoundException` in `adb logcat`.
- [ ] Pressed overlay drawn natively on the tapped button within ~100 ms of the tap, before JS, with the process killed and the phone in `force-idle`. The rest of the widget dims.
- [ ] The overlay lines up with the button on every widget size, and reads as pressed in all six themes, day and night. (Or the fallback to dimming only is recorded with its reason.)
- [ ] JS's pending draw and answer replace the overlay as today (`Starting…` → `Started`).
- [ ] A tap dropped because another is pending clears its overlay (redraws showing the other tap's pending state). The same for a tap without a session.
- [ ] Open-app taps (`OPEN_APP`) don't draw the overlay.
- [ ] `implan-tap-feedback`'s checks still hold: second tap while pending is dropped, airplane mode → pending then `Not saved: offline`, a task killed mid-write unlocks after 30 s.
- [ ] Faster taps: either implemented, with before/after numbers in `NOTES.md` showing the WorkManager hop under ~1 s after idle, or skipped with the numbers that justified it.

## Wrap up

- [ ] This plan's row in `plans/README.md` updated.
- [ ] The physical-phone checklist below has been run.

## Physical-phone checklist (Android 16+)

- Leave the phone untouched for an hour or more, then tap a widget button: the pressed look shows at once, then `Starting…`, then the answer.
- Tap every button on every widget you use over a day: none is dead.
- Start a sleep in the app, put the phone away for a few hours, open the app, tap Stop: it ripples and stops on the first tap. If it ever freezes again, open the Tap log (if shipped) and send it.
