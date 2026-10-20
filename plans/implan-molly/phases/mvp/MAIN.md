# MVP

Read the root [`MAIN.md`](../../MAIN.md) first; this file only adds the order of work and the detail for each step.

**Outcome:** both parents can onboard, start and stop sleep and feeding timers, log diapers, see the dashboard and edit entries. They can do this on the web (served from the Pi) and in the Android APK. The combined widget handles every one-tap action.

Some steps needed decisions first (Android application id, production Baby Buddy version). They're listed under "Open" in [`NOTES.md`](../../NOTES.md).

Work through the steps in order. Each step should land on its own. Mark it done here (`[x]`) before stopping, so the next session knows where to pick up.

## Steps

- [x] **1. Scaffold and compatibility proof.**
  - Set up the pnpm workspace, `apps/molly` (latest stable Expo SDK, Expo Router, NativeWind at the matching version), and empty `packages/api` and `packages/core` with Vitest.
  - Prove on a real device or emulator, with a throwaway release build:
    - (a) web export runs;
    - (b) a trivial widget renders from the headless handler;
    - (c) the handler can read a value from SecureStore and AsyncStorage and make a `fetch`.
  - Record the pinned versions and any workaround (e.g. `node-linker=hoisted`) in `NOTES.md`. If (b) or (c) fails, stop and raise it: the widget design depends on it.
- [x] **2. Baby Buddy test environment.** `e2e/docker-compose.yml` with `lscr.io/linuxserver/babybuddy`, pinned to a v2.11.x tag, with `CORS_ALLOWED_ORIGINS` set to the local Molly web origin. A seed script creates:
  - one child;
  - a second, non-superuser user without `delete_timer`;
  - a third user with it.

  It prints each user's API key. Record there the API facts you confirmed against the browsable API, especially default list ordering and whether `nap: null` gets auto-filled.
- [x] **3. `packages/api`.**
  - Client factory `createClient({ baseUrl, token })`, request wrapper and error mapping (`unreachable | unauthorized | forbidden | notFound | validation | server`).
  - Typed functions for every row of the feature → API table in root `MAIN.md`.
  - Tested against the test container.
- [x] **4. `packages/core`.** Pure functions, all unit-tested:
  - URL normalisation
  - nap rule (window, start time → bool)
  - widget stop button → feeding `{type, method, amount}`, using device defaults
  - diaper button → `{wet, solid}`
  - timer resolution: intent + server state → action or "already" outcome
  - last-of-each
  - today's totals with midnight clipping
  - timeline merge and sort
- [x] **5. Onboarding and storage.** Credential adapters (`.native.ts` SecureStore, `.web.ts` localStorage) and settings in AsyncStorage. Then the onboarding flow from root `MAIN.md`:
  - validate with `/api/profile/`, pick the child, show the checklist with the permissions note;
  - clear error states for bad key, unreachable, and CORS/Access;
  - sign out.
- [x] **6. Trackers and dashboard (web first).** TanStack Query hooks over `packages/api`. Build:
  - dashboard: running timers with elapsed time and "you"/"someone else", last of each, today's totals, recent timeline;
  - start/stop sleep; start feeding; stop feeding with method picker (Left, Right, Both, Bottle), bottle defaults applied;
  - cancel timer; diaper Wet / Dirty / Both;
  - edit and delete entry (amount, method, nap, times, color, notes/tags);
  - settings (bottle type and amount, nap window, child).

  Refetch on focus and foreground, and poll every 30 s while the dashboard is visible. Add Playwright coverage as you go.
- [x] **7. Web image and deployment.** *(2026-09-24. Changed: no GHCR; `pnpm web:up` locally and an arm64 tarball for the Pi. The operator runs it on the Pi.)*
  - `docker/Dockerfile` (nginx:alpine + `dist/`), `nginx.conf.template` (SPA fallback, asset caching, CSP with `connect-src` from env), `docker/compose.yml`.
  - A script: export web, build the image locally, and save an arm64 tarball for the Pi.
  - Run Playwright against the built image, not only the dev server.
- [x] **8. Android release build.** `docs/android-build.md`:
  - JDK and Android SDK install on Apple Silicon (e.g. Homebrew `openjdk@17` or the version the chosen SDK requires, Android command-line tools, `ANDROID_HOME`);
  - `keytool` keystore creation outside the repo;
  - `~/.gradle/gradle.properties` keys, and the release `signingConfig` injected by a small config plugin so `prebuild` doesn't wipe it;
  - `expo prebuild -p android --clean`, `./gradlew assembleRelease`, `adb install -r`;
  - backup instructions for the keystore.

  Add a `pnpm android:release` script.
- [x] **9. Widget.** One combined resizable widget with three rows:
  - **Sleep:** Start, or Stop + elapsed.
  - **Feeding:** Start, or Left / Right / Bottle + elapsed.
  - **Diaper:** Wet / Dirty / Both.
  - Each row shows "last at HH:MM".

  Click actions carry intent (`SLEEP_START`, `SLEEP_STOP`, `FEED_START`, `FEED_STOP_LEFT`, …) and go through the `packages/core` timer-resolution logic. Behaviour:
  - render from the AsyncStorage cache, then refresh;
  - show "not updated since" on failure;
  - short-lived confirmation or error text in the row;
  - the app calls `requestWidgetUpdate` after every successful write and on foreground;
  - `updatePeriodMillis` is 30 min;
  - a tap on the header opens the app.
- [x] **10. Setup docs.** `docs/setup.md` covers:
  - Baby Buddy `CORS_ALLOWED_ORIGINS`;
  - creating a Baby Buddy user per parent and granting `core.delete_timer` (or superuser);
  - where to find the API key;
  - Cloudflare Tunnel hostnames, and an Access bypass for `/api/*` on Baby Buddy while Molly's own hostname stays behind Access;
  - running the image on the Pi;
  - troubleshooting "can't reach Baby Buddy" (CORS vs Access redirect vs down).

  Onboarding error text links to its sections. *(Done as an in-app `/help?topic=` screen, since the repo isn't hosted: `reach`, `key`, `permissions`, mirroring `docs/setup.md`.)*

## Done when

Everything in [`TEST_STRATEGY.md`](TEST_STRATEGY.md) in this folder passes.
