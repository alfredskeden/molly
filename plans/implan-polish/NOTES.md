# Notes

## Decisions (2026-09-25)

- Own plan in `plans/implan-polish/`, not a phase folder inside `implan-molly`.
- Design: `Molly Polish.dc.html`, the (private) design source.
- All seven design sections are in scope, **except the Cloudflare Access "Your sign-in expired" screen**: dropped. An expired Access session shows as "Can't reach". (For the record, telling it apart would have needed `fetch(..., { redirect: 'manual' })`: a cross-origin redirect to the Access login otherwise fails CORS with the same `TypeError` as being offline.)
- Accessibility: the design's ten findings are the checklist, applied through shared components. No separate audit of the screens the design doesn't show.
- Widgets and the lock-screen notification: only the invalid-key path changes.
- Cold-start cache: persist the TanStack Query cache (not seeding from the widget snapshot, which is Android only and has no entry lists).

## Found while planning (2026-09-25)

- `src/lib/query.tsx` creates a plain `QueryClient` (`retry: 1`); nothing is persisted, so today every start is cold.
- Baby Buddy sends 403 for a bad token (`/api/profile`) and for a missing permission (`core.delete_timer`), see root `NOTES.md`. Today a 403 on a timer stop maps to `permissionNeeded` (`packages/core/src/timer.ts`), with the toast in `src/features/dashboard/outcome-messages.ts`.
- `askNotificationPermission` and the Settings "Lock screen" choice with "Open Android settings" already exist (`src/notification/sync.android.ts`, root `NOTES.md` "Redesign" step 8). Step 4 adds the sheet, "Not now" and the hero line, and tells "can still ask" from "blocked".
- `expo-haptics` isn't installed yet. `expo-splash-screen` is (`~57.0.9`), configured in `app.json`.
- `assets/images/` still holds Expo's template images (`react-logo*`, `expo-*`, `tutorial-web.png`, `logo-glow.png`, `tabIcons/`); check nothing imports them before deleting.
- `listEntries` in `packages/api/src/client.ts` already pages by offset and takes any Baby Buddy filter as `query`.

## Step 1: cache and skeletons (2026-09-25)

- Added `@tanstack/react-query-persist-client` and `@tanstack/query-async-storage-persister` `^5.103.2` (same line as `@tanstack/react-query`).
- Stored under AsyncStorage key `molly.query-cache` (plain `localStorage` key on web). Only `timer`, `entries` and `children` queries, only when idle and successful, and never data holding a negative id. `buster` = cache version + session key (URL, user, child); `maxAge` and `gcTime` 24 h.
- The persister throttles writes (1 s), so a write can land after sign-out removed the cache. The provider's storage wrapper is closed on unmount and drops late writes; the signed-out provider removes the key on mount.
- `AccessibilityInfo.announceForAccessibility` is a no-op in react-native-web, so "Loading today" is a polite live region on web and an announcement on native.
- Playwright's `toBeVisible` counts `opacity: 0` as visible, so before 300 ms the skeleton isn't rendered at all (not rendered invisibly); `e2e/tests/loading.spec.ts` checks it by count.

## Step 2: error states (2026-09-25)

- **Timer start confirmed:** an entry saved from a timer has exactly the timer's `start`. `packages/api/src/timers.int.test.ts` already asserted it (`start: timer.start`) for sleep and feeding; no new test needed. Matching is still to the minute (`entrySavedFromTimer`).
- `errorKindFor` already splits a 403 by its detail ("Invalid token." → `unauthorized`, anything else → `forbidden`). The profile check (`keyCheckVerdict`, `src/session/key-check.ts`) runs on both kinds anyway, as decided: a proxy or an older Baby Buddy may word it differently. A profile check that fails some other way (offline, 5xx) is `unconfirmed` and changes nothing.
- Every refused request, read or write, triggers the check: `useClient()` wraps the client (`watchRefusals`), one check at a time per key. Dashboard writes wait for it before their toast, so a bad key never flashes the permission toast.
- `keyRejected` is a session status (in memory, not stored). It keeps the session and the query cache; the onboarding stack shows `KeyRejected` at `/onboarding`, the connect form moved to `features/onboarding/ConnectForm.tsx` (also at `/onboarding/connect`). A new key for the same address with the child still there signs in directly, skipping the child choice and checklist. On web there's no "Scan a new key" (no barcode scanning); "Type the key instead" is the primary button.
- Widget cache has `keyRejected` (old caches load as `false`), set by `refreshedCache` in `src/widget/model.ts` after a refused refresh plus a refused profile, and cleared by the next good refresh. The widget shows "Can't sign in · Open Molly" (`OPEN_APP`); a running timer's notification becomes "Can't sign in · Open Molly to add a new key" with no buttons (its tap already launches the app).
- Reconnect on native: added `@react-native-community/netinfo` `12.0.1` (native module, needs a rebuild), wired to TanStack's `onlineManager` in `src/lib/online.native.ts`; web keeps the browser's online events. Queries use `networkMode: 'always'`: with the default `online` mode an offline read pauses silently instead of failing, so the banner would never show.
- Retry is never disabled: a request hanging on a bad connection would otherwise leave it dead. Offline, each dashboard read makes one attempt plus one retry, then waits for the poll, focus or reconnect (checked in Playwright, no loop).
- Toast texts: "Already stopped on another phone" (with "Nap saved there · 07:56–09:08" and Edit when the entry is found), "Already running since 09:02 · started by someone else" (or "by you"). The widget's short notes are unchanged.
- The hero with no sleep logged yet also says "as of HH:MM" while unreachable (the design only shows the "since" case).
- Playwright: the persister's first throttled write can hold only some queries, so specs that reload rely on polling the stored cache (e.g. for all four queries) first.

## Step 3: History (2026-09-25)

- **`*_max` confirmed:** `end_max`/`start_max`/`date_max` work like the `*_min` filters (UTC), across pages (`packages/api/src/window.int.test.ts`). History fetches a week `[from, to)` per page: sleeps by overlap (`end_min` + `start_max`, so a night sleep from the week before still counts after midnight), feedings by `start_*`, changes and medication by `date_*`. A sleep crossing a window boundary comes back in both weeks; `mergeWeeks` keeps one.
- Added `client.getLatestEntry(kind, child)` (limit 1, newest first) for the empty state's "The last one was…".
- Core: `toggleKind`, `historyDays` (grouped by the local day an entry started; a day's sleep total clipped at both midnights via the shared `sleptBetween`, which `todaysTotals` now uses too; days before the oldest loaded week left out), `emptyHistory`.
- `emptyHistory` has a third case the design doesn't show: no filter, nothing this week, but older entries exist → "Nothing logged this week", the last entry, and "Load earlier". Several trackers filtered read "No sleep, feeds or diapers this week"; after Load earlier "in the last 2 weeks".
- The History query (`['history', child]`, an infinite query) isn't persisted; writes invalidate it and `['latest']` with the dashboard's queries.
- The filter is a per-device setting (`historyFilter`, kept on sign-out like the theme); a broken stored value shows everything.
- Chips are `role="checkbox"` with `aria-checked` (All too, checked when nothing is selected); day labels are headings. "See all" is a link to the right of the Recent heading (the design doesn't show where it sits).
- Playwright: on web the dashboard stays in the DOM under History, so text that appears on both (the Today card's totals, "Today") must be scoped, e.g. to `getByTestId('history-days')`; role queries already skip the hidden dashboard.

## Step 4: notification permission (2026-09-25)

- `lockScreenPrompt` (`src/notification/model.ts`, unit-tested) decides: the sheet the first time a timer is started from the app, then only the hero line; nothing on web, with the setting off, or once allowed. The answer (Continue or Not now) is the per-device setting `notificationPrompted`, kept on sign-out.
- **Can still ask vs blocked:** Android only says "blocked" when asked. `askNotificationPermission` returns `granted | denied | blocked` (`never_ask_again`, before Android 13, or granted-but-switched-off). "Don't ask again" is remembered on the device (AsyncStorage `molly.notifications-blocked`, cleared once notifications are allowed), so Settings can show "Blocked in Android settings" without prompting.
- "Turn on" opens Molly's notification settings (new `MollyNotify.openSettings()`, `ACTION_APP_NOTIFICATION_SETTINGS`; native change, needs a rebuild) only when Android answered **without** showing its prompt. Found on the emulator: the second "Don't allow" itself returns `never_ask_again`, and opening settings right then throws a parent who just said no into system settings. A prompt that answers within 500 ms was never shown; nobody reads it and taps that fast.
- Checked on the emulator (release APK, Android 16): sheet with the running timer behind it; Not now → the hero line, remembered after a restart; Turn on → prompt, twice; the third Turn on → Molly's notification settings; Settings shows "Blocked in Android settings" / "Open settings". Not yet on a physical phone.
- The sheet dismisses the "Sleep started" toast (it would cover the buttons). It only opens when the timer really runs after the start (a failed start leaves nothing pending).

## Step 5: haptics (2026-09-25)

- `expo-haptics` `~57.0.3` (native: needs a rebuild). All calls go through `performAndroidHapticsAsync`, i.e. the view's `performHapticFeedback`, which follows the system's touch-feedback setting (the vibrator log shows usage `TOUCH`, reason `ViewRootImpl#performHapticFeedback`).
- **`AndroidHaptics` per strength** (`src/haptics/play.android.ts`):

  | Strength | Design meaning | `AndroidHaptics` | `HapticFeedbackConstants` |
  | --- | --- | --- | --- |
  | medium | a timer started | `Virtual_Key` | 1 |
  | success | saved with a duration | `Confirm` | 16 |
  | light | one-tap logs, cancels | `Keyboard_Tap` | 3 |
  | selection | a choice or step, nothing saved | `Clock_Tick` | 4 |
  | warning | "are you sure", "already" | `Long_Press` | 0 |
  | error | nothing saved | `Reject` | 17 |

  Android has no "warning" constant; `Long_Press` is the stronger, distinct buzz. `Clock_Tick` rather than `Segment_Tick` because the latter needs Android 14.
- Checked on the emulator through `adb shell dumpsys vibrator_manager`: Wet → 3, Start sleep → 1, Stop sleep → 16, Day/Night → 4; with Haptics off in Settings a Wet log plays nothing. The emulator can't be felt: the strengths themselves need a physical phone.
- Where they play: dashboard actions on the guess (`run(source, tap, …)`), then `answerStrength` for Baby Buddy's answer (warning for "already", error for failed or refused); `Choice` and the Day/Night pill (in `components/ui.tsx`, so every screen), History chips, the edit screen's nudges, amount steps and delete arming (and error on a refused save), the start popup's steps, the Adjust-time chips, steps and refused Set time.
- The web gets `play.ts` (no-op). `scripts/check-web-bundle.mjs` now also looks for `segment-frequent-tick`, an `AndroidHaptics` value that survives minification (`ExpoHaptics` doesn't appear in the web build of expo-haptics, so it wouldn't catch a leak); a deliberate leak made the check fail.

## Step 6: accessibility (2026-09-25)

- **Contrast test** (`src/theme/contrast.test.ts`, WCAG formula over `tokens.ts`, both themes): the design's passes (ink, muted, danger, toast, tile text and buttons, hero sub-lines at 85 %) plus the fixes below. All of the design's passes held as they were.
- **Today strip marks:** the design's suggested L 0.68 only reaches ≈ 2.7 : 1 on Day `bg`. New `*-mark` tokens: Day sleep and feed L 0.64, diaper L 0.62, med L 0.64 (3.1–3.2 : 1); Night marks are the Night `mid` colours (4.6–6.9 : 1 already). The strip has row labels (Sleep, Feed, Diaper, Med) and the card one spoken summary ("Today: 7h 40m sleep, 4 feeds, 3 diapers, 1 med").
- **Night toast buttons:** new `on-mid` token (Day `ink`, Night `bg`) for the text on `mid` ("Adjust time", "Edit"): 4.6–6.9 : 1 in Night instead of 2.1–3.2.
- Cancel links at full opacity. The ticking timer is a button labelled "Sleeping for 12 minutes. Edit start time" (`spokenDuration`), never a live region; the Awake duration is spoken the same way. The toast text is `role="status"` in a polite live region (was `alert`; form banners stay `alert`). Rows read "Feed at 08:15, Left, 17 minutes. Edit." (`spokenEntry`), with the dot, the chevron and the colour swatches hidden. Tile names are headings.
- **Large fonts:** the hero timers stop growing at 1.4× (`maxFontSizeMultiplier`), the feeding stop buttons go one per row above 1.3× font scale, tappable things use `min-h-*`. Found on the emulator at 200 % and fixed: the header now wraps (the date broke mid-word), the Today header wraps, and each strip row is label + lane, the lane as tall as its label, the label column widening with the font up to 1.5×.
- **48 dp:** `SLOP_48` (`components/ui.tsx`) on Back, the Cancel links, header links, help links; the Day / Night segments are 40 px plus slop. The first tap on Delete announces "Tap again to delete" and disarms after 4 s.
- **Remove animations:** `components/pressable.tsx` wraps Pressable and drops `active:scale-[…]` when Reanimated's `useReducedMotion()` is true; every Pressable with a press scale uses it.
- Playwright specs now find toasts by `role="status"` and rows by their spoken label.

## Step 7: icon and splash (2026-09-25)

- Source: `apps/molly/assets/brand/mark.svg` (the four rows and the now line, in the design's launcher coordinates). `pnpm brand:export` (`scripts/export-brand.mjs`, `@resvg/resvg-js` `^2.6.2` as a root dev dependency) renders `icon.png`, the adaptive `android-icon-foreground/background/monochrome.png`, `splash-icon.png`, `splash-icon-dark.png` and `favicon.png`, reading the colours from `tokens.ts`. Expo's template images and the unused iOS `assets/expo.icon` are deleted.
- **Adaptive icon:** the Pixel launcher shows more of the 108 dp layer than the 72 dp the design's board suggests, so the mark is sized by the safe zone instead: its corners 31 dp from the centre (the safe zone is 33). On the emulator's circle mask that makes it about half the circle's width, as in the design. The monochrome layer leaves out the now line, as the design does. Themed icons (monochrome) not checked on the emulator yet.
- **Splash:** Android 12+ masks the splash icon to a 192 dp circle on a 288 dp canvas, so the design's rounded tile is 140 dp (27 % corners) and stays whole; `imageWidth` 288. Day: ink tile on Day `bg`; Night (`dark` in the plugin config): Night surface tile on Night `bg`. The design's "Molly" wordmark under the icon is left out: `expo-splash-screen` has no branding image.
- **Confirmed on the emulator (Android 16):** `UiModeManager.setApplicationNightMode` (new `MollyNotify.setNightMode`, called from `ThemeProvider` whenever the preference is known or changes) makes the next cold start's system splash follow the per-device override: Night chosen with the system light → Night splash, Night app; Day chosen with the system dark → Day splash, Day app; "Follow the phone" (`MODE_NIGHT_AUTO`) follows the system both ways. `uiMode` is in the activity's `configChanges`, so the call doesn't recreate the activity.
- The splash is held (`preventAutoHideAsync` in the root layout) until the session is loaded (the theme and fonts are by then); before this a blank frame showed between the system splash and the first screen.

## Verify during implementation

All answered; see the step sections above.

- `*_max` list filters behave like `*_min` (UTC only): yes (step 3).
- An entry saved from a timer keeps the timer's start: yes, exactly (step 2).
- `UiModeManager.setApplicationNightMode` makes the system splash follow the override: yes, on the emulator (step 7).
- `AndroidHaptics` per strength: table in step 5.
- Reconnect on native needs `@react-native-community/netinfo`: yes (step 2).

## Open

- None.
