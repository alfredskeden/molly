# Redesign

Read the root [`MAIN.md`](../../MAIN.md) first; this file adds the order of work and the detail for each step. The Definition of Done is in [`TEST_STRATEGY.md`](TEST_STRATEGY.md).

**Outcome:** Molly looks and feels like the "Molly Redesign" design: a soft day/night visual system, a dashboard led by whatever is happening now, fast logging with an instant "Adjust time" for late logs, an edit screen without typed date strings, size-adaptive home-screen widgets, and a lock-screen notification for running timers. No behaviour the MVP guarantees is lost: intent-based, server-checked writes, two-parent sync, and every MVP flow keep working.

## The design source

The design lives in a private design project (not in this repo). Its files:

- `Molly Redesign.dc.html`: overview board. Tokens, type scale, shapes, components, and notes on each screen.
- `Molly App.dc.html`: the interactive app mock (412×892). Its script at the bottom is the clearest spec of behaviour: what the hero shows, toast texts, the Adjust time sheet, edit-screen controls.
- `Molly Widgets.dc.html`: widget sizes and the lock-screen notification, day and night.
- `Molly Current UI.dc.html` is the MVP as it looks today, for comparison. `support.js` is the mock runtime; ignore it.

The mock is a prototype with fake data. Where this plan and the mock disagree, this plan wins; the deviations are listed under Decisions.

## Scope

In:
- Visual system (tokens, Nunito, shapes, tap sizes, press feedback) applied to every screen through the shared components in `apps/molly/src/components/ui.tsx`. Screens not in the mock (settings, onboarding, scan, checklist, help) keep their layouts and pick up the new look.
- Day and night theme: follows the system, with a per-device override.
- Dashboard: hero, today strip, tracker tiles, recent list.
- Toast after every action, with an "Adjust time" sheet.
- Optimistic updates for starts, stops, cancels and diaper logs.
- Edit screen redesign.
- Widgets: restyle, plus size-adaptive layouts across four widget entries.
- Lock-screen ongoing notification for running timers.

Out (don't build, even though the mock shows it):
- **Predictions.** No nap-window bar, no "Nap window now / Opens in", no "Next feed around", no "next ~11:15" on widgets. They belong to the predictions phase, whose defaults still need sources (see root `NOTES.md`). Awake-for is a fact (time since the last sleep ended), so it stays.
- Background polling for the notification or widget. Neither learns about the other parent's actions faster than today.
- Multi-child UI, haptics, loading skeletons, timeline filters: still in the Polish phase.

## Decisions

| Decision | Why |
| --- | --- |
| Theme preference `system \| day \| night` in per-device settings, default `system`. The header pill sets Day or Night; Settings offers all three, which is the way back to `system` | The mock has a two-way pill only. Following the OS is the better default at 3am |
| The widget follows the same preference. For `system` it hands the widget library a `{ light, dark }` pair, so Android picks and swaps without a redraw. For an override it passes the same tree twice | `react-native-android-widget` supports the pair natively (`WidgetRepresentation` in its types) |
| Colours are hex values converted once from the design's oklch, kept in one TypeScript tokens module used by NativeWind, the widget and the notification. The oklch source stays as a comment | React Native and the widget renderer don't parse `oklch()` |
| Nunito is bundled with the app (e.g. `@expo-google-fonts/nunito` through `expo-font`), never loaded from Google Fonts. The widget gets the same font files through the widget plugin's `fonts` option | The CSP allows fonts only from `'self'`, and no runtime CDNs is a root rule |
| Optimistic updates: the hero, tiles and toast change on tap, from the device clock. The server's answer then replaces them: its real timer start, an "already running since" or "already stopped", or a rollback with an error toast | The mock shows the timer starting at once. Server-checked intent still decides what's true |
| Writes return what they created (timer id and start, entry kind, id and times), so the toast knows what "Adjust time" changes | Today `Outcome` carries no ids |
| "Adjust time" targets: a timer's start (after Start), an entry's end (after a stop), a change's time (after a diaper log). "Now" keeps the server's time and sends nothing. Any chosen time is clamped so it's never in the future and an end stays after its start | Baby Buddy rejects future times and end-before-start (root `NOTES.md`) |
| Adjusting a timer's start is `PATCH /api/timers/{id}/ { start }`, a new `packages/api` call. Which permission it needs for a plain caregiver is confirmed in its integration test and recorded in `NOTES.md` | Not used by the MVP, so not yet verified against the live API |
| Widgets: four entries in the widget picker, each choosing its layout from its current size. **Molly** (combined): 2×1 glance (time since sleep, fed, diaper) → 4×2 (running tracker leads) → 4×3 full. **Sleep**, **Feeding**, **Diaper**: 1×1 single action → 2×1 (Feeding shows last feed and side) → 2×2 with timer and actions | Fewer picker entries than one per mock variant, and parents resize instead of re-adding |
| Widgets can't tick (the library has no chronometer view), so a running timer shows its start clock large ("since 09:02") and the elapsed time as of the last draw small. The lock-screen notification is where a live, ticking timer lives | A frozen "12:34" that looks live would mislead |
| Widget feeding stops: Left / Right / Bottle, plus Both where the layout has room for four (4×2). Adds a `FEED_STOP_BOTH` intent | Keeps the MVP rule (three fit one row) while following the mock's 4×2 |
| The notification shows only timers this phone knows about: started here (app, widget or notification), or seen by the app on foreground or poll, or by a widget refresh. It disappears on stop, cancel or "already stopped" | No push from Baby Buddy, and background polling is out of scope |
| Notification actions: feeding Left / Right / Bottle, sleep Stop. Android allows at most three action buttons, so Both stays in the app | Same as the widget's one-row rule |
| Notification actions go through the same intent + server-check path as widget taps (`src/widget/model.ts` `runIntent` → `src/actions/trackers.ts`), running headless | A stale notification must never make a wrong write |
| The notification is on by default. Android asks for the notification permission the first time a timer starts from the app. Settings has a toggle, and explains how to allow notifications if the permission was denied | Discoverable without an extra onboarding step |
| Edit screen times move only by ±5 min, no typed times | Decided: anything more exact is rare and done in Baby Buddy's own admin |
| Recent list shows today's entries (since local midnight, including a night sleep that ends today), not a fixed count | Decided. Older entries are in Baby Buddy |
| Edit screen: all six feeding methods and all nine colours are selectable, not only the mock's four and five. Tags stay, below notes | Existing entries can hold any enum value, and the MVP requires editing tags |

## Steps

Work through the steps in order; each lands on its own. Mark a step `[x]` here when it's fully done, and record versions, workarounds and confirmed API facts in root `NOTES.md` under "Redesign".

- [x] **1. Spike: lock-screen notification mechanism.** Done 2026-09-25: local Expo module chosen, see root `NOTES.md` "Redesign" and `spikes/lock-screen-notification/spike-report.md`. Before any other native work, prove on a device or the emulator, with a throwaway build:
  - an ongoing notification with a system chronometer counting from a given start time, visible on the lock screen;
  - an action button that runs JavaScript headless with the app process killed, and can read SecureStore and call the API (as the widget handler does);
  - updating and removing that notification from the app and from the widget task handler.

  Compare an existing library (check that it's maintained and supports SDK 57) against a small local Expo module (Kotlin, `NotificationCompat` with `setUsesChronometer`/`setWhen`/`setOngoing`, action `PendingIntent`s into a headless JS task). Record the choice in `NOTES.md`. If headless actions can't work, stop and raise it: the fallback is actions that open the app.
- [x] **2. Visual foundation.**
  - Tokens module (day and night, tracker bg/mid/ink, neutrals, danger, scrim) wired into NativeWind so screens use semantic classes, not raw colours.
  - Nunito bundled and loaded before first render (web and Android); tabular numerals for clocks and timers.
  - Theme preference in settings (`src/storage/types.ts` parser + tests), resolved against the OS scheme, applied app-wide; header pill and Settings choice.
  - Restyle `ui.tsx` (Screen, Button variants primary / outline / quiet / destructive, Card, Field, Choice as segmented control, Banner) to the design's shapes and sizes, with press scale. Every existing screen should look right in both themes with no layout changes.
- [x] **3. Domain and data additions (TDD).**
  - `packages/core`, unit TDD:
    - the today strip: sleep and feeding blocks (including running timers) as fractions of today, clipped at local midnight, a minimum visible width, diaper marks, and the "now" position;
    - the last breast side (most recent non-bottle feeding's method);
    - adjusted time from "minutes ago": never in the future, end kept after start.
  - `packages/api`, integration TDD: `updateTimer(id, { start })`, including what a caregiver without `delete_timer` gets (`parent_a` in the seed).
  - `src/actions/trackers.ts` (unit tests with the fake client): outcomes carry what was created; an `adjustTime` action that PATCHes a timer start, an entry end or a change time.
- [x] **4. Dashboard.** Header (name, date, theme pill, settings link). Hero: idle shows "Awake for" + "since HH:MM" and a last-feed line; a running feeding takes over with its timer, "you" or "someone else", last side, stop-as Left / Right / Both / Bottle and Cancel; a running sleep likewise with "saves as nap/night sleep", Stop and Cancel. Today card with the strip and totals. Sleep / Feed / Diaper tiles. Recent list: today's entries in the design's row style, opening the edit screen. Optimistic updates as decided above. Keep polling and refetch exactly as the MVP does. Update the Playwright specs as you go.
- [x] **5. Toast and Adjust time.** Toast after every action (texts from the mock: "Feeding started 09:14", "Feed saved · Left · 14m", "Diaper saved · Wet", "Sleep cancelled", "Changes saved"), 6 s, with "Adjust time" where there's a target. Bottom sheet with Now / 5m / 10m / 15m / 20m / 30m / 45m / 60m, 1 min earlier / later, Set time. Errors and "already" outcomes use the same toast, carrying the help links the banners carry today. Playwright covers adjusting each target kind.
- [x] **6. Edit screen.** Back, Today/Yesterday chip, title, big start/end clocks with −5 / +5 min, duration, segmented controls (sleep kind; feeding side and type; diaper contents and colour with swatches), bottle-only amount stepper (±10 ml), notes, tags, "Delete entry" → "Tap again to delete for good", sticky Save. Baby Buddy's validation text still shows on a refused save.
- [x] **7. Widgets.** Four widget entries in `app.json`, size-adaptive layouts, day/night pair, Nunito, tracker colours. The snapshot gains what the new layouts show (last feeding's method). Layout choice from width/height and the per-layout view models live in `src/widget/model.ts` with unit tests; the `*.android.tsx` files stay thin. Remember `'use no memo';` on every widget file. Existing widget behaviour (cache first, "not updated since", notes, intents) stays.
- [x] **8. Lock-screen notification.** Build it with the mechanism chosen in step 1. Show, update and clear it from app writes, app foreground and polls, and widget refreshes. Permission prompt and Settings toggle as decided. Actions go through `runIntent`. Add the notification items to the Android device checklist and to `docs/setup.md` troubleshooting (permission denied, battery optimisation).
- [ ] **9. Widget picker previews.** Once the widgets are final, give each of the four widget entries a `previewImage` in `app.json` (the plugin copies it to `res/drawable/<name>_preview` and sets `android:previewImage`); today the picker shows only the app icon on a blank background. Capture each widget at its target size (Molly 4×3, the others 2×2) on the **emulator**, crop it and make the rounded corners transparent. Store the PNGs in `apps/molly/assets/widget-previews/`. The launcher caches previews, so reinstall to see them.

## Assumptions

- The design tokens and sizes are final enough to hard-code. Visual tweaks during review are expected and don't need a plan change.
- Baby Buddy accepts `PATCH` on a timer's `start` (it's a model field in the serializer). Step 3 confirms it.
- The Android device checklist in [`TEST_STRATEGY.md`](TEST_STRATEGY.md) runs on a physical Android phone; the emulator is fine while building.
