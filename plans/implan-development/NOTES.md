# Development guide: notes

## Decisions (2026-10-12)

- Ages birth to 3 years. Pages: Newborn, 1–11 months monthly, then 12, 15, 18, 21, 24, 30, 36 months (19 pages).
- Topics per page: Movement, Sounds and talking, Sleep, Feeding, Play and senses, Feelings and social, Health (check-ups and vaccines), Parents' corner.
- Text in English (the whole app is). One **Guidance** setting, app-wide and per device: `Sweden` (default) or `International`. Region changes only the parts that really differ: health checks and vaccines, feeding advice, who to contact, and the source list order. Room to add regions later (UK, US); not now.
- Uses the child's own Molly data: sleep (last days next to the typical range), a link to Measurements, Vitamin D status.
- Opens on the child's actual age. No due date / corrected age; the overview mentions that premature babies are often followed from their due date until about 2 years.
- No dedicated medical review step: the guide relies on its official sources. In exchange, disclaimers everywhere (see `MAIN.md`, "Disclaimers").
- Sleep compares the child's own logs with the range without any verdict.
- Past 36 months the guide shows that it ends at 3 years (no current page).
- How the content is split into writing steps is the implementer's call.
- We write our own summaries and link out. Never copy text, images or logos from any source.

## Licences (checked 2026-10-12)

| Source | Reuse | What it means for us |
| --- | --- | --- |
| 1177 ([terms](https://www.1177.se/om-1177/1177.se/om-1177.se/)) | Short quotes with credit and link; no images, no 1177 logo in apps; full text only via approved API | Own summaries, credit "1177.se" with link |
| Rikshandboken ([terms](https://www.rikshandboken-bhv.se/rhb/om-rikshandboken/anvanda-rikshandbokens-innehall/)) | Partial quotes, source "Rikshandboken-bhv.se"; no images | Facts (visit schedule) only, credited |
| Folkhälsomyndigheten ([terms](https://www.folkhalsomyndigheten.se/om-folkhalsomyndigheten/om-webbplatsen/)) | Quoting welcome with source; graphics not for others | Vaccine schedule as facts, credited |
| Livsmedelsverket ([terms](https://www.livsmedelsverket.se/om-oss/om-webbplatsen/far-man-anvanda-text-bild/)) | Spread unedited with source; reuser keeps it up to date | Own summaries, credited |
| CDC ([terms](https://www.cdc.gov/other/agencymaterials.html)) | Public domain; credit CDC, no logos, no implied endorsement | Most usable |
| NHS ([terms](https://www.nhs.uk/our-policies/terms-and-conditions/)) | Open Government Licence v3.0 with attribution | Most usable |
| WHO ([terms](https://www.who.int/about/policies/publishing/copyright)) | CC BY-NC-SA 3.0 IGO, no logo | Facts and links |
| AAP HealthyChildren | All rights reserved | Links only |

Facts (ages, schedules, ranges) aren't copyrighted; wording is.

## Source catalogue (all loaded 2026-10-12)

cdc.gov answers curl with 403; it loads in a browser. 1177 has **no English** versions of the development, sleep, food, teeth, colic or postnatal-depression pages (`/en/` gives 404): mark those links "In Swedish".

### Sweden

**1177** (Swedish unless EN given)
- Development 0–6 m: https://www.1177.se/barn--gravid/sa-vaxer-och-utvecklas-barn/barnets-utveckling/barnets-utveckling-0-6-manader/ (bands 0–2, 2–4, 4–6 m)
- Development 6–12 m: https://www.1177.se/barn--gravid/sa-vaxer-och-utvecklas-barn/barnets-utveckling/barnets-utveckling-6-12-manader/ (bands 6–8, 8–10, 10–12 m)
- Development 1–2 y: https://www.1177.se/barn--gravid/sa-vaxer-och-utvecklas-barn/barnets-utveckling/barnets-utveckling-1-2-ar/
- Development 2–3 y: https://www.1177.se/barn--gravid/sa-vaxer-och-utvecklas-barn/barnets-utveckling/barnets-utveckling-2-3-ar/
- Motor milestone table: https://www.1177.se/barn--gravid/sa-vaxer-och-utvecklas-barn/kroppen/tabell-nar-barnet-lar-sig-olika-rorelser/ — lifts head on tummy 1–5 m, grasps on purpose 2–6, rolls 3–8, sits with support 4–9, sits alone 5–10, crawls 5–12 (some skip it), pulls up and cruises 6–16, walks alone 8–18, pincer grip 9–12 m
- Play: https://www.1177.se/barn--gravid/sa-vaxer-och-utvecklas-barn/lek-och-sagor/sa-utvecklas-barn-av-att-leka/
- Sleep by age: https://www.1177.se/barn--gravid/att-ta-hand-om-barn/barns-somn/barns-somn-i-olika-aldrar/ — per 24 h: 0–3 m 14–18 h, 4–11 m 12–16, 1–2 y 10–16, 3–5 y 10–14
- Safe sleep: https://www.1177.se/barn--gravid/att-skota-ett-nyfott-barn/plotslig-spadbarnsdod--forebyggande-rad/ (EN: same path under `/en/`)
- Breastfeeding: https://www.1177.se/barn--gravid/att-skota-ett-nyfott-barn/amning-och-flaskmatning/amning/ (EN under `/en/`)
- Formula: https://www.1177.se/en/barn--gravid/att-skota-ett-nyfott-barn/amning-och-flaskmatning/brostmjolksersattning-och-tillskottsnaring/ (SV without `/en`)
- Food 0–1 y and vitamin D: https://www.1177.se/barn--gravid/att-ta-hand-om-barn/mat-och-dryck-for-barn/barnets-mat-upp-till-ett-ar/ — tiny tastes from 4 m at the earliest, taste portions from about 6 m, D-drops from about 1 week to 2 years, no honey or spinach under 1, no rice drinks under 6 y, milk as a drink from about 1 y
- Food 1–6 y: https://www.1177.se/barn--gravid/att-ta-hand-om-barn/mat-och-dryck-for-barn/barnets-mat-1-6-ar/
- Making taste portions: https://www.1177.se/barn--gravid/att-ta-hand-om-barn/mat-och-dryck-for-barn/laga-smakportioner-och-egen-barnmat/
- Tooth brushing: https://www.1177.se/barn--gravid/att-ta-hand-om-barn/praktiska-rad-i-vardagen/borsta-tander-pa-barn/ — from first tooth, twice a day, fluoride paste the size of the little-finger nail
- Teeth: https://www.1177.se/barn--gravid/sa-vaxer-och-utvecklas-barn/kroppen/tandernas-utveckling/ — first teeth usually 6–8 m; tell BVC if none by 1.5 y
- Crying: https://www.1177.se/barn--gravid/att-skota-ett-nyfott-barn/nar-sma-barn-skriker/
- Colic: https://www.1177.se/barn--gravid/vanliga-besvar-och-sjukdomar-hos-barn/vanliga-sjukdomar-och-besvar-hos-barn-0-1-ar/spadbarnskolik/
- Postnatal depression: https://www.1177.se/sjukdomar--besvar/psykiska-sjukdomar-och-besvar/depression/depression-i-samband-med-att-du-far-barn/ (EPDS at BVC 6–8 weeks; co-parents can be affected)
- After birth: https://www.1177.se/barn--gravid/forlossning/efter-forlossningen/sa-kan-du-ma-efter-forlossningen/
- Struggling as a parent: https://www.1177.se/barn--gravid/nar-familjelivet-ar-svart/att-ma-daligt-som-foralder/
- BVC: https://www.1177.se/barn--gravid/vard-och-stod-for-barn/besok-pa-barnavardscentralen-bvc/ (EN under `/en/`; EN gives +46 771-11 77 00 for foreign phones)
- Vaccination programme: https://www.1177.se/undersokning-behandling/vaccinationer/vaccinationsprogrammet-for-barn/ (EN under `/en/`)
- Fever in children (EN): https://www.1177.se/en/sjukdomar--besvar/infektioner/feber/feber-hos-barn/
- Calling 1177: https://www.1177.se/om-1177/nar-du-ringer-1177/
- Language development: no national page; only regional (https://www.1177.se/Vasterbotten/barn--gravid/sa-vaxer-och-utvecklas-barn/barnets-utveckling/sma-barns-sprakutveckling/). Use the development pages and Rikshandboken instead.

**Rikshandboken barnhälsovård** (Swedish, for professionals)
- Visit schedule PDF (approved 2026-05-13): https://www.rikshandboken-bhv.se/globalassets/rhb/media/barnhalsovardsprogrammet-oversikt.pdf
- Per visit: `https://www.rikshandboken-bhv.se/halsobesok/halsobesok-i-alla-aldrar/halsobesok-{0-till-6-dagar|1-till-3-veckor|4-veckor|6-veckor|8-veckor|3-manader|4-manader|5-manader|6-manader|8-manader|10-manader|12-manader|18-manader|25-ar|3-ar}/` (2.5 years is `25-ar`)
- Development follow-up: https://www.rikshandboken-bhv.se/halsobesok/utvecklingsuppfoljning/utvecklingsuppfoljning-i-olika-aldrar/ ; motor `.../utvecklingsuppfoljning/motorisk-utveckling/`, language `.../kommunikativ-utveckling/`, social-emotional `.../socioemotionell-utveckling/`, cognitive `.../kognitiv-utveckling/`
- EPDS: https://www.rikshandboken-bhv.se/foraldraskapsstod/individuellt-foraldraskapsstod/screening-med-epds/
- Teeth 0–6 y: https://www.rikshandboken-bhv.se/halsobesok/halsoundersokning/barnets-tander-0-6-ar/

BVC schedule (from the PDF):

| Age | Where | What |
| --- | --- | --- |
| 1 wk | Home visit | |
| 2 wk, 3 wk | BVC nurse | |
| 4 wk | BVC team (doctor) | Physical exam, development |
| 6 wk | BVC nurse | Development, EPDS, vaccine |
| 8 wk | BVC nurse | EPDS |
| 3 m | BVC nurse | Talk with the non-birth parent (at one of 3–5 m), vaccines |
| 4 m | BVC nurse | Talk with the non-birth parent (at one of 3–5 m) |
| 5 m | BVC nurse | Talk with the non-birth parent (at one of 3–5 m), vaccines |
| 6 m | BVC team | Physical exam, development |
| 8 m | Usually a home visit (some regions hold it at BVC) | Child safety |
| 10 m | BVC nurse | Development |
| 12 m | BVC team | Physical exam, BMI, vaccines |
| 18 m | BVC nurse | Development, BMI, vaccine |
| 2.5 y | BVC nurse | Development, BMI, language screening (at one of 2.5 / 3 y) |
| 3 y | BVC team | Development, BMI, language screening (at one of 2.5 / 3 y) |

EPDS at one of 6–8 wk; non-birth-parent talk at one of 3–5 m. Parent groups in the first year.

**Checked against the PDF 2026-10-12** (corrections to the first version of this table): the language screening is at *one of* the 2.5 / 3 year visits (no source for "some regions only at 3"); the 8-month visit carries no "not yet everywhere" in the PDF, and 1177's BVC page (updated 2025-06-12) says it is usually at home but some regions still hold it at BVC; the non-birth-parent talk is at one of 3, 4 or 5 m. 12 m and 18 m also show parents the growth curve. 1177: usually at least 13 visits in the first year, all free. The vaccine table below matches both Folkhälsomyndigheten sources (page 2026-04-16, PDF 2026-02); there is no whooping-cough dose at 18 m.

**Folkhälsomyndigheten** vaccination programme: https://www.folkhalsomyndigheten.se/vara-amnesomraden/vaccinationer/nationella-vaccinationsprogram/barnvaccinationsprogram/ (schedule PDF: https://www.folkhalsomyndigheten.se/globalassets/smittskydd-sjukdomar/vaccinationer/vaccinationsschema-for-barnvaccinationsprogrammet.pdf)

| Age | Vaccines |
| --- | --- |
| 6 wk | Rotavirus (drops) |
| 3 m | Rotavirus, 6-in-1 (diphtheria, tetanus, whooping cough, polio, Hib, hepatitis B), pneumococcal |
| 5 m | 6-in-1, pneumococcal (rotavirus 3rd dose only with 3-dose brands) |
| 12 m | 6-in-1, pneumococcal |
| 18 m | MMR (measles, mumps, rubella) |

Born before week 32: extra 6-in-1 dose from 6 weeks. BCG for risk groups only.

**Livsmedelsverket**
- Babies (SV): https://www.livsmedelsverket.se/matvanor-halsa--miljo/kostrad/barn-och-ungdomar/spadbarn/ ; (EN): https://www.livsmedelsverket.se/en/food-habits-health-and-environment/dietary-guidelines/babies-and-children/spadbarn/
- 1–2 y (SV): https://www.livsmedelsverket.se/matvanor-halsa--miljo/kostrad/barn-och-ungdomar/barn-1-2-ar/ ; (EN): https://www.livsmedelsverket.se/en/food-habits-health-and-environment/dietary-guidelines/babies-and-children/good-food-for-children---1-and-2-years/
- 2–17 y: https://www.livsmedelsverket.se/matvanor-halsa--miljo/kostrad/barn-och-ungdomar/barn-2-17-ar/
- Says: breast milk best for 6 m; D-drops daily first 2 years; tiny tastes from 4 m at the earliest; taste portions about 6 m, small meals about 8 m; iron-fortified porridge; introduce gluten, fish, egg, peanut in the first year; milk as a drink after 1 y; no honey under 1; wait with beetroot juice and lots of leafy greens until 1; no rice cakes / drinks (1177: under 6 y).

### International

**CDC Learn the Signs. Act Early.** `https://www.cdc.gov/act-early/milestones/{2-months|4-months|6-months|9-months|1-year|15-months|18-months|2-years|30-months|3-years}.html` (index `.../milestones/index.html`). Milestones = what 75% or more of children do by that age (Zubler et al., *Pediatrics* 2022;149(3):e2021052138). Areas: social/emotional, language, cognitive, movement.

**WHO**
- Motor windows: https://www.who.int/tools/child-growth-standards/standards/motor-development-milestones (1st–99th percentile, months; median): sitting alone 3.8–9.2 (5.9), standing with help 4.8–11.4 (7.4), hands-and-knees crawling 5.2–13.5 (8.3), walking with help 6.0–13.7 (9.0), standing alone 6.9–16.9 (10.8), walking alone 8.2–17.6 (12.0)
- Infant feeding: https://www.who.int/news-room/fact-sheets/detail/infant-and-young-child-feeding (exclusive breastfeeding 6 m, solids from 6 m, breastfeeding to 2 y or beyond); complementary feeding guideline 2023: https://www.who.int/publications/i/item/9789240081864
- Immunization summary: https://www.who.int/teams/immunization-vaccines-and-biologicals/policies/who-recommendations-for-routine-immunization---summary-tables ; children's table: https://www.who.int/publications/m/item/table-2-summary-of-who-position-papers-recommended-routine-immunizations-for-children

**NHS**
- Development: https://www.nhs.uk/baby/babys-development/
- Talking: https://www.nhs.uk/baby/babys-development/play-and-learning/help-your-baby-learn-to-talk/
- Reviews: https://www.nhs.uk/baby/babys-development/height-weight-and-reviews/baby-reviews/
- Teething: https://www.nhs.uk/baby/babys-development/teething/baby-teething-symptoms/
- Sleep: https://www.nhs.uk/baby/caring-for-a-newborn/helping-your-baby-to-sleep/
- SIDS: https://www.nhs.uk/baby/caring-for-a-newborn/sudden-infant-death-syndrome-sids/
- First solids: https://www.nhs.uk/baby/weaning-and-feeding/babys-first-solid-foods/
- Foods to avoid: https://www.nhs.uk/baby/weaning-and-feeding/foods-to-avoid-giving-babies-and-young-children/
- Vitamins: https://www.nhs.uk/baby/weaning-and-feeding/vitamins-for-children/
- Crying: https://www.nhs.uk/baby/caring-for-a-newborn/soothing-a-crying-baby/ ; colic: https://www.nhs.uk/conditions/colic/
- Postnatal depression: https://www.nhs.uk/mental-health/conditions/postnatal-depression/

**AAP HealthyChildren** (links only)
- Baby: https://www.healthychildren.org/English/ages-stages/baby/Pages/default.aspx ; toddler: https://www.healthychildren.org/English/ages-stages/toddler/Pages/default.aspx
- First 2 years: https://www.healthychildren.org/English/ages-stages/toddler/Pages/Milestones-During-The-First-2-Years.aspx
- Safe sleep: https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/A-Parents-Guide-to-Safe-Sleep.aspx
- Starting solids: https://www.healthychildren.org/English/ages-stages/baby/feeding-nutrition/Pages/Starting-Solid-Foods.aspx
- Many plausible milestone URLs there are 404; check each before use.

**Sleep totals**
- AASM consensus (Paruthi 2016): https://pmc.ncbi.nlm.nih.gov/articles/PMC4877308/ — 4–12 m 12–16 h incl. naps, 1–2 y 11–14, 3–5 y 10–13; no range under 4 m
- NSF: https://www.thensf.org/how-many-hours-of-sleep-do-you-really-need/ — 0–3 m 14–17 h

## Where Sweden and International differ

- Solids: Sweden tiny tastes from 4 m at the earliest, taste portions about 6 m; WHO / NHS around 6 m.
- Vitamin D: Sweden D-drops for all babies from about 1 week to 2 years; UK depends on breast or formula, then A, C, D 6 m–5 y. International pages say "ask your health service" plus WHO/NHS links.
- Vaccines: Sweden 6 wk, 3, 5, 12, 18 m (table above). International: no schedule, point to WHO tables and "your local programme".
- Check-ups: Sweden BVC table above. International: "Many countries offer check-ups around …" with CDC's checklist ages (2, 4, 6, 9, 12, 15, 18, 24, 30, 36 m).
- Sleep: 1177 ranges are wider (1–2 y 10–16 h) than AASM (11–14 h). Each region shows its own source's range.
- Foods to avoid: honey under 1 everywhere; Sweden adds rice drinks / cakes under 6 y and leafy greens until 1.
- Milestone framing: CDC = 75% by that age; WHO = 1st–99th windows; 1177 = broad ranges. Say which one a list uses.

## Research (2026-10-12)

`research/facts-*.md`: every source in the catalogue read page by page (by four research passes), facts paraphrased per age band with their URLs. The content is written from these files; check a claim there first, then on the page.

- cdc.gov answers scripts without a browser user agent with 403; with one it answers 200 (`pnpm check:sources` sends one), and WebFetch reads every checklist.
- No source gives nap counts by age under 18 months (1177's only number is "many go from two naps to one at about 1.5–2 years"; NHS, AASM, NSF give none), so the guide doesn't either.
- Sleep ranges (`typicalSleep`): Sweden 1177 (0–3 m 14–18 h, 4–11 m 12–16, 1–2 y 10–16 also for 24 and 30 m, 3 y 10–14). International AASM (4–11 m 12–16, 1–2 y 11–14, 3 y 10–13) with NSF's 14–17 h under 4 m, where AASM gives nothing. AASM's 4–12 m and 1–2 y bands meet at 12 m; the 12 m page (12–14 months) takes 1–2 y.
- Fever: 1177's Swedish page (any fever under 3 m, or under 6 m with no cold symptoms: seek care at once; 41 °C; first febrile fit 112; call before any medicine under 6 m) is stricter than its English page (same revision date), so Sweden follows the Swedish page. NHS: under 3 m 38 °C, 3–6 m 39 °C urgent; the fever page says 111, the under-5 urgent page 999 / A&E, so the guide just says "get urgent help" (the region contact line names the emergency number).
- Vitamin D: no Swedish page gives a dose, so none is stated. NHS doses are UK-only and not repeated for International.
- Postnatal depression: neither 1177 nor NHS gives a prevalence; the guide gives none.
- NHS pages past their review date (talk, colic, active) are still used where they agree with others.
- Where sources differ (room-sharing 3 vs 6 months, low-fat vs whole milk, colic drops, leaving a toddler to calm down) each region follows its own; the shared topics avoid the point or say what both agree on (stay close and calm).

## Decisions while building (2026-10-12)

- Topic bodies are shared between regions as `MAIN.md` says; only Health, Feeding and Sleep have region pairs (plus contacts, the sleep range, check-ups and Read more order). A test keeps the milestone topics and Parents' corner shared.
- A milestone list's framing note comes from its items' sources: 1177 / WHO items add "wide windows", CDC items add "about 3 in 4 children by around this age"; a list from both says both.
- "Missing one on its own is usually nothing to worry about" only goes under the milestone topics (Movement, Sounds and talking, Play, Feelings). Under Sleep, Feeding and Health it would be wrong (vitamin D, milk), so they say "Every child is different, so take this as a rough picture, not a checklist." Parents' corner says "Many parents feel some of this. You're not alone in it."
- "Lost skills they once had" is on every milestone topic's When to get help in both regions: only CDC says it outright, but nothing in the Swedish sources contradicts it.
- Read more on Sleep and Health includes the sources of the range and the check-up lines.
- Contacts: Sweden "BVC or call 1177 (+46 771-11 77 00 from a foreign phone)" and 112; for parents "BVC, your midwife or your health centre" (1177's postnatal pages). International "your child's doctor or nurse" / "your doctor, midwife or nurse" and "your local emergency number".

## Content review (2026-10-12)

An independent pass checked every item against `research/facts-*.md` (`research/review-2026-10-12.md`: 2 high, 10 medium, 12 low). All 24 are fixed:

- Signs the sources treat as emergencies now say so on the item ("call your emergency number now", "seek care straight away", "go to an emergency department straight away"); a test holds every item from `nhs-urgent`, `1177-breathing` or `1177-colic` to it.
- The rotavirus lines (6 weeks, 3 and 5 months) carry 1177's intussusception warning; the 3, 5 and 12 month lines say to call 1177 when unsure about a fever after vaccines.
- A CDC item on a page before its checklist's age says the age (`… (by 9 months)`), and the framing note then says "or by the age shown" (`resolveEntry`'s `page`).
- Sweden's Health gets 1177's 112 signs for breathing and colour (`1177-breathing`, 1177's page on children's breathing, updated 2024-11-13, Swedish only) and the colic page's emergency signs for babies. Known gap: no checked Swedish source names a rash that doesn't fade under a glass, so only International lists it.
- International sleep ranges are worded as the experts' recommendation ("Sleep experts recommend …"), Sweden's as 1177 describes it; under 4 months both add that sleep varies a lot.
- Words: US words for baby things, as the app's "diaper" (pacifier, crib, stroller, pants); British spelling otherwise, as the rest of the app (colour).

## Screens (2026-10-12)

- Routes `child/[id]/development/index.tsx` (`?page=`), `[topic].tsx` (`?page=`), `ages.tsx`; the static `development` folder wins over `[measure]` (checked on web). The strip changes the page with `setParams` (no history); All ages opens a page with `dismissTo` the overview, so Back still goes topic → page → child (Playwright).
- Links: expo-linking's web `openURL` replaces the page, so `features/development/open-link.web.ts` opens a new tab (`window.open`, `noopener`); native uses `Linking.openURL`.
- The child's own blocks: the sleep numbers and the Vitamin D line only on the child's own page (they are about today); check-ups, vaccines and the weight row on every Health page. The guide reads the child's sleeps and medication with its own query (`guide-entries`, 9 days), since the guide's child may not be the one on screen.
- Topic tones `topic-*` in every palette: the theme's `sleep-mark` lightness and chroma at one hue per topic, nudged to ≥ 3 : 1 on `surface` (contrast test). Past pages in All ages have muted titles instead of the design's 55 % fade, which would take their lines below 4.5 : 1.
- `copy.ts`: `development` (card label: Development / Level guide / Mission briefing / Season guide / `guide --age` / Field guide) and `allAges`. The guide's own text is plain in every theme.
- No `open_in_new` glyph in `symbols.ts`: Read more rows end with the chevron and say "Opens in the browser" as their hint.
- Web dev server (`expo start --web`) shows a NativeWind "Cannot manually set color scheme" overlay with a night look set; the production image doesn't. Screenshots and Playwright use the image.
- Headless Chromium screenshots draw open sheets without their surface (every sheet, not only the guide's note): look at sheets on the emulator.

## Look review (2026-10-12)

- Web (production image), Classic day and night and Arcade night: entry card, note, overview, topics, All ages match the design's layout. Emulator (`emulator-5554`, release build): Classic day and night, font scale 2.0 (largest): nothing clipped; the month strip scrolls and centres the page shown.
- Fixed on the way: the month strip's dot for the child's page sat over the label at large font sizes (now in the flow under it); `Text` in `components/ui.tsx` added `text-ink` over the measurement tones (`text-grow-ink`, `text-hot-ink`, `text-warm-…`), so those drew in ink: the Coming up card, the When to get help card, All ages' tags and the Measurements card's `+` now get their own colours.
- Accessibility labels (uiautomator dump): topic rows read name and line, strip tabs read the page and the child's age, Read more links read title, publisher and "in Swedish", with "Opens in the browser" as the hint.
- On the emulator Read more opens Chrome; Back returns to the topic at its scroll position (a source page with its own history may take one more Back, which is Chrome's).

## Open

- None. Every decision needed to start is in "Decisions" above.
