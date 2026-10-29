# Stepping between rings

GitHub issue #3. Decisions and code facts are in [`NOTES.md`](NOTES.md), the picture in [`MENTAL_MODEL.md`](MENTAL_MODEL.md), the Definition of Done in [`TEST_STRATEGY.md`](TEST_STRATEGY.md). System context: [`../implan-molly/MAIN.md`](../implan-molly/MAIN.md) and the root `CLAUDE.md`.

## Outcome

Once the dashboard shows a past ring (from Recent days, a Today sheet entry or the sun/moon cap), the header turns into a pager. `‹` and `›` step to the previous and next ring, one window at a time, so day and night alternate. On the newest past ring, `›` is an ink pill naming the live ring (`Today ›` or `Tonight ›`) and returns to it. Under a past ring, four stat boxes take the tiles' place. The live dashboard doesn't change.

Before, a past ring could only switch to its pair (the cap) or go back to now; to see the day before, the parent had to go back to Recent days and tap another ring.

```
 past ring                                     live ring (unchanged)
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│ [‹]        Yesterday         [›]     │     │ Molly                  [⟲] [+] [⚙]   │
│          ☀ Wed 21 Oct                │     │ Today · Thu 22 Oct                   │
│                                      │     │                                      │
│             ( ring )                 │     │             ( ring )                 │
│                                      │     │                                      │
│           [↶ Back to now]            │     │  window row                          │
│ [☾ 2h 10m][☁ 3][🍼 7][🚼 5]           │     │  [Sleep] [Feed] / [Diaper] [Medicine] │
│  slept     naps feeds diapers        │     │                                      │
└──────────────────────────────────────┘     └──────────────────────────────────────┘
 newest past ring: [›] becomes the ink pill [Today ›] (or [Tonight ›])
```

## Design source

`Molly Ring Day Nav Board.dc.html` (three phones) importing `Molly Ring v5.dc.html`, from the private design source. Snapshot in [`design/Molly Ring v5.dc.html`](design/Molly%20Ring%20v5.dc.html); NOTES.md lists exactly what changed since v4. Read the template (sizes, colours) and the script (`pagePrev`, `pageNext`, `pastStats`) before building. Match it as closely as React Native allows; the other themes are a judgment call, as in [`implan-ring-redesign`](../implan-ring-redesign/MAIN.md).

## The rules

**Pager header** (past ring only; the live header with name and three buttons shows only on the live ring):

- Three columns, centred title: left `‹` (48×48, surface, line border, radius 14, `chevron_left` 28); centre the window title (22/900) over the kind's icon (`wb_sunny` in `med-ink` on a day, `bedtime` in `sleep-ink` on a night, filled, 16) and the date (14/700 muted); right `›` like `‹`, or on the newest past ring the ink pill (`height 48`, radius 14, live title 15/900, `chevron_right` 26).
- Title and date: `windowTitle(window, live)` and `windowDate(window)` (core `ring.ts`), the words the design uses.
- `‹` shows the window before (`windows[viewIndex + 1]`), `›` the one after (`viewIndex - 1`; index 0 is live, so the pill calls `showLive`).
- `‹` is enabled while an older window can exist: some loaded entry starts before the shown window, or the oldest week Baby Buddy sent had any entry (Recent days' `olderMayExist` rule). Otherwise it dims to 0.3, is announced as unavailable, and does nothing.
- If the window before isn't loaded yet, `‹` asks for it and steps once it arrives: the dashboard's `wantAt` grows from "the window before live" to "the window before this one", and fetches the next `useDays` week when the loaded weeks don't reach it. No spinner unless the wait passes the usual tap-feedback threshold (`implan-tap-feedback`).
- Spoken: `Previous: <title>` / `Next: <title>` (the pill: `Next: Today`). The title is a header.
- Every step closes the editor, likely panel and pickers, as the cap does. The 60 s snap back to now restarts with each step (it already does, `viewKey` changes) and the app returning from the background still goes to now (replaced on Android by [`implan-live-on-return`](../implan-live-on-return/MAIN.md): only after a minute away, from any screen). Android back on a past ring still goes to now, not one step back.

**Past stat boxes** (in place of the tiles while a past ring is idle; the editor still takes their place when an entry is tapped):

| Ring | Boxes |
| --- | --- |
| Day | slept · naps · feeds · diapers |
| Night | slept · feeds · diapers · medicine |

- Surface card with line border, radius 16, padding 10/10/12; kind icon (filled, 20, kind ink); value 19/900 tabular; label 12/700 muted, singular for 1 (`nap`, `feed`, `diaper`). Four equal columns, gap 8.
- Counts over the window: `totalsBetween(entries, start, end)` for slept, feeds, diapers and medicine; naps are sleeps that started in the window. One pure function feeds both these boxes and the existing past centre text (`pastCentre` in `index.tsx`), so they can't disagree.
- One accessible group: `Yesterday: 2h 10m slept, 3 naps, 7 feeds, 5 diapers`.

`Back to now` stays above the boxes, as in the design. The cap keeps switching to the pair.

## Where it lives

- `packages/core/src/ring.ts` (+ test): `windowStats(window, entries)` (the counts above, used by `pastCentre` and the boxes) and the pager rule, e.g. `ringPager({ windows, index, olderMayExist, live })` → previous and next (title, spoken label, enabled, whether next is live). Exact shape is yours; keep it pure.
- `apps/molly/src/features/dashboard/`: a `Pager` header component next to `Header.tsx`, and a `PastStats` component. `Header` loses its past-window date line (it only renders on the live ring).
- `apps/molly/src/app/(main)/index.tsx`: which header and which panel to render, `‹`/`›` handlers, the widened `wantAt`, fetching an older `useDays` page.
- Themes: use the themed `IconButton` / `InkButton` / card tokens so all six themes dress the pager and boxes; the header pattern (`HeaderArt`) stays behind the pager as it does behind the header.

## Steps

1. [x] **Core rules (TDD, `packages/core`).** `windowStats` and the pager rule with unit tests (see TEST_STRATEGY.md). Move `pastCentre` onto `windowStats`.
2. [x] **Loading older windows.** Widen `wantAt` to "the window before a given one"; when the loaded weeks don't reach it and older may exist, `fetchNextPage` and step once it's there. Give up quietly (and dim `‹`) when Baby Buddy has nothing older.
3. [x] **Pager header.** `Pager` component; render it instead of `Header` on a past ring. Remove `Header`'s past-window date line (`dateLine` becomes the live window's). Add `chevron_left` to the symbol set if missing.
4. [x] **Past stat boxes.** `PastStats` in place of the tiles on an idle past ring. Then remove the tile handlers' `setViewKey(null)` / `showLive()` that only existed for taps on a past ring (check each caller first, NOTES.md "Cleanup sweep").
5. [x] **E2E.** Update the specs that read the old one-line past header (`ring.spec.ts:101`, `recent-days.spec.ts:101,196`) and add the pager scenarios from TEST_STRATEGY.md.
6. [x] **Look review.** Web and emulator-5554, every theme by eye in day and night, 412 and 320 px, largest font.
7. [x] **Docs.** `plans/README.md` row; a one-line pointer in `plans/implan-ring-redesign/MAIN.md`'s Dashboard header bullet; facts found along the way in NOTES.md.

## Boundaries

- The live dashboard, the cap's pair switch, Recent days, the Today sheet, widgets and notifications don't change.
- No swipe gestures. No new Baby Buddy endpoints: older weeks come from the existing `useDays` query.
- Predictions (ghosts, window row) stay live-only.

## Assumptions

- `windowsBefore` gives every window back to the oldest loaded entry, so stepping visits days and nights with nothing logged too (they show an empty ring and zeros). Check this holds; if empty stretches appear before the first-ever entry, the `‹` rule above stops there.
- The dashboard's 400 px ring area has room for the pager header (min height 62) as it had for the old header.
