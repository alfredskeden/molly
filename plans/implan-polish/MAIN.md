# Polish

**Status: feature complete (2026-09-25).** All seven steps are done; the Definition of Done in [`TEST_STRATEGY.md`](TEST_STRATEGY.md) is signed off.

Context: the Molly system plan in [`../implan-molly/MAIN.md`](../implan-molly/MAIN.md) (architecture, rules) and its [`NOTES.md`](../implan-molly/NOTES.md) (confirmed Baby Buddy behaviour). This plan builds on the shipped redesign ([`../implan-molly/phases/redesign/MAIN.md`](../implan-molly/phases/redesign/MAIN.md)) and medication logging ([`../implan-medication/MAIN.md`](../implan-medication/MAIN.md)), and is the "Polish" entry of the root roadmap. Decisions and verified facts are in [`NOTES.md`](NOTES.md). The Definition of Done is in [`TEST_STRATEGY.md`](TEST_STRATEGY.md).

**Outcome:** Molly feels finished. It opens instantly from a cache, says clearly what went wrong and what to do when something fails, asks for notifications at the moment they matter, has its own icon and a splash that matches the theme, lets a parent browse and filter older entries, gives a tactile answer to every tap, and works with TalkBack and large fonts.

## The design source

`Molly Polish.dc.html`, the (private) design source. It has seven numbered sections, which map to the steps below. The text of each board and the data at the bottom of its script (`HAPTICS`, `PASSES`, `FINDINGS`, the History sample) are the spec. It uses the tokens already in `apps/molly/src/theme/tokens.ts`. `support.js` is the mock runtime; ignore it.

Where this plan and the design disagree, this plan wins. The deviations:
- **No "Your sign-in expired" (Cloudflare Access) screen.** An expired Access session keeps showing as "Can't reach Baby Buddy".
- The error screens use the words "Baby Buddy" and "Molly" as in the design, but reuse existing screens where one exists (onboarding scan and connect form, the toast, `Banner`).

## Scope

In: the Android app and the web app, all seven design sections except the Access screen. For widgets and the lock-screen notification, only the invalid-key path (step 2) changes.

Out: multi-child UI, predictions, background polling, the Access screen, redesigning screens the design doesn't show (settings, onboarding, help and edit keep their layouts, and pick up the accessibility fixes through shared components).

App paths (`src/…`, `app.json`, `assets/…`) are under `apps/molly/`.

## Decisions

| Decision | Why |
| --- | --- |
| Persist the TanStack Query cache: `PersistQueryClientProvider` with an AsyncStorage persister (AsyncStorage is localStorage on web). Only settled, successful queries are stored, so optimistic guesses (negative ids) never are. Cleared on sign-out; busted when the stored shape changes | The design shows the cached dashboard on a cold start. Without a persisted cache every start is cold |
| Skeleton only when a query that the dashboard needs has no data at all, and only after 300 ms | The design's rule: fast loads never flash |
| While loading: header, tile names, Diaper and Medication buttons are live; Sleep and Feed buttons wait; screen readers hear "Loading today" once | Diaper and medication logs don't depend on server state; Start vs Cancel does |
| "Can't reach" is a banner (with Retry) above a dimmed hero that says "as of HH:MM" from the query's `dataUpdatedAt`. Buttons stay tappable and fail with the existing toast. Queries also refetch on app focus and on reconnect (TanStack `onlineManager`) | Nobody should think a feed was logged; nobody should be locked out of reading the last state |
| A 401 or 403 from any request is confirmed by `GET /api/profile`. Only if the profile call also fails with 401/403 does Molly show "Molly can't sign in to Baby Buddy" | Baby Buddy sends 403 both for a bad key and for a missing permission (`parent_a` stopping someone else's timer). The permission case keeps its existing toast |
| The invalid-key screen keeps the server URL and child, and only asks for a new key: "Scan a new key" opens the onboarding scanner, "Type the key instead" opens the connect form with the address filled, "Where do I find my key?" opens the help topic | Reuses onboarding; the data is safe in Baby Buddy |
| Widgets and the notification: an intent that fails as invalid key marks it in the widget cache. The widget then shows one "Can't sign in · Open Molly" state that opens the app on that screen, and the notification is replaced by one that does the same | Android blocks opening an activity from a background worker, so the tap has to be the parent's |
| "Already stopped" finds the entry saved elsewhere: after the refetch, the newest entry of that tracker that started at the stale timer's start (to the minute). If found, the toast says "Already stopped on another phone · Nap saved there · 07:56–09:08" with Edit, and that row is highlighted in Recent. If none, it says "Already stopped on another phone". "Already running since HH:MM" names who started it | A Baby Buddy entry saved from a timer takes the timer's start. Matching is a pure `packages/core` function |
| History is a new route `src/app/(main)/history.tsx`, opened by "See all" under Recent. It loads 7-day windows (newest first, "Load earlier" for the next), each fetched with the existing `listEntries` using `*_min` and `*_max` filters | The existing client pages by offset already; a date window keeps the day headers complete |
| Filter chips All / Sleep / Feed / Diaper / Med: tapping several combines them, All resets. Filtering is client-side on the merged list; the selection is stored per device in settings | The design's behaviour |
| Day headers carry a summary of what the filter shows ("7h 40m sleep · 4 feeds · 3 diapers · 1 med"), with sleep clipped at midnight, as today's totals already are | One set of rules for "how much sleep on a day" |
| Empty History: filtered to nothing → "No medication this week", "The last one was Vitamin D on 15 September." (from a `limit=1` lookup of the latest entry of the selected kinds, left out if none) and "Show everything". No entries at all → "Nothing logged yet. Tap Start sleep or Start feed on the dashboard." | The design's copy |
| Notification permission: a bottom sheet (the existing `Sheet` shell) the first time a timer is started from the app, while the Lock screen setting is on and permission isn't granted. The timer is already running behind it. Continue → the system prompt; "Not now" is remembered per device | Asking at the moment the lock-screen timer is useful, and never blocking a log |
| Once dismissed or denied: one line inside the running hero, "Not on your lock screen. Notifications are off." with "Turn on" (prompts again if Android still can, otherwise opens the app's notification settings). Only while a timer runs, and only while the Lock screen setting is on. Settings shows the same state permanently | A parent who turned the setting off chose that; don't nag them |
| Haptics through `expo-haptics`, one module mapping each action kind to one of the design's strengths (the `HAPTICS` table). On Android use `performAndroidHapticsAsync`, which goes through the view's haptic feedback and so respects the system touch-feedback setting; record the chosen `AndroidHaptics` per strength in `NOTES.md` | The design asks to respect the system setting |
| Haptics fire on the optimistic update. If the server then refuses, the error haptic plays with the toast. Nothing on web, widgets or the notification. A per-device "Haptics" On / Off in Settings, default on | Taps feel instant; the design's rules |
| The accessibility fixes are the design's ten `FINDINGS`, made in the shared components (`src/components/ui.tsx`, `Hero`, `Tiles`, `TodayCard`, `Recent`, the toast) so every screen benefits. Anything new in this plan (skeleton, banner, History, sheets) follows the same rules from the start | The design's audit was chosen as the checklist, not a new audit |
| App icon: the design's mark (four tracker rows on dark ink, with the now line). The SVG goes into `assets/brand/` as the source; the PNGs `app.json` points at (`icon.png`, `android-icon-foreground/background/monochrome.png`, `splash-icon.png`, `favicon.png`) are rendered from it by a small script, keeping the adaptive foreground inside the 66 dp safe zone. Expo's placeholder images are deleted | One source, reproducible exports |
| Splash: `expo-splash-screen` with the Day `bg` token and a `dark` variant with the Night `bg`. The splash stays up (`preventAutoHideAsync`) until settings and fonts are loaded, so the first frame already has the right theme. To make the system splash itself follow the per-device override, the existing local Expo module sets `UiModeManager.setApplicationNightMode` (Android 12+) when the theme preference changes. Verify it on the emulator; if it doesn't take, the splash follows the system theme and that is recorded in `NOTES.md` | Android draws the splash before JavaScript runs, so only a persisted app night mode can change it |

## Steps

Work through the steps in order; each lands on its own. Mark a step `[x]` when it's fully done, and record versions, workarounds and confirmed API facts in [`NOTES.md`](NOTES.md). Install app dependencies with `npx expo install`.

- [x] **1. Persisted cache and loading skeletons.** Persister and provider in `src/lib/query.tsx`, cleared on sign-out. Dashboard skeleton for the hero, Today card and Recent, with the 300 ms delay and the live parts as decided. Playwright: a cold load with delayed API responses shows the skeleton and lets a diaper log through; a reload with a cache shows the cached dashboard with no skeleton.
- [x] **2. Error states.**
  - Unreachable banner with Retry and the dimmed "as of" hero; refetch on focus and reconnect.
  - Invalid key: the profile check (a small pure rule in `packages/core` deciding "invalid key" vs "permission" from the two results), the screen, the reuse of scan and connect with the address kept, and the widget and notification state.
  - Stale timer: the core matching function (unit TDD), the "Already stopped on another phone" toast with Edit, the Recent highlight, and "Already running since HH:MM".
- [x] **3. History with filters.** Day grouping, per-day summaries and filtering as pure functions in `packages/core` (unit TDD, zero → one → many, then midnight and empty cases). A `packages/api` integration test for a closed date window (`*_min` + `*_max`) per entry kind. The route, the "See all" link, chips, day headers, rows opening the edit screen, "Load earlier", both empty states, the stored selection.
- [x] **4. Notification permission.** The sheet with the notification preview, "Not now" in settings, the hero line with Turn on, and the Settings copy lined up with the design ("Lock-screen timer", "Blocked in Android settings", "Open settings"). Extends `askNotificationPermission` in `src/notification/sync.android.ts` to tell "can still ask" from "blocked".
- [x] **5. Haptics.** `expo-haptics`, the mapping module (unit-tested: outcome → strength, including a refused optimistic action ending in the error haptic), calls at each action in the `HAPTICS` table, the Settings toggle. The web bundle gets a no-op.
- [x] **6. Accessibility fixes.** The ten findings, in this order: High (Today strip labels and one card label, darker Day marks to ≥ 3 : 1; no live region on ticking timers, spoken labels such as "Feeding for 12 minutes", toast as a polite live region; roles and states on tiles, chips and rows, chevrons and dots hidden; `minHeight` instead of fixed heights, hero timer `maxFontSizeMultiplier` 1.4, stop buttons one per row above 1.3× font scale), then Medium (Night toast "Adjust time" contrast; Day / Night pill to 48 dp with its label; `hitSlop` to 48 dp on Back, Cancel and Delete links; Cancel links at full opacity; "Tap again to delete" announced, reset after 4 s), then Low (press scale off when the system's Remove animations is on). A Vitest check computes the design's contrast pairs from `tokens.ts` so a token change can't regress them.
- [x] **7. App icon and splash.** SVG source, export script, `app.json`, the themed splash, the night-mode call in the local module, placeholder images removed. Check on the emulator: launcher (circle mask), themed icons (monochrome), a cold start in each theme override with no light flash at night, and the web favicon.

## Assumptions

- The design's tokens, copy and sizes are final enough to build from. Visual tweaks during review don't need a plan change.
- Baby Buddy's `*_max` list filters (`end_max`, `start_max`, `date_max`) work like the `*_min` ones, including the UTC-only rule for offsets. Step 3's integration test confirms it.
- An entry saved from a timer keeps the timer's start (to the minute). Step 2 confirms it against the container and records it in `NOTES.md`.
- The Android device checklist runs on a physical Android phone; the emulator is fine while building.
