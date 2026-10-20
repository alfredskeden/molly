# Measurements

Context: the Molly system plan in [`../implan-molly/MAIN.md`](../implan-molly/MAIN.md). Facts and decisions in [`NOTES.md`](NOTES.md), Definition of Done in [`TEST_STRATEGY.md`](TEST_STRATEGY.md). Design source: `Molly Measurements.dc.html` (frames 1a, 1c–1g, 2a–2c; 2a/2b replace 1b).

The child screen (`src/app/(main)/child/[id].tsx`) gains a **Measurements** card: weight, height, head circumference, temperature and BMI, each with its latest value, when it was taken, and a `+` that opens the add sheet. Tapping a row opens that measurement's own screen. Each measurement has its own picture rather than one shared chart: a weight curve inside WHO ranges, a doorframe for height, growth rings for head, zones and fever episodes for temperature, bars for BMI.

All five are Baby Buddy models with REST endpoints, so both parents see the same data. Works on web and Android. Nothing outside the child screen changes.

## Data

| Measurement | Baby Buddy endpoint | Value as stored | Shown | Step in the add sheet | When |
| --- | --- | --- | --- | --- | --- |
| Weight | `weight/` | grams (`7050`) | `7 050 g` | 10 g | date |
| Height | `height/` | cm | `65.5 cm` | 0.5 cm | date |
| Head circumference | `head-circumference/` | cm | `42.3 cm` | 0.5 cm | date |
| Temperature | `temperature/` | °C | `36.9 °C` | 0.1 °C | date and time |
| BMI | `bmi/` | number | `16.3` | 0.1 | date |

Field names are expected, not yet confirmed: step 1 checks them against the test Baby Buddy and records them in `NOTES.md` (and the Baby Buddy facts in `implan-molly/NOTES.md`). Weight in grams is decided; never convert to kg on write.

Sex (`girl | boy`, unset by default) is a new per-child preference in `ChildPrefs` (`packages/core/src/children.ts`), per device like the nap window. It only picks the WHO table.

## The screens

**Measurements card (1a).** Under the name, above Day and night. One row per measurement: name, `23 Sep · 5 days ago` (temperature: `Today 07:40`), value, and a `+` button. A measurement with no entries shows `None yet` and still has `+`. The row and the `+` are separate touch targets.

**Measurement screen.** Shared frame: back to the child, `+ Weight` (etc.) top right, label, big value with unit, a muted line under it, the picture, then the latest entries (date, value, change from the one before). Route is up to you; `child/[id]/[measure]` (moving `[id].tsx` to `[id]/index.tsx`) fits Expo Router.

**Weight (2a, 2b).**
- Line under the value: date, gain since the previous entry and over how long, and a rate whose unit follows age: per day under 3 months (`+470 g in 16 days · about 29 g a day`), per week from 3 to 12 months (`about 110 g a week`), per month after (`about 180 g a month`).
- Chart: the child's weights as a line with dots over WHO weight-for-age bands for the child's sex: 3rd–97th (faint), 15th–85th, dashed 50th; band labels `97th`, `50th`, `3rd` at the right edge. No sex set: the line alone, and the footer says to set it on the child screen.
- X axis by age: under 3 months, birth to 12 weeks with ticks every 4 weeks; 3–12 months, birth to now with month ticks; over 12 months, a `Last year | Since birth` switch (Last year first). Y range fits the bands and points shown.
- Centile chip (sex set only): which band the latest weight is in, compared with birth or the past year (`Just above the 50th centile, as at birth`, `Close to the 50th centile all year`). Exact words are a wording review item; the rule goes in core.
- Birth-dip card (2a), shown under 3 months when there's a weight on the birth date and a lower one in the first two weeks: `Lowest 3 160 g on day 3, 7% under birth weight. Back to birth weight on day 12.` (or `Not back to birth weight yet`).
- List: newest four, change from the one before with the gap (`+470 g · 16d`, `+360 g · 2m`).
- Footer: `WHO girls` / `WHO boys`, plus `gain shown per month after the first year` when that applies.

**Height (1c, 2c).** Doorframe: a ruler of cm ticks (long every 5) on the left, a mark per entry at its height, older marks fainter. Under 1 year all marks since birth, labelled by date (`Birth`, `21 May`); over 1 year the last year's marks, labelled by age (`1 year`, `15 months`). Line under the value: `15.5 cm taller than at birth` under 1 year, `+2.6 cm since May` after.

**Head circumference (1d).** Concentric rings, one per entry, sized by value, older fainter, latest thicker; birth value in the centre. Line: `+0.7 cm since August`. List of the newest three with change.

**Temperature (1e).** A zone bar (Low, Normal, Raised, Fever over 35.5–40 °C) with the latest reading as a big marker and the four before as fading pins. Line: `Today 07:40 · Normal`. A fever card for the most recent fever episode in the last 30 days: readings ≥ 38.0 grouped from the first one until the first Normal reading after (`Fever 26 – 27 Sep` / `Peak 38.4 °C · back to normal after 26h · 5 readings`, or `still going`). List: date and time, value, zone chip.

**BMI (1f).** Big value, a `weight ÷ height²` card when there is a weight and a height on the latest BMI's date, bars for the newest six BMIs (latest darker), and the hint that adding BMI pre-fills from the same day's weight and height.

**Add sheet (1g).** One sheet for all five, opened from any `+`: title (`Weight entry`), `Last 7 000 g · 23 Sep`, − / value / + stepper starting at the last value (BMI: computed from today's weight and height when both exist, else the last BMI), tap the value to type it, `Today | Yesterday | Pick date`, temperature also a time (default now), Notes, `Save weight`. Built like the other sheets (`features/add/`, `BehindSheet`, keyboard follows); saving uses the optimistic pattern in `features/dashboard/optimistic.ts`. A date picker is new to the app: use the native one on Android and `<input type="date">` on web, or a small in-app picker if that's simpler; record the choice in `NOTES.md`.

## Where the logic lives

Pure rules in `packages/core` (new files, e.g. `growth.ts`, `who-weight.ts`, `temperature.ts`, `measurements.ts`), TDD'd: WHO bands at an age, the band a weight falls in and the chip, gain and rate words, birth dip, axis choice and ticks, height labels and range, temperature zone and episodes, BMI from weight and height, the add sheet's step / prefill / typed value, the row's `when` words. Screens only lay out what core returns. `packages/api` gets typed list and create calls, tested against the real container like the others.

**WHO data.** Weight-for-age LMS tables for boys and girls, 0–5 years, from the WHO Child Growth Standards (`who.int/tools/child-growth-standards/standards/weight-for-age`; the expanded daily tables give smooth curves for newborns). Commit them as typed data in core with the source and date in a comment. Centile value from LMS: `M · (1 + L·S·z)^(1/L)`, with z for 3rd/15th/50th/85th/97th = −1.881, −1.036, 0, 1.036, 1.881. Values are kg; convert to grams in core.

**Themes.** Colours through semantic tokens; add tokens for the design's growth / warm / hot / cool colours in `src/theme/tokens.ts` for every theme, day and night. Measurement labels per theme in `copy.ts` (`useCopy()`), plain words for screen readers.

## Out of scope

Editing or deleting a measurement (fix it in Baby Buddy; see Open in `NOTES.md`), centiles for height / head / BMI, corrected age for premature babies, imperial units, measurements anywhere but the child screen.

## Steps

- [x] 1. API: confirm the five models on the test Baby Buddy (fields, grams accepted, permissions), add types plus `list…` / `log…` calls with integration tests, record facts.
- [x] 2. Core, shared: sex in `ChildPrefs`, value formatting (`7 050 g`, `65.5 cm`), row `when` words, add sheet step / prefill / typed value / BMI from weight and height.
- [x] 3. Core, weight: WHO tables, bands at an age, band of a weight and the chip rule, gain and rate words, birth dip, axis and ticks, list deltas.
- [x] 4. Core, others: height ruler range, marks and labels; head rings; temperature zones and episodes; BMI bars.
- [x] 5. App: tokens, queries, Measurements card and sex picker on the child screen, the add sheet.
- [x] 6. App: the five measurement screens.
- [ ] 7. Themes copy, Playwright flows, look review, and this plan's row in `plans/README.md`.
