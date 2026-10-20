# Medication logging

Context: the Molly system plan in [`../implan-molly/MAIN.md`](../implan-molly/MAIN.md) (architecture, Baby Buddy facts in its `NOTES.md`). This feature builds on what the redesign already shipped (Tiles, toast with Adjust time, optimistic updates, Today card, Recent, edit screen) and doesn't change that plan. The confirmed API facts are in [`NOTES.md`](NOTES.md). The Definition of Done is in [`TEST_STRATEGY.md`](TEST_STRATEGY.md).

**Outcome:** a parent logs the daily vitamin D with one tap, and any other medicine with a short typed text, from the dashboard. Both parents see it in Today, Recent and the edit screen, as they do sleeps, feeds and diapers.

## Scope

In: the dashboard on web and in the Android app, the Today card, Recent, the edit screen.

Out: the widget, the lock-screen notification, quick actions, dose reminders (`next_dose_interval`), Baby Buddy's `dosage` / `dosage_unit` fields. The widget's types and data stay as they are.

## How it works

The design is `Molly App.dc.html` (the private design source, not in this repo). Its dashboard and edit screens are the reference for everything below.

App paths (`src/…`, `tailwind.config.js`) are under `apps/molly/`.

- **Storage:** Baby Buddy's own Medication model, `/api/medication/` (`name` required, `time`, `notes`). The typed text goes into `name` as is: "Paracetamol 2.5 ml". Molly never writes `dosage` or `dosage_unit`.
- **Medication card**, full width below Diaper in `src/features/dashboard/Tiles.tsx`, `bg-med-bg` / `text-med-ink`. Header "Medication", and on the right "Last HH:MM · <name>" for today's latest, or "None today". Two buttons side by side:
  - **Vitamin D** (solid, `med-ink` on `med-bg`): logs `{ name: 'Vitamin D' }` with no `time` (Baby Buddy stamps it, as for diapers), optimistic like a diaper. Toast "Vitamin D saved" with Adjust time.
  - **Other** (outline, 2 px `med-ink` border): opens a bottom sheet with the same shell as Adjust time (`AdjustSheet` in `src/features/toast/toast.tsx`: scrim, surface, rounded top, handle; extract the shell so both use it). The sheet has a `med-mid` dot, the title "Which medication?", and one focused single-line field (placeholder "e.g. Paracetamol 2.5 ml", 2 px `med-mid` border, large bold text). Under the field, the hint "Tap outside to save", or "Tap outside to cancel" while the field is empty. Tapping outside or pressing Enter saves. An empty or whitespace-only field closes without saving. Saving logs `{ name }` at now, and the toast says "<name> saved" with Adjust time.
- **Toast and Adjust time:** medication toasts use the `med` tone (a `med-mid` dot). Adjust time gains a `medication` target, a PATCH of `time` like a change, with the sheet title "When was it?".
- **Today card** (`TodayCard.tsx`): a fourth lane below the diaper lane, with 10 px `bg-med-mid` point markers like the diaper lane. The totals line ends in " · 1 med" / " · N meds", and only when N > 0.
- **Recent** (`Recent.tsx`, `timeline-text.ts`): medication rows have a `bg-med-mid` dot. The title is the name and the detail is "Medication".
- **Edit screen** (`src/app/(main)/entry/[kind]/[id].tsx`, route kind `medication`):
  - Chip in `med` tones ("Today" / "Yesterday"), and the name as the title ("Medication" when it's empty).
  - One "Time" card with −5 / +5 min, no end and no duration.
  - A "Medication" single-line field (placeholder "Name and dose"), then Notes, then the usual delete and Save.
  - An empty name can't be saved.

## Decisions

| Decision | Why |
| --- | --- |
| Native `/api/medication/`, not a Note with a "medication" tag | It exists in v2.11.0 after all, keeps name and notes apart for the edit screen, shows under Medication in Baby Buddy, and needs no tag |
| The whole typed text goes in `name` | No parser; Baby Buddy's four units wouldn't cover what parents type anyway |
| No `time` on one-tap and Other logs | Baby Buddy refuses future times; a device clock a little ahead would fail every log (same as diapers) |
| Parents need `core.delete_medication` | Without it deleting from the edit screen is a 403, for caregivers as for the seeded parents |
| `medication` joins `EntryKind` in `packages/api`, but `getLatestEntries` (the widget's source) stays three kinds | Generic `listEntries` / `getEntry` / `editEntry` / `deleteEntry` then cover it; the widget is out of scope |

## Steps

- [x] **1. Client and permissions (integration tests, `packages/api`).** `Medication` and `NewMedication` types, `medication` in `EntryKind` / `Entry` / `ENTRY_PATHS` (`medication/`), `logMedication`. Add `core.delete_medication` to `PARENT_PERMS` in `e2e/seed.py` (then `pnpm bb:down && pnpm bb:up && pnpm bb:seed`) and to the permission table in `docs/setup.md`. Tests as in `TEST_STRATEGY.md`.
- [x] **2. Domain (TDD, `packages/core`).** `entryTime` covers medication (`time`). `EntriesByKind` gains `medication`; `mergeTimeline` / `todaysTimeline` include it (kind order after change). `todaysTotals` gains `medications` (since local midnight). `todayStrip` gains `medications` points. A name rule for Other: trimmed text, or nothing to save when empty. The card header needs today's latest medication (not the latest ever: "None today"). Take it from today's entries, and leave `lastOfEach` and the widget's three-kind snapshot as they are.
- [x] **3. Dashboard.** Tokens `med-bg` / `med-mid` / `med-ink` for day and night in `src/theme/tokens.ts` (the design's oklch values, in `NOTES.md`; converted to hex with the oklch as a comment, like the others), `tones('med')` in `tailwind.config.js`, `med` in `Tone` / `HAS_COLOR` / button styles in `src/components/ui.tsx`, `med` toast tone. `logMedication` and the `medication` Adjust target in `src/actions/trackers.ts`; medication in `useRecentEntries` (`date_min` since yesterday's midnight, UTC ISO) and in `optimistic.ts`. Medication card, Other sheet, Today lane and summary, Recent rows. Playwright spec `e2e/tests/medication.spec.ts`.
- [x] **4. Edit screen.** `medication` kind with a `med` chip: time (with the ±5 nudges), name, notes, delete. Playwright specs in `e2e/tests/edit.spec.ts`.
