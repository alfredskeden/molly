# Daily ml total on Recent days

## Outcome

Each Recent days card shows roughly how much the baby drank over that card: the night that ended that morning plus the day after it. Bottles add what was saved; breastfeeds add the child's default bottle amount, as the most the baby probably drank.

```
┌ Yesterday ─────────── Tue 13 Oct ┐
│   (night ring)      (day ring)   │
│     Night             Day        │
│            ≈ 840 ml              │
└──────────────────────────────────┘
```

## The rule

A pure function in `packages/core` (new `packages/core/src/drank.ts`, exported from `index.ts`), no I/O:

`drank(feedings, from, to, defaultMl) → { ml, estimated, unmeasured, unmeasuredBreast }`

- Feedings count when they **start** in `[from, to)`, the same rule as `totalsBetween`.
- Only methods `bottle`, `left breast`, `right breast`, `both breasts`. `parent fed` / `self fed` are skipped.
- Bottle with `amount` → that amount. Not an estimate.
- Breastfeed, or bottle with `amount` null → `defaultMl` when it's set, and `estimated` becomes true.
- When `defaultMl` is undefined those feeds add nothing and are counted in `unmeasured` (and `unmeasuredBreast` when they're breastfeeds), so the line can name them.

The words come from a second pure function (same file): `drankText(result) → { text, spoken } | null`

| Case | text | spoken |
| --- | --- | --- |
| no counted feeds | `null` (no line) | |
| bottles with ml only | `640 ml` | `640 millilitres` |
| any estimate | `≈ 840 ml` | `about 840 millilitres` |
| no default, some breastfeeds only | `360 ml + 3 breastfeeds` | `360 millilitres plus 3 breastfeeds` |
| no default, bottles without ml among them | `360 ml + 4 feeds without ml` | `… plus 4 feeds without millilitres` |
| no default, nothing measured | `3 breastfeeds` / `4 feeds without ml` | |

Use `counted` from `format.ts` for the plurals.

## Where it shows

`src/app/(main)/recent-days.tsx`, `DayCard`: one line under the two rings, centred, `text-label`, muted ink. Its span is the card's windows: from the night's `start` (or the day's when the card has no night) to the day's `end` (or the night's when there's no day), capped at the fetch time `now` like `summary` already does. The default is `useChildPrefs().bottle.amount`. Add it to the card's accessible text (the line is plain text, not a button; the rings stay the tap targets).

Plain words in every theme: no `copy.ts` entry unless a theme already renames Recent days' labels (check `useCopy()` before adding one).

## Decisions and why

- **Per card, not per half or calendar day**: a card is "one morning to the next", which is how a parent thinks of a day's drinking.
- **Default bottle as the breastfeed estimate**: Baby Buddy has no ml for breastfeeds; the bottle default is the parent's own idea of a full feed, so it's an upper guess. Always marked `≈` so it never reads as measured.
- **Today's default, on this device**: Molly never stored the default a feed was saved with. Accept that changing the default changes past estimates.
- **No default → count, don't guess**: no hidden 120 ml fallback; the parent sees how many feeds weren't measured.
- **Recent days only**: not on the Today sheet, feed tile, widgets or notifications.

## Boundaries

- Nothing is written to Baby Buddy; no new query. The entries Recent days already fetches (`useDays`) include feedings with `amount`.
- No change to how feeds are saved, to `totalsBetween`, or to the mini ring.
- No unit setting (always ml).

## Steps

1. [x] `drank` and `drankText` in core, TDD (see `TEST_STRATEGY.md`).
2. [x] The line on each Recent days card, with its spoken text; Playwright case in `e2e/tests/recent-days.spec.ts` (seed a bottle with ml and a breastfeed in one card). Make sure `e2e/seed.py` gives a feeding with an amount in a visible card.
3. [x] Look review (web and emulator-5554, both a plain and a decorated theme, largest font), then update the plan list in `CLAUDE.md`.

## Assumptions

- Breast milk bottles, formula and fortified breast milk all count the same: method `bottle` is what matters, not `type`.
- A feeding still running is a timer, not an entry, so it isn't counted until it's stopped.
