# Notes: shared to-do list

## Decisions (2026-10-25)

- Spec: GitHub issue #22 (rewritten in Gherkin at the end of planning). Design: "Molly To-do" (`Molly To-do.dc.html`, private design source, Android and Web variants).
- **Done day as a tag.** Ticking off adds `molly-done-YYYY-MM-DD` (the ticking phone's local date) next to `molly-todo-done`, so both phones hide it after the same midnight. Costs one Baby Buddy tag per day something is ticked; Molly never shows these as labels.
- **Photos: random file name, downscaled, public by URL.** Baby Buddy serves `/media/` with no auth (see below), so the URL is the only secret. Docs add a Cloudflare Access bypass for `/media/notes/images/*`; the web CSP's `img-src` gets the Baby Buddy origin.
- **Date-only reminders at 19:00 the evening before**; items with a time remind 1 h before.
- **Labels come from the to-do notes, not `/api/tags/`** (parents can't list tags, below). A label exists while any to-do note (open or done, any age) carries it.
- Label tag name: `To-do: <label>` (readable in Baby Buddy's own UI). Matched case-insensitively, so typing "pharmacy" reuses "Pharmacy". "Other", "Buy" and "Appointments" are reserved names (the last two are built in).
- Flat plan, steps in `MAIN.md`.

## Confirmed against the live API (v2.11.0, :4778, 2026-10-25)

Probed with `parent_a` / `parent_b`; probe notes, tags and image files deleted afterwards.

- **`POST /api/notes/` accepts a future `time`** (the Note model has no `clean()`, unlike medication). Returned in UTC.
- **`?tags=a,b` is an OR filter** (`CharInFilter` on `tags__name`), and `child` is optional: `?tags=molly-todo,molly-todo-done` returns every child's to-do notes in one list. Default order `-time`; `ordering=time` works.
- **`GET /api/tags/` is 403 for parents** (no `core.view_tag`). Creating a tag by naming it on a note works (`core.add_tag`), as for `molly-skip`.
- Tag names may hold spaces and a colon (`To-do: Appointments` → slug `to-do-appointments`). Tag names are unique, ≤100 chars.
- **Images**: multipart `POST` with `image` returns `"image": "http://<host>/media/notes/images/<file name>"`, an absolute URL built from the request's host. The file name is the uploaded one; a clash gets a random suffix (`3f2a9c_bFbimCa.png`). Multipart `tags` repeats the field per tag.
- **`/media/` is served by the image's nginx with no auth** (`location ^~ /media/` in `/config/nginx/site-confs/default.conf`): `GET` without a token is 200.
- `PATCH {"image": null}` (JSON) removes the image; multipart `PATCH` with `image` replaces it; a JSON `PATCH` of `tags` / `time` keeps it.
- **Removed or replaced image files stay on disk**, and deleting a note doesn't delete its file. Molly can't clean them up (no file API); say so in the docs.
- A non-image upload is 400 `{"image": ["Upload a valid image. …"]}`. No size limit (`client_max_body_size 0`); Molly downscales anyway.
- `note` takes 2000+ characters (TextField, no limit).
- Parents' existing permissions are enough: `add_note`, `change_note` (caregiver group), `add_tag` / `change_tag` (setup step 10). `DELETE` stays 403 (`core.delete_note`), hence ticking by retag.

## Code pointers found while planning

- Notes client: `packages/api/src/client.ts` (`createNote`, `updateNoteTags`, `listNotes`), types `packages/api/src/types.ts:141-147`. `updateNoteTags` has one caller, `apps/molly/src/app/(main)/index.tsx:460` (skip Undo).
- Skip notes query (pattern for polling): `apps/molly/src/features/dashboard/queries.ts` `useSkipNotes`.
- Header buttons: `apps/molly/src/features/dashboard/Header.tsx:63-65` (`IconButton`).
- Alarms: `Notifier.kt:240` `scheduleNapReminder` (two alarms, `setWindow` 10 min + `setAndAllowWhileIdle`, "rang" key), `keepOnlyNapReminders`; JS side `apps/molly/src/notification/sync.android.ts`. Channels today: `molly.timers`, `molly.reminders`. Notification ids in use up to 5.
- `expo-camera` is installed (onboarding QR scan); no image picker or manipulator yet. `expo-image` is installed.
- Web CSP: `docker/nginx.conf.template:13` (`img-src 'self' data: blob:`). Access bypass text: `docs/setup.md:53`.

## Open

- None.
