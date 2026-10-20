# Notes

## Verified against Baby Buddy v2.11.0 source (github.com/babybuddy/babybuddy)

- CORS: built in via `django-cors-headers`; set env `CORS_ALLOWED_ORIGINS` (comma-separated) on the Baby Buddy instance.
- Timer API fields: `id, child, name, start, duration, user` (the model's `active` isn't serialized). No end, no type. Molly tells timers apart by `name`. Filterable by `name`, `user`, `child`.
- Stopping a timer = POST `/api/sleep/` or `/api/feedings/` with `"timer": <id>`; Baby Buddy fills start/end and deletes the timer. (Confirmed. A second stop is a 400, see below.)
- `Timer.can_be_consumed_by(user)`: only the owner, or a user with `core.delete_timer` (superuser has it), can turn a timer into an entry. Deleting another user's timer needs the same permission.
- Feeding: `type` required (`breast milk | formula | fortified breast milk | solid food`), `method` required (`bottle | left breast | right breast | both breasts | parent fed | self fed`), `amount` optional float, no unit.
- Sleep: `start, end, nap` (bool).
- Diaper change: `time, wet, solid, color` (blank or `black|brown|gray|green|orange|red|white|yellow`), `amount`.
- List filters: `child`, `start_min/max`, `end_min/max`, `date_min/max`; pagination `limit`/`offset`.
- Children detail route is keyed by `slug` (`/api/children/{slug}/`), not id. Child fields: `id, first_name, last_name, birth_date, birth_time, due_date, slug, picture`.
- Timer `user` is a bare id and there is no users endpoint, so Molly can only tell "me" (from `/api/profile/`) apart from "someone else". It can't show the other parent's name.
- On sleep/feeding POST, `child` is optional when `timer` is given. Sleep `nap` accepts null (default None).
- `/api/profile/` returns `user {id, username, first_name, last_name, email, is_staff}`, `language`, `timezone`, `api_key`. No permissions or superuser flag.
- Latest react-native-android-widget at time of planning: v0.22.1 (2026-08).

## Confirmed against the live API (MVP step 2, v2.11.0-ls251, 2026-09-24)

Probed against the `e2e/docker-compose.yml` container with the seeded users. **These override the source-reading notes above where they differ.**

- **Profile route is `/api/profile`, no trailing slash.** `/api/profile/` is a 404 HTML page. All other routes keep the trailing slash.
- **A bad or missing token is 403, not 401.** The body tells them apart: bad token `{"detail":"Invalid token."}`, no token `{"detail":"Authentication credentials were not provided."}`, missing permission `{"detail":"You do not have permission to perform this action."}`. So `unauthorized` vs `forbidden` must be decided from the body, not the status.
- **Stopping an already-consumed timer is 400, not 404:** `{"timer":["Invalid pk \"<id>\" - object does not exist."]}`. The client must map this specific validation error to `notFound` ("already stopped").
- Consuming someone else's timer without `delete_timer`: 403 `{"detail":"You do not have permission to consume timers."}`, and the timer stays.
- **`DELETE /api/timers/{id}/` needs the `core.delete_timer` model permission, even for your own timer.** Without it the answer is 403 before any lookup (so also 403 for a missing id). With it, a missing id is 404. Cancelling a timer "started by mistake" is impossible for a plain caregiver.
- **The caregiver group can't read `/api/profile`** (needs `babybuddy.view_settings`) and has no delete permissions at all. A parent account needs, besides the `caregiver` group: `babybuddy.view_settings`, `core.change_tag`, `core.add_tag`, `core.delete_sleep`, `core.delete_feeding`, `core.delete_diaperchange`, and `core.delete_timer` to stop/cancel the other parent's timers. Or make both parents superusers. `docs/setup.md` (step 10) must say this.
- Profile for a non-superuser returns the same shape as for admin, including `api_key`.
- **Tagging an entry needs `core.change_tag`, and a tag name that doesn't exist yet also needs `core.add_tag`.** Caregivers have neither, so a PATCH with `tags` is 403 `"You do not have permission to change tags."`. Tags are sent and returned as names (`["mixed"]`); a new name creates the tag.
- **Overlapping sleeps are rejected:** 400 `{"non_field_errors":["Another entry intersects the specified time period. ..."]}`. End before start: 400 `non_field_errors` "Start time must come before end time.". An invalid enum: 400 on that field (`{"type":["\"juice\" is not a valid choice."]}`).
- **A timer whose start overlaps the last entry of its kind is accepted, but its stop is refused, for feedings as for sleeps** (checked 2026-09-25): 400 `non_field_errors` "Another entry intersects the specified time period. Conflicting entry: …". A start exactly at the previous entry's end is fine.
- **Finished feedings (checked 2026-10-14, `instant-feeds.int.test.ts`):** one minute long is fine; a start exactly at the previous feeding's end is fine, even zero-length (start = end). Only `start` is checked against the server clock (future start → 400 `start` "Date/time can not be in the future."); a future `end` is accepted. `/api/feedings/?method=bottle` filters by method; `amount__isnull` is ignored.
- **v2.11.0 has a Medication model, `/api/medication/`** (checked 2026-09-25): `name` required (≤255), optional `time` (omitted = server now; future = 400), `notes`, `dosage`, `dosage_unit`, `next_dose_interval`, `tags`. Caregivers can add and change entries, but deleting needs `core.delete_medication`. Details in `../implan-medication/NOTES.md`.
- **Sleep `nap: null` (or omitted) is auto-filled by the server** from Baby Buddy's own nap window, not Molly's. Molly must always send `nap` explicitly.
- Default list ordering is newest first: sleep and feedings by `-start`, changes by `-time`. `limit=1` gives the latest without `ordering`.
- Timer `name` filter is an exact, case-sensitive match (`molly` and `MOLLY:SLEEP` don't match `molly:sleep`).
- **`GET /api/timers/?name=molly:sleep` without `child` returns every child's running timer of that name** (confirmed 2026-09-28, v2.11.0-ls251, as a caregiver without special permissions): two children's sleeps at once, another name's timer left out, and a consumed (stopped) timer gone. `listTimers({ name })` in `packages/api` (`timers-all.int.test.ts`), used by the children plan.
- Timestamps sent with an offset (`+02:00`) are stored and returned in UTC (`Z`).
- CORS preflight from `http://localhost:8081` returns `access-control-allow-origin` for that origin and allows the `authorization` and `content-type` headers, with `CORS_ALLOWED_ORIGINS` set.
- Default page size is 100 (`LimitOffsetPagination`).
- **Notes (`/api/notes/`)** (checked 2026-09-26, day-plan plan): `child`, `note` (required), `time` (optional), `tags` (names). Parents can add and PATCH notes (tag and text); the first `molly-skip` creates the tag (`core.add_tag`). **`DELETE` is 403 for parents** (needs `core.delete_note`). The list filters by `tags=<name>` exactly and by `date_min` and `date_max` on `time` (`date_max` checked 2026-09-28, days plan); a retagged note drops out of the old tag's list. Details in `../implan-day-plan/NOTES.md`.
- **Measurements** (checked 2026-10-11, measurements plan): `weight/`, `height/`, `head-circumference/`, `bmi/` take `child`, the value (`weight` / `height` / `head_circumference` / `bmi`, floats with no range or precision limit: `7050`, `-5` and `7050.123` all accepted), optional `date` (`YYYY-MM-DD`, default the server's local date, future = 400 `"Date can not be in the future."`), `notes`, `tags`. `temperature/` has `time` instead (omitted = now, returned in UTC). Lists order by `-date` (ties arbitrary) or `-time`; date-only ones filter only by `child` and exact `date`. **The caregiver group may view, add and change weight and temperature only: height, head circumference and BMI are 403** unless the parent gets `core.view_*` / `core.add_*` for `height`, `headcircumference`, `bmi`. No delete for caregivers. Details in `../implan-measurements/NOTES.md`.
- A separate manual-testing instance at `http://localhost:4777` (compose project outside this repo) also runs v2.11.0 (`latest` tag, `v2.11.0-ls251`). Integration tests use the disposable one on 4778 instead, so they never touch its data.

## `packages/api` design (MVP step 3, 2026-09-24)

- `createClient({ baseUrl, token })` returns an object of endpoint functions. Failures throw `BabyBuddyError` with `kind` (`unreachable | unauthorized | forbidden | notFound | validation | server`), plus `fields` (DRF field → messages) for `validation`. The status/body → kind mapping is the pure `errorKindFor` in `errors.ts`.
- Entries are addressed by domain kind (`'sleep' | 'feeding' | 'change'`) in `editEntry`, `deleteEntry` and `listEntries`. `listEntries` collects every page by `offset`, not by following `next`, whose absolute URL can carry the wrong scheme behind Cloudflare.
- The values Molly sends live in `FEEDING_TYPES`, `FEEDING_METHODS` and `DIAPER_COLORS` (`enums.ts`); the TS types derive from them, and each value has an integration test.
- Tests: 47 in ~1.2 s against the 4778 container. Each timer/entry test resets the test child's timers and entries through raw admin calls first. `errors.test.ts` is a unit test (a 5xx can't be provoked from the container).
- Not built yet, because no test needed it: `listChildren` reads only the first page (100 children).
- `birth_date` is required on a child, so every child has one (the next-sleep prediction relies on it). `PATCH /api/children/{slug}/` with `{"birth_date": "YYYY-MM-DD"}` changes it (the e2e next-sleep spec uses this). (2026-09-26)
- `GET /api/sleep/?child=N&end_min=<UTC ISO>&limit=1000` returns every sleep since then in one page; a real family's two months of sleeps came back in one call. (2026-09-26)

## `packages/core` design (MVP step 4, 2026-09-24)

- Pure functions, no I/O; types come from `@molly/api` as type-only imports.
- `normaliseBaseUrl` → `{ ok, url }` or `{ ok: false, reason: 'empty' | 'invalid' | 'insecure' }`. `http` is allowed for `localhost`, `*.local`, `127/8`, `10/8`, `172.16/12` and `192.168/16`. It parses with `try { new URL() }`, not `URL.canParse`, which Hermes' polyfill may lack.
- `isNap(start, window)`: window as local `HH:MM` strings, edges included, default 07:00–19:00.
- `decideTimerAction(intent, running)` → `create | consume | alreadyRunning (since = timer start, ISO) | alreadyStopped`. `stopFailureOutcome(kind)` → `alreadyStopped` (notFound), `permissionNeeded` (forbidden), otherwise `failed`. Formatting "since HH:MM" is left to the UI.
- `todaysTotals(entries, now)` → `{ sleepMs, feedings, changes }` from local midnight; sleep clipped at midnight, feedings by start day.
- `mergeTimeline`: newest first; ties by kind (sleep, feeding, change), then higher id first.
- Tests pin `TZ=Europe/Stockholm` (vitest `env`).

## Onboarding and storage (MVP step 5, 2026-09-24)

- **Credentials file naming deviates from the plan:** `src/storage/credentials.ts` is the web (localStorage) implementation and `credentials.native.ts` the SecureStore one. A type-only `credentials.ts` next to `.web.ts`/`.native.ts` would make TypeScript see no functions. Shared key, types and parsers (`parseCredentials`, `parseSettings`) are in `src/storage/types.ts`, and unreadable data counts as signed out.
- Credentials `{ baseUrl, token, userId }` under `molly.credentials`; settings `{ childId }` under `molly.settings` (AsyncStorage). Sign out clears both.
- Session (`src/session/session.tsx`) drives `Stack.Protected` guards in the root layout. Onboarding keeps the validated URL, key and children in memory and saves the session only on the checklist's Continue, so the permissions note shows once.
- A base URL that answers with a web page (e.g. `…/admin` → Baby Buddy's login page, or a Cloudflare Access page) is `unreachable`, not `notFound`: during a stop, `notFound` would mean "already stopped".
- Playwright runs against the static web export served by `serve -s` on `:8080` (`pnpm e2e`); 7 onboarding tests. The CORS-blocked case points the app at `http://127.0.0.1:8080`, a real server on another origin without CORS headers.
- Android: onboarding against the test container via `adb reverse tcp:4778 tcp:4778` works in the release APK (plain `http://localhost` is allowed), and the session survives a force-stop. Sign-out returns to onboarding after a restart.
- A LAN test instance (e.g. `http://192.0.2.10:4779`, admin key not stored in the repo) was also used. Its CORS doesn't allow the local web origins, so it's for the Android app. Use it to check LAN `http://` on the device without `adb reverse`.
- Setup-doc links from the onboarding errors wait for `docs/setup.md` (step 10); the hints are inline text for now.

## Trackers and dashboard (MVP step 6, 2026-09-24)

- **Bottle defaults: formula, 120 ml** (chosen by the agent when no answer came; editable in Settings, default in `src/storage/types.ts`).
- `src/actions/trackers.ts` (plain TS, unit-tested with a fake client) holds every write: start, stop sleep, stop feeding, cancel, log diaper. Each looks the timer up first; a gone or forbidden write becomes `alreadyStopped` / `permissionNeeded`, other failures `failed`. The widget (step 9) reuses it.
- Queries (TanStack Query 5.103): running timers per tracker and entries since yesterday's midnight, both polled every 30 s and refetched on focus (AppState on native). Any write invalidates `timer` and `entries`. The query provider is keyed by base URL + user + child, so sign-out or a child change starts with an empty cache.
- Settings screen: bottle type and amount, nap window, child (only with several children), sign out. Entry screen: edit times (`YYYY-MM-DD HH:MM` local), nap, type, method, amount, tags, color, contents, notes; delete asks for confirmation.
- React Native Web ignores `accessibilityState.checked` for radios; `Choice` uses `role="radio"` + `aria-checked`.
- Playwright: Playwright's `clock.runFor` did not fire TanStack's poll interval, `clock.fastForward` does. Two-parent tests wait for each write's banner before fast-forwarding.
- `pnpm check` runs the boundary check (`scripts/check-boundaries.mjs`), typecheck, ESLint (`eslint-config-expo`), all Vitest suites and the web-bundle check (`scripts/check-web-bundle.mjs`). `pnpm e2e` runs Playwright.
- **Android spot-check on a physical phone**, over Wi-Fi against a LAN instance (`http://192.0.2.10:4779`, no `adb reverse`): onboarding, start and cancel sleep, feeding start + Left, diaper Wet with "last change" and timeline, delete from the timeline. All correct in Baby Buddy; the test entries were deleted afterwards. Found and fixed:
  - **Release builds blocked plain `http://`** to LAN addresses (only the debug manifests allowed cleartext; `localhost` happened to be exempt). `app.json` now sets `usesCleartextTraffic` via `expo-build-properties`. Android's network security config can't express IP ranges, so the LAN-only rule stays in `normaliseBaseUrl`.
  - **The first tap on a button with the keyboard open only closed the keyboard.** `Screen`'s ScrollView uses `keyboardShouldPersistTaps="handled"`.
  - **Elapsed showed "-1m"** right after a start: timer starts come from the server and the phone's clock lagged it. `formatElapsed` clamps at 0.
  - Content ran under the status bar; `Screen` pads by the safe-area insets.
- **Emulator**: `emulator` + `system-images;android-36;google_apis;arm64-v8a`, AVD `molly` (a phone hardware profile, hardware keyboard on). It reaches the Mac as `10.0.2.2` (test container: `http://10.0.2.2:4778`, allowed as LAN by the `10/8` rule) and the LAN instance directly. Onboarding and a real reboot (uptime checked) with the session surviving were confirmed there. Target it with `adb -s emulator-5554` when the phone is also attached. The final Android checklist still runs once on the real phone.
- Password managers on the phone offer to save the API key, since the field is `secureTextEntry`. Left as is.

## Web image (MVP step 7, 2026-09-24)

- `docker/Dockerfile`: `nginx:1.29-alpine` + `apps/molly/dist`. `docker/nginx.conf.template` is rendered by the nginx entrypoint (envsubst of defined variables only). `docker/05-require-baby-buddy-origin.sh` stops the container unless `BABY_BUDDY_ORIGIN` is a bare `scheme://host[:port]` (anything else would change the CSP).
- CSP: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'` (react-native-web injects styles, and `index.html` has an inline style) `; img-src 'self' data: blob:; font-src 'self' data:; connect-src <BABY_BUDDY_ORIGIN>; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`. The whole Playwright suite passes under it, so the bundle needs no eval or inline script.
- Caching: `_expo/static/` and `assets/` get `public, max-age=31536000, immutable` (hashed names); everything else, including SPA fallbacks, `Cache-Control: no-cache`. nginx drops server-level `add_header`s in a location that has its own, so the assets block repeats `nosniff`.
- On the web the CSP blocks every address except the configured Baby Buddy, so onboarding to another address ends in "can't reach". The web error adds a `BABY_BUDDY_ORIGIN` hint.
- `pnpm e2e` builds the image (`e2e/docker-compose.yml`, profile `web`, `molly-web:e2e` on :8080, origin `http://localhost:4778`); a global teardown removes the container because stopping `compose up` leaves it running.
- `scripts/build-web-image.sh local|pi` (`pnpm web:up`, `pnpm web:image:pi`): export, bundle check, then `docker build` into `molly-web:local`, or an arm64 build saved with `docker save` to `dist/molly-web-arm64.tar` (buildx's file exporter needs a non-default builder; plain build + save doesn't).
- `docker/compose.yml` runs `molly-web:local`, reads `BABY_BUDDY_ORIGIN` and optional `MOLLY_PORT` (default 8080) from `docker/.env` (gitignored), and refuses to start without the origin.
- CORS is browser-only: the Android app needs no `CORS_ALLOWED_ORIGINS` entry (it still needs the Cloudflare Access `/api/*` bypass if Access protects Baby Buddy). Only the web origin must be listed.

## Android release build (MVP step 8, 2026-09-24)

- Upload key: a keystore at a path outside the repo (PKCS12, RSA 4096, alias `molly`, e.g. `CN=Molly, O=Example, C=SE`), created with a random password. The password is only in `~/.gradle/gradle.properties` (`MOLLY_UPLOAD_*`, mode 600). **Copy the keystore and password into a password manager.**
- `apps/molly/plugins/with-release-signing.js` adds a `release` signing config reading those properties and points `buildTypes.release` at it; idempotent, and throws if Expo's template changes shape. Missing properties fail the build rather than debug-signing.
- `pnpm android:release` (`scripts/android-release.sh`): checks JDK 17, `ANDROID_HOME` and the properties, `expo prebuild -p android --clean`, `assembleRelease`, then `apksigner verify --print-certs`.
- Verified on the emulator: two separate clean builds carry the same certificate, and the second installs over the first with `adb install -r`, keeping the signed-in session.

## Widget (MVP step 9, 2026-09-24)

- `src/widget/model.ts` (unit-tested, no widget library): click intents, `runIntent` → `actions/trackers.ts` (so the widget is server-checked exactly like the app), row notes, `fetchSnapshot`, the AsyncStorage cache (`molly.widget`, validated on load) and `widgetView`. Notes show for 2 min (`NOTE_MS`) and must stay short: a row truncates after about 20 characters (seen on the emulator).
- `task-handler.android.tsx`: draws the cache at once, then runs the tapped intent or refreshes, and draws again. A failed refresh keeps the snapshot and sets `refreshFailedAt` ("Not updated since HH:MM").
- The app redraws the widget (`syncWidget`, `sync.android.tsx`; no-op `sync.tsx` on web) after every write (in `useRefreshAfterWrite`), on every foreground and on session changes. That sync drops the last widget note, which would otherwise hide newer data for up to 2 min (found on the emulator).
- Settings → "Add widget to home screen" (Android only) uses `requestPinWidget`.
- Buttons carry `accessibilityLabel`s ("Diaper: Wet"), which also make them findable in `uiautomator` dumps; status texts are not in the dump.
- `packages/api`: `findTimer` and the latest-entry lookups now declare `Promise<… | null>` explicitly. The app compiles the api source without `noUncheckedIndexedAccess`, so the inferred type had lost the `null`.
- The step 1 proof widget (`proof*.android.tsx`) is gone.

## Setup docs (MVP step 10, 2026-09-24)

- `docs/setup.md`: users and permissions, API key, CORS (web only), Cloudflare Tunnel and the Access `/api/*` bypass, running the web image on the Mac and the Pi, the Android app, troubleshooting. Permission labels are copied from Baby Buddy's admin.
- **Baby Buddy's own Users form makes a user a superuser unless Caregiver or Read only is ticked** (`BabyBuddyUserForm.save`), so the simplest parent setup needs no Django admin at all.
- The onboarding and dashboard errors link to an in-app help screen (`/help?topic=reach|key|permissions`, outside the auth guards; content in `src/features/help/topics.ts`) instead of the doc, because the repo isn't hosted anywhere a link could reach.
- Baby Buddy's "Add device" page (`/user/add-device/`) shows a QR code with `BABYBUDDY-LOGIN:{"url", "api_key", "session_cookies"}`; likely how other Baby Buddy apps onboard. Added to the Polish candidates.

## QR login (added after the MVP steps, 2026-09-24)

- `@molly/core` `loginFromQr(text)`: parses `BABYBUDDY-LOGIN:{"url","api_key","session_cookies"}` from Baby Buddy's Add a device page into `{ baseUrl, token }`, normalised; `null` for anything else. A public `http://` URL is upgraded to `https://`, because behind Cloudflare Baby Buddy builds the URL from the plain-http request it sees.
- Android: "Scan the login QR code" on the connect screen opens `onboarding/scan.tsx` (`expo-camera` `CameraView`, QR only; plugin with `recordAudioAndroid: false`, so no microphone permission). A good scan connects straight away (`useConnect` with `replace`, keeping the camera out of the back stack); a failed connect returns to the form with both fields filled and the error shown.
- Web: expo-camera can't scan barcodes there, so there's no button; pasting the code's text into the address field fills both fields (Playwright-tested).
- The connect form (address, key, error) lives in the onboarding context so the scanner can fill it without effects.
- The emulator's emulated back camera opens (CameraX) but shows a black feed, so the actual scan is checked on a physical phone.

## Device clock vs server clock (found on a physical phone)

- **Baby Buddy rejects entry times in the future:** 400 `{"time":["Date/time can not be in the future."]}`. A phone's clock ran a few seconds ahead of the server, so every one-tap diaper log (app and widget) failed as `validation`.
- **Omitting `time` on `POST /api/changes/` makes Baby Buddy stamp it with its own clock** (confirmed on v2.11.0). One-tap diaper logs now send no time, like timers take their start from the server. `NewChange.time` is optional. Hand-entered times on the edit screen still come from the device and can still hit this rule. Baby Buddy's error text is then shown there.

## Redesign (planned 2026-09-25)

Design source: the (private) "Molly Redesign" design files, not in this repo.

Scope and decisions made while planning (detail in `phases/redesign/MAIN.md`):
- All four parts in: app visuals, toast + Adjust time, widget redesign, lock-screen notification.
- Predictions stay out (nap-window bar, next feed). Awake-for stays: it's a fact.
- Theme: system by default, header pill overrides, per device. Widgets follow the same setting.
- Widgets: four size-adaptive entries (Molly, Sleep, Feeding, Diaper) rather than one per mock variant.
- Optimistic updates, server answer replaces the guess.
- Screens missing from the mock keep their layouts and adopt the new components.
- Notification: own-device knowledge only, no background polling.

Found while planning (check again when building):
- `react-native-android-widget` 0.22.1: a render can return `{ light, dark }` (`WidgetRepresentation`), and `WidgetInfo` carries `width`/`height` for size-adaptive layouts. The config plugin takes `fonts: [...]` next to `widgets`. There is no chronometer widget, so widget timers can't tick.
- React Native and the widget renderer don't parse `oklch()`: the design's colours need converting to hex once.
- The design loads Nunito from Google Fonts; the CSP (`font-src 'self' data:`) and the no-CDN rule forbid that. Bundle the font.
- Android notifications show at most three action buttons, so Both isn't a notification action.
- `Outcome` in `src/actions/trackers.ts` carries no ids today; Adjust time needs them.
- The widget snapshot has no last-feeding method; the new layouts need it.
- `artifacts/mental-model.html` and `mental-model-light.html` predate the redesign and don't show sections 11–12 of `MENTAL_MODEL.md`. Markdown only this time; regenerate or delete them when convenient.

Decided 2026-09-25:
- Edit screen times: ±5 min nudges only, as in the mock. For anything more exact, use Baby Buddy's admin.
- Recent list: today's entries (since local midnight, a night sleep ending today included) instead of the MVP's 20 or the mock's 6.

Step 1 spike (2026-09-25, report: `spikes/lock-screen-notification/spike-report.md`). Proven on the emulator (Android 16) and a physical Android 16+ phone:
- **Chosen mechanism: a local Expo module** (Kotlin, under `apps/molly/modules/`), decided after the spike. It uses `NotificationCompat` with `setUsesChronometer`/`setWhen`/`setOngoing`. Each action is an immutable broadcast `PendingIntent` → `BroadcastReceiver` → expedited WorkManager job → headless JS task. That's the same WorkManager + `ReactHost` pattern as `react-native-android-widget`'s `oss/HeadlessJsTaskWorker`; don't use `HeadlessJsTaskService`, because Android 12+ bans starting a foreground service from the background.
- `react-native-notify-kit` 10.7.2 also passed every check. It's the fallback if we'd rather not own Kotlin. `@notifee/react-native` is archived, and `expo-notifications` has no chronometer.
- With the process killed (`am kill`), a lock-screen action tap reached JS in about 0.5 s and the Baby Buddy write finished in about 1.1 s. SecureStore and `fetch` work headless. Actions run without unlocking.
- **The channel must be `IMPORTANCE_DEFAULT` with no sound and no vibration.** Pixel hides `IMPORTANCE_LOW` ("silent") notifications on the lock screen by default. Importance is fixed once a channel exists, so get it right before first release or rename the channel.
- Ongoing notifications can be swiped away on Android 14+. The local module needs a `deleteIntent` to know. Updating with the same `when` keeps the chronometer's start.
- The small icon needs a monochrome drawable (the launcher icon renders as a white square). Pixel's compact lock screen shows the notification as an icon pill until tapped.
- Expedited WorkManager on API < 31 needs `getForegroundInfo`; the spike didn't implement it. Not tested: the permission prompt, OEM battery killers, Android 16 promoted "Live Updates".
- Testing: `uiautomator dump` fails while a chronometer is on screen. Use screenshots or logcat.

Step 2 (2026-09-25):
- New dependencies: `@expo-google-fonts/nunito` 0.4.2 (font files only) and `expo-asset` ~57.0.18 (web font URLs; `expo install` also added its config plugin).
- Colours live in `apps/molly/src/theme/tokens.ts` as hex, with each oklch source kept as a comment. `tailwind.config.js` maps semantic names (`bg`, `surface`, `ink`, `muted`, `line`, `danger`, `scrim`, `sleep|feed|diaper-bg|mid|ink`) to `rgb(var(--name) / <alpha-value>)`. `ThemeProvider` sets the variables with NativeWind `vars()` on the root View, so the manual override works without NativeWind's `dark:` variant.
- Nunito is one family, "Nunito", with a file per weight (500–900), so `font-bold`/`font-black` pick the right file. On Android it's the `expo-font` plugin's `android.fonts` `fontDefinitions` (XML font family, registered at build time, nothing to load). On web, `src/theme/fonts.web.ts` adds `FontFace`s for the bundled files and waits for them before first render, which the CSP's `font-src 'self'` allows.
- React Native Text doesn't inherit fonts, so screens use `Text` from `components/ui` (it adds `font-sans` and a default `text-ink`), never React Native's.
- Sign-out now keeps the theme (it belongs to the device) and resets the other settings. `clearSettings` is gone.
- Stack screens paint their own white background; `useStackOptions()` sets it to the palette's `bg`.

Step 3, confirmed against the live API (v2.11.0, 2026-09-25, `packages/api/src/timers.int.test.ts`):
- `PATCH /api/timers/{id}/ { start }` moves a running timer's start. The timer is then found with the new start.
- **A caregiver without `core.delete_timer` (`parent_a`) can move their own timer's start.** `change_timer` covers it, so Adjust time after a Start works for both seeded parents.
- A future `start` is refused as a 400 with a `start` field message (`validation`).
- Step 4: optimistic updates (`src/features/dashboard/optimistic.ts`) cancel the in-flight timer and entries queries, write a guess into the query cache (a timer or change with a negative id; Recent rows for guesses aren't tappable), and return an undo. `run()` undoes on `failed` / `permissionNeeded` or a throw, because with Baby Buddy down the refetch fails too and would leave the guess showing. "Already running / stopped" need no undo: the refetch shows the server's truth.
- A poll or focus refetch can swap a button under a finger (tile "Start sleep" → "Cancel" in the same spot). The e2e spec for "already running" hides the other parent's timer from the page until the tap, to stay deterministic. The race is real for users too, but rare. Not handled yet.
- The Playwright browser's time zone isn't the host's, so specs format clocks in the page (`page.evaluate`), not in Node.
- Last breast side counts only `left breast` / `right breast` / `both breasts`. `parent fed` / `self fed` (solid food) are skipped along with bottles, because they say nothing about a side. That narrows the phase TEST_STRATEGY's "wasn't a bottle".

Step 8 (2026-09-25), lock-screen notification:
- Local Expo module `apps/molly/modules/molly-notify/` (autolinked from `modules/`, no config; `package.json` there isn't a pnpm workspace package). Kotlin: `MollyNotifyModule` (`show(tracker, notification)`, `cancel(tracker)`, `allowed()`), `Notifier`, `ActionReceiver`, `ActionWorker` (a port of the widget library's `HeadlessJsTaskWorker`, headless task `MollyNotifyAction`). Its `build.gradle` needs `defaultConfig.versionName` (Expo's gradle plugin fails without it) and `implementation 'com.facebook.react:react-android'` for `ReactHost` and `HeadlessJsTaskContext`.
- Channel `molly.timers`, `IMPORTANCE_DEFAULT`, no sound or vibration. Notification ids: sleep 1, feeding 2; id 3 is the "Saving…" foreground notification that expedited work needs on API < 31 (`getForegroundInfoAsync`). Small icon: Material "timer" vector in the module's `res/drawable`, tinted with the tracker's day `-mid` colour.
- Content comes from the widget's cache (`src/notification/model.ts`, unit-tested): "Sleeping · since HH:MM · saves as nap|night sleep" with Stop; "Feeding · since HH:MM · by you|by someone else · last side X" with Left / Right / Bottle. A recent error note (the widget's 2 min) replaces the details line.
- Sync point: `refreshWidget` (every widget refresh and tap, every `syncWidget` from app writes, foreground and settings) calls `syncNotifications`. Dashboard polls call `syncWidget` when the running timers' id or start change (`useSyncWhenTimersChange`), skipping optimistic guesses.
- Swipe-dismiss: the `deleteIntent` stores the timer's start in SharedPreferences `molly.notify`; `show` skips that same start, so a dismissed timer stays away until the next timer. `cancel` clears it.
- Permission: `PermissionsAndroid.request(POST_NOTIFICATIONS)` after a timer is started from the app, only while the setting is on and notifications aren't allowed yet; Android itself stops prompting after two denials. Settings has a "Lock screen" On / Off choice (applies at once, kept on sign-out like the theme) and, when Android blocks notifications, a note and "Open Android settings" (`Linking.openSettings()`).
- **Android 16 bundles Molly's two notifications into one group** when sleep and feeding both run, so each needs expanding to reach its buttons. A distinct `setGroup` per tracker doesn't prevent it; left as system behaviour. On its own, a notification shows expanded with its buttons.
- On the emulator (API 36) from a killed process: tap → WorkManager starts the process → worker SUCCESS in about 4 s, including React's cold start. A physical phone took about 1.1 s in the spike.

## Pinned versions (MVP step 1, 2026-09-24)

- Expo SDK 57 (`expo` 57.0.24), `expo-router` 57.0.22, React Native 0.86.3, React 19.2.3.
- NativeWind 4.2.7 with Tailwind CSS 3.4.19. NativeWind 4.x needs Tailwind 3, not 4; 4.2.7 is the release that adds SDK 57 support. NativeWind 5 is still an RC.
- `react-native-android-widget` 0.22.1 (peer `expo >=54`). `expo-secure-store` 57.0.4, `@react-native-async-storage/async-storage` 2.2.0 (the version `expo install` picks for SDK 57, not npm's latest 3.x).
- TypeScript 6.0.3, Vitest 5.0.1, pnpm 10.12.1, Node 24.
- Android toolchain the build needs: JDK 17, compileSdk/targetSdk 36, minSdk 24, NDK 27.1.12297006, Gradle 9.3.1 (wrapper).
- Workarounds: `.npmrc` `node-linker=hoisted` (chosen up front so Metro and Gradle autolinking see one flat `node_modules`). `nativewind-env.d.ts` declares `*.css` modules, because TS 6 rejects the side-effect `global.css` import otherwise.
- Deviation from the layout in `MAIN.md`: routes live in `apps/molly/src/app/` (the SDK 57 template default), not `apps/molly/app/`.
- The config plugin crashes unless `widgets` is passed; the widget is declared in `app.json`. `expo prebuild -p android` generates the receiver and provider XML correctly.
- Android package: `se.skedeback.molly` (step 8). Builds before that used the placeholder `dev.molly.app`; that app is a separate install and can be uninstalled.

## Decisions

- Feeding widget: one "start feeding" button. While a feeding timer runs it becomes stop buttons Left / Right / Bottle, each with a fixed `method`. "Both breasts" and other methods are in-app only.
- Feeding `type` is not a UI concern. Left/Right log `breast milk`. Bottle logs a per-device default type chosen once in settings. A mix can be recorded afterwards as an optional tag or note. The dashboard and predictions ignore type.
- Amount: logging never requires it. Bottle feedings get a per-device default amount automatically, widget taps included, and are editable later in the app (PATCH `/api/feedings/{id}/`). Unit shown as ml.
- Cross-parent timer stop: Molly can't detect the permission in advance. Onboarding validates with `GET /api/profile/` and shows a checklist note about `delete_timer`/superuser for both users. A 403 at stop time shows a specific message ("started by someone else; your user can't stop other people's timers") with a link to the fix. The other parent's name isn't available from the API.
- Sleep `nap` flag: Molly sets it from an editable daytime window (default 07:00–19:00, by start time). Editable afterwards.
- Diaper one-tap: Wet / Dirty / Both → `wet`/`solid` booleans. Color and amount are in-app edits only.
- Widgets: one combined resizable widget with sleep, feeding and diaper rows, each showing "last at HH:MM".
- Web access: Molly's hostname sits behind Cloudflare Access. Only Baby Buddy's `/api/*` bypasses Access and relies on the token.
- Deploy (changed 2026-09-24, no GHCR): no registry. `pnpm web:up` builds and runs the image on the Mac; `pnpm web:image:pi` writes `dist/molly-web-arm64.tar` for `docker load` on the Pi. The operator sets the web origin and Baby Buddy's `CORS_ALLOWED_ORIGINS` on the server and runs the Pi checks.
- Keystore: at a path outside the repo, passwords in `~/.gradle/gradle.properties`, backed up to a password manager. Nothing in git.
- Times shown in the device timezone. Timestamps sent to Baby Buddy with offsets.
- Settings (bottle default type/amount, nap window, later prediction defaults) are per device, in local storage. There is no shared config.
- MVP dashboard: running timers (elapsed, who started), last of each tracker, today's totals since midnight, recent timeline with tap to edit or delete.
- Plan is split: root files describe the system, `phases/mvp/` holds the MVP detail. Polish, multi-child and predictions are outlines in root `MAIN.md` until they're planned. They're named, not numbered, because the original brief called predictions "Phase 2".
- Timer naming convention `molly:sleep` / `molly:feeding`. Molly ignores other timers.
- Testing: TDD by kind of work: unit TDD in `core`, integration TDD against the Baby Buddy container in `api`, Playwright for flows (no TDD), and a manual device checklist for Android-only behaviour (no Maestro).
- The mental model has an HTML companion in `artifacts/` (dark + light). Regenerate both whenever `MENTAL_MODEL.md` changes.
- Widget and app actions carry intent (start/stop) and check the server first. They never toggle.

## Open

MVP step 1 (resolved):
- ~~Pin Expo SDK, NativeWind and Tailwind versions together.~~ Done, see "Pinned versions".
- Proof (a) web export: done. It renders in headless Chrome, SPA deep links fall back to `index.html`, and the web bundle has no widget code.
- Release APK builds (2026-09-24): Homebrew `zulu@17` + `android-commandlinetools`, `ANDROID_HOME=/opt/homebrew/share/android-commandlinetools`, `JAVA_HOME` pinned to 17 (the default `java` is Temurin 27). SDK packages installed with `sdkmanager`: platform-tools, `platforms;android-36`, `build-tools;36.0.0`, `ndk;27.1.12297006`. `./gradlew assembleRelease` succeeds in ~5 min cold (debug-signed; real signing is step 8), 104 MB APK (all ABIs).
- **Proof (b) and (c) passed on a physical phone.** With the app process killed (`am kill`), a widget tap started the headless handler without opening the app. It rendered, read the seeded values from SecureStore and AsyncStorage, and completed an HTTPS fetch (`google.com/generate_204` → 204). `example.com` didn't resolve on the test network, so don't use it for connectivity checks.
- **Platform files must share the fallback's extension.** Metro tries each source extension in turn, and within each one the platform variants: `x.android.ts`, `x.native.ts`, `x.ts`, then `x.android.tsx`… So a `proof.ts` fallback beats `proof.android.tsx`, silently. Pair `.android.tsx` with `.tsx` and `.android.ts` with `.ts` (same for `.native`/`.web`).
- **React Compiler breaks widgets.** `experiments.reactCompiler` is on, and it rewrites widget components with `useMemoCache`, so `buildWidgetTree` throws "Invalid Hook Call" and the widget stays blank (the worker still reports SUCCESS). Every `*.android.tsx` file under `src/widget/` must start with `'use no memo';`. Errors show only in `adb logcat` under `ReactNativeJS`.
- Agent shells don't load `~/.zprofile`: pass `JAVA_HOME` and `ANDROID_HOME` inline when running Gradle from Claude Code. The throwaway proof widget is in `apps/molly/src/widget/proof*.android.tsx`. In the app, "Seed widget proof values" writes to both stores; the widget shows what the headless handler reads back plus an HTTPS fetch status. Tap the widget to re-run it.

MVP step 2 (resolved): see "Confirmed against the live API" above.

Open questions before the relevant step:
- ~~Molly web origin, GHCR image name.~~ Decided 2026-09-24: no GHCR; the operator configures the origin and CORS on the server. The CSP needs only Baby Buddy's origin (`BABY_BUDDY_ORIGIN`), set at run time.
- ~~Android application id and display name.~~ Decided 2026-09-24: `se.skedeback.molly`, "Molly".
- ~~Baby Buddy version running in production.~~ Decided 2026-09-24: production runs `lscr.io/linuxserver/babybuddy:latest`, currently v2.11.0-ls251, same as the test pin. Because prod floats on `latest`, bump the pin in `e2e/docker-compose.yml` and rerun `packages/api` tests whenever prod pulls a new version.
- Sources for age-based wake-window and nap defaults. Before the predictions phase.
