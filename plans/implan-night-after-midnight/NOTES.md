# Notes

## Verified in the code (develop, 414159d)

- `morningOf` (`apps/molly/src/features/days/recent.ts:21–22`): `new Date(start.y, start.m, start.d + (kind === 'night' ? 1 : 0))`. `recentDays` (`:29–44`) loops `[live, ...past]`, keys each by `dateKey(morningOf(window))` and sets `card[window.kind] = …` (`:41`), so a second window of the same kind on one key replaces the first with no warning. `past` comes after `live`, so a finished night wins over the live one.
- Card `title` is `'Tonight'` for the live night, else `windowTitle({ kind: 'day', start: morning }, live)`; `date` is `windowDate({ start: morning })` (`recent.ts:38–39`). Both follow from the key, so fixing `morningOf` fixes them.
- Reproduced with a throwaway test in `apps/molly` (deleted, not committed): live night 13 Sep 21:10, past `[day 13 Sep 07:55 → 21:10, night 13 Sep 00:30 → 07:55]` → cards `[Tonight, Mon 14 Sep, night "Night" starting 00:30, no day]`, `[Today, Sun 13 Sep, no night, day]`. Same run: `windowTitle(night 00:30, live day 13th)` = `"Sunday night"`, `windowDate(night 00:30)` = `"Sun 13 Sep"`, `windowTitle(day 13th, live night 14th 00:30)` = `"Yesterday"`, `ringPager([live day 13th, night 13th 00:30], index 1).previous.title` = `"Today"`.
- `windowTitle` (`packages/core/src/ring.ts:319–325`): `back = daysBetween(window.start, live.start)`, weekday from `window.start`; "Tonight" by start equality. `Titled = { kind, start }` (`:307`): no `end`.
- `windowDate` (`ring.ts:362–365`): the start's date. Callers: dashboard header (`index.tsx:1125`, live window, or `{ start: now }`), pager (`index.tsx:1147`), `recentDays`.
- `ringPager`'s `before()` (`ring.ts:355–359`): before a night is a day with the same start; before a day is a night at 00:00 of the date before. Used only when the older window isn't loaded.
- `titleOf` (`index.tsx:797`) feeds the header, pager title, "Switch to …" accessibility labels (`:856–858`), the editor subtitle (`:952`) and the past stat boxes (`:1275`). All follow `windowTitle`.
- `todaySheetTotals` (`index.tsx:1350–1364`) takes `recentDays(live, windowsBefore(…, 1, running))[0]`; with `days = 1` and a live night, `windowsBefore` returns 3 windows (`day-window.ts:85–87`), including last night, so the Today sheet hits the same bug.
- Night starts: a bedtime is the first sleep after the morning wake, before the next morning's wake range opens, that starts ≥ usual bedtime − `bedtimeCut` (90 min), or ≥ usual − `eveningFrom` (3 h) and runs long (`dayOn` / `isBedtime`, `day-window.ts:137–173`, tuning `day-rhythm.ts:48–49`). Without a bedtime, the night starts at the day's end: usual bedtime (`dayOf`, `:211–214`) or "Day ends" (`clockDay` / `clockNightAfter`, `:217–224`). So a sleep at 00:30 is the bedtime when nothing qualified earlier (usual 20:00, awake all evening) — no need for a usual bedtime near midnight.
- Night ends: live → `usualWakeAfter(start)` (`:227–236`), then stretched to ≥ now + 30 min (`dayWindow`, `:33–34`); past → the next calendar day's start (`windowsOn`, `:102–109`, from `implan-night-ends-at-wake`). Always set. A night's `wake` is the morning wake before its bedtime (its evening's date), or the day's end for a clock night after a clock day.
- `windowsBefore` already files a 00:20 bedtime under the day before (`day-window.test.ts:845–862`, "a bedtime after midnight"); only the app and the titles misread it.
- Not affected: `weeks.ts` (fetch weeks by `now`), `rows.ts` (`window.start >= oldest.from`, instants), dashboard `keyOf` / `wantAt` (`index.tsx:543`, instants), `likely-detail.ts:87` (a day's wake).
- Tests: `packages/core` and `apps/molly` Vitest both run with `TZ: 'Europe/Stockholm'` (`vitest.config.ts`); the clock-change fixtures use 25 October 2026. `apps/molly` is `@molly/app`; run one file with `pnpm --filter @molly/app exec vitest run src/features/days/recent.test.ts`. Existing title/pager tests: `ring.test.ts:538–616`, `:834–909`.
- e2e: `e2e/tests/recent-days.spec.ts` seeds into "yesterday" (`iso(hours, minutes, dayOffset)`) with the browser clock set on it.

## Decisions

- Card rule: noon cut on the night's start (`windowDay`), in core `ring.ts`; reasons in MAIN "The rule".
- Titles, `windowDate` and the pager use the same helper; `windowDate` of a night shows its evening.
- No runtime collision guard in `recentDays`; invariant and tiling tests instead.
- Lean plan: no mental model file.

## Cleanup sweep (planning)

- **Remove:** nothing. `morningOf` stays as the one-line wrapper over `windowDay` (or is inlined; REFACTOR call). `dateKey` stays (only user; the other date helpers in the app build `Date`s, not keys).
- **Refactor (in steps):** `daysBetween` takes calendar days from `windowDay` (step 1/3); `before()` builds from `windowDay` (step 5); the noon cut gets a named constant (step 1).
- **Comments that will lie:** `windowTitle` ("Counted from the live window's calendar day"), `windowDate` ("the day it starts on"), `before()` ("the night before a day starts the day before"), `morningOf` ("a night's next"). Rewritten in steps 3–6.
- **Docs that will lie:** `plans/implan-recent-days-order/NOTES.md:11` ("a night's start date + 1"); `CLAUDE.md` "Day and night" bullet gains the rule (step 8).
- **Spotted, not in scope:** none.

## Open

- None.
