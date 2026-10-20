# Ring redesign

Context: the Molly system plan in [`../implan-molly/MAIN.md`](../implan-molly/MAIN.md) (architecture, rules) and the root `CLAUDE.md`. Decisions are in [`NOTES.md`](NOTES.md), the picture in [`MENTAL_MODEL.md`](MENTAL_MODEL.md), the Definition of Done in [`TEST_STRATEGY.md`](TEST_STRATEGY.md).

**Outcome:** the whole app (Android and web) gets the "Molly Ring v4" redesign. The dashboard becomes one big clock ring of the baby's day or night with the four tiles under it; History, Days and the edit screen give way to a Today sheet, a Recent days screen and an inline editor; Settings, the child screen and the theme picker take the new layout. The design is the reference: match it as closely as React Native allows.

**Branch:** this work happened on `redesign-ring` (made from `main`), was tried there and then merged into `main`.

## Design source

- `Molly Ring v4 Board.dc.html` (the board: 12 phones, `1a`–`1l`) and `Molly Ring v4.dc.html` (the live component they import) (the private design source). `support.js` is only the canvas runtime.
- A snapshot of the component is in [`design/Molly Ring v4.dc.html`](design/Molly%20Ring%20v4.dc.html). The template (top half) has every size, weight, radius and colour; the script (bottom half) has the ring geometry and every text rule. Read it before each step. If the live file has changed since the snapshot, the live one wins: refresh the snapshot and note it in `NOTES.md`.
- The design uses Classic tokens only; they already match `src/theme/themes.ts` Classic (check, don't assume). Its fonts are Nunito 500–900 and Material Symbols Rounded (filled where it sets `'FILL' 1`).

The board phones, for reference in steps and checks: `1a` day awake · `1b` tapped a nap (editor) · `1c` feed running, stop and save as · `1d` night, sleeping · `1e` Today sheet · `1f` tapped the sun (last night) · `1g` yesterday opened from Recent days · `1h` Settings · `1i` child settings · `1j` Add entry, nap with no end · `1k` Recent days · `1l` Theme sheet.

## The screens

### Dashboard (`src/app/(main)/index.tsx`)

Top to bottom, as `1a`:

- **Header:** child's name (28/900) over `<window title> · <date>` (e.g. `Today · Thu 24 Sep`, `Last night · …`). Right: three 48×48 buttons, `history` (opens the Today sheet), `add` (ink-filled, opens Add entry), `settings`. **Tapping the name opens the Children sheet** (`features/children/ChildrenSheet.tsx`) when more than one child is shown; with one child it's plain text. The avatar stack and the other-child strip go.
- **The ring** (400×400, centred in the free space). Geometry from the design script (`renderVals`): centre 200, sleep track radius 132 / width 30, marks radius 178, gap at the top from 16° and a 328° sweep, round caps.
  - Grey track, hour ticks inside it, sleep arcs in `sleep-mid` (tappable, 44 px hit stroke), the running sleep in `sleep-ink` up to now.
  - Feeds, diapers and medicine as 34 px round marks outside the track at their start, kept at least 15° apart in time order and never before 42° (clear of the cap), with their kind's icon (`Left`/`Right`/`Both`/`Bottle`, `Wet`/`Dirty`/`Both`, `medication`). A running feed is a filled mark with a `feed-mid` ring; tapping it opens Stop and save as.
  - Predicted sleeps (the day plan) as dashed outlines on the track, the next one filled `sleep-bg`, later ones fainter, with start and end times outside (no end label on the one that reaches the ring's end). Only on the live day, only while no timer runs. Skipped ones aren't drawn.
  - The now hand (ink line through the track, dot inward) on the live window only.
  - The **cap** at the top: a sun (`wb_sunny`, `med` colours) on a day, a moon (`bedtime`, `sleep` colours) on a night. Tapping it switches to the other window of the pair (live day ↔ last night; live night ↔ today's day) and back. Beside it, `Day started 07:13` (day) or `Bedtime 19:05` (night) with a short tick on the track where that happened.
  - Centre text: `Awake` / `2h 39m` / `since 09:01`; `Sleeping` or `Feeding` (kind's ink) with a live `m:ss` timer and `since`; on a past window `Slept` / total / `3 naps · 4 feeds` (night: `· diapers`).
  - When a sleep or mark is selected, everything else fades to 25%.
- **Under the ring**, one of three panels:
  - **Idle:** the window row (only on the live day, awake, with a prediction): dashed dot, `Nap 2 likely`, `12:56–13:26`, `in 1h 16m`; under it `Then nap 3 15:20–15:50 · bedtime 18:30–19:00` and `Estimate · not medical advice`. **Add a `Skip` action to this row** (not in the design; Skip is kept): it writes the `molly-skip` note as today, Undo in the toast retags it. Style it like the design's quiet text buttons (15/800 muted, 48 px tall). Then the 2×2 **tiles** (76 px, radius 20, kind bg/ink, icon 30, name 17/900, sub `2h 39m ago · Left` / `not yet`). A running kind's tile turns ink-filled: `Stop sleep` / `Stop feed` with the live timer. Sleep and Feed tiles start a timer at once; Diaper and Medicine open a picker.
  - **Picker** (card): `Stop and save as` (Left / Right / Both / Bottle, `Cancel feed` below), `Diaper` (Wet / Dirty / Both), `Medicine` (Vitamin D). Bottle uses the child's bottle defaults.
  - **Editor** (card, `1b`): kind icon, `Nap` / `Night sleep` / `Feed` / `Diaper` / medicine name, sub `1h 9m · ended 2h 0m ago` (or the window title when older than 12 h), Start/End rows (or Time) with −5 / +5, kind segment for feeds and diapers, `Delete` and `Done`. **Done saves** (optimistic write, `Button`'s pending state), the close X discards. End can't pass now, length stays ≥ 1 min. Tapping the running sleep arc opens it with a Start row only (the existing edit-running-start behaviour).
- **Back to now** (ink pill, `undo` icon) above the panels whenever a past window is showing.
- Toasts as the design's: ink pill, `check_circle` in `diaper-mid`, 96 px above the bottom.

Keep the existing behaviour around it: optimistic writes and their undo, tap pending states (`implan-tap-feedback`), the unreachable banner, `Updating…` on return (`useUpdatingOnReturn`), skeletons while loading, snap back to now after 60 s and on returning from the background, screen-reader labels for every mark, arc and tile.

### The windows the ring shows

The ring is one **window** from `packages/core/src/day-window.ts`, unchanged in meaning:

- A **day** runs from the morning wake (the wake-up closest to the child's "Day starts" time; `dayWindow`'s rule) to "Day ends", or to the end of the plan's bedtime window when there is one. A **night** runs from bedtime to the next morning's "Day starts". With no logged wake, the clock times stand in (`clock: true`).
- So the ring's 16° start is the window's start: the `Day started` tick sits at the top unless the clock fallback put the start elsewhere. Angles are `(t − start) / (end − start)` of the sweep, as the design's `ang`. Hour ticks fall on whole clock hours inside the window (not a fixed 12).
- "Day starts / Day ends" are the existing nap window (`ChildPrefs.napWindow`), only renamed in the UI. Nap vs night sleep keeps `isNap`.
- The pair for the cap: `previousWindow` gives the one before; from a past window, the cap goes to the other half of the same calendar pair (as the design's `pairK`). Any past window can show on the ring when opened from Recent days.

Put the ring's pure logic in core, unit-tested, no React: angle of a time in a window, arc path for a span (min 0.5°), hour tick angles, mark placement with the 15° spacing, window-label placement, and the text rules (centre text, window row, `Then …` line, editor sub). Suggested home `packages/core/src/ring.ts`. Totals come from `totalsBetween`; the plan from `dayPlan`.

### Today sheet (`1e`)

Bottom sheet over a scrim (`components/sheet.tsx` restyled), title `Today` / `Tonight`, four stat boxes (slept, naps or sleeps, feeds, diapers), `Recent · tap to edit` with the last six entries (tap opens the editor on the dashboard for that entry and shows its window), then a `Recent days` row. Replaces the Recent list and `See all`.

### Recent days (`1k`)

Its own screen, replacing `history.tsx` and `days.tsx` (both routes go). `‹ Back`, `Recent days`, one card per calendar day, newest first: title (`Today`, `Yesterday`, weekday) and date, then the day and night mini rings side by side (since `implan-recent-days-order`: night left, day right, one card per morning) (168 px, the same geometry scaled, sleeps only on the track, other entries as dots, a sun/moon dot at the top), each with an icon, slept total, `3 naps` / `2 feeds`, and `Day` / `Night` / `Today so far` / `Tonight`. Tapping a ring opens it on the dashboard. Three days load first, `Load 3 more days` adds three until Baby Buddy has nothing older. Reuse `useDays`, `windowsBefore` and the week fetching from `implan-days`.

### Add entry (`1j`)

Bottom sheet from `+`: four type tiles, `Start` (or `Time`) as a time input with −5/+5, for sleep and feed an optional end (`Add end time` dashed / `No end`), feed kinds only with an end, diaper kinds, medicine `Vitamin D` / `Other` with a note or a required name, a live explanation line (`No end time, so a sleep timer starts from 10:50…`, or the validation error in `danger`), and `Start sleep timer` / `Save sleep`. With no end it starts a Baby Buddy timer backdated to the start. Times parse as the latest such clock time not in the future.

### Settings (`1h`), Theme sheet (`1l`), child screen (`1i`)

- **Settings:** `‹ Back`, `Settings`; `Children` card (avatar, name, age, `· hidden`, chevron to the child screen); `For everyone`: `Colours` segment (Follow the phone / Day / Night), a toggles card (Notifications with its live-updates line and `Open settings` when it applies, Haptics; keep the playful-labels switch here for a theme that has them), the `Theme` row (current name, chevron) and `Baby Buddy · Connected` (to the existing connection and sign-out). A sticky `Save changes` / `Saved` button: Colours and toggles are a draft until saved; leaving with changes toasts `Changes not saved`.
- **Theme sheet:** the six themes as cards (day and night swatch halves with sleep / feed / diaper dots, name, tagline, radio). Tapping one applies it at once and toasts `Theme changed to …`; it's not part of the draft. Replaces `ThemePicker.tsx`'s current look.
- **Child screen:** avatar, name, `7 months · born 24 February 2026`; `Show in Molly`; `Colour` (five round swatches with a check); `Day and night` (Day starts / Day ends, −15/+15, with the design's explanation line); `Bottle` (Breast milk / Formula, amount −10/+10 ml); `Vitamin D reminder` (keep its real rule in the subtitle, see `NOTES.md`). Same sticky Save as Settings.
- Onboarding, the key-rejected screen, help and the Tap log keep their flows; give them the new controls (buttons, cards, headers) so nothing looks old.

### Themes

All six themes stay and dress the new layout in day and night: colours, fonts, corners, borders / shadows, the header pattern behind the header row, the playful labels (`useCopy()`, screen readers keep the plain ones) and Safari's pictures on the tiles. The design only draws Classic, so the other five are a judgment call: map each design token to the theme's (`--rc` cards, `--rb` buttons, `--rs` small, `--rsh` sheets, `--bw` borders, `--sh` shadows, `--fd` / `--fdw` display font), keep the ring geometry fixed, and check every theme by eye.

## Shape

```
packages/core/src/ring.ts (+ test)         angles, arcs, ticks, marks, labels, text rules
packages/core/src/children.ts              five hues (design's 285, 350, 210, 165, 60)
apps/molly/src/features/ring/               Ring (react-native-svg), MiniRing, CenterText, Cap
apps/molly/src/features/dashboard/          Tiles, WindowRow, Picker, Editor, TodaySheet, AddSheet; Hero, TodayCard, TodayPager, PastWindowCard, Recent, StartPopup go
apps/molly/src/app/(main)/                  index (dashboard), recent-days (new), settings, child/[id]; history, days, entry/[kind]/[id] go
apps/molly/src/features/children/           ChildrenSheet from the title; AvatarStack, OtherChildStrip, Switcher go
apps/molly/src/theme/                       icons (Material Symbols Rounded set), ThemeSheet, themes mapped to the new tokens
apps/molly/src/components/                  ui (buttons, cards, segment, toggle, stepper rows), sheet
e2e/tests/                                  specs rewritten for the new screens
```

## Steps

Work through them in order. Each lands on its own (the app runs after each). Mark a step `[x]` only when fully done; record findings in [`NOTES.md`](NOTES.md). After each step: `pnpm check` green, commit on `redesign-ring`.

- [x] **1. Foundations.** `npx expo install react-native-svg` (check web and the widget bundle aren't affected). The Material Symbols Rounded icons the design uses, filled and outlined, as SVGs in `src/theme/icons.ts` (or the font, if it can do `FILL`; pick one and note why). New `components/ui` pieces from the design: 48 px icon button, ink button, card, segment, toggle, stepper row, sticky save bar, toast look. Child colours to the design's five hues (core TDD for `assignHues` / `defaultChildPrefs` with five; map stored indices so a child's colour stays close, see `NOTES.md`).
- [x] **2. Ring logic in core.** Unit TDD (Given / When / Then, zero → one → many, then boundaries): `packages/core/src/ring.ts` as listed above, against the design's numbers (a 07:00–19:00 window puts 13:00 at 180°; marks 5 min apart spread to 15°; a window label at the ring's end is dropped; centre and window-row texts for awake, sleeping, feeding, past day, past night).
- [x] **3. The ring on the dashboard.** New header (name, date line, three buttons, name opens Children sheet), the ring on the live window with arcs, marks, plan ghosts and labels, hand, cap with start label, centre text, the tiles and running states, Back to now, cap switching to the pair window. Old Hero / TodayCard / TodayPager / Recent / AvatarStack / OtherChildStrip go. Playwright (fixed clock, seeded): `1a`, `1d` and `1f` states by their texts and roles; starting and stopping sleep from the tile; cap tap and Back to now.
- [x] **4. Panels under the ring.** Window row with Skip (Undo), the three pickers, the inline editor (Done saves, X discards, Delete, running-sleep Start only). The entry route goes. Playwright: `1b` edit a nap's end and save; delete; `1c` stop a feed as Left; diaper and Vitamin D from the pickers; skip and undo a nap.
- [x] **5. Today sheet and Recent days.** Sheet with stats, last six (tap to edit), link; the Recent days screen with mini rings, three days per load, tap a ring to open it. `history.tsx`, `days.tsx` and their specs go. Playwright: `1e`, `1k`, `1g`.
- [x] **6. Add entry.** The sheet with every type, end / no end, kinds, medicine note, validation, backdated timer start. Playwright: `1j` start a backdated nap timer; save a finished feed with a side; a future time is refused; `Other` medicine needs a name.
- [x] **7. Settings, Theme sheet, child screen.** Draft + sticky Save, `Changes not saved`, Theme sheet applying at once, child screen sections. Playwright: `1h`, `1i`, `1l` flows (change, save, leave unsaved).
- [x] **8. Themes and the rest.** All six themes on every new screen, day and night (header art, playful labels, Safari pictures); onboarding, key-rejected, help, Tap log restyled. Web and emulator look pass against the board for Classic, both schemes, largest font.
- [x] **9. Wrap up.** Remove dead code and specs; update "Where things stand" in the root `CLAUDE.md` (one line, pointing here); tick `TEST_STRATEGY.md`; the branch is then ready to try.

## Out of scope

- The home-screen widgets and the lock-screen notifications: they already follow the theme and stay as they are.
- New prediction or day-window rules (only placed differently).
- Swiping between windows (the design wires none; the cap and Recent days do it).
- Merging into `main`: decided after trying the branch (since merged).

## Assumptions

- `react-native-svg` works with Expo SDK 57 on Android and web (step 1 checks).
- `dayWindow`, `previousWindow` and `windowsBefore` already give every window the ring needs; nothing in their rules changes.
- Baby Buddy timers accept a backdated `start` on create (it's how `implan-edit-running-start` moves a running start; confirm in step 6).
- Sleep and feed timers can still run at the same time. The design's prototype stops one to start the other; the real app doesn't (see `NOTES.md`).
