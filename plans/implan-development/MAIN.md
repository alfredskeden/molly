# Development guide

Context: the Molly system plan in [`../implan-molly/MAIN.md`](../implan-molly/MAIN.md). Facts, sources, licences and decisions in [`NOTES.md`](NOTES.md), Definition of Done in [`TEST_STRATEGY.md`](TEST_STRATEGY.md). Design source: `Molly Development.dc.html` (frames 1a–1d), a private design file; its copy is placeholder.

Each child's screen gets a **Development** card that opens an age guide on the child's current age: what many children do now, what to try together, when to get help, and where to read more. Parents can browse back and ahead from birth to 3 years. The goal is a calm, trustworthy place to look things up, with good sources one tap away.

All content is bundled in the app (no backend, works offline), written in our own words, and points to the official source behind every claim. It is a rough guide, never medical advice, and says so often.

## Ages and topics

**19 pages:** Newborn (0–4 weeks), 1 to 11 months (one per month), 12, 15, 18, 21, 24, 30 and 36 months. The child's page is the last one whose age they have reached (`ageInMonths` in `packages/core/src/sleep-guide.ts`; under 1 month is Newborn). Past 36 months there is no current page: the entry card says `The guide ends at 3 years` and the overview opens on 36 months without the "is now" line or a "Coming up" card; All ages tags no page as now.

**8 topics on every page**, in this order, each with its own colour bar (1b):

| Topic | What it covers |
| --- | --- |
| Movement | Head control, rolling, sitting, crawling, walking, hands |
| Sounds and talking | Listening, babbling, first words, sentences |
| Sleep | Typical total and naps, safe sleep, the child's own logs |
| Feeding | Milk, solids, drinks, foods to avoid, teeth |
| Play and senses | Grabbing, mouthing, toys, pretend play |
| Feelings and social | Smiling, attachment, stranger and separation anxiety, tantrums |
| Health | Check-ups and vaccines around this age, vitamin D, teeth, fever, Measurements |
| Parents' corner | Your own sleep and mood, baby blues vs depression, couple and co-parent, getting support |

## Guidance region

A new device setting `guideRegion: 'sweden' | 'international'` in `Settings` (`apps/molly/src/storage/types.ts`, parsed like the others), default `sweden`. Settings gets a `Guidance` row (`Sweden | International`); the guide's overview shows the region with a link to change it.

The body of every topic is shared. Region only changes:

- **Health:** Sweden lists the BVC visit and the vaccines around this age (schedule tables in `NOTES.md`); International says what many countries check around this age (CDC checklist ages) and points to the local programme and WHO.
- **Feeding:** solids start (Sweden: tiny tastes from 4 months at the earliest, taste portions about 6; International: around 6), vitamin D, foods to avoid.
- **Who to contact** in "When to get help": Sweden says BVC, 1177 (phone 1177, from abroad +46 771-11 77 00) and 112 for emergencies; International says "your child's doctor or nurse" and "your local emergency number".
- **Sleep range:** each region shows its own source's range (1177 vs AASM / NSF).
- **Read more:** the region's sources first, then the other region's.

Adding a region later (UK, US) means adding its variants and sources; the content model must allow that without touching screens.

## Content model

Content lives as typed data in `packages/core/src/development/` (pure, no I/O, testable). Suggested shape, adjust if a better one appears:

- `SOURCES`: every source once, by id: title, publisher, URL, language (`en | sv`), region. Screens label Swedish-only links "In Swedish".
- Topic entries cover an **age range of pages**, not one page each: e.g. one Parents' corner entry for Newborn–2 months. A page takes the entry covering its age. This keeps writing to what really changes and avoids 152 near-identical texts.
- An entry has: headline (1c title), one-line summary (1b row), intro paragraph, `now` (things many children do around this age), `tryTogether`, `getHelp` (signs to ask about), `sources` (ids). Region-specific parts are a `{ sweden, international }` pair on the fields that differ.
- Every `now` and `getHelp` item names the source ids it comes from. Milestone lists say which framing they use: CDC's are things about 3 in 4 children do by that age; WHO's and 1177's are wide windows. Use the wording "many children", never "should".
- Page-level text: page title, overview line (1b intro), "Coming up at …" teaser (1b bottom card), All ages one-liner (1d).

Pure functions in core, TDD'd: `guidePage(birthDate, now)`, the page list and neighbours (month strip, All ages with past / now / next), `pageContent(page, topic, region)` resolving entries and region variants, `sourcesFor(...)` in region order, the sleep comparison and the "around this age" BVC visit / vaccines picks.

## Using the child's own data

- **Sleep:** under the typical range, the child's last 7 full days from Molly's sleeps (the dashboard's `entries` query in `apps/molly/src/features/dashboard/queries.ts` already fetches sleeps `PREDICTION_DAYS` = 15 days back, and medication): average total per 24 h and naps per day, e.g. `Ella, last 7 days: 13 h 20 m a day, 3 naps`. Show side by side, **no verdict** (no "too little"). Hidden with fewer than 3 full days logged. Night / nap split by `isNightSleep` (`packages/core/src/nap.ts`).
- **Measurements:** the Health topic has a row to the child's weight screen (`child/[id]/weight`) with the latest value.
- **Vitamin D:** Sweden, under 2 years: the Health and Feeding topics say D-drops every day until 2 and show `Given today` / `Not logged today` using `vitaminDCycle` + `vitaminDStatus` (`packages/core/src/vitamin-d.ts`) over the same medication entries, as `src/widget/model.ts` does, so "today" means the baby's cycle like the reminder. International: the general line only, no status.

## The screens

Routes beside the measurements ones: `child/[id]/development/index.tsx` (overview of a page, `?page=` to browse), `.../[topic].tsx`, `.../ages.tsx`. The static `development/` folder wins over the `[measure]` segment in Expo Router; check it does. Works on web and Android.

- **Entry card (1a)** on the child screen, above Measurements: `Development · Month 5`, `What to expect at 5 months`, the page's one-liner, `Read this month`.
- **Overview (1b):** back to the child, `All ages` top right; horizontal month strip over all 19 pages, centred on the shown page, the child's page marked, swipe or tap to browse; `Ella is 5 months, 3 weeks` (only on the child's own page; elsewhere `Ella reaches this in 2 months` / `Ella was here in March`); big page title; intro line; the 8 topic rows (colour bar, name, summary); `Coming up at 6 months` card; disclaimer footer with region and `Change`.
- **Topic (1c):** back to the page, topic chip, headline, reading time, intro, `Many children around now` list, `Try together` card, `When to get help` card (hot colours, region contact), the topic's personal block (sleep / measurements / vitamin D), `Read more` list (publisher, title, `In Swedish` when so, opens the browser), disclaimer. Health shows its visit / vaccines block above the lists.
- **All ages (1d):** grouped First year / Second year / Third year, each page with its one-liner, `Ella now` and `Next` tags, past pages faded; tap opens that page.
- **First open:** a one-time note (per device) before the first overview: what the guide is, that it isn't medical advice, region choice. Stored in `Settings` like `notificationPrompted`.

Links open with `expo-linking` (`Linking.openURL`; a new tab on web). The web CSP limits `connect-src` only, so outbound links are fine.

Colours through semantic tokens (`grow-*`, `warm-*`, `hot-*` exist since Measurements); topic bar colours need tokens per theme, day and night (`src/theme/tokens.ts`), never raw colours. Card and screen titles per theme in `copy.ts` like `measure*`; content text stays plain in every theme. Use `Text` from `@/components/ui`.

## Disclaimers

Be generous with them. At least:

- Overview footer and every topic: "A rough guide, not medical advice. Every child develops at their own pace."
- Every "When to get help": ends with "If you're worried, contact [BVC / 1177 | your child's doctor or nurse]. In an emergency call [112 | your local emergency number]." Trust your instinct is fine to say.
- Every `now` list: "Many children do these around this age. Missing one on its own is usually nothing to worry about."
- The first-open note and the overview mention premature babies are often followed from their due date until about 2 years: ask BVC / your clinic.
- Sources: "Written by Molly from these sources. Check them for the full advice." No logos.

## Writing the content

You write it, from the sources in `NOTES.md` (add more as needed: official health bodies and peer-reviewed papers only, recorded in `NOTES.md` with the date checked). Rules:

- Own words. Never copy sentences, images or logos (licences in `NOTES.md`). Facts like ages and schedules are fine.
- Plain, warm, short, in the app's words (it says "diaper", not "nappy"). No "should", no comparisons between children, no fear.
- Every claim traceable to a source id on the entry. When sources disagree, follow the region's source and say ranges are wide.
- Parents' corner content is about the adult: sleep, mood, baby blues vs depression (both parents), relationship, asking for help, with region contacts.

## Steps

1. [x] **Core model and ages.** `packages/core/src/development/`: page list, `guidePage`, neighbours, All ages states, region type, content and source types, `pageContent` / `sourcesFor` resolution, and a structural test over the content (see `TEST_STRATEGY.md`). Seed one page fully (5 months) to prove the shape.
2. [x] **Region setting.** `guideRegion` and the first-open flag in `Settings`, parse tests, `Guidance` row in Settings.
3. [x] **Content: first half year.** Newborn to 6 months, all 8 topics, both regions, sources.
4. [x] **Content: 7–12 months.**
5. [x] **Content: 15–36 months.** (Steps 3–5 are a suggested split; regroup if the content falls more naturally another way, keeping each step reviewable on its own.)
6. [x] **Personal parts in core.** Sleep comparison, BVC visit / vaccines around an age, vitamin D line; TDD.
7. [x] **Screens.** Entry card, overview, topic, All ages, first-open note, tokens, `copy.ts` words.
8. [x] **Source link check.** `pnpm check:sources`: requests every URL in `SOURCES`, reports non-200 (cdc.gov blocks scripts; allow a browser user agent or list it as manual).
9. [x] **Look and content review.** Web and emulator, both themes, largest font; read-through of every page against `TEST_STRATEGY.md`. Add this plan to "Where things stand" in the root `CLAUDE.md`.

## Out of scope

Due date / corrected age, regions other than Sweden and International, Swedish-language text, milestone tick-off or tracking, push reminders for check-ups or vaccines, booked BVC appointments, reading or copying source pages at runtime, the widgets and notifications.
