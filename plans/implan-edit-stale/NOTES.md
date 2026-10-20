# Notes

## Found (2026-09-27)

- `['entry', kind, id]` isn't in `useRefreshAfterWrite`, and isn't persisted (`shouldPersist` keeps only `timer` / `entries` / `children`), so the stale copy lives in memory only: an app restart also hides the bug.
- `client.editEntry` returns the updated entry (`PATCH` response), usable for `setQueryData`.

## Done (2026-09-27)

- Two specs in `e2e/tests/edit.spec.ts` ("opened again after saving", "the other parent changed"): both failed on the old image with an empty Notes field, both pass after the fix. Full suite 115 passed, `pnpm check` green.
- `['entry']` is invalidated with `refetchType: 'none'`: refetching the open screen's entry right after a delete would 404 and flash "Couldn't load" before `router.back()`. The gate refetches on the next open anyway. For the same reason `removeQueries` after a delete runs after `router.back()`.
- The edit screen's Back button is named "‹ Back" (two `Text` children), so `exact: true` doesn't find it in Playwright.
- Release build on emulator-5554: edit notes → Save → reopen shows the saved notes.

## Open

- None.
