# Redesign: Definition of Done

The redesign is done when every item below is true. The method (which layer gets TDD, which gets Playwright, which gets manual checks) is in the root [`TEST_STRATEGY.md`](../../TEST_STRATEGY.md), and its cross-phase checks still apply. Items are outcomes: choose the test shape yourself, following that method.

## Nothing from the MVP regresses

- [ ] Every item in [`phases/mvp/TEST_STRATEGY.md`](../mvp/TEST_STRATEGY.md) "App flows" still passes, with its Playwright specs updated to the new screens (toasts replace the "Saved." banners, new labels). No spec is deleted without an equivalent replacing it.
- [ ] Every MVP widget behaviour still holds: cache first, "not updated since HH:MM", row confirmations and errors, intents server-checked, header opens the app.

## Mechanism proof (step 1)

- [x] A spike report under the plan's `spikes/` folder shows, on a device or the emulator: a lock-screen notification whose timer ticks with the app process killed, and an action button that completes a Baby Buddy write headless. The chosen mechanism is recorded in `NOTES.md`.

## Domain rules (`packages/core`, unit TDD)

- [x] The today strip places each sleep and feeding (finished or running) as a start fraction and width of today; a block crossing midnight shows only today's part; a very short block still has a minimum visible width; diaper changes are point marks; "now" sits at the current fraction. An empty day gives an empty strip.
- [x] The last breast side is the method of the most recent feeding that wasn't a bottle, or none.
- [x] An adjusted time "N minutes ago" is never later than now, and an adjusted end is never at or before its entry's start.

## Baby Buddy client and actions

- [x] `packages/api` (integration, test container): a timer's start can be moved earlier, and the timer is then found with the new start. What a caregiver without `delete_timer` gets when adjusting their own timer is asserted and recorded in `NOTES.md`.
- [x] Every successful start, stop and diaper log reports what it created (timer id and start, or entry kind, id and times). "Already" and failure outcomes are unchanged.
- [x] Adjusting time changes the right field: timer start, sleep or feeding end, change time. A time Baby Buddy refuses (overlap, future) comes back as a validation outcome with Baby Buddy's text.

## Settings

- [x] The theme preference (`system | day | night`) is stored per device, defaults to `system`, and an unreadable or unknown stored value falls back to `system`.
- [x] The notification toggle is stored per device and defaults to on. *(`src/storage/settings.test.ts`; sign-out keeps it, like the theme.)*

## App flows (Playwright on the web image)

- [x] **Theme:** with `system`, the app follows the browser's colour scheme (both schemes emulated). Choosing Day or Night in the header overrides it and survives a reload. Choosing System in Settings goes back to following it.
- [x] **Idle hero:** shows "Awake for" with the time since the last sleep ended and its clock, plus the last feed's time and side. With no sleep logged yet it shows a sensible empty state, not "NaN" or a blank.
- [x] **Running hero:** a running feeding or sleep takes over the hero with its elapsed time, start clock and "you" or "someone else". Stop-as Left / Right / Both / Bottle and Stop sleep save the right entry; Cancel removes the timer and logs nothing.
- [x] **Instant feedback:** after a tap, the hero or tile changes before Baby Buddy answers (checked with a delayed response). When Baby Buddy then says "already running" or "already stopped", or fails, the screen shows the server's truth and a toast says why.
- [x] **Today card:** the strip shows the seeded sleeps, feedings and changes, and the totals text matches today's totals.
- [x] **Recent list:** shows exactly today's entries, including a night sleep that started yesterday and ended today, and nothing from earlier days.
- [x] **Toast:** every action shows its toast with the design's text. Errors and "already" outcomes show in the toast too, with the help link where the MVP banner had one.
- [x] **Adjust time:** after a start, a stop and a diaper log, "Adjust time" → a chip or ±1 min → Set time changes the timer start, entry end or change time in Baby Buddy. "Now" changes nothing.
- [x] **Edit screen:** start and end move by ±5 min, the duration follows, sleep kind / feeding side and type / diaper contents and colour / bottle amount / notes / tags all save to Baby Buddy. The amount control shows only for bottle feedings. Delete needs a second tap. A refused save shows Baby Buddy's reason and keeps the edits.
- [ ] **Other screens:** settings, onboarding, checklist and help render in both themes with the new components, and their MVP specs pass unchanged in behaviour.

## Visual review (manual, web and Android, both themes)

- [ ] Dashboard (idle, feeding running, sleep running), edit screen for each kind, toast and Adjust time sheet match the design's look: tracker colours, Nunito with tabular digits, radii, spacing. Deviations are only the ones listed in the phase `MAIN.md`.
- [ ] Every tap target is at least 44 px; logging buttons are 52–56 px; buttons visibly scale on press.
- [ ] Night mode has no hard-coded light surfaces left anywhere, including onboarding and help.

## Android (device checklist on a physical phone, release APK)

- [ ] Nunito renders in the app and in every widget.
- [ ] The widget picker offers Molly, Sleep, Feeding and Diaper. Each switches layout when resized through its sizes (combined: 2×1, 4×2, 4×3; single: 1×1, 2×1, 2×2) and every button in every layout performs its intent with the app closed, entry correct in Baby Buddy.
- [ ] With the theme on System, widgets switch between day and night when the phone's dark mode flips, without a tap or app open. With Day or Night chosen, widgets stay on that theme.
- [ ] A running timer on a widget shows its start clock and never presents a frozen elapsed time as if it were live.
- [x] Starting a feeding or sleep (app, widget or notification) shows the lock-screen notification with a ticking timer. Stopping or cancelling anywhere on this phone removes it. *(Passed on a device.)*
- [x] With the app process killed, the notification's Left / Right / Bottle and Stop actions save the right entry and clear the notification. On a timer the other parent already stopped, the action reports "already stopped" and creates nothing. *(Passed on a device.)*
- [x] A timer the other parent started appears in the notification after this phone's app opens or a widget refresh sees it. *(Passed on a device.)*
- [x] With the phone's default settings, the notification is visible on the lock screen, and its actions work without unlocking. *(Passed on a device.)*
- [x] Swiping the notification away (Android 14+) keeps it away for that timer, even after the app opens or a widget refreshes. The next timer shows it again. *(Passed on a device.)*
- [x] The first app-started timer asks for the notification permission. Denying it keeps everything else working, and Settings explains how to turn it on. The Settings toggle off stops the notification. *(Passed on a device.)*
