# Development guide: Definition of Done

Done when every item below is true.

Method, per the root `CLAUDE.md`:
- **Pure logic and content:** unit TDD in `packages/core` (Vitest, Given / When / Then, zero → one → many, then boundaries and errors).
- **Flows:** Playwright against the web image.
- **Android:** the emulator (`emulator-5554`).
- **Looks:** manual review.
- **Source links:** `pnpm check:sources`.

## Nothing regresses

- [x] `pnpm check` is green, and every existing Playwright spec passes.
- [x] The child screen's other cards (Measurements, shown, colour, sex, day and night, bottle, Vitamin D) work as before. The measurement screens still open.
- [x] Settings parses old saved settings without `guideRegion` as `sweden`, with the first-open note not yet seen.

## Ages (unit)

- [x] There are exactly 19 pages, in order: Newborn, 1–11 m, 12, 15, 18, 21, 24, 30, 36 m.
- [x] The child's page is the last page reached:
  - born today → Newborn
  - 3 weeks → Newborn
  - exactly 1 month (including month-end birthdays, as `ageInMonths`) → 1 m
  - 13 months → 12 m
  - 23 months → 21 m
  - 35 months → 30 m
  - 36 months → 36 m
  - 37 months → no page ("ends at 3 years")
- [x] Neighbours and the All ages tags (past, now, next) are right at the first page, a middle page, the last page, and past 3 years (nothing is "now").
- [x] The words for where the child stands work in both directions:
  - on their own page: `5 months, 3 weeks`
  - ahead of a page: `reaches this in 2 months`
  - past a page: `was here in March`

## Content is complete (unit)

- [x] Every page has all 8 topics in both regions, and each topic has exactly one entry covering it.
- [x] Every entry has a headline, summary, intro, at least one `now` item, at least one `tryTogether` item, at least one `getHelp` item, and at least one source. Every `now` and `getHelp` item names a source.
- [x] Every page has a title, overview line, All ages one-liner and, except the last, a "Coming up" teaser.
- [x] Every source id used exists in `SOURCES`, and every source in `SOURCES` is used.
- [x] Every source URL is https on an allowed domain: 1177.se, rikshandboken-bhv.se, folkhalsomyndigheten.se, livsmedelsverket.se, who.int, cdc.gov, nhs.uk, healthychildren.org, pmc.ncbi.nlm.nih.gov, thensf.org, plus any added in `NOTES.md`.
- [x] Every Swedish-language source is marked `sv`.
- [x] The text never says "should" or "normal child", and has no exclamation marks.
- [x] Every topic in both regions resolves to the disclaimer and the right region contacts:
  - Sweden: BVC, 1177, 112
  - International: doctor or nurse, local emergency number
- [x] `Read more` lists the region's own sources first.

## Content is correct (unit spot checks plus a read-through)

- [x] The Sweden vaccine lines match the Folkhälsomyndigheten table in `NOTES.md` at 6 wk, 3, 5, 12 and 18 m. Pages with no vaccine due say none.
- [x] The Sweden visit lines match the BVC table in `NOTES.md` (including the 8 m visit, usually at home with some regions holding it at BVC, and the language check at 2.5 or 3 y).
- [x] Feeding by region:
  - Sweden: tiny tastes from 4 m at the earliest, taste portions about 6 m, D-drops to 2 y
  - International: solids around 6 m
  - both: no honey under 1
  - Sweden also: no rice drinks under 6
- [x] The sleep ranges per page match the region's source (1177 for Sweden, AASM / NSF for International).
- [x] Motor milestones fall inside the WHO or 1177 windows, or match CDC's checklist age for the page they're on.
- [x] A read-through of every page against its sources (recorded in `NOTES.md` with the date) finds no claim without a source, no copied sentences, and no advice that contradicts the region's source.

## Personal parts (unit)

- [x] Sleep comparison:
  - fewer than 3 full days gives nothing
  - with 3 or more days: average per 24 h and naps per day, with nights split by `isNightSleep`
  - a sleep across midnight is split between days
  - a running sleep doesn't count
  - the words never judge
- [x] Vitamin D line:
  - Sweden under 2 y: `Given today` or `Not logged today` for the baby's Vitamin D cycle (`vitaminDCycle` + `vitaminDStatus`)
  - Sweden from 2 y: no status
  - International: the general line only
- [x] The Health topic's weight row shows the latest weight, or `None yet`.

## Flows (Playwright, web)

- [x] The child screen shows the Development card for the child's page. After 3 years it says the guide ends at 3.
- [x] Opening the guide for the first time shows the note once. It doesn't show again after reload.
- [x] The overview works:
  - the month strip moves between pages
  - All ages opens a page
  - each topic row opens its topic
  - Back returns step by step to the child
- [x] Changing Guidance in Settings changes the Health contacts and the order of the Read more list.
- [x] A Read more link opens the source in a new tab.
- [x] The Sleep topic shows the child's numbers when the test Baby Buddy has 3 or more days of sleeps.

## Source links

- [x] `pnpm check:sources` reports every URL in `SOURCES` as reachable. cdc.gov is either checked with a browser user agent or listed as checked by hand with a date.

## Looks and Android (manual)

- [x] Web and emulator, Classic day and night plus one other theme, largest font:
  - the entry card, overview, topic and All ages screens match the design's layout
  - nothing is clipped
  - the month strip is usable
  - colours come only from tokens
- [x] Screen reader: topic rows, month strip pages and links have plain labels. `In Swedish` is spoken.
- [x] On the emulator, Read more opens the browser, and Back returns to the topic.
