# Edit screen shows stale values

Context: the Molly system plan in [`../implan-molly/MAIN.md`](../implan-molly/MAIN.md). Definition of Done in [`TEST_STRATEGY.md`](TEST_STRATEGY.md).

**Outcome:** after saving an edit, opening the same entry again shows the saved values, every time.

## The bug

Edit a Recent entry → Save → open it again: old values. Back, open a third time: new values.

## Cause

- The edit screen reads the entry with `useEntry` (`src/features/dashboard/queries.ts`), query key `['entry', kind, id]`, `gcTime` one day, default `staleTime` 0.
- `useRefreshAfterWrite` invalidates `timer`, `entries`, `sleeps`, `skips`, `past`, `history`, `latest`, but not `entry`. So after Save the cached entry still holds the pre-edit values.
- Second open: TanStack Query returns the cached (old) entry at once and refetches in the background. `EntryLoader` renders `EntryForm` as soon as `data` exists, and `EntryForm` seeds its draft with `useState(() => draftOf(entry))`, which runs only once. The refetched values arrive but never reach the form.
- Third open: the background refetch from the second open has updated the cache, so the form starts from the new values.

The same thing happens without our own save: the other parent edits the entry, or the hero moves a start, and the cached copy is older than Baby Buddy.

## Fix

- The form only starts from data fetched while the screen is open: `EntryLoader` waits for `entry.isFetchedAfterMount` (with `refetchOnMount: 'always'`) before rendering `EntryForm`. This covers our own saves, the other parent's edits and any other write, in one place. Cost: a moment of blank screen on open, as on a first open today.
- After a save, the PATCH response (Baby Buddy returns the updated entry) goes into `['entry', kind, id]` with `setQueryData`; after a delete, `removeQueries`. `useRefreshAfterWrite` also invalidates `['entry']`. Not needed for correctness with the gate above, but keeps the cache honest.

## Decisions

| Decision | Why |
| --- | --- |
| Gate on a fresh fetch, not re-seed the draft when data changes | Re-seeding (e.g. `key={dataUpdatedAt}`) would wipe edits the parent has already started if a refetch or poll lands mid-edit |
| No TDD step | App wiring only, no `packages/core` logic. Covered by a Playwright regression spec, per the testing method in `CLAUDE.md` |

## Steps

- [x] **1. Regression spec (fails first).** In `e2e/tests/edit.spec.ts`: edit a sleep's notes, Save, open the same Recent row again, expect the Notes field to show the saved text. Run it against the current image and see it fail.
- [x] **2. Fix.** `EntryLoader` gate, `setQueryData` / `removeQueries` in `write`, `['entry']` in `useRefreshAfterWrite`. The spec from step 1 passes, full Playwright suite and `pnpm check` stay green.
- [x] **3. Android check.** Release build on the emulator (emulator-5554): edit → Save → reopen shows the new values.
