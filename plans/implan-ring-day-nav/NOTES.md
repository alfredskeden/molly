# Notes

## Design source

- `Molly Ring Day Nav Board.dc.html` (three phones: yesterday mid-history, last night with Today next, last night in night colours) imports `Molly Ring v5.dc.html` (private design source; `support.js` is only the canvas runtime). Snapshot: [`design/Molly Ring v5.dc.html`](design/Molly%20Ring%20v5.dc.html), fetched 2026-10-22.
- v5 differs from the v4 snapshot (`plans/implan-ring-redesign/design/`) only in:
  - a pager header shown while `isPast` (template lines ~20–28), and the old header wrapped in `isLive`;
  - `showPastStats` boxes in place of the tiles on a past ring (`showTiles: pIdle && live`);
  - script: `pagePrev` / `pageNext` step `view ± 1`, `nextLive` when `view === -1`, `prevOp` 0.3 at the limit, `prevAria` / `nextAria` = `Previous: <title>` / `Next: <title>`, `pastStats`.
- `Back to now` is still in v5 on past rings. The cap still switches to the pair.
- Board text: "The buttons work in both screens" means both colour schemes (the third phone is night colours).

## Decisions (2026-10-22, from issue #3)

- **How far back:** `‹` keeps going until Baby Buddy has nothing older (like Recent days' `Load 3 more days`), not the design's two-week stop. It dims (opacity 0.3, still announced, does nothing) once nothing older exists.
- **Snap back:** keep the 60 s snap back to now and the return-from-background reset. Each step changes `viewKey`, which already restarts the minute (effect deps in `index.tsx`), so stepping through a week works.
- **Buttons only.** No swipe gestures.
- Past stat boxes and the hidden live header are part of the design and in scope, though the issue names only the buttons.

## Facts from the code

- Dashboard window state: `viewKey` (`<kind>-<start ms>`, null = live) and `windows` (live first, then `windowsBefore(everything, …, daysBack, …)`, newest first) in `apps/molly/src/app/(main)/index.tsx` (~255, ~494). `viewIndex` is the shown window's index; the cap uses `pairOf(viewIndex)`.
- Older data: `usePastEntries` covers `PAST_DAYS = 2` midnights; beyond that `useDays(older)` (`features/days/queries.ts`, a week per page, `fetchNextPage`) is enabled. The dashboard only ever loads page 0 today. Recent days decides "older may exist" as "the oldest page Baby Buddy sent had any entry" (`recent-days.tsx`, `olderMayExist`).
- `wantAt` (`index.tsx` ~258) waits for a window not yet loaded; `time: null` means "the window before live" (the cap's first tap).
- Titles and dates: `windowTitle(window, live)` and `windowDate(window)` in `packages/core/src/ring.ts` (`Yesterday`, `Last night`, `Tuesday night`, `Thu 24 Sep`). Same words as the design's `titleOf2`.
- Past centre text: `pastCentre` (`index.tsx` ~209) from `totalsBetween` (`packages/core/src/totals.ts`, has `sleepMs`, `feedings`, `changes`, `medications`) plus sleeps started in the window.
- Buttons: `IconButton` (`components/ui.tsx`, 48×48, themed) takes an `OutlinedSymbol`; `chevron_right` is used elsewhere as a `Glyph`, check `chevron_left` is in the symbol set. `InkButton` is the ink pill.
- E2E asserting the old one-line header on past windows: `e2e/tests/ring.spec.ts:101`, `e2e/tests/recent-days.spec.ts:101,196`.

## Cleanup sweep (planning)

- **Remove:** the past-window branch of the header's date line: `Header` only ever shows the live window now. Tile handlers' `setViewKey(null)` / `showLive()` that exist only because a tile could be tapped on a past ring (`index.tsx` ~782 sleep, ~794 feed, diaper and med alike). Check each caller first: `start()` is also called from the likely panel (live only) and maybe Add entry (header hidden on past, but verify no other route in).
- **Refactor first:** the pager rule as a pure, unit-tested function; `wantAt` widened from "before live" to "before a given window".
- **Docs:** `plans/README.md` row. `plans/implan-ring-redesign/MAIN.md` describes the header as always name + three buttons: add a one-line pointer to this plan, not a rewrite.
- Nothing else found: no flags, storage keys, deps or copy tied to the old header.

## Open

(none)
