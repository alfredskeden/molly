# Measurements: notes

## Decisions

- **Weight is stored in Baby Buddy as grams** (`7050`, not `7.05`). Molly writes and reads grams. Baby Buddy's own UI will show the bare number.
- **Sex is a per-device child preference** (`settings.children[id].sex`, unset by default), set on the child screen. It isn't stored in Baby Buddy, so each phone sets it on its own. With no sex set, the weight chart has no WHO bands and no centile chip.
- **WHO centile bands on weight only**, as designed. Height keeps the doorframe, head the rings, BMI the bars, with no centiles.
- **No gestational week / corrected age.** The design's footer "born at week 40" is dropped; it says `WHO girls` / `WHO boys`. Prematurity correction would be its own plan.
- **Child screen only.** No measurements in the Add entry sheet, the ring, widgets or notifications.
- **Temperature zones fixed as designed:** Low < 36.0, Normal 36.0–37.4, Raised 37.5–37.9, Fever ≥ 38.0 °C. No age adjustment, no advice beyond the zone name.
- **Themes:** semantic tokens so all six themes work, plus playful measurement labels per theme in `copy.ts` (screen readers keep the plain words).
- **Weight design:** section 2 of the design (2a, 2b) replaces 1b. Height at an older age follows 2c (marks labelled by age).

## Design source

`Molly Measurements.dc.html` (the private design source). Frames: 1a entry point, 1b weight (old), 1c height, 1d head, 1e temperature, 1f BMI, 1g add sheet, 2a weight at 2 months, 2b weight at 2 years, 2c height at 2 years. `support.js` is only the design canvas runtime, nothing to port. The design's colours `--grow-*`, `--warm-*`, `--hot-*`, `--cool-*` have no tokens in `src/theme/tokens.ts` yet.

## App decisions (steps 5–6)

- **Date picker:** `@react-native-community/datetimepicker` 9.1.0 (`npx expo install`, config plugin added to `app.json`), opened imperatively with `DateTimePickerAndroid.open` on Android (`DateField.android.tsx`, max today); on web the browser's `<input type="date">` shows under the day choices once Pick date is chosen (`DateField.tsx`). New native code: the next Android build needs a clean prebuild.
- **"Today" sends no date** (temperature: no change, it always sends its time). Baby Buddy checks a date against its own time zone's today and stamps an omitted one with it, so a phone already past midnight while Baby Buddy isn't (the UTC test container) would otherwise be refused "Date can not be in the future." Yesterday and a picked date are sent as the phone's local date.
- **No permission:** each measurement is its own query. A 403 (a plain caregiver on height, head or BMI) shows `Needs permission in Baby Buddy` on the row with no `+`; the screen says why. Help → Permissions lists the six permissions.
- **Colour tokens** `grow-*`, `warm-*`, `hot-*`, `cool-bg` for every theme, day and night: each theme's own sleep tones' lightness and chroma at the design's hues (grow 230, hot 25, cool 250); warm is the theme's feed bg / mid (Classic's design values are exactly those). Contrast tests cover the chip, fever card, zone chips and the weight line.
- **Sex picker:** a `Girl or boy` panel (Not set / Girl / Boy) on the child screen after Colour, saved with the other settings.
- **Routes:** `child/[id]/index.tsx` (moved) and `child/[id]/[measure].tsx` (`weight | height | head | temperature | bmi`).
- **Web sheets (found, not caused here):** in the web export every `Sheet` (Settings' Baby Buddy sheet too, checked on the commit before this plan) loses the classes on its `Animated.View`s, so the sheet draws without its surface over the screen. Flows still work (Playwright passes). Not fixed in this plan; reported as a separate issue.

## Open

- **Editing and deleting a measurement.** The design shows no way to fix a wrong entry. Default unless decided otherwise: out of scope, fix it in Baby Buddy.
- **Wording review** of the centile chip, gain line and birth-dip card once real words show on screen. Chip rule as built: the nearest of the 3rd / 15th / 50th / 85th / 97th lines, `Close to` within 0.05 z of it, `Just above / below` within 0.25 z, `Above / Below` further; first year compared with a weight on the birth date (`, as at birth` / `, up from the 15th at birth`), after it with the past year (`… all year`, `Close to` when the year's weights sit on both sides of the line, or `, up from the 15th a year ago`). Theme names (`measure*` in `copy.ts`) are also up for review.
- **Web sheets** draw without their surface in the web export (every sheet, not only this plan's; see App decisions). Needs its own fix.

## What's left

- Emulator (`emulator-5554`, release build): Pick date opens the system date dialog with future days disabled and the picked date saves (`2026-10-05`) ✓; Android Back closes the sheet first and stays on the child screen ✓; with the sheet open the accessibility tree holds only the sheet (labels: `Weight in grams`, `Down 10 g`, `Up 10 g`, the day radios) ✓. Left: the keyboard check with a docked keyboard (the emulator's is floating, so the sheet doesn't move), and listening to TalkBack itself.
- Look review: the remaining themes (Arcade, Mission Control, Match Day) in day and night, and the largest font (web checked in Classic day, Terminal night, Safari day only).
- The physical-phone checks in `TEST_STRATEGY.md`. Baby Buddy users need the height / head / BMI permissions if they're caregivers (`docs/setup.md`).

## Confirmed against the live API (step 1, v2.11.0-ls251)

- Fields: `weight/` → `weight`, `height/` → `height`, `head-circumference/` → `head_circumference`, `bmi/` → `bmi`, each with `date` (`YYYY-MM-DD`, optional, default Baby Buddy's local date); `temperature/` → `temperature` with `time` (optional, default now, sent with an offset, returned in UTC). All have `notes` and `tags`. Values are floats.
- **Grams are fine:** `7050` comes back as `7050` (JSON `7050.0`). No validation on the number at all: `-5`, `123456.78` and `7050.123` are accepted, so Molly's add sheet must range-check before saving.
- A future `date` is 400 `{"date":["Date can not be in the future."]}`.
- Lists: newest first (`-date`, ties in no set order; temperature `-time`). Date-only lists filter by `child` and exact `date` only (no `date_min`), so Molly fetches all of a child's entries (`collect`), and core sorts ties by id.
- **Permissions:** Baby Buddy's `caregiver` group has `view/add/change` on weight and temperature only. **Height, head circumference and BMI are 403 for a plain caregiver** (list and add). Nobody but admins may delete. Seed: `parent_a` stays a plain caregiver for these (the forbidden path), `parent_b` gets `view_` / `add_` on `height`, `headcircumference`, `bmi`. `docs/setup.md` must list them.
- API: `logMeasurement(kind, …)` and `listMeasurements(kind, child)` with `kind` = `weight | height | head | temperature | bmi` (`measurements.int.test.ts`).
