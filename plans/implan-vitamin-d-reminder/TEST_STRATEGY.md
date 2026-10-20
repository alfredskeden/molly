# Vitamin D reminder: Definition of Done

Done when every item below is true, apart from the physical-phone checks at the end, run after the work is handed over. The method follows the root `CLAUDE.md`: unit TDD for logic in `packages/core` and `src/notification/model.ts` / `src/widget/model.ts` (Vitest, Given / When / Then, zero → one → many, then boundaries and errors), emulator checks for Android-only behaviour (`emulator-5554`), manual review for looks.

## Nothing regresses

- [x] `pnpm check` is green, and the web bundle still has no widget or notification-module code.
- [x] Every existing Playwright spec passes unchanged.
- [ ] The sleep and feeding notifications are unchanged: chronometer, actions, pending line, Live Updates promotion, `molly.timers` still `IMPORTANCE_DEFAULT` and silent.
- [x] With the setting off (the default), stopping a sleep behaves exactly as before: no extra request, no notification.

## Domain (unit, `packages/core`)

Cycle:
- [x] Logged morning wake → cycle `[wake, wake + 24 h)`.
- [x] A night waking at 03:00 falls in the cycle opened by the previous morning's wake.
- [x] The morning wake just logged opens a new cycle (yesterday's dose no longer counts).
- [x] No logged wake (`clock: true`), day or night → cycle starts at the latest nap-window start at or before now.

Name match:
- [x] `Vitamin D`, `vitamin d`, `Vitamin D3`, ` Vitamin D 10 µg ` count; `Vitamin drops`, `Paracetamol`, `Vitamin` and an empty name don't.

Due:
- [x] No medications → due, no last dose.
- [x] A Vitamin D inside the cycle → not due.
- [x] Only other medicines in the cycle → due.
- [x] A Vitamin D just before the cycle start → due, and it's the last dose.
- [x] Boundaries: a dose exactly at the cycle start counts; one exactly at its end doesn't.

## Reminder model (unit, `apps/molly`)

- [x] Setting off, or notifications not allowed → no notification.
- [x] Due → title "Vitamin D not given yet"; last dose today / yesterday / earlier → the matching "Last given …" text; no last dose → no text line.
- [x] Not due → no notification (and a showing one is cancelled).
- [x] `vitaminDReminder` defaults to false, parses from stored settings, survives sign-out.
- [x] `VITAMIN_D_GIVEN` parses as an intent and runs `logMedication` with `{ name: 'Vitamin D' }` and no `time`; its outcome and error note follow the other intents' rules.
- [x] Refresh with a reminder in the cache: a dose in the cycle, or the cycle over → reminder cleared; still due → kept. Refresh with none → no medication fetch.
- [x] The check after `SLEEP_STOP` runs only when the stop succeeded, and a failed check (unreachable) posts nothing.

## Emulator (`emulator-5554`, test Baby Buddy seeded)

- [x] Setting on, no Vitamin D today → Stop sleep from the app, the widget and the lock-screen notification each post the reminder, silent, on the lock screen.
- [x] Vitamin D logged (by either seeded parent) → Stop posts nothing.
- [x] Given now → "Saving…", then a `Vitamin D` medication in Baby Buddy (by this parent, Baby Buddy's time) and the reminder gone; the app's Today card and Recent show it.
- [x] Given now with Baby Buddy down → error line, buttons back.
- [x] Dismiss closes it; the next Stop posts it again.
- [x] One-tap Vitamin D in the app with a reminder showing → reminder gone at once.
- [ ] The other parent logs Vitamin D → the reminder goes on this phone's next refresh (driven by foregrounding the app).
- [ ] Stop on the other parent's session / Baby Buddy's own UI → no reminder here.
- [ ] Turning the setting off, or signing out, cancels a showing reminder.
- [x] `adb shell dumpsys notification` shows channel `molly.reminders` at `IMPORTANCE_DEFAULT`, no sound, no vibration.
- [x] Web: Settings shows no Vitamin D reminder switch.

## Look (manual, emulator, day and night, largest font)

- [ ] The reminder reads well on the lock screen and in the shade, buttons reachable, icon tinted `med-mid`.
- [ ] Switching to a playful theme (e.g. Arcade) with playful labels on changes nothing in the reminder or the Settings switch label.
- [ ] The Settings switch sits under the Lock-screen choice, matches it, and fits at the largest font.

## Wrap up

- [x] Root `CLAUDE.md` "Where things stand" lists this plan.
- [x] `NOTES.md` records the notification id and anything learned about the channel.
- [ ] The physical-phone checklist below has been handed over.

## Physical-phone checks (Android 16+, after handover)

- [ ] After a real nap: reminder on the lock screen, no sound, Given now logs it.
- [ ] At a night waking: reminder there when the phone is picked up, nothing buzzes.
- [ ] Morning wake: the new cycle reminds even when yesterday's dose was given.
