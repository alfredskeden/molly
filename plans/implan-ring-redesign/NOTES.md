# Notes

## Decisions (2026-10-02)

- **Branch:** `redesign-ring` off `main`. Work and commits stay there until it has been tried and merged.
- **Themes stay**, all six, with every extra (header pattern, playful labels, Safari pictures). The design added the Theme sheet (`1l`) for picking them; it applies at once.
- **Children:** the child's name replaces "Molly" in the header; tapping it opens the Children sheet. No avatar stack, no other-child strip.
- **Skip nap stays**, as a `Skip` action on the window row under the ring (not in the design).
- **Ring span = the existing day / night windows.** The day ring starts at the morning wake (wake-up closest to "Day starts") and runs to "Day ends" or the plan's bedtime; the night ring from bedtime to the next "Day starts". "Day starts / Day ends" is the nap window renamed. Nap vs night sleep classification unchanged.
- **History, Days and the edit screen are replaced** by the Today sheet, Recent days and the inline editor.

## Defaults chosen in planning (not reviewed separately)

- Widgets and lock-screen notifications unchanged. Web gets the redesign too.
- Editor: Done saves, the close X discards (the prototype applies ±5 live, which would mean one write per tap).
- Tapping the running sleep arc opens the editor with Start only, keeping `implan-edit-running-start`.
- Sleep and feed timers may run together, as today. The prototype's `startTimer` ends the other timer first (and a feed stopped that way would have no side); don't copy that. With both running, the centre shows the sleep and the feed is the live mark.
- Playful-labels switch kept in Settings' toggles card for themes that have playful labels (the design has no place for it).
- Vitamin D reminder subtitle: the design says "Once a day, if not logged by 10:00", but the real rule is a check when a sleep this phone stops (`implan-vitamin-d-reminder`). Keep the real rule and word the subtitle for it.
- Child colours: the design has five hues (285, 350, 210, 165, 60); today there are four indices (350, 210, 145, 75). Map stored 0–3 to the nearest new hue (350, 210, 165, 60) so nobody's colour jumps; 285 becomes the fifth.
- "Load 3 more days" stops when there's nothing older (the prototype stops at 13 days).

## Design facts

- Board `Molly Ring v4 Board.dc.html` imports component `Molly Ring v4.dc.html`; snapshot in `design/`. The Theme sheet (`1l`) was added after the first read the same day; the snapshot includes it.
- Ring constants (main): C 200, RS 132, WS 30, RM 178, A0 16°, SPAN 328°, hit stroke 44, mark spacing 15°, cap at y = C − RS − WS/2 − 24. Mini ring: RS 132, WS 34, dots at RS + WS/2 + 22, drawn into 168 px.
- The prototype has swipe handlers (`onDown` / `onUp`) but the template doesn't wire them: no swiping.

## Step 1 (foundations), 2026-10-02

- Live `Molly Ring v4.dc.html` checked against the snapshot: identical.
- Classic tokens checked against the design's `:root`: every colour (the hex comments in `src/theme/tokens.ts` carry the same oklch), radii card 20 / button 14 / chip 12 / sheet 28 and the 1 px border match. Two radii the design also uses got theme variables derived from Classic's: `rounded-inner` (`--rsi`, chip − 2 = 10, segment options) and `rounded-box` (`--rcs`, card − 4 = 16, toast, stat boxes).
- `react-native-svg` 15.15.4 (`npx expo install`). Web bundle check still passes (no widget code); the widget doesn't import it. Android needs a fresh build for the native module.
- **Icons are SVG paths, not the font.** `src/theme/symbols.ts`: Material Symbols Rounded weight 400 (the design never sets `wght`, so the font's default), from `@material-symbols/svg-400` 0.47.6, `FILLED` and `OUTLINED` sets with only the glyphs used. React Native can't set the variable font's `FILL` axis, and paths draw the same on Android and web. Drawn by `Glyph` (`src/theme/Glyph.tsx`). `expand_more` isn't in the package: it's the font's alias of `keyboard_arrow_down`, stored under the design's name. The widget's Safari pictures (`icons.ts`, weight 500) are untouched.
- **Child colours:** `CHILD_HUE_ANGLES = [350, 210, 165, 60, 285]` in core. Indices kept their meaning (0–3 moved to the nearest new hue: 145 → 165, 75 → 60), 285 is index 4, so stored prefs need no migration. Day avatars use the design's `oklch(0.90 0.05 h)` / `oklch(0.40 0.10 h)`; night keeps `oklch(0.40 0.07 h)` / `oklch(0.90 0.06 h)`; notification icons `oklch(0.52 0.10 h)`. New children still take the least-used colour, lowest index first.
- New `components/ui` pieces: `IconButton`, `CloseButton`, `InkButton`, `QuietButton`, `Panel`, `SectionLabel`, `Segment`, `ToggleRow`, `LinkRow`, `StepperRow`, `SaveBar`. The toast took the design's look (ink, 16 px corners, `check_circle` in `diaper-mid`, `error` in `danger` for failures, 96 px above the bottom inset). Text at the design's 900 uses `font-display` so other themes put their display face there.

## Step 2 (ring logic), 2026-10-02

- `packages/core/src/ring.ts` (+ 62 tests): `RING` geometry, `ringAngle`, `ringPoint`, `arcPath`, `hourTicks`, `placeMarks`, `ringGhosts`, `windowRow`, `centreText`, `editorSubtitle`, `windowTitle`, `windowDate`, `startLabel`. `format.ts`: `clockText` (now shared with `skipNote`), `durationText`, `timerText`, `counted`.
- Lengths follow the design's `H` (`2h 9m`, no zero padding), floored to the minute, not rounded (live values).
- Running timers in the centre: `m:ss`, and `h:mm:ss` from an hour (the prototype's `mm:ss` would read `150:00`; the board's night shows `1h 20m` only because its scenario has no real start).
- Awake with no sleep ever logged: `Awake` / `–` / `No sleep logged yet` (the prototype would show `0m since now`).
- Window row: the first unskipped likely sleep even after its window closed (`14m ago`, as the prototype's `winState`); naps numbered after the naps logged since the morning wake, skipped ones not counted. Ghosts on the ring drop ended windows (as the prototype's `w.e > now`).
- Titles count from the live window's calendar day (prototype's `titleOf2`): the day just ended under a live night is still `Today`; `Last night` only for the night before a live day, otherwise `<Weekday> night`. The date line is the window's start date.
- Editor: a running sleep's subtitle is `40m so far` (not in the design).

## Steps 3–4 (dashboard, panels), 2026-10-03

- The dashboard (`src/app/(main)/index.tsx`) is a ScrollView with `flexGrow: 1`: header, the ring in the free space (`features/ring/Ring.tsx`, the design's 400 px box scaled down with `transform: scale` when there's less room, never under 280 px: below that the screen scrolls), then the panel. Ring parts from `features/ring/model.ts` (entries → arcs and marks, with icons and spoken labels).
- Arcs take taps along their whole length (a transparent 44 px SVG stroke with `onPress`) and also have an invisible 44 px button at their middle: SVG isn't reachable by screen readers or Playwright, the button is ("Nap 09:32 to 10:41, 1 hour 9 minutes").
- The cap switches between the live window and `previousWindow` (step 5 adds windows opened from Recent days). Snap back after 60 s and on returning to the app, as `TodayPager` did.
- Sleep and Feed tiles wait (disabled, `skeleton-sleep` / `skeleton-feed`) until the timers are loaded, as the old Start buttons did. Their timer ticks each second.
- Classic copy now uses the design's words: `Awake` (was `Awake for`), `Cancel feed`, `Medicine` (was `Medication`, so toasts say `Medicine cancelled`), new key `stopFeed` (`Stop feed`, a word per theme).
- The design's Medicine picker has only Vitamin D; `Other` stays beside it (opens the old MedicationSheet) until step 6's Add entry takes over.
- Window row: tapping it opens the Why sheet (kept, without its Skip button); the disclaimer is the old one (`Based on age (5 months) only · …` until there are logs, then the design's `Estimate · not medical advice`). Countdowns (`in`, `left`) round up to the minute.
- Inline editor (`features/dashboard/Editor.tsx`, rules in `editor-model.ts`, unit-tested): Done saves with an optimistic edit (`optimistic.edited` / `deleted` on both `entries` and `past`), the X drops the draft, the ring shows the draft live. Delete keeps the old two-tap confirm (`Tap again to delete`), as it can't be undone. A bottle feed gets an Amount row (±10 ml); switching to Bottle takes the child's bottle type and amount. A refused save keeps the editor open and toasts Baby Buddy's field message.
- **Dropped from editing** (the design's editor has no place for them): a sleep's nap / night switch, feeding type other than via Bottle, diaper colour, notes, tags, a medicine's name. Baby Buddy keeps what's stored.
- The running sleep's editor has Start only, and its Delete is `Cancel sleep` (cancels the timer). The running feed's start moves through `Edit start` in the Stop-and-save picker (not in the design; keeps `implan-edit-running-start`), its Delete is `Cancel feed`.
- The toast's `Edit` (a stop another phone already saved) and History rows open the editor through `/?edit=<kind>-<id>`; the entry route is gone.
- Specs: `ring`, `editor`, `running` (ports of hero + edit-start) are new; `dashboard`, `day-plan`, `next-sleep`, `today-window`, `toast`, `pending`, `loading`, `errors`, `children` (header part), `accessibility` rewritten; `hero`, `edit`, `edit-start` removed (each behaviour still covered, or listed as dropped above). Still to port in their steps: Days / History / `Load earlier` (step 5), the nap-window and bottle-defaults flows through the child screen, `theme`, `theme-picker`, the theme-switch radio check from `accessibility`, children's Settings tests (step 7).

## Step 5 (Today sheet, Recent days), 2026-10-03

- `Sheet` (`components/sheet.tsx`) took the design's look: optional `title` with a close X, `scroll` for a body that scrolls under it at most 82 % of the screen tall.
- Today sheet (`features/dashboard/TodaySheet.tsx`): the live window's totals (running sleep counted, like the old card), the latest six entries from the dashboard's entries, `Recent days`. A row opens the editor on the window the entry is in, fetching the past windows first when needed (`wantAt` on the dashboard; an entry in the gap between Day starts and a later wake still opens, on the live ring).
- Recent days (`src/app/(main)/recent-days.tsx`, cards from `features/days/recent.ts`, unit-tested): `useDays`' weekly fetching and `daysRows` underneath, three calendar days shown per `Load 3 more days`, which fetches the week before only when the shown cards run out; the button goes once the newest fetched week had nothing in it. A card holds its day and the night that starts on it (since `implan-recent-days-order`: one card per morning, the night that ended on it left, the day right); each mini ring (`features/ring/MiniRing.tsx`) takes half the card.
- A tapped mini ring opens the dashboard with `?window=<kind>-<start ms>`; any window can show, its entries from the past fetch or, for older ones, `useDays` (now with an `enabled` flag). The cap pairs windows as the design's `pairK` does, counting back from the live one: from yesterday's day (with a live day) it goes to the night before it. A past window doesn't snap back while one of its entries is being edited.
- History and Days screens, `EntryRow`, `TodayCard`, `PastWindowCard`, `page-text` are gone; `features/history` keeps the week helpers `useDays` uses (tidy in step 9). The `history` / `days` specs became `recent-days.spec.ts`; History's filters are gone with the screen (the design has none).
- Expo Router's typed routes (`.expo/types/router.d.ts`) only regenerate with the dev server (`npx expo start`), not with `export:web`: start it once after adding or removing a route, or typecheck fails.

## Step 6 (Add entry), 2026-10-03

- Confirmed on Baby Buddy v2.11.0: `POST /api/timers/` takes a past `start`, so a sleep or feed with no end starts its timer backdated (`NewTimer` in `packages/api`, `startTimer(…, { start })`).
- Rules in `features/add/add-model.ts` (unit-tested): a typed `10:50` (or `9:05`) is the latest such time not in the future, yesterday's when it's later than now; the design's explanation and error lines; `Add end time` puts the end 30 min after the start or at now. Saving is `addEntry` in `actions/trackers.ts` (unit-tested): finished sleeps are a nap or night sleep by the nap window, a finished Bottle feed takes the child's bottle defaults, a Vitamin D note goes into Baby Buddy's `notes` (`NewMedication.notes`), another medicine is saved by the name written.
- The sheet waits for Baby Buddy (spinner, `Saving…`), closes on success and toasts as a stop / log would (with Adjust time). A refused Save keeps the sheet. Its container is labelled `New entry` (the header button is `Add entry`).
- Times are typed into a text field (`HH:MM`, numbers keyboard) rather than the platform's time picker: the design shows a plain field with −5 / +5 beside it.
- The Medicine picker now has Vitamin D only, as the design; other medicines go through Add entry. `MedicationSheet` is gone; `medication.spec.ts` rewritten, `add-entry.spec.ts` new.

## Step 7 (Settings, Theme sheet, child screen), 2026-10-03

- Settings (`src/app/(main)/settings.tsx`): Children card, Colours segment, a switches card (Notifications with its live-updates / permission line, Haptics, and Playful labels only when the theme isn't Classic, which has no words of its own), Theme and Baby Buddy rows. Colours and switches are a draft until the sticky `Save changes`; Save toasts `Settings saved`. The theme applies at once from its sheet (`src/theme/ThemeSheet.tsx`, was `ThemePicker.tsx`) and toasts `Theme changed to …`. Theme names stay the app's (`Molly Classic`, not the design's `Classic`), drawn in Nunito as the design does.
- Baby Buddy row opens a small sheet: the server address and `Sign out` (the design doesn't show where it goes). `Add widget to home screen` and the version line (long-press opens the Tap log) stay at the bottom of Settings.
- Child screen (`src/app/(main)/child/[id].tsx`): Show in Molly, five colour swatches in the design's order (285 first, i.e. index 4; spoken names Lavender, Rose, Sky, Mint, Sand), Day starts / Day ends ±15 (the nap window), Bottle Breast milk / Formula and amount ±10 ml (down to no amount), Vitamin D reminder (Android). All a draft until Save (`<name>'s settings saved`). The last shown child can't be switched off. The reminder's subtitle keeps the real rule: `After a sleep this phone stops, if no dose is logged that day`.
- Leaving either screen with a draft toasts `Changes not saved` (`features/settings/unsaved.ts`, on the navigator's `beforeRemove`).
- Settings writes are queued (`updateSettings` in `storage/settings.ts`): Save applies Colours through the theme provider while writing the switches, and two read-modify-writes at once lost one of them.
- Specs: `settings.spec.ts` replaces `theme` and `theme-picker`; children's Settings tests, the bottle-defaults and day-and-night flows (from `dashboard` and `today-window`) and the "which one is chosen" check (from `accessibility`) are in `settings` / `children` now.

## Steps 8–9 (themes, wrap up), 2026-10-03

- All six themes checked on the web in day and night (dashboard, Today sheet, Settings, Recent days): colours, fonts, corners, borders / shadows, header patterns, playful labels and Safari's pictures (tiles, diaper picker) carry over; the ring's geometry is the same in each. Fixes from that pass: the window row keeps its range and countdown on one line and lets the title wrap (monospace themes); segment labels may take two lines (`Follow the phone` in wider faces).
- Emulator (`emulator-5554`, release build): the ring draws (react-native-svg native), and at the largest font (font scale 2.0) text in fixed-size controls is capped (`FIXED_SCALE` 1.3 in segments, step buttons, stepper rows, Add entry's tiles and time fields; tiles and window row 1.4), segments grow in height instead of clipping. The ring's own text was already capped at 1.2.
- The shared primitives (`Button`, `Card`, `Field`, `Title`) took the design's look, so onboarding, the key-rejected screen, help and the Tap log match without their own redesign; help and the Tap log got `‹ Back` and the new title.
- Dead code removed: core `strip`, `history`, `side`, `medication` modules, `nextChild` / `stackOf` / `otherChildSleeping`, `todaysTimeline`; app History feature (week helpers moved to `features/days/weeks.ts`), the settings `historyFilter`, old prediction texts, skeletons, `useEntry`, preview fonts, `TextLink` / `Choice` / `Card` / `Row`, unused copy keys. `previousWindow` and the replay helpers stay (tested rules, the replay script).
- Android's back button closes a sheet (`Sheet` listens for it), then the dashboard's editor or picker, then a past window, before it leaves the app (found on the emulator: back with the Add sheet open quit Molly).
- Tap targets: marks and arc buttons are 44 px with 2 px slop (48), segments 44 with 4 px slop, everything else 48 or more.
- Emulator spot check of widgets' sibling, the lock-screen notification: a sleep started from the tile shows the usual `Sleeping · since · saves as night sleep` notification with Stop; Stop from it saves the sleep (Baby Buddy confirmed) and the Vitamin D reminder follows, as on `main`. The widget itself wasn't placed on the emulator's home screen in this pass.
- **Seen, not chased:** with the app open, a Stop from the notification shade left the app showing the sleep until it came back from the background (a timer started meanwhile through the API did show within the 30 s poll). The notification task and polling code aren't changed on this branch; worth checking on `main` and on a device (`implan-instant-taps` territory).
- Not done in this pass: the side-by-side look review against the board and the device checklist; widgets and notifications were not touched by this branch.

## After the first try (2026-10-03)

- **Toasts at the top**, over the header's name and date (nothing there needs a tap right after an action), with an X to dismiss early; they never cover the tiles, a picker or the editor any more.
- **The ring never moves.** Its area's height comes from the screen (`HEADER_SPACE` 80 + `PANEL_SPACE` 290 left for the rest, never under 280), not from the panel under it: the editor, a picker or Back to now make the page scroll instead of shifting or shrinking the ring. The `Can't reach` banner moved under the ring for the same reason.
- **The tiles never move either.** Everything under the ring is anchored to the screen's bottom edge: the tiles (or a picker / the editor in their place) sit on it, and the window row, Back to now and the `Can't reach` banner grow up into the space under the ring. Only a panel taller than all of that space makes the page scroll.
- The centre's text box spans the inside of the track (200 px): long totals like `11h 55m` were cut off at 124 px.
- **Relative, not clock times** (no mental arithmetic): the window row says `Nap 2 likely · in 1h 16m` (open: `20m left`), the line under it `Then nap 3 in 4h 16m · bedtime 19:31`, the ring's ghosts `in 1h 16m` / `now` (one label each, before the window). Clock times stay only for when the day started, bedtime (row, ghost, `Bedtime likely 18:30–19:00`) and the Add entry time field. The centre says `since the nap` / `since waking up`, `nap so far` / `night sleep so far`, `so far`. The Today sheet's rows (`ended 59m ago`), the Why sheet (`Awake for 50m`), toasts (`Sleep started just now`, `Already running for 20m`, `Nap saved there · 1h 9m, ended 12m ago`), the offline banner and Add entry's line all count from now. `agoText` (core `format.ts`) switches to the clock time past 12 hours, where "26h ago" helps no one; tiles always say how long (`just now`, `2h 39m ago`).
- **But a time being set is a clock time** (found on a device: relative times are wrong for real timestamps). The editor's Start / End / Time values (`Start 09:32`; the subtitle above keeps `1h 9m · ended 59m ago`), the Adjust-time sheet's big value (`10:25`, with `15m ago` under it; the chips stay minutes ago) and the toasts confirming a set time (`Time set to 10:25`, `Start moved to 10:55`). Relative is for glancing at what's next and how long ago; a time you set, check against the clock, or type is the clock time.
- Unchanged on purpose: screen-reader labels keep clock times (spoken, not read at a glance), and the widgets and lock-screen notification (out of this plan's scope) still show `since 05:32`.

## Open

(none yet)

- **Sleep times on the ring, lines from the marks** (it was hard to tell where in the day you are). Every sleep's start and end clock times sit just inside the track (`sleepLabels` in core `ring.ts`, radius `sleepLabelRadius` 96): a running sleep only its start, times outside the window left out (the cap's `Day started` / `Bedtime` says the window's edge), a nap too short for two labels one `12:00–12:30` at its middle, and a label crowding the one before moves on round the ring by up to 25°, else it's left out. Boxes are sized for 8 px a character, 18 px tall (the widest theme font at the 1.2× cap). Label text never takes a tap (one `pointerEvents="none"` layer), so the arcs under the 100 px label boxes open again. Feed, diaper and medicine marks have no time: each sits at its own time with a short straight line in its colour in to the track (no more spreading; straight lines decided). Marks close in time overlap, the latest on top and the selected one above all; a second tap on a stack opens the one underneath, and after the oldest it closes (`markTap`, overlap = circles touching at the mark radius, ~11°). `Day started 07:13` / `Bedtime 19:05` sits centred above the cap, outside the scaled ring box (`START_LABEL_SPACE` 22 px, kept even when there's no label so the ring never moves): beside the cap, marks just after the start covered it (found on a device).
- The e2e specs that seed entries at 00:00–00:04 today or 30 min ago (`dashboard.spec.ts` "the tiles show how long since…", `pending.spec.ts` editor Done / Delete) fail just after midnight, on earlier commits too: the time of day, not the ring.
- **A sleep's drawn edge is its time** (found on a device: a diaper at 03:18 met the middle of the night's round end, and the 03:18 and 03:41 sleeps looked joined). Round ends reach half the track's width past their stroke, so each sleep's stroke stops short by that much (`sleepStroke` in core `ring.ts`, on the ring and the mini rings): the rounded tip lands on the start and end times, a mark's line at the same time meets the very edge, and sleeps never overlap. A sleep too short for two round ends (under ~13° on the big ring) is drawn square-ended at its times. (Labels anchored against the arc's ends were tried and reverted: not what was meant.)
