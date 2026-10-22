# Test strategy: done when every box is ticked

## Unit (Vitest, `packages/core/src/ring.test.ts`, TDD, Given / When / Then)

`windowStats(window, entries)`:

- [x] Zero: no entries in the window → 0 slept, 0 naps, 0 feeds, 0 diapers, 0 medicine.
- [x] One of each inside a day → slept is the sleep's length, 1 nap, 1 feed, 1 diaper, 1 medicine.
- [x] Many: several sleeps and feeds are summed and counted.
- [x] Boundaries: a sleep crossing the window's start is clipped in slept but not counted as a nap; entries exactly at `end` don't count, at `start` do.
- [x] `pastCentre` uses it: the existing past centre tests stay green unchanged.

Pager rule (`ringPager` or whatever the implementer names it):

- [x] Index 1 (newest past) → next is live, titled `Today` (live day) or `Tonight` (live night), spoken `Next: Today`.
- [x] Index 2+ → next is the window at index − 1 with its title, not live.
- [x] Previous is the window at index + 1 with its title, spoken `Previous: <title>`, enabled.
- [x] The window before isn't in the list yet but older may exist → previous enabled, marked as needing a load.
- [x] Nothing older (not in the list and older may not exist) → previous disabled.
- [x] Titles alternate day and night as the list does (`Yesterday`, `Tuesday night`, `Tuesday`).

## Playwright (`e2e/tests/ring.spec.ts`, `recent-days.spec.ts`, against the seeded Baby Buddy)

- [x] On the live ring the header is unchanged: name, history, add, settings; no pager.
- [x] Opening yesterday from Recent days shows the pager: title `Yesterday`, its date, `Previous: <day before's night>` and `Next: Last night` buttons; no history/add/settings buttons.
- [x] `›` from yesterday shows last night; there the right button is `Next: Today` (the pill) and it returns to the live ring with the normal header.
- [x] `‹` from last night shows yesterday, then the night before: day and night alternate.
- [x] `‹` past the dashboard's loaded days (more than two days back) loads the older week and steps.
- [x] With nothing older in Baby Buddy, `‹` is announced as unavailable and does nothing.
- [x] A past day shows the four boxes (slept, naps, feeds, diapers) with the seeded counts as one accessible label; a past night shows slept, feeds, diapers, medicine. No tiles on a past ring.
- [x] Tapping an entry on a past ring still opens the editor in place of the boxes.
- [x] `Back to now` and the cap still work from a paged-to ring.
- [x] The old one-line past header assertions (`ring.spec.ts:101`, `recent-days.spec.ts:101,196`) are updated to the pager's title and date.
- [x] `pnpm check` and `pnpm e2e` green.

## Look review (manual: web and emulator-5554, never the developer's own phone)

- [x] Pager and boxes match the design's three phones (yesterday, last night with `Today ›`, night colours) in Classic.
- [x] Every theme by eye, day and night scheme: buttons, pill, boxes and the header pattern look right.
- [x] 412 and 320 px, and the largest font: long titles (`Wednesday night`) and values (`11h 40m`) fit or shrink cleanly; nothing overlaps the ring.
- [x] The dimmed `‹` reads as unavailable.
- [x] TalkBack (accessibility tree): title is a header, buttons read `Previous: …` / `Next: …`, boxes read as one label.

## Android (manual, emulator-5554)

- [x] Back on a paged-to ring goes to the live ring.
- [x] Idle 60 s on a past ring returns to now; stepping restarts the minute.
- [x] Leaving the app and coming back returns to now.

## Wrap-up

- [x] Tile handlers no longer reset `viewKey` / call `showLive` only for past-ring taps (or the reason they still must is noted in NOTES.md); `Header` has no past-window branch.
- [x] Typecheck, lint and all tests green after the removals.
- [x] `plans/README.md` lists this plan; the pointer is in `implan-ring-redesign/MAIN.md`; `MAIN.md` steps ticked.
