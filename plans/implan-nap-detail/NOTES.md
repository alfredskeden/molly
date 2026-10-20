# Notes

## Decisions

- Build design option 2b. From the Terminal frame only the panel's playful wording; write matching words for Arcade, Mission Control, Match Day, Safari (draft table in `MAIN.md`, awaiting review).
- Remind-me bell is in scope: fires at window start, follows the window, cancelled on sleep start / skip.
- Reminder uses the existing silent `molly.reminders` channel (no new channel) and the Vitamin D reminder's permission rules: works when notifications are allowed, otherwise the bell asks again via `turnOnNotifications`.
- Why sheet and Skip move into the panel; the row opens the panel.
- Row and every ghost open the panel (for the tapped sleep).

## Found while planning

- No `expo-notifications`; all notifications go through the local module `modules/molly-notify` (`Notifier.kt`: channels `molly.timers`, `molly.reminders`; `showReminder` / `dismissReminder` for Vitamin D). No scheduled-alarm code exists yet.
- Ghosts are drawn by `Ghost` in `src/features/ring/Ring.tsx` from `ringGhosts` (`packages/core/src/ring.ts`), not tappable today. Selection is `RingKey` (`src/features/ring/model.ts`), driven by `editing` in `src/app/(main)/index.tsx`.
- The window row's model is `windowRow(plan, napsSoFar, now)` in `ring.ts`; `napsSoFar` is computed in `index.tsx` (counts a running nap).
- Past days per slot: `PastDay = { wake, naps, bedtime }` from `daysBefore` inside `sleepContext` (`next-sleep.ts`); `pastNapLength` already takes medians per slot.
- The Terminal design's "avg (7 days)" doesn't match the data (14 days, median); its label became `median`. Its disclaimer "# estimate from her logs…" is not used: the disclaimer stays plain (design's own note) and gendered words are avoided.

## Built

- Core: `likelyDetail` / `likelySlots` (`packages/core/src/likely-detail.ts`; `windowRow` and `ringGhosts` number through `likelySlots`, ghosts carry their `slot`), `reminderFor` / `placeOf` / `napReminderAt` (`nap-reminder.ts`). `whenText` / `countdown` moved to `format.ts`.
- A reminder is stored by its **place** in the day counting skipped naps (`NapReminder.place`), not the panel's number: a skip renumbers the panel (`nap 3` becomes `Nap 2 likely`), so the panel's number would silently move the reminder to another nap. The notification still says the panel's number.
- Lengths read `1h 5m` (`durationText`, as everywhere in the app), not the design's `1h 05m`.
- Classic's later list: `Then nap 3` for the first item comes from the app (`Then` + lower-cased name) when a theme has no Later heading; the label itself is `Nap {n}`. `copy.ts` keys `likely*`; null = nothing shown (leads, heading, Classic's bell words).
- Skip sits under the bell / Start sleep row (the header row has no room for `Keep exploring` at the largest font). Why is a link at the end of the disclaimer line, spoken `Why this window?` (the sheet is labelled `Why this window`).
- Ghost buttons say `aria-expanded` while their panel is open (React Native has no `aria-pressed`).
- Cache: `napReminders` in the widget cache (`ChildNapReminder`: the reminder, its child and its last worked-out `ring`). `refreshedCache` fetches each reminded child's sleeps, sleep timer and skips (only when a reminder exists) and recomputes with `napReminderRing` (same `dayPlan` / `dayWindow` / naps-so-far as the dashboard); a failed fetch keeps it. `refreshWidget` gets `notificationsAllowed()`; not allowed → dropped. `napRemindersAfter`: a bell change saved while a refresh was out wins over the refresh's copy (found on the emulator: returning from the permission prompt starts a refresh that overwrote the reminder just set).
- Native (`Notifier.kt`): notification **id 5**, tag = child id, channel `molly.reminders`, `Dismiss` (native, remembered like a swipe), timestamp hidden. Content is kept in SharedPreferences (`nap:<child>`); the alarm posts what JS last scheduled. **Two alarms** per child: `setWindow(at, 10 min)` (on time outside Doze; 10 min is the shortest window Android 12+ keeps without the exact-alarm permission) and `setAndAllowWhileIdle(at)` (rings in Doze, but Android gave it a window of up to ~75 % of the time to go: 24 min on a 33 min alarm, so alone it was too late). Whichever rings first posts; `napRung:<child>` makes the other, and any reschedule into the past, a no-op for the same reminder (`key` = when it was set).
- Package reinstall cancels the alarms; the next refresh sets them again (no boot receiver, as planned).

## Emulator checks (emulator-5554, clock set to 10:50)

- Panel from the row and from a later ghost (ghost filled, rest dimmed, no Why / Skip on a later one), Back closes it, all as on web.
- Bell on → two alarms at the window start (`dumpsys alarm`), bell filled, spoken `Reminder set for 11:25`; off → gone.
- Rang 10 min after its start (the clock jump put it at the end of its window): `Nap 2 likely` / `11:25 – 12:25`, silent, `molly.reminders`, Start sleep + Dismiss. Start sleep from it started the sleep in Baby Buddy, the reminder went and the sleep notification came.
- Editing the morning nap's end moved a nap 3 reminder to the plan's new nap 3 start after the refresh (matched the app's ghost).
- Skip from the panel and Start sleep in the app each cancelled the alarm.
- Notifications revoked: the bell asked; Don't allow → nothing set; Allow → set.
- Largest font (2.0), Classic: the panel fits the width, the page scrolls to Skip.
- No new channel (`molly.timers`, `molly.reminders` only).
- Artefact of moving the emulator clock, not a bug: OkHttp's disk cache served answers from before the change; cleared with `rm -rf /data/data/se.skedeback.molly/cache/http-cache`.

## Open

- Wording review of the playful wording table in `MAIN.md` (built as drafted).
- Returning from Android's permission prompt closes the panel (the dashboard snaps back to live on every return, `showLive`); the reminder is set. Keep, or exempt the panel?
- Not checked on the emulator: several shown children (initial icon, `Ella · Nap 2 likely`), cancel on a widget / lock-screen start, sign-out and hiding the child (unit-tested), Dismiss, the other themes at the largest font, widgets / timer notifications unchanged.
- `pending.spec.ts` (editor Saving… / Deleting…) failed in the full e2e run at 00:16: both seed a diaper 30 min ago, which was before midnight. Not touched by this work; rerun in the day to confirm.
