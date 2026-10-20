# Notes

## Decisions (2026-09-25)

- Own plan, not a phase of `implan-molly`.
- Dashboard only: not the widget, not quick actions, not the lock-screen notification.
- Store in Baby Buddy's native Medication model (`/api/medication/`), not a Note with a "medication" tag.
- The text typed into Other goes whole into `name`; `dosage` and `dosage_unit` stay empty.
- The approved design is `Molly App.dc.html` (the private design source, not in this repo). The `MAIN.md` details for the card, the sheet, the edit screen and the copy come from it.
- The Other sheet's placeholder is "e.g. Paracetamol 2.5 ml". "Name and dose" is the edit screen's field placeholder.

## Design tokens (from the design)

| Token | Day | Night |
| --- | --- | --- |
| `med-bg` | `oklch(0.94 0.06 95)` | `oklch(0.31 0.05 95)` |
| `med-mid` | `oklch(0.84 0.12 92)` | `oklch(0.70 0.11 92)` |
| `med-ink` | `oklch(0.44 0.09 80)` | `oklch(0.88 0.08 95)` |

## Confirmed against the live API (v2.11.0-ls251, 2026-09-25)

Probed with curl against the `e2e/docker-compose.yml` container (`:4778`) and the seeded users. Also in `../implan-molly/NOTES.md`.

- **v2.11.0 has a Medication model**: `/api/medication/` is listed at `/api/`. Fields: `child`, `name` (required, 1–255 chars), `dosage` (float, optional), `dosage_unit` (`mg | ml | tablets | drops`, returned as `""` when unset), `time` (optional), `next_dose_interval` (duration, optional), `notes`, `tags`. Filters: `child`, `date`, `date_min`, `date_max`, `dosage_unit`, `name`.
- POST with no `time` stamps the server's now. A future `time` (POST or PATCH) is 400 `{"time":["Date/time can not be in the future."]}`. An empty name is 400 `"This field may not be blank."`, a 256-char name is 400 `"Ensure this field has no more than 255 characters."`. `dosage` without a unit is accepted.
- Response shape: `{"id":1,"child":1,"name":"Vitamin D","dosage":null,"dosage_unit":"","time":"2026-09-25T11:40:18.519547Z","next_dose_interval":null,"notes":null,"tags":[]}`.
- A caregiver (`parent_a`) can create entries, and `parent_b` can PATCH `name`, `notes`, `time` on `parent_a`'s entry. `notes: ""` is kept as `""`.
- **DELETE is 403 for both seeded parents** (`"You do not have permission to perform this action."`); admin gets 204. The permission is `core.delete_medication`, missing from `e2e/seed.py` and `docs/setup.md`.
- `date_min` must be URL-safe: a `+02:00` offset in the query string turns into a space and is refused ("Enter a valid date/time."). UTC `…Z` works, which is what `toISOString()` gives.
- The rejected alternative, for the record: `/api/notes/` takes `child`, `note` (required), `time`, `tags`, `image`, and `?tags=medication` filters. `parent_a` could tag, because the seed grants `change_tag` / `add_tag`.

## Implementation notes (2026-09-25)

- `LastOfEach` (hero, widget snapshot) stays three kinds: `Exclude<EntryKind, 'medication'>`. The card header uses `lastMedicationToday` from `@molly/core`.
- The tokens' `Tracker` type stays `sleep | feed | diaper` (the widget has `Record<Tracker, …>`); only the palette keys gain `med`.
- The sheet shell is `Sheet` in `src/components/sheet.tsx` (Adjust time and Other). It lifts itself above the keyboard with `Keyboard` did-show / did-hide listeners, because edge-to-edge Android doesn't resize the window, and keeps the part of the nav-bar inset a floating keyboard doesn't cover. Checked on the emulator (2026-09-25) with the docked Gboard (sheet sits on the keyboard, no gap) and the floating one (sheet stays at the bottom, clear of the gesture bar). The emulator needs `hw.keyboard=no` in the AVD config for the docked keyboard; with the Mac keyboard attached Gboard only floats.
- Opening Other dismisses the toast (`useDismissToast`): the last log's toast otherwise covers the field.
- Edit screen: Save is disabled while the medication name is empty or whitespace.

## Open

- None.
