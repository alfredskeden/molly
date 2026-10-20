# Likely sleep panel

Context: the system plan in [`../implan-molly/MAIN.md`](../implan-molly/MAIN.md), the ring dashboard from [`../implan-ring-redesign/`](../implan-ring-redesign/MAIN.md), the plan and skips from [`../implan-day-plan/`](../implan-day-plan/MAIN.md), themes and `copy.ts` from [`../implan-themes/`](../implan-themes/MAIN.md), the reminder channel pattern from [`../implan-vitamin-d-reminder/`](../implan-vitamin-d-reminder/MAIN.md). Decisions and findings in [`NOTES.md`](NOTES.md), the picture in [`MENTAL_MODEL.md`](MENTAL_MODEL.md), the Definition of Done in [`TEST_STRATEGY.md`](TEST_STRATEGY.md).

Design source: `Molly Nap Detail.dc.html` (the private design source). Build option **2b "In the tile panel"**. From the **3a Terminal** frame take only the panel's wording (its table "Wording · Classic → Terminal"), nothing else: scanlines, `boot 07:13`, the header and the ring styling there are not part of this work. Option 2a (peek + rest-of-day sheet) is not built.

**Outcome:** tapping a likely sleep, the window row under the ring or any dashed ghost on it, opens a panel in place of the window row and tiles, the way tapping an entry opens the editor. It says when that sleep is likely and how it went yesterday and usually, lists the rest of the day, and offers Start sleep, Skip (next nap), Why, and a bell that reminds this phone when the window opens. Every theme words the panel in its own voice.

## Scope

In: the panel (web and Android), tappable ghosts, playful panel words for all six themes, the nap reminder (Android only).

Out: option 2a, the Terminal frame's other looks, reminders on web, reminders shared between parents (each phone sets its own), more than one reminder per child, reminders at any time other than window start, widget changes.

## How it works

App paths (`src/…`, `modules/…`) are under `apps/molly/`.

### Opening and closing

- **Window row** (`src/features/dashboard/WindowRow.tsx`): tapping it opens the panel for the next unskipped sleep. It no longer opens the Why sheet, and its Skip button moves into the panel.
- **Ghosts** (`Ghost` in `src/features/ring/Ring.tsx`): each is tappable with a screen-reader label (`Nap 3 likely 15:20 to 15:50`) and opens the panel for that sleep. Ghost labels stay as they are.
- While open, the tapped ghost is filled with `sleep-mid` (design: the conic segment over the ring), other ghosts and sleeps dim the way they do when an entry is selected. Extend the ring's selection to cover a likely sleep (e.g. a `likely-<index>` key alongside `RingKey`), so opening the panel closes the editor and vice versa.
- Close (✕), Android Back (the dashboard's existing back chain, `back` in `src/app/(main)/index.tsx`), tapping the same ghost again, opening Today / Add / Settings, or the plan no longer containing that sleep (it started, was skipped, the window ended) closes it and brings the tiles back.
- Only on the live day window with a plan, same as the row. While a sleep runs the ghosts still show (`implan-plan-while-asleep`) and open the panel, but without Start sleep and Skip.

### The panel (design 2b)

Same container as `Editor` (`src/features/dashboard/Editor.tsx`): surface card on the bottom edge, in place of the row and tiles.

1. **Header**: sleep icon tile, title (`Nap 2 likely` / `Bedtime likely`), line under it in `sleep-ink`: `12:56 – 13:26 · in 1h 16m` (when-words as the row's `whenText`: `in …`, `20m left`, `14m ago`), ✕.
2. **Yesterday** and **Usually**: for a nap, its start clock and length (`13:05 · 1h 05m`); for bedtime, the start only. Same slot = the same nap number counted from the morning wake (bedtime = the day's bedtime), from the `PastDay`s `sleepContext` already builds. Yesterday = the most recent past day; Usually = median start and median length over the past days that have that slot (`median` in `next-sleep.ts`). A row with no data is left out; both missing, the block and its divider are left out.
3. **Later**: every unskipped likely sleep after this one, each with a dashed dot and its range (`Then nap 3 · 15:20 – 15:50`, `Bedtime · 18:30 – 19:00`). Empty → left out.
4. **Disclaimer** line: the existing `disclaimer(...)` text (`Estimate · not medical advice` / age-only variant), plain in every theme, followed by a **Why ›** link (next sleep only, opens the existing `WhySheet`). The design's "Later times shift as you log" prefix is included.
5. **Buttons**: bell (Android only, see Reminder) + **Start sleep** in `sleep-ink` (same as the Sleep tile's start, then closes the panel). **Skip** (a `QuietButton`, next unskipped nap only, as today's `skipNap`) sits in the header row left of ✕ or under the buttons; pick what fits at largest font.

Pure parts (title numbering, yesterday/usually, later list, when-words) go in core (`packages/core/src/likely-detail.ts` or next to `windowRow` in `ring.ts`), unit-tested. `windowRow` and the panel must number naps the same way (`napsSoFar`).

### Wording

Themed labels come from `copy.ts` (`useCopy()`); screen readers keep the plain ones (`spoken`). **Times, durations, when-words and the disclaimer stay literal in every theme** (design note: nothing should read as a joke about the baby's data). `{n}` is the nap number, `{t}` the window's start clock. Classic must read exactly as design 2b, Terminal as frame 3a. The other four are drafts in each theme's existing voice (sleep, start-sleep words from `copy.ts`); a wording review of this table decides.

| Label | Classic | Terminal | Arcade | Mission Control | Match Day | Safari |
| --- | --- | --- | --- | --- | --- | --- |
| Nap title | Nap {n} likely | $ inspect nap_{n} | Save point {n} ahead | Hypersleep {n} on approach | Time-out {n} expected | Lion nap {n} coming up |
| Bedtime title | Bedtime likely | $ inspect bedtime | Final save ahead | Night dock on approach | Full time expected | Den time coming up |
| Before the range | – | eta | – | window | – | – |
| Yesterday | Yesterday | yesterday | Last round | Last mission | Last match | Yesterday |
| Usually | Usually | median | Usual run | Usual orbit | Season usual | Most days |
| Before a length | – | ran | – | – | – | – |
| Later heading | – | > queued for later | Next levels | Upcoming burns | Later fixtures | Further down the trail |
| Later nap | Then nap {n} | nap_{n} | Save point {n} | Hypersleep {n} | Time-out {n} | Lion nap {n} |
| Later bedtime | Bedtime | shutdown (bedtime) | Final save | Night dock | Full time | Den time |
| Bell, off | (icon only) | ping {t} | Alarm {t} | Comms at {t} | Whistle at {t} | Roar at {t} |
| Bell, on | (icon, filled) | ping set {t} | Alarm on {t} | Comms set {t} | Whistle set {t} | Roar set {t} |
| Skip | Skip | skip | Skip level | Scrub | Play on | Keep exploring |
| Why | Why › | man nap › | Hint › | Flight data › | Stats › | Tracks › |
| Start sleep | existing `startSleep` (Start sleep, run sleep, Pause game, Launch sleep, Call time-out, Nap time) | | | | | |

Classic "Then" prefixes only the first later item (design 2b); with a heading (other themes) no item gets a prefix. Classic's bell is icon-only (52×52) with the label spoken (`Remind me at 12:56` / `Reminder set for 12:56`); a themed bell shows its label, grid `1fr 1.4fr` with Start sleep as in frame 3a. With Playful labels off every theme reads as Classic (`copyFor`).

### Reminder (Android)

- **Set**: tapping the bell on a panel sets a reminder on this phone for that sleep at its window start; tapping it again (bell shown filled) removes it. One reminder per child: setting another replaces it. A start already passed: bell disabled.
- **Stored** per child in the widget cache (`src/widget/model.ts`, next to `reminders`), as which sleep it's for (nap number or bedtime, and the day window's start), not a fixed time.
- **Follows the window**: every refresh (`refreshWidget` → `syncNotifications`, which already recomputes the plan) finds that sleep in the current plan and reschedules to its start. Gone from the plan (skipped, the day window ended) or **any sleep started for that child** (app, widget, lock screen, the other parent's start seen on refresh) → cancelled. So the time can shift after a log, and it's late at most by the next refresh when the other phone changes things.
- **Fires**: native `AlarmManager.setAndAllowWhileIdle` (inexact; a few minutes late in Doze is fine, no exact-alarm permission) → receiver posts on the existing **`molly.reminders`** channel, the Vitamin D reminder's (silent, lock-screen visible), with its own notification id (next free after Vitamin D's 4) and tag = child id. Content plain in every theme: title `Nap 2 likely` (`Ella · Nap 2 likely` with several shown children, initial icon as other notifications), text `12:56 – 13:26`, actions **Start sleep** (existing `SLEEP_START` intent through the lock-screen action path, pending line, child in extras) and **Dismiss** (native). Tap opens Molly. Firing clears the stored reminder.
- Native API in `modules/molly-notify` (`Notifier` + `MollyNotifyModule`: schedule / cancel per child), JS wrapper in an `.android.ts` file with a plain no-op sibling. Reschedule after reboot isn't needed: the next refresh does it.
- **Permission, same as the Vitamin D reminder**: with notifications allowed the bell just works. Not allowed → tapping the bell asks again through the existing `turnOnNotifications` flow and sets the reminder only once granted; still refused (blocked) → nothing is set and the bell stays off (the toast / Settings' permission line already explain blocked). Notifications turned off later → stored reminder cancelled on the next refresh.
- Cancelled also on sign-out and child hidden.

## Decisions

| Decision | Why |
| --- | --- |
| 2b, not 2a | One tap, same place as the editor |
| Only the panel takes theme words; times and disclaimer literal | Design note; playful panel words wanted in every theme |
| Row tap opens the panel; Why and Skip move into it | One place for everything about a likely sleep |
| Any ghost opens the panel for that sleep | Decided |
| Why only for the next sleep, Skip only the next nap | Why data (`NextSleep`) and skips exist for the next one only |
| Reminder included, Android only, this phone only | Web has no local notifications |
| Fires at window start, follows the window | Decided ("ping 12:56") |
| Same silent `molly.reminders` channel as Vitamin D | No new channel, seen when the phone is picked up |
| Bell needs notification permission, asks again if missing | Same rules as the Vitamin D reminder |
| Inexact alarm | No exact-alarm permission prompt; minutes late is fine for a 30-min window |
| Notification words plain | All notifications are theme-free (see Vitamin D plan) |

## Steps

Core work is TDD (Given / When / Then, zero → one → many), UI no TDD, Android behaviour by emulator check (emulator-5554; physical-phone checks separately).

- [x] 1. **Core: panel content.** Pure function for a chosen likely sleep: title number, range, when-words, yesterday / usually, later list. Shares numbering with `windowRow`.
- [x] 2. **Copy.** New panel labels in `Copy` for all six themes as in the table, `copy.test.ts` covers every theme having them.
- [x] 3. **Panel and ghosts.** Panel component, ghosts tappable and filled when selected, row opens the panel, Why and Skip moved in, Start sleep, closing rules. Bell hidden until step 5. Playwright e2e on web: row opens the panel, ghost opens a later one, close brings tiles back, Skip works from the panel.
- [x] 4. **Core: reminder rule.** Pure function: stored reminder + current plan + running sleep + now → schedule at / cancel. TDD.
- [x] 5. **Native reminder + bell.** Channel, alarm, receiver, actions in `molly-notify`; store in widget cache; refresh reschedules; cancel paths; bell on the panel. Emulator check: set, fires, Start sleep from it, moves after a log, cancels on sleep start / skip, bell with notifications denied asks again.
- [ ] 6. **Wrap up.** Look review (web and emulator, all six themes, day and night, largest font), CLAUDE.md entry, what's left in `NOTES.md`. Done: CLAUDE.md, NOTES.md, web in all six themes day and night, emulator Classic at the largest font. Left: the rest under "Open" in `NOTES.md`.
