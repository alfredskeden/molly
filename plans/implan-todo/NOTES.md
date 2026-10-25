# Notes: shared to-do list

## Decisions (2026-10-25)

- Spec: GitHub issue #22 (rewritten in Gherkin at the end of planning). Design: "Molly To-do" (`Molly To-do.dc.html`, private design source, Android and Web variants).
- **Done day as a tag.** Ticking off adds `molly-done-YYYY-MM-DD` (the ticking phone's local date) next to `molly-todo-done`, so both phones hide it after the same midnight. Costs one Baby Buddy tag per day something is ticked; Molly never shows these as labels.
- **Photos: random file name, downscaled, public by URL.** Baby Buddy serves `/media/` with no auth (see below), so the URL is the only secret. Docs add a Cloudflare Access bypass for `/media/notes/images/*`; the web CSP's `img-src` gets the Baby Buddy origin.
- **Date-only reminders at 19:00 the evening before**; items with a time remind 1 h before.
- **Labels are listed with `/api/tags/`, and `core.view_tag` is required** (admins have it; setup asks parents for it). No fallback to labels read from the notes: without the permission the chips are Buy and Appointments only, with a hint.
- **A new label's tag is created on Save** (with the note), not when "+ New label" → Add is tapped.
- **Family label cards show only with items** (open or done today); Buy and Appointments always.
- Label tag name: `To-do: <label>` (readable in Baby Buddy's own UI). Matched case-insensitively, so typing "pharmacy" reuses "Pharmacy". "Other", "Buy" and "Appointments" are reserved names (the last two are built in).
- Flat plan, steps in `MAIN.md`.

## Confirmed against the live API (v2.11.0, :4778, 2026-10-25)

Probed with `parent_a` / `parent_b`; probe notes, tags and image files deleted afterwards.

- **`POST /api/notes/` accepts a future `time`** (the Note model has no `clean()`, unlike medication). Returned in UTC.
- **`?tags=a,b` is an OR filter** (`CharInFilter` on `tags__name`), and `child` is optional: `?tags=molly-todo,molly-todo-done` returns every child's to-do notes in one list. Default order `-time`; `ordering=time` works.
- **`GET /api/tags/` is 403 without `core.view_tag`** (the seeded parents lack it; admins list fine). Paged; filter `?name=` is exact. Each tag has `slug`, `name`, `color` (random hex), `last_used`.
- Creating a tag works for parents both by naming it on a note and by `POST /api/tags/ {"name"}` (201, `core.add_tag`).
- **Tag names are case-sensitive**: `To-do: Pharmacy` and `To-do: pharmacy` became two tags (`to-do-pharmacy`, `to-do-pharmacy_1`).
- Tag names may hold spaces and a colon (`To-do: Appointments` → slug `to-do-appointments`). Tag names are unique, ≤100 chars.
- **Images**: multipart `POST` with `image` returns `"image": "http://<host>/media/notes/images/<file name>"`, an absolute URL built from the request's host. The file name is the uploaded one; a clash gets a random suffix (`3f2a9c_bFbimCa.png`). Multipart `tags` repeats the field per tag.
- **`/media/` is served by the image's nginx with no auth** (`location ^~ /media/` in `/config/nginx/site-confs/default.conf`): `GET` without a token is 200.
- `PATCH {"image": null}` (JSON) removes the image; multipart `PATCH` with `image` replaces it; a JSON `PATCH` of `tags` / `time` keeps it.
- **Removed or replaced image files stay on disk**, and deleting a note doesn't delete its file. Molly can't clean them up (no file API); say so in the docs.
- A non-image upload is 400 `{"image": ["Upload a valid image. …"]}`. No size limit (`client_max_body_size 0`); Molly downscales anyway.
- `note` takes 2000+ characters (TextField, no limit).
- Parents' existing permissions cover the notes: `add_note`, `change_note` (caregiver group), `add_tag` / `change_tag` (setup step 10). Listing labels adds `core.view_tag`. `DELETE` stays 403 (`core.delete_note`), hence ticking by retag.

## Code pointers found while planning

- Notes client: `packages/api/src/client.ts` (`createNote`, `updateNoteTags`, `listNotes`), types `packages/api/src/types.ts:141-147`. `updateNoteTags` has one caller, `apps/molly/src/app/(main)/index.tsx:460` (skip Undo).
- Skip notes query (pattern for polling): `apps/molly/src/features/dashboard/queries.ts` `useSkipNotes`.
- Header buttons: `apps/molly/src/features/dashboard/Header.tsx:63-65` (`IconButton`).
- Alarms: `Notifier.kt:240` `scheduleNapReminder` (two alarms, `setWindow` 10 min + `setAndAllowWhileIdle`, "rang" key), `keepOnlyNapReminders`; JS side `apps/molly/src/notification/sync.android.ts`. Channels today: `molly.timers`, `molly.reminders`. Notification ids in use up to 5.
- `expo-camera` is installed (onboarding QR scan); no image picker or manipulator yet. `expo-image` is installed.
- Web CSP: `docker/nginx.conf.template:13` (`img-src 'self' data: blob:`). Access bypass text: `docs/setup.md:53`.

## Found while building (2026-10-25)

- **Expo's `fetch` can't send React Native's `{ uri, name, type }` form parts** (`expo/src/winter/fetch/convertFormData.ts`: "`uri` is not supported"). The app's global `fetch` is `expo/fetch`, so `NoteImage` is `{ name, blob }` only: on Android the blob is an `expo-file-system` `File` (it implements `Blob` and has `bytes()`), which Expo's FormData sends under the file's own name, so the downscaled file is moved to `<random>.jpg` first. On the web it's a real `Blob` built from the manipulator's base64 (a `fetch` of the `blob:` URL would break the CSP's `connect-src`).
- `GET /api/tags/` has no `id`, so the client's page collector takes a key (`slug` for tags).
- The "seen" mark lives in the device settings (`todoSeen`), dropped on sign-out with the children's preferences. A device without one marks everything seen on the first load, so a fresh install has nothing "New".
- New packages (all `npx expo install`, SDK 57): `expo-image-picker` ~57.0.20 (config plugin: no microphone), `expo-image-manipulator` ~57.0.21, `expo-file-system` ~57.0.7, `expo-crypto` ~57.0.4 (random photo names).
- Native alarms: `Notifier.kt` has one `Alarm` kind per reminder (nap: child id, to-do: note id) sharing the two-alarm schedule and "rang" key; the nap keys (`nap:<child>`, `napRung:<child>`) and request codes are unchanged. To-do reminders are notification id 6, tagged with the note id, channel `molly.todo`, tap opens `molly://todo`.

## Open

- None.
