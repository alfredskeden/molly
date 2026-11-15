# A night that starts after midnight belongs to the evening before

GitHub issue #47 (the agreed spec, in Gherkin). Builds on `plans/implan-recent-days-order/` (cards keyed by the morning) and `plans/implan-night-ends-at-wake/` (past windows tile). Issue #48 (a late nap becoming the night) is separate and not in this plan. Branch `fix/issue-47-night-after-midnight` from `develop`, PR with `--base develop`.

## Outcome

A night whose bedtime is logged after local midnight (say 00:30 Sunday) is treated as Saturday's night everywhere a window is given a calendar day:

- **Recent days** puts it on Sunday's card, left half, labelled "Night". Tonight's card keeps the live night (Sunday 21:10 → …), labelled "Tonight", dated Monday. No window replaces another.
- **The Today sheet** (`todaySheetTotals`, which takes Recent days' top card) counts tonight, not last night.
- **The dashboard pager and header** call it "Last night" under Sunday's live day (today: "Sunday night"), date it "Sat 12 Sep" (today: "Sun 13 Sep"), call Sunday's day "Today" under a live night that started after midnight (today: "Yesterday"), and step back from it to "Yesterday" (today: "Today").

Nights that start before midnight are unchanged.

Reproduced on `develop` with a throwaway test (not committed): `recentDays(tonight 13th 21:10, [day 13th 07:55, night 13th 00:30])` gives `[Tonight · Mon 14 Sep, left half "Night" starting 00:30]` and `[Today · Sun 13 Sep, no night]`, so the live night is gone. `windowTitle(night 00:30, live day)` is `"Sunday night"`, `windowDate` is `"Sun 13 Sep"`, and the pager's previous from that night is `"Today"`.

## The rule

**A window's calendar day (`windowDay`) is its start date for a day. For a night, it's the start date when the night starts at noon or later, and the date before when it starts before noon.** A night's card (its morning) is the day after that.

```
 Sat 12:00 ─────────────── Sun 00:00 ─────────────── Sun 12:00
 │ a night starting here is Saturday's night │ (Sunday's starts after this)
 │ 19:05 ✓        23:40 ✓        00:30 ✓    05:10 ✓ │
```

Why the start with a noon cut, not the `end` date or `start + 12h`:

- **Every caller has the start; not all have the end.** `windowTitle` and `ringPager` take `Titled = { kind, start }`, and the pager's `before()` makes up a window with only a start for the one not loaded yet (`packages/core/src/ring.ts:307`, `:355`). An `end` rule would mean widening `Titled` and inventing an end in `before()`.
- **The live night's `end` is a guess, stretched.** It's `usualWakeAfter(start)` (`day-window.ts:227–230`) and `dayWindow` pushes it to at least now + 30 min (`day-window.ts:33–34`). It is always set (the usual wake falls back to "Day starts" before anything is learned), and it lands on the right morning in every case we found, but its meaning ("the guess") is weaker than the start's ("the logged bedtime").
- **Nights never start near noon.** A night starts at a bedtime sleep, which is a sleep after the day's morning wake that starts no earlier than the usual bedtime − `eveningFrom` (3 h) and before the next morning's wake range opens (`isBedtime`, `dayOn`, `day-window.ts:137–173`), or at the day's end without one (usual bedtime or "Day ends", `dayOf` / `clockDay`). So a night starts from late afternoon to early morning, never around 12:00, and the cut can't split two nights onto one day.
- **It agrees with the tiling.** A past night runs from its day's end to the next day's start (`windowsOn`, `day-window.ts:102–109`), so its `end` date is the morning and its `wake` (the wake before its bedtime) is on its evening. Step 2 locks that in with tests over `windowsBefore`, so if the rhythm ever produces a night the noon cut misplaces, a test fails.
- **DST-safe** by using calendar fields (`getHours`, `new Date(y, m, d − 1)`), never `start + 12 h` in milliseconds (an hour off on the change days).
- **No usual wake learned** doesn't matter: the rule doesn't read the rhythm.

**Where it lives:** `packages/core/src/ring.ts`, next to `windowTitle` / `windowDate`, exported through `index.ts`. Both the core titles and the app's `recentDays` need the same answer; one helper keeps them from drifting. `recentDays` itself stays in the app (`apps/molly/src/features/days/recent.ts`, tested by `apps/molly` Vitest, `recent.test.ts`, TZ Europe/Stockholm); moving it to core isn't needed for the fix.

## Every place that gives a window a day

| Place | Today | Affected | Change |
|---|---|---|---|
| `recentDays` / `morningOf` (`recent.ts:21–22`) | night → start date + 1 | **Yes** (the bug) | `windowDay` (+1 for a night) |
| Today sheet (`todaySheetTotals`, `index.tsx:1361`) | Recent days' top card | **Yes**, through `recentDays` | none beyond `recentDays` |
| `windowTitle` (`ring.ts:319–325`) | start date of window and live | **Yes**: "Sunday night", "Yesterday" | `windowDay` for both |
| `windowDate` (`ring.ts:362–365`) | start date | **Yes**: "Sun 13 Sep" for Saturday's night | night → `windowDay` |
| `ringPager` / `before()` (`ring.ts:331–359`) | day's night = date − 1 at 00:00; night's day = its start | **Yes**: "Today" from a 00:30 night | `before()` by `windowDay` |
| Dashboard `titleOf` (`index.tsx:797`): header, pager, "Switch to …" labels, editor subtitle, past stat boxes title | `windowTitle` | Yes, through `windowTitle` | none |
| Recent days card `title` / `date` (`recent.ts:38–39`) | from the morning | Through `morningOf` | none |
| `weeks.ts` `weekWindow` | calendar weeks of entries to fetch, by `now` | No: fetches instants, not windows' days | none |
| `rows.ts` `daysRows` filter `window.start >= oldest.from` | instants | No (an after-midnight night is kept; older evenings drop as before) | none |
| Dashboard `keyOf`, `wantAt`, `?window=` param | `start.getTime()` | No (instants) | none |
| `likely-detail.ts:87` (`sleep.day.wake.toDateString()`) | a day's wake | No (a day, not a night) | none |
| `pastDays`, `dayOn`, `windowsOn` | calendar day of the wake | No: they already put a 00:20 bedtime on the day before (`day-window.test.ts:845–862`) | none |

## Steps

TDD (Vitest, Given / When / Then, zero → one → many, then boundaries). `packages/core` first, then `apps/molly`'s `recent.test.ts`. Fixtures are made up; the issue's times (usual bedtime 20:00, wake 07:00, Sunday 23:00) as the example week.

- [ ] **1. `windowDay` in core** (`ring.ts`, tests in `ring.test.ts`, new `describe("a window's calendar day")`):
  - Zero/one: a day → its start date (midnight); a night at 19:05 → its start date.
  - Many: a night at 23:40 → same date; at 00:30 → the date before; at 05:10 → the date before.
  - Boundaries: 11:59 → the date before, 12:00 → same date; 00:30 on 1 March → 28 February, on 1 January → 31 December; 00:30 on 25 October 2026 (the fall-back night, TZ Europe/Stockholm) → 24 October.
  - REFACTOR: `daysBetween` takes the two `windowDay`s; give the noon cut a named constant with a one-line why.
- [ ] **2. The rule agrees with the tiling** (`day-window.test.ts`, tests only, no code change expected): over `windowsBefore` for (a) a normal week, (b) the existing "a bedtime after midnight" group (00:20), (c) clock nights (no bedtime), (d) the clock-change week: for every night, the day after `windowDay(night)` is `end`'s date; for a night with a logged wake (`clock: false`), `windowDay(night)` is `wake`'s date. A failure here means the rule is wrong: stop and bring it to the developer.
- [ ] **3. `windowTitle` by `windowDay`** (`ring.test.ts`, "a window's title"):
  - Live day Sunday, night from Sunday 00:30 → "Last night".
  - Live night from Monday 00:30 (after a Sunday day), Sunday's day → "Today"; Sunday's 00:30 night under it → "Saturday night".
  - An older night starting after midnight → its evening's weekday night.
  - The live night starting after midnight is still "Tonight" (start equality). Existing title tests stay green.
- [ ] **4. `windowDate` of a night is its evening** ("a window's date"): night from Sunday 00:30 → "Sat 12 Sep"; night from 19:05 unchanged; a day unchanged. The signature widens to `{ kind, start }` (callers already pass whole windows; `index.tsx:1125` passes `{ start: now }` with no kind: give it `kind: 'day'` or make `kind` optional, whichever reads simpler). Doc comment: "the day it starts on, a night's evening".
- [ ] **5. The pager steps by `windowDay`** ("the pager over a past ring"): `[live day Sunday, night Sunday 00:30]`, index 1, previous not loaded → "Yesterday"; from a day, the made-up night before it is on the evening before (its title "Last night" / weekday night as today). `before()` builds its stand-in from `windowDay`, not from the raw start. Existing pager tests green.
- [ ] **6. Recent days** (`apps/molly/src/features/days/recent.test.ts`, run with `pnpm --filter @molly/app exec vitest run src/features/days/recent.test.ts`). `morningOf` becomes `windowDay` plus one day for a night. New fixture helper for a night at any start (e.g. `nightAt(start, end)`; not `nightFrom`, which core already exports). Tests, in order:
  - **Scenario "A bedtime after midnight belongs to that morning's card"**: live day Sunday (at 23:00 with no bedtime yet the live window is still the day), past `[night Sun 00:30 → 07:55]` → one card, Sunday, `night` = that night labelled "Night".
  - **Scenario "The live night keeps its own Tonight card"**: live night Sunday 21:10, past `[day Sun 07:55 → 21:10, night Sun 00:30 → 07:55]` → `[Tonight · Mon, night = live "Tonight", no day]`, `[Today · Sun, night = the 00:30 night "Night", day "Day"]`. This is also the Today sheet's top card.
  - **Scenario "A night that starts before midnight is unchanged"**: past night Saturday 20:15 → Sunday 06:50 on Sunday's card (existing tests cover most of this; add the issue's times once).
  - **Scenario "Two windows never replace each other silently"**: a two-week list mixing before- and after-midnight nights, a clock night, a missing night, with a live day and again with a live night → every window in `[live, ...past]` is in exactly one slot across the cards, and no card has two of one kind (count slots = count windows).
  - REFACTOR: `morningOf`'s comment and `RecentDay.date`'s ("the morning's date") stay true; rewrite `morningOf`'s ("a night's next") to say "the morning after its evening".
- [ ] **7. Playwright** (`e2e/tests/recent-days.spec.ts`): seed a night from 00:30 to 07:55 on "yesterday" (the spec's `iso(0, 30)` / `iso(7, 55)`, with the evening before awake) and a sleep timer running since 21:10, browser clock at 23:00 → the top card is "Tonight" and its ring is the running night; the next card's left half is last night (00:30). On the dashboard, `Switch to last night` names it "Last night". If the seeded rhythm makes the 00:30 sleep a nap instead of the bedtime (see NOTES), seed earlier days with a usual 20:00 bedtime first; don't change detection for it (that's #48's area).
- [ ] **8. Docs.** `CLAUDE.md` "Day and night" bullet: one clause that a night's calendar day is its evening (start date, or the day before when it starts before noon: `windowDay`). `plans/implan-recent-days-order/NOTES.md` line 11 ("a night's start date + 1"): point here. `plans/README.md` row status.
- [ ] **9. Wrap-up.** `implan-cleanup` wrap-up sweep over the diff, `pnpm check` and `pnpm e2e` green, PR into `develop` (description: what and why, how tested), issue #47 updated with anything that changed during the work. Manual look on emulator-5554 only (titles and Recent days cards for a seeded after-midnight night); the developer checks their own phone afterwards.

## Decisions and why

- **Noon cut on the start**, not `end` or `start + 12 h`: reasons above. One helper in core so titles, dates, pager and cards agree.
- **Fix the titles and dates too**, not only Recent days: the issue asks to check other places treating a night's start date as its day, and the pager/header show the same mistake ("Sunday night" for last night).
- **`windowDate` of a night shows its evening**, matching nights before midnight seen after midnight (a live night from 21:00 Saturday already reads "Tonight · Sat 12 Sep" at 01:00 Sunday).
- **No runtime guard in `recentDays`** against a slot collision: the rule makes collisions impossible for tiled windows, and the invariant test (step 6) plus the tiling test (step 2) catch a regression. Throwing on screen would be worse than a hidden window.
- **`recentDays` stays in the app.** It's already unit-tested there; moving it is unrelated churn.

## Not in this plan

- How bedtime is found (`isBedtime`, `dayOn`), or a late nap counting as the night: issue #48.
- `weeks.ts` and the Days fetch: they work on instants.
- The card's totals (`cardSpan`, `cardStats`): they follow from the right windows on the card.

## Assumptions

- A learned usual bedtime is never before about 15:00, so no bedtime sleep starts before noon on its own day (it's at least `usual − 3 h`).
- No morning wake range opens after 12:00 (usual wake / "Day starts" are mornings), so no night starts after noon of its morning.
