# Edit screen shows stale values: Definition of Done

Method as in [`../implan-molly/TEST_STRATEGY.md`](../implan-molly/TEST_STRATEGY.md): no domain logic, so Playwright on the web image plus a manual Android check.

## App flow (Playwright on the web image)

- [x] Editing an entry, saving, and opening the same entry again shows the saved values (spec fails before the fix, passes after).
- [x] An entry changed in Baby Buddy directly (the other parent) after it was opened once shows the new values when opened again.
- [x] Every existing Playwright spec still passes, and `pnpm check` is green.

## Android (manual, emulator-5554)

- [x] Edit → Save → reopen shows the new values on the release build.
