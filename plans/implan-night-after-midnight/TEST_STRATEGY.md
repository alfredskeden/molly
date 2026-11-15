# Test strategy: done when every box is ticked

Tests first (Vitest, Given / When / Then, zero → one → many, then boundaries). `packages/core` for the rule and titles, `apps/molly` `recent.test.ts` for the cards, Playwright for the screen. Fixtures are made up; TZ Europe/Stockholm as configured.

## Unit (Vitest, `packages/core`)

### `ring.test.ts`: a window's calendar day (`windowDay`)

- [ ] A day → its start date; a night at 19:05 → its start date; at 23:40 → same date.
- [ ] A night at 00:30 and at 05:10 → the date before.
- [ ] 11:59 → the date before; 12:00 → same date.
- [ ] 00:30 on 1 March → 28 February; on 1 January → 31 December.
- [ ] 00:30 on 25 October 2026 (fall-back night) → 24 October.

### `day-window.test.ts`: the rule agrees with the tiling

- [ ] For every night from `windowsBefore` (normal week, the 00:20 bedtime group, clock nights, the clock-change week): the day after `windowDay` is `end`'s date; with `clock: false`, `windowDay` is `wake`'s date.

### `ring.test.ts`: titles, date, pager

- [ ] Night from Sunday 00:30 under Sunday's live day → "Last night".
- [ ] Sunday's day under a live night from Monday 00:30 → "Today"; Sunday's 00:30 night under it → "Saturday night".
- [ ] A live night that started after midnight → "Tonight".
- [ ] `windowDate` of a night from Sunday 00:30 → "Sat 12 Sep"; nights from the evening and days unchanged.
- [ ] Pager from the 00:30 night, older not loaded → previous "Yesterday".
- [ ] Existing title, date and pager tests green, unchanged.

## Unit (Vitest, `apps/molly` `recent.test.ts`)

Issue scenario → test:

- [ ] "A bedtime after midnight belongs to that morning's card": the 00:30 → 07:55 night is Sunday's card's left half, labelled "Night".
- [ ] "The live night keeps its own Tonight card": top card "Tonight", Monday, the running night labelled "Tonight", no day; Sunday's card has the 00:30 night and the day.
- [ ] "A night that starts before midnight is unchanged": Saturday 20:15 → Sunday 06:50 on Sunday's card.
- [ ] "Two windows never replace each other silently": a two-week mix (before/after-midnight, clock, missing nights), with a live day and with a live night: slots across all cards = windows given, each exactly once.
- [ ] Existing `recentDays`, `cardSpan`, `cardStats` tests green, unchanged.

## Playwright (`e2e/tests/recent-days.spec.ts`)

- [ ] Night seeded 00:30 → 07:55, sleep timer since 21:10, clock 23:00: top card "Tonight" with the running night; next card's left half is the 00:30 night; the dashboard names it "Last night" when switching to it.
- [ ] Existing `recent-days.spec.ts`, `ring.spec.ts`, `day-night.spec.ts` green.

## Checks

- [ ] `pnpm check` and `pnpm e2e` green.
- [ ] Comments rewritten: `windowTitle`, `windowDate`, `before()` in `ring.ts`, `morningOf` in `recent.ts`; `CLAUDE.md` "Day and night", `plans/implan-recent-days-order/NOTES.md`, `plans/README.md` updated.

## Manual (emulator-5554 only; the developer's phone afterwards)

- [ ] With a seeded after-midnight bedtime: Recent days shows Tonight on top and last night on Today's card; the dashboard pager and header read "Last night" and the evening's date.
