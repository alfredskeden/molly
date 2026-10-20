# Live Updates: Definition of Done

Done when every item below is true, apart from the physical-phone checks at the end, which are run separately on an Android 16+ phone. The method follows the root `CLAUDE.md`: unit TDD for logic in `src/notification/model.ts` (Vitest, Given / When / Then, zero → one → many, then boundaries and errors), emulator checks for Android-only behaviour (`emulator-5554`, API 36, first Android 16 build, which can't promote; promotion on AVD `molly-36.1`, Android 16 QPR2, `emulator-5556`; see `NOTES.md`), manual review for looks.

## Nothing regresses

- [x] `pnpm check` is green, and the web bundle still has no widget or notification-module code.
- [x] Every existing Playwright spec passes unchanged (136 passed).
- [x] The notification still ticks from the timer's start, keeps its actions (Stop; Left / Right / Bottle), draws the pending line with no buttons on a tap, and the swipe-away-until-a-new-timer behaviour still holds.
- [x] The `molly.timers` channel keeps `IMPORTANCE_DEFAULT` with no sound.

## Promotion (emulator)

- [x] `adb shell dumpsys notification --noredact` shows Molly's sleep and feeding notifications requesting promotion and promoted, in each state: running, pending tap, error line, "Can't sign in". ("Can't sign in" not driven: same `Notifier.post()`, extra set unconditionally; see `NOTES.md`.)
- [x] With Live Updates turned off for Molly in Android settings, the notification is still posted, plain, as before.
- [x] If the emulator image draws the promoted UI: lock-screen card and status-bar chip with the ticking time. If it doesn't, `NOTES.md` says so and this moves to the physical-phone checks.
- [x] `NOTES.md` records the resolved `androidx.core` version and the API used to request promotion.

## Settings hint

Unit (the line choice, next to `lockScreenPrompt`):

- [x] Lock-screen timer off: no line.
- [x] Notifications off or blocked: the existing permission line, not the Live Updates one.
- [x] Allowed and Live Updates `off`: the Live Updates line.
- [x] Allowed and Live Updates `on` or `unsupported`: no line.

Emulator:

- [x] Live Updates off → return to Molly → the line shows; `Open settings` lands on Molly's Live Updates setting (or its notification settings if that screen can't be opened); turning them on and returning hides the line, and a running timer's notification is promoted again.
- [x] Web: Settings shows no Live Updates line (the whole Notifications card is hidden on web: `hasNotifications` false; `sync.ts` returns `unsupported`).

## Look (manual, emulator, both day and night, largest font, every theme)

- [ ] The Settings line matches the existing permission line and fits at the largest font. (Seen on `molly-36.1` in Molly Classic, day, font scale 1.0 and 2.0: same layout as the permission line, wraps cleanly. Night and the other themes left for the look review; the line reuses the permission line's classes.)

## Wrap up

- [x] Root `CLAUDE.md` "Where things stand" lists this plan.
- [x] The physical-phone checklist below is written.

## Physical phone checks (Android 16+)

- [ ] Start a sleep: lock screen shows the Live Update card at the top, status bar shows a chip with the ticking time.
- [ ] Same for a feeding, and with both running.
- [ ] Stop from the card on the lock screen: pending line, then gone; chip gone.
- [ ] Turn Live Updates off for Molly: plain notification, Settings line shows; on again: card and chip come back.
