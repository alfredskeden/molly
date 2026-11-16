# Test strategy: done when every box is ticked

Tests first (Vitest, Given / When / Then, zero → one → many, then boundaries). `packages/core` for the rule and titles, `apps/molly` `recent.test.ts` for the cards, Playwright for the screen. Fixtures are made up; TZ Europe/Stockholm as configured.

## Unit (Vitest, `packages/core`)

### `ring.test.ts`: a window's calendar day (`windowDay`)

- [x] A day → its start date; a night at 19:05 → its start date; at 23:40 → same date.
- [x] A night at 00:30 and at 05:10 → the date before.
- [x] 11:59 → the date before; 12:00 → same date.
- [x] 00:30 on 1 March → 28 February; on 1 January → 31 December.
- [x] 00:30 on 25 October 2026 (fall-back night) → 24 October.

### `day-window.test.ts`: the rule agrees with the tiling

- [x] For every night from `windowsBefore` (normal week, the 00:20 bedtime group, clock nights, the clock-change week): the day after `windowDay` is `end`'s date; with `clock: false`, `windowDay` is `wake`'s date.

### `ring.test.ts`: titles, date, pager

- [x] Night from Sunday 00:30 under Sunday's live day → "Last night".
- [x] Sunday's day under a live night from Monday 00:30 → "Today"; Sunday's 00:30 night under it → "Saturday night".
- [x] A live night that started after midnight → "Tonight".
- [x] `windowDate` of a night from Sunday 00:30 → "Sat 12 Sep"; nights from the evening and days unchanged.
- [x] Pager from the 00:30 night, older not loaded → previous "Yesterday".
- [x] Existing title, date and pager tests green, unchanged.

## Unit (Vitest, `apps/molly` `recent.test.ts`)

Issue scenario → test:

- [x] "A bedtime after midnight belongs to that morning's card": the 00:30 → 07:55 night is Sunday's card's left half, labelled "Night".
- [x] "The live night keeps its own Tonight card": top card "Tonight", Monday, the running night labelled "Tonight", no day; Sunday's card has the 00:30 night and the day.
- [x] "A night that starts before midnight is unchanged": Saturday 20:15 → Sunday 06:50 on Sunday's card.
- [x] "Two windows never replace each other silently": a two-week mix (before/after-midnight, clock, missing nights), with a live day and with a live night: slots across all cards = windows given, each exactly once.
- [x] Existing `recentDays`, `cardSpan`, `cardStats` tests green, unchanged.

## Playwright (`e2e/tests/recent-days.spec.ts`)

- [x] Night seeded 00:30 → 07:55, sleep timer since 21:10, clock 23:00: top card "Tonight" with the running night; next card's left half is the 00:30 night; the dashboard names it "Last night" when switching to it.
- [x] Existing `recent-days.spec.ts`, `ring.spec.ts`, `day-night.spec.ts` green.

## Checks

- [x] `pnpm check` and `pnpm e2e` green.
- [x] Comments rewritten: `windowTitle`, `windowDate`, `before()` in `ring.ts`, `morningOf` in `recent.ts`; `CLAUDE.md` "Day and night", `plans/implan-recent-days-order/NOTES.md`, `plans/README.md` updated.

## Manual (emulator-5554 only; the developer's phone afterwards)

- [ ] With a seeded after-midnight bedtime: Recent days shows Tonight on top and last night on Today's card; the dashboard pager and header read "Last night" and the evening's date.
