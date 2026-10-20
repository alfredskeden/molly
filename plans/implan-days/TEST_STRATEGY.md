# Days: Definition of Done

Done when every item below is true. The method follows the root `CLAUDE.md`: unit TDD for `packages/core` (Given / When / Then, zero → one → many, then boundaries), integration tests against the real test Baby Buddy for `packages/api`, Playwright on the web image with the clock fixed by `page.clock` for screens, and manual review for looks.

Times follow the day-plan story (Saturday 26 September, woke 06:40, default nap window 07:00–19:00). Exact times come from the seeded history. What's checked is the rules; the times are examples.

## Nothing regresses

- [x] `pnpm check` is green (boundaries, typecheck, lint, all Vitest, web-bundle check).
- [x] Every existing Playwright spec passes, changed only where it expected more than one past page.
- [x] The swipe's past page reads exactly as before (title, span, totals, stems, Likely lane, accuracy line, `Back to now ›`, snap-back after 60 s and on return from the background, hatched skipped nap).
- [x] The dashboard's first load fetches no more than before. The past-page query now covers two days of entries, not eight.

## `previousWindow` (`packages/core`, unit TDD)

- [x] During Today it's last night. On Tonight in the evening it's today's day. On Tonight after midnight it's yesterday's day.
- [x] A day with no logged wake falls back to the nap window, as `windowsBefore` does.
- [x] It's always the same window as `windowsBefore(...)[0]` for the same inputs.

## Notes `date_max` (integration, test Baby Buddy)

- [x] A `molly-skip` note after `date_max` isn't listed, and one before it is. The fact is recorded in `NOTES.md` and `../implan-molly/NOTES.md`.

## One swipe (Playwright, fixed clock)

- [x] On Today, one swipe right shows last night. On Tonight, it shows the day that just ended.
- [x] A second swipe right leaves the previous page in place. There are two dots.
- [x] `All days ›` shows on the live card on Today and on Tonight, and opens the Days screen.

## Days screen (Playwright, fixed clock, a seeded week)

- [x] The first row is the last finished window (the same one the swipe shows). The live window isn't listed.
- [x] Rows run newest first, with nights and days as separate, alternating rows, and titles like `Saturday 26 September` and `Friday night 25 September`.
- [x] Each day row has its totals, strip, Likely lane and accuracy line. Night rows have totals and strip, and no Likely lane.
- [x] A skipped nap on an older day is hatched in its Likely lane.
- [x] `Load earlier` adds the week before, and its rows follow on without a gap or a duplicate at the week boundary.
- [x] With nothing logged the screen shows its empty text. While the first week loads it shows the skeleton. Offline shows the unreachable banner.
- [x] Logging an entry on the dashboard and coming back shows it on the Days screen (the query is invalidated after writes).
- [x] Tapping a row does nothing. `‹ Back` returns to the dashboard.
- [x] A screen reader reads each row's title, span and totals.

## Look (manual, web and emulator, both themes, largest font)

- [ ] Days rows look like the swipe's past page and scroll smoothly with several weeks loaded.
- [ ] `All days ›` fits beside the title on Today and Tonight at the largest font, and in every theme.

## Wrap up

- [x] Root `CLAUDE.md` "Where things stand" lists this plan, and `../implan-day-plan/MAIN.md` points its swipe-back parts here.
