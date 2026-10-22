# Test strategy: done when every box is ticked

## Playwright (`e2e/tests/shell.spec.ts`, production nginx image)

- [x] The Add entry sheet's bottom edge is the viewport's bottom, its top is below 0, and its background isn't transparent.
- [x] At 1280 × 800 the sheet is at most 520 px wide and centred on the window.
- [x] Both fail on the old code and pass with the fix.
- [x] Every other spec still passes (`pnpm e2e`).

## Look review (web, screenshots at 412 px and 1280 px)

- [x] Today sheet in day and night colours: anchored, surface, rounded top, scrim.
- [x] Add entry, Theme and the guide's About sheet: same.
- [x] Settings, Recent days, child, Development, measurement, Help and onboarding: nothing stretched or cut at either width.

## Manual (after the work)

- [ ] Android emulator (`emulator-5554`): sheets open, drag down to close, flick, keyboard lift in Add entry and the measurement sheet, TalkBack finds the sheet by its label.
- [ ] Desktop Safari and Firefox, and mobile Safari: a sheet sits on the bottom with its surface; a wide window shows the centred column.
