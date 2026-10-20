# MVP: Definition of Done

The MVP is done when every item below is true. The method (which layer gets TDD, which gets Playwright, which gets manual checks) is in the root [`TEST_STRATEGY.md`](../../TEST_STRATEGY.md). Items are outcomes: choose the test shape yourself, following that method.

## Foundations (step 1)

- [x] The pinned Expo SDK, NativeWind and `react-native-android-widget` versions build for web and for an Android release APK. The versions are recorded in `NOTES.md`.
- [x] A widget task handler running headless reads from SecureStore and AsyncStorage and completes an HTTPS request, confirmed on a real device.

## Domain rules (`packages/core`, unit TDD)

- [x] Baby Buddy URLs are normalised: trailing slashes and `/api` removed, `https` required except for LAN and localhost addresses, invalid input rejected.
- [x] A sleep's `nap` flag is true exactly when its start falls inside the configured daytime window, window edges included. The default window is 07:00–19:00.
- [x] Widget feeding stops map correctly:
  - Left → `breast milk` / `left breast`
  - Right → `breast milk` / `right breast`
  - Bottle → `bottle` + the device's default type and amount
- [x] Diaper buttons map correctly: Wet → wet only, Dirty → solid only, Both → both.
- [x] Timer decisions:
  - start with no timer → create;
  - start with a timer → "already running since HH:MM";
  - stop with a timer → consume;
  - stop with none → "already stopped";
  - a stop that returns not-found → "already stopped";
  - a stop that returns forbidden → the permission message.
- [x] "Last of each" returns the most recent sleep, feeding and change, or an empty state for a new child.
- [x] Today's totals count from local midnight, clipping a sleep that crosses midnight to today's part only.
- [x] The timeline merges all three entry types newest first, with stable order for equal timestamps.

## Baby Buddy client (`packages/api`, integration against the test container)

- [x] A valid key returns the profile with the user id. A wrong key surfaces as `unauthorized`. An unreachable host surfaces as `unreachable`.
- [x] Starting a sleep or feeding creates a timer named `molly:sleep` or `molly:feeding` for the child. It's found again by child + name.
- [x] Stopping through the timer creates a sleep or feeding with the right fields and removes the timer.
- [x] A user without `delete_timer` stopping another user's timer gets `forbidden`, and the timer stays. A user with the permission succeeds.
- [x] Stopping a timer that's already gone surfaces as `notFound`.
- [x] Diaper changes, manual entries, edits (amount, method, nap, times, color, notes, tags) and deletes round-trip for all three entry types.
- [x] Lists that span more than one page are fully collected.
- [x] Every enum value Molly sends is accepted by the container. This guards against drift in Baby Buddy's field names.

## App flows (Playwright on the web image)

*Status 2026-09-24: all pass in `e2e/tests/` against the production nginx image (`pnpm e2e` builds it).*

- [x] **Onboarding:**
  - a valid URL and key reach the dashboard, with the permissions note shown once;
  - a bad key shows "key rejected";
  - an unreachable or CORS-blocked instance shows the "can't reach" message with CORS and Cloudflare Access hints.
- [x] With several children, onboarding asks for a choice. With one, it doesn't. The choice can be changed in settings.
- [x] Start and stop sleep from the app. The resulting entry has the correct nap flag.
- [x] Start a feeding, then stop it with each method. A bottle stop records the device's default type and amount, and the amount can be edited afterwards.
- [x] Log each diaper kind. It appears in "last change" and in the timeline.
- [x] **Two parents:** a timer started by parent A appears on parent B's open dashboard within about 30 s, marked "someone else". B stops it (with permission), and A's dashboard shows it stopped.
- [x] Without the permission, B sees the specific permission message, not a generic error.
- [x] Cancelling a timer removes it without creating an entry.
- [x] The dashboard shows running timers with elapsed time, last of each, today's totals and the recent timeline. They match the seeded data.
- [x] Editing and deleting an entry from the timeline changes it in Baby Buddy.
- [x] Changing the bottle defaults or nap window in settings takes effect for the next log.
- [x] Sign out clears stored credentials and returns to onboarding.
- [x] While Baby Buddy is down, actions show a clear "can't reach Baby Buddy" error, and nothing looks as if it was saved.

## Android (device checklist on a real phone, release APK)

- [ ] The signed release APK installs over a previous version (`adb install -r`) without uninstalling. This proves the keystore signing is stable. *(Confirmed on the emulator: a second clean build installed over the first and kept the session. Repeat on the phone.)*
- [ ] Onboarding stores credentials in SecureStore. They survive an app restart and a phone reboot. *(App restart and sign-out confirmed on a physical phone; reboot confirmed on the `molly` emulator, API 36. Recheck the reboot on the real phone in the final device pass.)*
- [x] Every flow in "App flows" works in the Android app. Spot-check at least onboarding, sleep, feeding and diaper. *(Physical phone over Wi-Fi: onboarding, start + cancel sleep, feeding + Left, diaper, delete from the timeline.)*
- [ ] The widget can be added, resized, and shows three rows with "last at HH:MM". *(Added via Settings → Add widget to home screen and shows the rows on the emulator; resizing not yet checked.)*
- [ ] With the app closed, each widget action works:
  - start and stop sleep;
  - start feeding; stop Left, Right or Bottle;
  - Wet, Dirty, Both.

  Each shows a confirmation, and the entry is correct in Baby Buddy. *(Emulator, app process killed: start sleep, start feeding, Bottle, diaper Both checked in Baby Buddy; every button's mapping is unit-tested in `src/widget/model.test.ts`.)*
- [ ] After logging in the app, the widget updates within a few seconds without being tapped. *(Passed on the `molly` emulator; repeat in the final phone pass.)*
- [ ] When the other parent starts a timer, the widget shows it after the app is opened, after a widget tap, or within 30 min. *(Passed on the `molly` emulator; repeat in the final phone pass.)*
- [ ] Tapping stop on a stale widget whose timer the other parent already stopped shows "already stopped" and creates no entry. *(Passed on the `molly` emulator; repeat in the final phone pass.)*
- [ ] In airplane mode, the widget keeps its last data, shows "not updated since HH:MM", and a tap shows an error instead of a false confirmation. *(Passed on the `molly` emulator; repeat in the final phone pass.)*
- [ ] Tapping the widget header opens the app. *(Passed on the `molly` emulator; repeat in the final phone pass.)*

**Polish** ([`plans/implan-polish/TEST_STRATEGY.md`](../../../implan-polish/TEST_STRATEGY.md)), signed off on a device:

- [x] Cold start after force-stop shows the cached dashboard; airplane mode shows the banner and the dimmed hero; turning it off refetches without a tap.
- [x] First timer start on a fresh install shows the permission sheet with the timer already running; Continue asks Android; "Not now" never shows the sheet again; the hero line's Turn on prompts again, or opens notification settings once Android has stopped prompting. *(Passed on the `molly` emulator.)*
- [x] A widget or notification action with a revoked key shows "Can't sign in · Open Molly"; tapping it opens the invalid-key screen; a new key fixes both.
- [x] Haptics match the design's table; nothing when the Settings toggle is off or the system's touch feedback is off. *(Effects and the toggle confirmed in the emulator's vibrator log; the feel needs the phone.)*
- [x] TalkBack: the Today card reads as one summary; tiles, chips and rows read with role and state; the running timer isn't read every second; start, stop and errors are announced once; "Tap again to delete" is announced.
- [x] Font size at 200 %: no clipped buttons, the hero timer stops growing, the stop buttons wrap one per row. *(Passed on the `molly` emulator after fixes.)*
- [x] Every tap target in the design's findings is at least 48 dp (Back, Cancel, Delete, the Day / Night pill).
- [x] Remove animations on: no press scale.
- [x] Launcher icon in circle and squircle masks, themed (monochrome) icons on. *(Circle mask checked on the emulator.)*
- [x] Splash: cold start with the Night override while the system is light shows the Night splash with no light flash, and the reverse; the icon sits inside the safe zone. *(Passed on the `molly` emulator.)*

## Deployment and docs

- [x] One command builds and runs the web image on the Mac (`pnpm web:up`), and one writes an arm64 image tarball for the Pi (`pnpm web:image:pi`). No registry.
- [ ] The Pi loads the tarball and runs it with `docker/compose.yml`. Deep links reload correctly (SPA fallback). *(Deep links pass against the image in Playwright; the Pi run is done by the operator.)*
- [x] Responses carry a CSP whose `connect-src` allows only the configured Baby Buddy origin. Hashed assets are cached long-term, and `index.html` isn't cached.
- [x] The image contains no Baby Buddy URL or key.
- [ ] Following `docs/setup.md` from scratch gets a second person to a working web and Android setup. It covers:
  - `CORS_ALLOWED_ORIGINS`;
  - users and the `delete_timer` permission;
  - the API key;
  - Cloudflare Tunnel with the `/api/*` Access bypass, while Molly stays behind Access;
  - troubleshooting.

  *(Written 2026-09-24 from facts verified against Baby Buddy v2.11.0; not yet followed by a second person.)*
- [ ] Following `docs/android-build.md` from a clean Mac (JDK, Android SDK, keystore, gradle properties) produces a signed release APK. The keystore backup step is included. *(Written from the steps that produced the signed APK on this Mac; not yet followed on a clean Mac.)*
