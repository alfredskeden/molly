# Definition of Done: Expo review

The project's methods (root `CLAUDE.md`):
- **Pure logic:** unit TDD in `packages/core`, `packages/api` and pure app modules. Use Given / When / Then, go zero → one → many, then boundaries and errors.
- **`packages/api` against Baby Buddy:** integration tests against the test container, only where the real server's behaviour matters.
- **Screens and flows:** Playwright against the built web image.
- **Native and visual behaviour:** emulator checks on `emulator-5554`.
- **Every step:** `pnpm check` green.

Done when every box is ticked.

## Bugs

- [x] A tap's guess survives a poll: with a write held up past the next poll (slow Baby Buddy, or a delayed request in a test), the dashboard never flips back to the old state. Polling and focus refetch resume after the write.
- [x] A failed write still undoes its guess (the existing behaviour).
- [x] On Android, Back from Settings or Recent days leaves that screen on the first press, including when Settings was opened from a past window.
- [ ] On the dashboard, Back still closes the editor, then the picker, then the past window, then leaves the app.
- [x] A failing credentials or settings read ends on the signed-out screen with the default theme, not on the splash (forced failure in a test or a temporary throw, removed afterwards).
- [x] A lock-screen Stop tapped while the app is starting still runs. A notification whose task fails or is stopped comes back with its buttons.
- [ ] After editing or deleting a sleep, the next-sleep prediction and the ring agree at once, before any refetch.
- [x] The dashboard fetches recent sleeps once per poll, not twice.
- [x] An unknown 4xx (405, 408, 409, 413, 429) from Baby Buddy doesn't run the key check or show a permission toast. 401 and 403 behave as before. Unit tests cover each status.

## JS-thread load

- [x] The dashboard screen re-renders once a minute, not every second (React DevTools profiler or a render counter, removed afterwards). The ring centre and a running tile still tick every second and show the same seconds.
- [x] The ring, window row and tiles look the same as before at any moment (side-by-side check on the emulator).
- [ ] The notification module's `show`, `keepOnly`, `showReminder`, `keepOnlyReminders` and `liveUpdates` are async. Lock-screen notifications still appear, update and disappear correctly for sleep, feeding and the Vitamin D reminder, with one and with two children.
- [x] A query cancelled mid-request aborts its HTTP request, and the app doesn't treat the abort as `unreachable` (no "Can't reach" banner). Unit test in `packages/api` for the combined signal and timeout.
- [x] 4xx errors are never retried; `unreachable` and `server` are retried once. Unit tests on the retry predicate.
- [x] One tap triggers only the refetches its screen needs: `past` and `days` don't refetch unless they're showing, and `history` is gone.
- [x] `implan-instant-taps/NOTES.md` points at the JS-load fixes that landed here.

## Hygiene

- [x] `npx expo install --check` reports nothing to fix, and `npx expo-doctor` passes every check.
- [x] `expo-symbols`, `expo-glass-effect`, `@expo/ui`, `expo-device` and `expo-web-browser` are gone from `package.json`, the lockfile and `app.json`, and nothing breaks.
- [x] `react-native-android-widget` is pinned to `0.22.1` and the patch applies on a clean `pnpm install`.
- [x] `pnpm android:release` builds from a clean prebuild, and the release APK runs on the emulator: dashboard, widget taps and lock-screen actions.
- [x] The web bundle builds, contains no widget code, and the Playwright suite is green.
- [x] On the web image, an unknown path goes to the dashboard (or onboarding when signed out), not "Unmatched Route".
- [x] Reloading `/settings`, `/recent-days` or `/child/<id>` on the web, then going back, lands on the dashboard.
- [x] A render error shows a themed error screen whose Try again recovers (forced with a temporary throw, removed afterwards).
- [ ] The persisted cache keeps the last good timer and entries when the app is killed during a refetch: a cold start after that shows data, not the skeleton. Guesses are never persisted. Unit tests on the persist predicate.
- [x] A list that gains an entry between pages returns each entry once (unit test on the dedupe).
- [ ] A malformed notification colour falls back instead of crashing.
- [ ] The skeleton pulse looks as before and stops with Remove animations on.

## Sheets

- [ ] Every sheet slides in and out with the scrim fading. With Remove animations on, they appear and disappear without motion.
- [ ] Dragging a sheet down past the threshold closes it. A short drag springs it back. Scrolling inside a sheet's content still scrolls and doesn't close it. A drag that's cancelled doesn't leave the sheet half-open.
- [ ] In the Add sheet, the focused time field stays visible while the keyboard opens, and the sheet moves with the keyboard, not after it.
- [x] With TalkBack on and a sheet open, swiping never reaches the dashboard or Settings behind it.
- [x] Sheets work on the web (click the scrim and Done to close, and the keyboard library does nothing harmful there).

## Accessibility and polish

- [x] Every tappable listed in `MAIN.md` shows a pressed state, and no press scale goes below 0.97.
- [x] TalkBack reads timers in minutes and doesn't re-announce them every second while focused.
- [x] TalkBack explains why the Add button is dimmed.
- [x] `Segment` options are at least 48 dp to tap.
- [x] No arbitrary `text-[Npx]` remains for the sizes that got tokens, and no `rounded-[18px]` / `rounded-[10px]` remain.

## Look review

- [ ] Emulator, all six themes, day and night, largest font: dashboard, sheets (open, drag, keyboard), Settings, the error screen. Nothing looks different except what this plan changed on purpose.
- [ ] Web, both themes: the same screens.

## Wrap up

- [x] Root `CLAUDE.md` "Where things stand" lists this plan and what's left.
- [x] The physical-phone checklist is written down: lock-screen Stop while the app is starting, Back from Settings, sheet drag and keyboard, TalkBack behind a sheet.
