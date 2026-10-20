# Vitamin D reminder

Context: the Molly system plan in [`../implan-molly/MAIN.md`](../implan-molly/MAIN.md) (architecture, Baby Buddy facts in its `NOTES.md`), medication logging in [`../implan-medication/`](../implan-medication/MAIN.md), and the lock-screen notification as it stands after [`../implan-tap-feedback/`](../implan-tap-feedback/MAIN.md) and [`../implan-live-updates/`](../implan-live-updates/MAIN.md). Decisions and findings are in [`NOTES.md`](NOTES.md), the picture in [`MENTAL_MODEL.md`](MENTAL_MODEL.md), the Definition of Done in [`TEST_STRATEGY.md`](TEST_STRATEGY.md).

**Outcome:** a parent who turns on "Vitamin D reminder" gets a notification each time a sleep ends on their phone (nap, night waking or morning wake) while no Vitamin D has been logged in the baby's current 24-hour cycle. The reminder has a **Given now** button that logs it. A daily dose that's easy to forget gets remembered at the moments someone is awake with the baby anyway.

## Scope

In: Android app only (widget taps, lock-screen Stop and the app's Stop all trigger it), a Settings switch, a new silent notification channel.

Out: web (no local notifications), other medicines, reminders at a set clock time, background polling, any Vitamin D status on the widgets, sleeps ended by editing an entry.

## How it works

App paths (`src/…`, `modules/…`) are under `apps/molly/`.

### When it fires

Only on the phone that stopped the sleep, right after Baby Buddy accepted the stop. The same stop through any of this phone's three surfaces counts:

- widget and lock-screen Stop: intent `SLEEP_STOP` through `runWidgetIntent` (`src/widget/refresh.ts`);
- the app's Stop: `stopSleep` in `src/app/(main)/index.tsx`.

A sleep stopped on the other parent's phone never reminds this one. That keeps the lock-screen notification's rule (own-device knowledge only, no background polling; `implan-molly/NOTES.md`), and the parent who stopped the sleep is the one with the baby.

Then, if the setting is on and notifications are allowed, Molly fetches this phone's view of the cycle from Baby Buddy and decides:

1. **The cycle** runs from the baby's morning wake to 24 hours after it: `[wake, wake + 24 h)`, with `wake` from `dayWindow` (`packages/core/src/day-window.ts`). Compute it with the sleeps fetched *after* the stop, so a morning wake that was just logged opens a new cycle. Without a logged wake (`clock: true`), use the latest nap-window start at or before now. `byClock`'s own `wake` is the evening at night, which would start the cycle at bedtime.
2. **Vitamin D given** means a medication in the cycle whose name, trimmed and ignoring case, is `vitamin d` followed by nothing, a space or a digit (the one-tap button logs `Vitamin D`; Other may say `Vitamin D3` or `Vitamin D 10 µg`; `Vitamin drops` doesn't count).
3. None given → post the reminder. Given → post nothing (and clear a reminder still showing).

Each stop checks again. Dismissing after a nap doesn't silence the next wake-up.

Can't reach Baby Buddy for the check → no reminder. The stop itself just succeeded, so this is rare, and a guess could nag after a dose was given.

### The notification

- Title "Vitamin D not given yet"; text "Last given yesterday 08:10" when a dose shows up in what was fetched (fetch from 2 days before the cycle start), otherwise no text line. Exact wording is checked in the look review. **Superseded** by `Molly Children Widgets.dc.html` (`../implan-children/MAIN.md`, "Vitamin D reminder"): title `Vitamin D` (`Ella · Vitamin D` with several children), text `Not given today`, Given now + Later (Dismiss renamed).
- **Same in every theme.** Plain words, never `copy.ts` (whose only medication label, `med`, is the Medication card's title: "Potion", "Med bay"…). This matches the timer notifications, which never read `copyFor`, and the dashboard's Vitamin D button, which says "Vitamin D" in every theme. Icon tinted with the day `med-mid` (`PALETTES.day['med-mid']`), the way the timers use their tracker's day `-mid`.
- Buttons: **Given now** and **Dismiss**. Tapping the body opens Molly.
- Not ongoing, not promoted, swipeable. Own id (next free after the "Saving…" work notification's 3) and own channel **`molly.reminders`**: `IMPORTANCE_DEFAULT`, no sound, no vibration, the same lock-screen visibility as `molly.timers`. Importance is fixed once a channel exists, so get it right before first install.
- **Given now** takes the lock-screen action's path: broadcast → `ActionReceiver` draws a pending line ("Saving…", no buttons) → expedited WorkManager → headless `MollyNotifyAction` → `runWidgetIntent`. New intent `VITAMIN_D_GIVEN` in `WIDGET_INTENTS` (`src/widget/model.ts`); `runIntent` maps it to `logMedication(client, { child, name: 'Vitamin D' })` with no `time` (Baby Buddy stamps it; see `implan-medication`). No widget draws a button for it. The `pending` guard (`tapAllowed`) applies like any tap. Success → the reminder goes away. Failure → the reminder comes back with the error line and its buttons.
- **Dismiss** is native only: cancel the notification, no JS.

### When it goes away

- Vitamin D logged on this phone (one-tap, Other with a Vitamin D name, Given now): cancelled at once.
- Otherwise on this phone's next refresh (`refreshWidget`: widget updates about every 30 min, app foreground, app writes). Store the showing reminder's cycle in the widget cache (e.g. `reminder: { cycleStart } | null`). Only while one is showing does the refresh also fetch the cycle's medications, and cancel when a dose appears or the cycle has ended. Refreshes with no reminder cost nothing extra.
- Setting turned off, or sign-out: cancelled.

### The setting

`vitaminDReminder: boolean` in `Settings` (`src/storage/types.ts`), **default off**, per device, kept on sign-out like the Lock-screen choice. Shown in Settings' Notifications card (`NotificationCard` in `src/app/(main)/settings.tsx`) as "Vitamin D reminder" On / Off, below the Lock-screen choice. Hidden on web (the card already is: `hasNotifications`). Turning it on asks for the notification permission through the existing `turnOnNotifications` flow. The card's permission line already covers "blocked".

## Decisions

| Decision | Why |
| --- | --- |
| Only the phone that stopped the sleep reminds | Instant, no polling, matches the lock-screen notification's own-device rule; the stopping parent is the one awake |
| Check Baby Buddy at stop time, not the cache | The other parent may have logged it; medications aren't in the widget snapshot |
| Cycle = morning wake + 24 h, from `dayWindow` | A day cycle from the wake to the next 24 hours; covers the naps and the night after that day |
| Every sleep end counts (nap, night waking, morning wake) | The reminder is wanted after naps and on night wakings |
| Silent channel `molly.reminders` | Seen when the phone is picked up; no buzz at 3 am |
| Name match: "vitamin d" then nothing, a space or a digit, case-insensitive | Covers the one-tap log and typed variants (`D3`, doses) without a parser; `Vitamin D3` should count |
| Off by default | A reminder no one asked for is noise |
| Plain words and day `med-mid` tint in every theme | Notifications and the Vitamin D button are already theme-free; a playful "Potion" reminder at 3 am helps no one |
| No reminder when the check can't reach Baby Buddy | Better silent than wrong after a dose was given |
| Given now reuses the notification action path and `runWidgetIntent` | Same pending / answer / refresh behaviour as every other lock-screen tap |

## Shape

```
packages/core/src/vitamin-d.ts                 cycle, name match, due / last dose (pure)
apps/molly/src/notification/model.ts           reminder content from settings + check result
apps/molly/src/notification/reminder.ts        fetch + decide + show/cancel (with .android.ts native calls, plain sibling no-op)
apps/molly/src/widget/model.ts, refresh.ts     VITAMIN_D_GIVEN intent, reminder in cache, check after SLEEP_STOP, clear on refresh
apps/molly/src/app/(main)/index.tsx            check after the app's Stop; cancel after a Vitamin D log
apps/molly/src/storage/types.ts                vitaminDReminder setting
apps/molly/src/app/(main)/settings.tsx         the switch
apps/molly/modules/molly-notify/android/…      Notifier: channel, showReminder / cancelReminder, Dismiss; MollyNotifyModule exposes them
```

File names are a suggestion; follow the file-suffix rule in the root `CLAUDE.md` (the `.android.ts` file and its plain fallback share an extension).

## Steps

Work through them in order. Each lands on its own. Mark a step `[x]` when it's fully done, and record findings in [`NOTES.md`](NOTES.md).

- [x] **1. Domain (TDD, `packages/core`).** `vitamin-d.ts`: the cycle from a `DayWindow` (with the `clock` rule above), `isVitaminD(name)`, and one function that takes the cycle and the fetched medications and returns whether a dose is due plus the latest dose (for "Last given"). Export from the package index.
- [x] **2. Reminder model (TDD, `src/notification/model.ts`).** Content from setting, notifications allowed, and the check result: null when off or given; title / text otherwise (today / yesterday / weekday in "Last given"). Setting `vitaminDReminder` in `Settings` / `DEFAULT_SETTINGS` and its parsing in `src/storage/`, unit-tested like the other settings.
- [x] **3. Native.** In `molly-notify`: channel `molly.reminders`, `showReminder(content)`, `cancelReminder()`, Given now (pending line in `ActionReceiver`, words passed in extras as today), Dismiss (native cancel). Rebuild (`pnpm android:release`, `docs/android-build.md`); check the channel with `adb shell dumpsys notification`.
- [x] **4. Wiring.** `VITAMIN_D_GIVEN` intent and `runIntent` mapping (unit tests in `model.test.ts` like the other intents). Check after a successful `SLEEP_STOP` in `runWidgetIntent` and after the app's Stop. Reminder in the widget cache; refresh clears it as above. Cancel after this phone logs Vitamin D. Settings switch.
- [ ] **5. Emulator checks and wrap up.** The emulator list in `TEST_STRATEGY.md`. Update this plan's row in `plans/README.md`. Hand over the physical-phone checklist.
