# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Plans

Plans live in `plans/`, one folder per plan (`plans/implan-<topic>/`, never a new phase inside another plan). Each has `MAIN.md` (ordered steps with `[x]` progress), `NOTES.md` (verified facts, versions, decisions, open questions) and usually `TEST_STRATEGY.md` (Definition of Done). [`plans/README.md`](plans/README.md) lists every plan with its status.

`plans/implan-molly/` holds the system design (`MAIN.md`) and the authoritative Baby Buddy facts (`NOTES.md`, "Confirmed against the live API").

When picking up a plan, read its step list first. Mark a step `[x]` only when it's fully done. Record new versions, workarounds and confirmed API facts in that plan's `NOTES.md` (Baby Buddy facts also in `implan-molly/NOTES.md`). Steps that depend on an open question (listed under "Open" in `NOTES.md`) wait for its answer.

Committed files never hold personal details: no real children, real logs, home addresses, devices or private accounts. Use made-up examples and documentation addresses (`baby.example.com`, `192.0.2.10`).

## Branches and releases

Work goes on a branch from `develop` and into `develop` through a pull request, always opened with `gh pr create --base develop` and a written description (what changed and why, how it was tested); the GitHub default branch is `main`, so always pass `--base`. PRs into `develop` are squash-merged, and the squash commit's message is the PR title and description. `main` only moves through a release pull request `develop` → `main`, merged with a merge commit (never squash), then tagged `v<version>` with the APK built from the tag. Steps, version bump and hotfixes: [`docs/releasing.md`](docs/releasing.md).

## Commands

From the repo root (pnpm workspace, `node-linker=hoisted`):

```sh
pnpm install
pnpm test                                   # every package's Vitest suite
pnpm typecheck                              # tsc --noEmit in every package
pnpm --filter @molly/core exec vitest run <file> -t "<test name>"   # one file / one test
pnpm --filter @molly/core exec vitest       # watch mode
pnpm lint                                   # expo lint in apps/molly
pnpm check                                  # boundaries + typecheck + lint + all Vitest + web-bundle check
pnpm e2e                                    # Playwright against the nginx image (needs the test Baby Buddy up and seeded)
pnpm web:up / pnpm web:down                 # build + run the web image on :8080 (needs docker/.env with BABY_BUDDY_ORIGIN)
pnpm web:image:pi                           # arm64 image tarball in dist/ (e.g. for a Raspberry Pi)
pnpm bb:up && pnpm bb:seed                  # disposable Baby Buddy v2.11.0 on :4778, keys → e2e/.env.test (gitignored)
pnpm bb:down                                # wipes it (tmpfs)
pnpm brand:export                           # icon, adaptive icon, splash and favicon PNGs from apps/molly/assets/brand/mark.svg + tokens.ts
pnpm replay:naps <sleeps.json> <birth date> # replay real sleeps through nextSleep: hit rate, misses, width (data fetched separately, never committed)
```

In `apps/molly`:

```sh
pnpm web                     # Expo dev server, web
pnpm export:web              # static SPA → dist/
npx expo install <pkg>       # always use this, not pnpm add, for app deps (SDK-compatible versions)
pnpm android:release                        # (repo root) clean prebuild + signed assembleRelease; see docs/android-build.md
npx expo prebuild -p android --clean        # regenerate android/ (gitignored, never hand-edit)
cd android && ./gradlew assembleRelease     # needs JAVA_HOME=JDK 17, ANDROID_HOME set (see docs/android-build.md); pass both inline if your shell profile isn't loaded
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

Expo Go can't run this app (the widget needs native code). No EAS: all builds are local.

## Architecture

- **No backend.** Web, Android app and Android widget all call the family's Baby Buddy REST API directly with a per-parent token. Two parents share state only through Baby Buddy.
- **`packages/core`**: pure domain logic, no I/O (URL normalisation, nap rule, button → payload mapping, timer resolution, last-of-each, today's totals with midnight clipping, timeline merge). **`packages/api`**: typed Baby Buddy client (`createClient({ baseUrl, token })`) mapping failures to `unreachable | unauthorized | forbidden | notFound | validation | server`. Neither may import React, Expo or `apps/`, because the widget's headless task handler runs with no React tree, router or query client and must reuse them directly.
- **`apps/molly`**: Expo SDK 57 + Expo Router (routes in `src/app/`), NativeWind 4 (Tailwind 3, not 4), TanStack Query over `packages/api`.
- **Platform splitting by file suffix** keeps Android-only code out of the web bundle: all `react-native-android-widget` imports live in `*.android.ts(x)`, with a plain `.ts` sibling (no-op or web version) that TypeScript and web resolve. Same pattern for credentials: SecureStore in `.native.ts`, `localStorage` in `.web.ts`. The web bundle must never contain widget code. **The fallback must use the same extension as the platform file** (`x.android.tsx` + `x.tsx`, not `x.ts`): Metro resolves the extension before the platform, so a `.ts` fallback silently wins over `.android.tsx`.
- **Widget files need `'use no memo';` as their first line.** The React Compiler (on in `app.json`) otherwise rewrites them, and the widget renders blank. The error ("Invalid Hook Call") appears only in `adb logcat` under `ReactNativeJS`; the worker still reports success.
- **Reanimated views take `style`, never `className`.** NativeWind drops `className` on `Animated.View` on the web (it still works on Android, so it only shows there). Put classes on a plain `View` inside the animated one, as `components/sheet.tsx` does. On the web the app is a centred column at most 520 px wide (`ThemeProvider`).
- **Entry**: `apps/molly/index.ts` (`package.json` `main`) imports `src/widget/register` (registers the headless widget task handler on Android only), then `expo-router/entry`. The widget itself is declared in `app.json` under the `react-native-android-widget` plugin (the plugin crashes without a `widgets` array).
- **Day and night** come from the child's rhythm, recomputed from the sleeps on every render, never stored: `dayRhythm(sleeps, birthDate, napWindow, now)` (core `day-rhythm.ts`) learns the usual wake, usual bedtime and first wake window from the 14 days before today (with an anchor-free rule, so it can't drift), plus the age band's thresholds; the child's "Day starts / Day ends" setting (`napWindow`) stands in until 3 days are learned, for the morning under 3 months, and for the clock fallback. Every day function takes that `DayRhythm` (`dayWindow`, `windowsBefore`, `nextSleep`, `dayPlan`, `sleepingSpan`, `vitaminDCycle`…). The morning wake is the first sleep end near the usual wake after which the baby stayed up the age's threshold (so the ring stays night for that first hour); bedtime is a sleep starting within 90 min of the usual bedtime, or within 3 h that runs long. Nap or night for one sleep is `isNight` (`day-window.ts`); the flag is decided at the tap from what's at hand (`NightRule` in `actions/trackers.ts`: the dashboard's cached sleeps, the widget cache's `nightFrom`), by the clock (`isNightSleep`) with nothing at hand, and never patched. Plan and numbers: `plans/implan-day-night/`.
- **Next-sleep prediction** is computed on the device, never stored in Baby Buddy: `nextSleep(sleeps, runningSleepTimer, birthDate, rhythm, now)` from the last 14 days of sleeps (the dashboard's entries query, the widget refresh's own fetch) and the child's `birth_date`. While a sleep runs it's the sleep after it (the running nap assumed to last its usual length; none once it's the night). Past days are split into naps and bedtime by the day rhythm, never by the saved `nap` flag; bedtime comes once the day has its usual naps (or the usual bedtime is near), within an hour of the usual bedtime, earlier after short naps. Hidden at night, after 6 h awake, outside 6 weeks–36 months, and 45 min after the window. `dayPlan` chains the rest of the day from it and applies skips (`molly-skip` notes from the last days, fetched by the dashboard and the widget refresh); the widgets show the plan's first unskipped sleep, none while a sleep runs (the ring shows all of it and the window row the next).
- **Children**: `settings.childId` is the child on screen; per-child preferences (shown, colour index, nap window, bottle, Vitamin D reminder) are `settings.children[childId]`, filled from defaults by `childPrefs` (core) and dropped on sign-out. Read them through `features/children/use-children.ts` in the app, `childPrefs([], settings.children, id)` without the children list (widget refresh, notifications). Query keys carry the child id; the provider key and persisted cache don't, so switching back is instant.
- **Trackers**: sleep, feeding, diaper change and medication (medication is in-app only: not in the widget snapshot or `lastOfEach`). **Solid food** is a per-child setting (`ChildPrefs.solids`, off by default) that adds Solids to Feed in the app only: a meal is a `solid food` / `parent fed` feeding with amount `0` and the food in its notes. `isSolidFeed` (by method) keeps meals out of `lastOfEach`, the needs and the ml line; they still count in the feed totals.
- **Lock-screen notification**: local Expo module `apps/molly/modules/molly-notify/` (Kotlin, autolinked, not a pnpm workspace package). Shows a chronometer notification per running timer this device knows about; action taps go broadcast → `ActionReceiver` → expedited WorkManager → headless JS task `MollyNotifyAction` → `runIntent`. Content is built in `src/notification/model.ts` (unit-tested) from the widget cache; `refreshWidget` calls `syncNotifications`. Channel `molly.timers` must stay `IMPORTANCE_DEFAULT` with no sound (Pixel hides low-importance ones on the lock screen; importance is fixed once the channel exists).
- **Query cache is persisted** (`src/lib/query.tsx`, AsyncStorage key `molly.query-cache`): only settled, successful `timer` / `entries` / `children` queries, never optimistic guesses (negative ids), cleared on sign-out. Queries use `networkMode: 'always'` so offline reads fail (and show the "Can't reach" banner) instead of pausing; reconnect comes from `@react-native-community/netinfo` on native (`src/lib/online.native.ts`).
- **Stale connections**: every request has a 15 s timeout (`timeoutMs` in `packages/api`, fails as `unreachable`). On Android the app's `fetch` (`expo/fetch`, not React Native's networking) shares one OkHttp pool installed at `Application.onCreate` (`Connections.kt` in `molly-notify`, via `MollyNotifyPackage`); `freshConnections()` (`src/lib/connections`) empties it when the app comes back and at the start of widget and notification tasks, since a connection the network dropped while the phone was pocketed hangs instead of failing. The dashboard header says "Updating…" while that reload takes over 400 ms (`useUpdatingOnReturn`). Reproduce on the emulator by dropping the app's open connections with `iptables` (`adb root`).
- **Refused requests (401/403) are confirmed with `GET /api/profile`** (`src/session/key-check.ts`, `keyCheckVerdict` in core): only if the profile also fails is the key invalid (session status `keyRejected`, the `KeyRejected` screen at `/onboarding`); otherwise it's a missing permission and the normal toast shows. Widgets and the notification get a "Can't sign in · Open Molly" state via the widget cache.
- **Writes are optimistic** (`src/features/dashboard/optimistic.ts`): a guess with a negative id goes into the query cache and is undone on failure; the refetch replaces it.
- **Timers are the shared state.** Sleep and feeding use Baby Buddy timers named `molly:sleep` / `molly:feeding` (other timers are ignored). Stopping = POST the entry with `timer: <id>`. Every action carries intent (start/stop, never toggle) and checks the server first; 404 on stop means "already stopped", 403 means the user lacks `core.delete_timer`.
- Baby Buddy's real behaviour differs from its source in places (`/api/profile` has no trailing slash, bad token is 403, a consumed timer is a 400 on stop). `NOTES.md` "Confirmed against the live API" is authoritative; the seeded users `parent_a` (no `delete_timer`) and `parent_b` (with it) exist to test the permission paths.
- **Theme**: colours are semantic classes (`bg-surface`, `text-ink`, `bg-feed-ink`…) backed by CSS variables from `src/theme/tokens.ts`; never raw colours or `slate-*`. Use `Text` from `@/components/ui`, not React Native's (it applies Nunito and the ink colour; RN text doesn't inherit fonts).
- Web output is a single-page app (`web.output: "single"`), served by nginx with SPA fallback and a CSP whose `connect-src` allows only the Baby Buddy origin.

Widget logic lives in `src/widget/model.ts` (unit-tested, no widget library); `*.android.tsx` files there are the thin widget UI, task handler and app→widget sync.

## Testing method

Tests first, by kind of work:

- `packages/core`: Vitest unit tests, Given / When / Then comments, zero → one → many, then boundaries and errors.
- `packages/api`: Vitest integration tests against a real Baby Buddy container (`e2e/docker-compose.yml`, `lscr.io/linuxserver/babybuddy` pinned to v2.11.x), not mocks.
- Screens and flows: no TDD, Playwright against the built web image. Visuals and widget look: manual review. Android-only behaviour: manual device checklist in `plans/implan-molly/phases/mvp/TEST_STRATEGY.md`.
