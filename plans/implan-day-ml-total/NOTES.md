# Notes

## Decisions (2026-10-14)

- One ml total per Recent days **card** (the night that ended that morning plus the day after), not per half and not per calendar day. The `Tonight` card totals the live night so far.
- Only Recent days shows it. Not the Today sheet, not the feed tile, not widgets or notifications. (Later the Today sheet got the top card's line: [`implan-today-sheet-card`](../implan-today-sheet-card/MAIN.md).)
- Counted: feedings with method `bottle`, `left breast`, `right breast`, `both breasts`. Left out: `parent fed`, `self fed` (solids aren't drunk).
- A bottle counts its saved `amount`.
- A breastfeed counts the child's default bottle amount (the most the baby likely drinks). A bottle saved without `amount` counts the same way. Either one makes the total an estimate: `≈`, spoken "about".
- When the child has no default bottle amount, those feeds add no ml; the line says how many there were instead (`360 ml + 3 breastfeeds`).
- Wording and placement: a line under the two rings; `+ 3 breastfeeds` when all unmeasured feeds are breastfeeds, `+ 4 feeds without ml` when bottles without ml are among them.

## Facts from the code

- Baby Buddy feeding entries carry `amount: number | null` (`packages/api/src/types.ts`). Molly saves breastfeeds with no amount and bottles with the default (`feedingForStop` in `packages/core/src/feeding.ts`).
- The default is per device and per child: `childPrefs(...).bottle.amount`, optional (`BottleDefaults` in `feeding.ts`). Clearing it on the child screen (minus to 0) leaves `{ type }` with no amount. Built-in default `DEFAULT_BOTTLE` is 120 ml, but a cleared default stays cleared.
- The estimate uses today's default, not the default at the time of the feed (Molly never stored it). Two parents' phones may show different estimates if their defaults differ.
- Window membership already counts feedings by their start (`totalsBetween` in `packages/core/src/totals.ts`); the ml total follows the same rule.
- Recent days screen: `src/app/(main)/recent-days.tsx` (`DayCard`, `Slot`), cards from `recentDays` in `features/days/recent.ts`.

## Done (2026-10-14)

- Core: `drank` / `drankText` in `packages/core/src/drank.ts`, 21 tests in `drank.test.ts`. `drankText` gives null when `ml` is 0 and nothing is unmeasured, so a card whose only bottles were saved as 0 ml shows no line.
- Screen: `drankLine` in `recent-days.tsx`, the default passed down from the screen's `useChildPrefs()` (one hook, not one per card). The line is a `Text` with `accessibilityLabel` = the spoken words (an `aria-label` on web).
- Playwright: the spec seeds its own feeds through the admin API (`post` in `recent-days.spec.ts`), like every other Recent days test; `e2e/seed.py` only makes users and the child, so it needed no change. The seeded parent has no stored bottle, so the default is the built-in 120 ml.
- `pnpm check` green; `pnpm e2e` 191/192 on the full run, the one failure (`add-entry.spec.ts` 1j, a sleep timer backdated) passed on its own rerun: flaky, not touched here.
- Web look (412 and 320 px, Classic and Ribbon day / night, Life Sim night with no default bottle): the line sits centred under both rings without moving them; `150 ml + 3 feeds without ml` fits on one line at 320 px.
- Emulator (`emulator-5554`, release build of `7f49e34`, Life Sim night): the line sits centred under the rings, the card with no feeds has none. At font scale 2.0 `≈ 510 ml` and, with the default bottle cleared, `150 ml + 3 feeds without ml` still fit on one line (just; a longer one wraps centred). `uiautomator dump`: the line's description is `about 270 millilitres` / `150 millilitres plus 3 feeds without millilitres`. Emulator left at font scale 1.0, bottle 120 ml. Classic was checked on web only, not on the emulator.

## Open

- None.
