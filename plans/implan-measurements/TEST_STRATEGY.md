# Measurements: Definition of Done

Done when every item below is true. The physical-phone checks at the end are the exception: they run after handover.

Method, per the root `CLAUDE.md`:
- **API:** Vitest integration tests against the real test Baby Buddy (`pnpm bb:up && pnpm bb:seed`).
- **Pure logic:** unit TDD in `packages/core` (Vitest, Given / When / Then, zero → one → many, then boundaries and errors).
- **Flows:** Playwright against the web image.
- **Android-only behaviour:** the emulator (`emulator-5554`).
- **Looks:** manual review.

## Nothing regresses

- [x] `pnpm check` is green; every existing Playwright spec passes.
- [x] The child screen's other settings (shown, colour, day and night, bottle, Vitamin D) work as before.
- [x] The dashboard, ring, Add entry sheet, widgets and notifications are unchanged.

## API (integration, test Baby Buddy)

- [x] Each of the five models can be logged and listed for a child, newest first, with the confirmed fields; the facts are in `NOTES.md` and `implan-molly/NOTES.md`.
- [x] A weight of `7050` (grams) is accepted and comes back as `7050`.
- [x] Temperature keeps its time; the others keep their date.
- [x] Failures map like other entries (`validation` for a bad value, `forbidden` without permission).

## Shared rules (unit, `packages/core`)

- [x] Values format as `7 050 g`, `65.5 cm`, `42.3 cm`, `36.9 °C`, `16.3`.
- [x] Row `when` words: `23 Sep · 5 days ago`; temperature `Today 07:40`; no entries → `None yet`.
- [x] Add sheet: the step per measurement (10 g, 0.5 cm, 0.5 cm, 0.1 °C, 0.1). It starts at the last value. Typed values are parsed and out-of-range ones rejected. With no previous entry it starts at a sensible default.
- [x] BMI starts from the same day's weight and height when both exist (7 000 g, 65.5 cm → 16.3), otherwise from the last BMI.
- [x] `ChildPrefs` has `sex`, unset by default; it is dropped on sign-out like the other child prefs.

## Weight (unit)

- [x] WHO bands at an age match the published weight-for-age tables (spot checks at birth, 2 months, 1 year, 2 years, both sexes, within rounding).
- [x] The band a weight falls in, and the chip words (same band as at birth / as all year / moved), with nothing when sex is unset.
- [x] Rate unit: per day under 3 months, per week to 12 months, per month after. Zero or one entry gives no gain line.
- [x] Axis: 12 weeks under 3 months; birth to now in months to 12 months; Last year / Since birth over 12 months, with Last year as the default.
- [x] Birth dip: lowest weight, its day and percent under birth weight, and the day back to birth weight or `Not back to birth weight yet`. No birth-date weight, or no lower weight in the first two weeks, gives no card. No card at 3 months or older.
- [x] List: the newest four, each with the change and the gap since the one before (`+470 g · 16d`, `+360 g · 2m`).

## Height, head, temperature, BMI (unit)

- [x] Height: the ruler range fits the marks shown. Under 1 year, every mark since birth, dated. Over 1 year, the last year's marks, labelled by age. The line under the value matches the age rule.
- [x] Head: one ring per entry, ordered and sized by value; the line under the value is the change since the previous entry.
- [x] Temperature zone boundaries: 35.9 Low, 36.0 Normal, 37.4 Normal, 37.5 Raised, 37.9 Raised, 38.0 Fever.
- [x] Fever episodes: a single fever reading; several readings to a Normal one (peak, duration, count); a Raised reading doesn't end an episode; an episode still going; none in the last 30 days gives no card.
- [x] BMI bars: the newest six, the latest marked; the formula shows only with a weight and a height on the latest BMI's date.

## Theme words (unit, `apps/molly`)

- [x] Every theme in `COPY` has every measurement label; Classic matches the design word for word.
- [x] With playful labels off, every theme shows Classic's words; screen readers always hear Classic's.

## Flows (Playwright, web)

- [x] The child screen shows the Measurements card with five rows; a row opens its screen and Back returns to the child.
- [x] Each `+` (card or screen) opens the sheet for that measurement. Saving logs it in Baby Buddy, and the card and screen show the new value.
- [x] Typing a value, Yesterday and Pick date save the chosen value and date; temperature saves its time.
- [x] A failed save shows the normal error toast and leaves nothing behind.
- [x] Weight with sex unset shows no bands or chip, and the footer points to the child screen; setting sex shows them.
- [x] Over-1-year weight: the Last year / Since birth switch changes the chart.

## Emulator (`emulator-5554`)

- [x] Pick date opens the native date picker; the chosen date saves.
- [ ] The sheet follows the keyboard when typing; Android Back closes the sheet first.
- [ ] TalkBack reads the card rows, the big values with units, and the stepper buttons; the screen behind the sheet is hidden from it.

## Look (manual, web and emulator, all six themes, day and night, largest font)

- [ ] The card and the five screens match the design frames (1a, 2a, 2b, 1c / 2c, 1d, 1e, 1f, 1g) in Classic day.
- [ ] New colour tokens read well in every theme and in night.
- [ ] Nothing clips or overlaps at the largest font: long values, the chart's right-edge labels, the temperature axis.

## Physical phone (Android 16+, after handover)

- [ ] Log a weight, height, head and temperature for a child, and check they show in Baby Buddy's own UI.
- [ ] With sex set, the weight bands look right for the child; the other parent's phone shows the same entries.
