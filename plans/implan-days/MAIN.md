# Days

Context: the Molly system plan in [`../implan-molly/MAIN.md`](../implan-molly/MAIN.md) (architecture, rules) and the day-plan work in [`../implan-day-plan/MAIN.md`](../implan-day-plan/MAIN.md), which built the swipe-back pages this changes. Decisions are in [`NOTES.md`](NOTES.md), the picture in [`MENTAL_MODEL.md`](MENTAL_MODEL.md), the Definition of Done in [`TEST_STRATEGY.md`](TEST_STRATEGY.md).

**Outcome:** two changes, wanted after using the swipe-back pages.

1. **The Today card swipes back one page only.** The live page plus the window just before it: on Today that's last night, on Tonight it's the day that just ended. Nothing further back. Two dots.
2. **A new `Days` screen** shows every earlier day and night as its own card strip, newest first, loading older weeks on demand like History. It opens from an `All days ›` link on the Today card. It's read-only.

No design file: both reuse the existing past-page card look (`TodayCard` as the swipe's past page draws it).

## The previous page (swipe)

The past page itself doesn't change: title, span, totals, stems on logged sleep starts, a `Likely` lane and accuracy line on a day, `Back to now ›`, snap-back after 60 s and on returning from the background, screen-reader paging (`TodayPager.tsx`).

What changes:
- **One past page.** It is the newest window that started before the live one (Today → last night; Tonight → today's day; small hours of Tonight → yesterday's day). Add `previousWindow(entries, napWindow, now, running)` in `packages/core/src/day-window.ts`, built on `windowsBefore`'s rules. The dashboard uses it instead of the whole list. Keep `windowsBefore`, because the Days screen needs it.
- **Less data.** `usePastEntries` (`features/dashboard/queries.ts`) only has to cover that window: entries from two midnights back, plus sleeps `PREDICTION_DAYS` further back for the Likely lane. `PAST_DAYS = 7` goes. The dashboard's skip-notes query (`useSkipNotes`, `SKIP_DAYS`) only needs the same two days. The Days screen fetches its own skips.
- **Dots:** two, the live one first.

## The Days screen

Route `src/app/(main)/days.tsx`, laid out like `history.tsx`: `‹ Back`, the `Days` heading, the unreachable banner, a skeleton while the first week loads, `Load earlier` at the bottom, and an empty text when nothing is logged. No filter chips.

- **Rows:** one card per window, days and nights as separate rows, newest first, in the same order and with the same boundaries as `windowsBefore`. The first row is the last finished window (the same one the swipe shows). The live window isn't on this screen.
- **Each row is the swipe's past page without `Back to now ›`:** title, span, totals, strip, stems. Days also get the `Likely` lane and accuracy line (`likelyFor`, `accuracySummary` from `@molly/core`). Nights don't.
- **Titles carry the date**, because weekdays repeat after a week: `Saturday 26 September` · `06:40 – 19:25`, `Friday night 25 September` · `19:30 – 07:00`. The swipe's page keeps its plain weekday title.
- **Read-only.** Tapping does nothing. Edits stay in History.
- **Screen readers** read each row's title, span and totals (as the swipe page's `summary` does).
- **Build the past page once.** The card-building code for a past window is inline in `index.tsx` now (`pastPages`). Move it into a component both the dashboard and Days render (in `features/dashboard/` or a new `features/days/`), with an optional header slot for `Back to now ›`.

**Data:** a `useDays` infinite query, a week per page like `useHistory` (`features/history/queries.ts`, `historyWindow`, `mergeWeeks`). Each week needs:
- every entry kind in the week, with sleeps fetched by overlap as History does;
- sleeps `PREDICTION_DAYS` before the week's start, for the Likely lane;
- `molly-skip` notes in the week (hatched blocks in the Likely lane). `NoteQuery` in `packages/api/src/types.ts` only has `date_min`. Add `date_max` and check it against the test Baby Buddy.

You decide how the query splits these, for example one query per week that fetches everything, or a separate sleeps query. Rows are `windowsBefore(merged, napWindow, now, loadedDays)`. A window only shows once the week it starts in is loaded. `useRefreshAfterWrite` invalidates the new query key too. `likelyFor` runs a day plan per sleep, so work it out once per row (memoised) and not on every render. If many loaded weeks make scrolling slow, virtualise the list.

**Entry point:** `All days ›` in the live Today card's header slot (the `header` prop, where the past page puts `Back to now ›`), as a `TextLink` to `/days` like Recent's `See all`. It's on both Today and Tonight.

## Shape

```
packages/core/src/day-window.ts          previousWindow (new); windowsBefore kept
packages/api/src/types.ts, client.ts     NoteQuery.date_max
apps/molly/src/app/(main)/index.tsx      one past page from previousWindow; All days › link
apps/molly/src/app/(main)/days.tsx       Days screen (new)
apps/molly/src/features/dashboard/       queries (past = one window, skips 2 days), shared past-window card, page-text (dated title)
apps/molly/src/features/days/            useDays query (or beside history's queries)
e2e/tests/day-plan.spec.ts               swipe specs to one page
e2e/tests/days.spec.ts                   Days screen (new)
```

## Steps

Work through them in order. Each lands on its own. Mark a step `[x]` when it's fully done, and record findings in [`NOTES.md`](NOTES.md).

- [x] **1. `previousWindow` in core.** Unit TDD in `day-window.test.ts` (Given / When / Then): Today → last night, Tonight in the evening → today's day, Tonight after midnight → yesterday's day, a day with no logged wake (clock fallback), and it always equals `windowsBefore(...)[0]`.
- [x] **2. `date_max` on notes.** Integration test against the test Baby Buddy (`pnpm bb:up && pnpm bb:seed`): a note after `date_max` drops out. Record the result in `NOTES.md` and `../implan-molly/NOTES.md`.
- [x] **3. One swipe.** Extract the shared past-window card. The dashboard shows only `previousWindow`'s page. Shrink `usePastEntries` and the skips query. Add the `All days ›` link. Playwright: rewrite `further swipes go back through nights and days…` in `day-plan.spec.ts` so one swipe right shows the previous window, a second does nothing, and there are two dots. The other swipe specs stay green.
- [x] **4. Days screen.** `useDays`, the dated title (unit test in `page-text.test.ts`), the route, `Load earlier`, the empty and loading states, invalidation after writes. Playwright (`days.spec.ts`, fixed clock, seeded week): `All days ›` opens it from Today and from Tonight. Rows run newest first, nights and days alternating, starting at the last finished window. A day has its Likely lane and accuracy line and a night doesn't. A skipped nap is hatched. `Load earlier` adds the week before. `‹ Back` returns.
- [x] **5. Wrap up.** Update "Where things stand" in the root `CLAUDE.md`. In `../implan-day-plan/MAIN.md`, point outcome 3 and step 8 at this plan ("swipe-back narrowed to one page, older days on the Days screen"). Tick `TEST_STRATEGY.md`.

## Out of scope

- The live window on the Days screen (it's on the dashboard).
- Filters, tapping into a row, and editing from Days.
- Changes to History, the widgets, the notification or the day plan itself.
- A new design file.

## Assumptions

- `windowsBefore` over several merged weeks gives the same windows as it does over one week's data, as long as each window's morning-wake sleep is in the data. History's overlap fetch already brings in the night sleep that crosses into a week.
- Baby Buddy's notes endpoint filters `date_max` the way medication does (step 2 checks this).
- Both phones run in one time zone (as in the day plan).
