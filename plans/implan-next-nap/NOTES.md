# Notes: next-nap prediction

## Decisions

- Design direction **1a** ("Window on the bar"): awake-for stays the headline and the bar's label shows the window as clock times. 1b is not built.
- Predict **the next sleep only** (the next nap, or bedtime once the evening window is next). Never a whole day's schedule. (Superseded 2026-09-26 by `../implan-day-plan/`: the strip shows every likely sleep until bedtime; the hero, Recent and widgets still show only the next.)
- The prediction lives in Molly, not Baby Buddy: computed on the fly from logged sleeps, nothing written to the server.
- Age comes from the selected child's `birth_date` in Baby Buddy (entered when the child was added there). There's no age setting in Molly, and the table covers all ages, not one baby.
- The age guide is **read-only**. No Settings screen for it. The "Why this window" sheet shows the band and range used.
- The **reminder notification is out** (later work). Molly has no scheduled-notification support today (no `expo-notifications`, no AlarmManager), so it needs native work of its own.
- Widgets are in, following 1a's widget layouts, with clock times only.
- The hero's "Last feed HH:MM · Left … ago" row goes, as in the 1a design: the disclaimer row takes its place, and the Feed tile below already shows "Last HH:MM · Left".
- The replay against real logs uses a real Baby Buddy, read-only. The URL and API key stay in a gitignored env file and are never written into the plan, a commit or logs.

## Defaults chosen during planning (overturn if the replay says otherwise)

- Catnaps under 15 min don't end a wake window: the anchor stays at the end of the last sleep of 15 min or more.
- History: a new sleeps-only query over the last 14 days. The dashboard's `useRecentEntries` starts at yesterday's midnight, which is too short.
- "Usual bedtime" is the median start of night sleeps (`nap: false`) over those 14 days. With fewer than 3, fall back to `napWindow.end` (the per-device setting, default 19:00) instead of a fixed 19:00.
- Naps vs night sleeps in history: use Baby Buddy's stored `nap` flag. Molly always sets it with `isNap`.
- Starting constants, from the design: the same slot over the last **14** days (decided 2026-09-25: the design's 7 days caps samples at 7, so its "history only from 10" could never happen), median ±15 min. Age guide only under 3 samples, then history counts more with each sample, fully at 10. Bedtime if the window starts within 60 min of usual bedtime. The window is dropped 45 min after it ends. Hidden if the last wake was over 6 h ago.

## Research: what is known about infant sleep timing

**No peer-reviewed table of wake windows by age exists.** A pediatric sleep physician says the popular numbers "do not seem to be based on any scientific evidence" ([Canapari](https://drcraigcanapari.com/wake-windows)). A pro-wake-window site agrees "there isn't a specific study identifying the ideal timing for each age" ([Baby Sleep Code](https://babysleepcode.com.au/blogs/sleep-tips/are-wake-windows-bs-are-they-science-based)). So the age guide only covers a baby with no history yet and acts as a sanity check. The baby's own logs are what make the window accurate.

Peer-reviewed numbers used to cross-check the guide:

| Source | Finding |
|---|---|
| Galland et al. 2012, *Sleep Med Rev* 16:213 (meta-analysis, 34 studies) | Naps/day, mean (±1.96 SD): 0–5 mo **3.1** (1.2–5.0); 6–11 mo **2.2** (0.9–3.5); 1–2 y **1.2** (0.4–2.1). Naps fall by 0.28/month from 1–6 mo, then by 0.1/month. |
| Iglowstein et al. 2003, *Pediatrics* 111:302 (Zurich, n≈450) | Night / day sleep in h, mean ± SD: 6 mo 11.0 / **3.4 ±1.5**; 9 mo 11.2 / **2.8 ±1.2**; 12 mo 11.7 / **2.4 ±1.1**; 18 mo 11.6 / **2.0 ±0.7**; 24 mo 11.5 / **1.8 ±0.5**. 100 % nap to 12 mo, 87 % at 2 y, 50 % at 3 y. Big shift from 2+ naps to 1 around 18 mo. |
| Mindell et al. 2016, *J Sleep Res* (841 babies, 157k app-logged sleeps) | 3–7 mo: two naps of about 1.5 h plus a night of about 10.5 h. Morning wake time stays steady from 5–36 mo. Bedtimes vary more than wake times. |
| [Parenting Science chart](https://parentingscience.com/baby-sleep-chart/) (summarises Galland and Sadeh 2008) | Total sleep: 0–2 mo 14–15 h, 3–5 mo 13–13.5 h, 6–12 mo 12.5–13 h. |

Pediatrician-reviewed guides, not studies: [Cleveland Clinic](https://health.clevelandclinic.org/wake-windows-by-age) (reviewed by a pediatrician) and [Huckleberry](https://huckleberrycare.com/blog/first-year-of-sleep-expectations) (reviewed by an FAAP pediatrician). Both say the first window of the day is the shortest and the one before bed the longest; neither cites data for it.

### Proposed age guide (step 1 encodes this; ranges in h:mm)

| Age | Naps | Wake window | Guides | Cross-check* |
|---|---|---|---|---|
| < 6 weeks | – | hidden | newborn sleep isn't organised enough | – |
| 6 wk – 3 mo | 4–5 | 1:00 – 1:45 | CC 1–2 h; HB 0:30–1:30 → 1–2 h | – |
| 3 – 5 mo | 3–4 | 1:15 – 2:30 | CC 1:15–2:30; HB 1:30–2:30 | ≈ 2:30 (upper end) |
| 5 – 7 mo | 3 | 2:00 – 3:00 | HB 2–3; CC 2–4 | 6 mo ≈ 3:00 |
| 7 – 10 mo | 2 | 2:30 – 3:30 | HB 2:30–3:30; CC 2:30–4:30 | 9 mo ≈ 3:20 |
| 10 – 12 mo | 2 | 3:00 – 4:00 | HB 3–4; CC 3–6 | 12 mo ≈ 3:20–4:00 |
| 12 – 18 mo | 1–2 | 3:00 – 4:30 | 2→1 nap transition | – |
| 18 – 36 mo | 1 | 5:00 – 6:00 | common tables (as quoted by Canapari) | 18 mo ≈ 5:10; 24 mo ≈ 5:20 |
| > 36 mo | – | hidden | half of 3-year-olds no longer nap | – |

\*Cross-check: (24 h − night sleep − day sleep) ÷ (naps + 1), from Iglowstein and Galland. Where both sources give data, it falls inside or at the top of the guide range. That's the sanity check behind the table. CC = Cleveland Clinic, HB = Huckleberry.

**Slot rule, derived from the guides' "first shortest, last longest" (not from data):** the first window of the day uses the lower two-thirds of the band's range, the last window before bedtime uses the upper two-thirds, and windows in between use the full range. The replay step checks whether this helps.

## Decisions made while building (steps 1–2)

- `sleepGuide(birthDate, now)` returns `{ band: '3–5 months', wake: { min, max } }` in minutes; `wakeForSlot(wake, 'first' | 'middle' | 'last')` applies the slot rule. `ageInMonths` counts a month on the monthly birthday, or on the last day of a shorter month (born the 31st).
- The guide starts on day 42 (6 weeks) and stops on the 36-month birthday.
- `nextSleep` is also **hidden at night**: once the day window is `night` (bedtime logged, or evening with no morning wake), a waking isn't predicted. Night wakings are out of scope.
- History weight = (samples − 2) ÷ 8, clamped to 0–1: 3 days → 1/8, 6 → 1/2, 10+ → history only. Both ends blended the same way; start and end rounded to the minute.
- States: `before` until `start`, `open` from `start` until `end`, `past` from `end`, dropped once more than 45 min past `end` (exactly 45 is still `past`). Hidden when more than 6 h awake (exactly 6 h is shown).
- A past day is its morning wake (`morningWake`, now exported from `day-window.ts`) plus the sleeps of 15 min or more that start before the next morning's nap-window start, so a day without a logged bedtime can't borrow the next day's naps. Its slot-n sample counts only if that sleep has `nap: true`; its bedtime is the first sleep with `nap: false`.
- Usual bedtime compares wall-clock minutes (a bedtime after midnight counts as late). With fewer than 3 logged bedtimes, the nap-window end.
- Bedtime is chosen when the nap window would start at or after usual bedtime − 60 min (exactly 60 counts).

## Replay against real logs (step 3, 2026-09-26)

Replayed on one family's real logs (not committed): about two months of sleeps, mostly imported
from another sleep app, so the `nap` flags were set there, not by `isNap` (a "nap" starting late in
the evening, a night sleep starting in the morning). That baby's day ran late (late morning wake,
bedtime late in the evening, last nap often ending after 19:00), so the replay was run with a later
nap window as well as the default 07:00–19:00. Going back to sleep after a night waking is hidden on
purpose and left out of the totals.

Knobs tried (`--set`): the spread (15 / 20 / 25 / 30), `historyDays` (7 / 14 / 21), the blend
thresholds, the catnap cut-off (10–25 min), the slot rule (off / stronger), `bedtimeWithin`
(30 / 60 / 90), a code change choosing bedtime when the *bedtime* window lands near the usual
bedtime, age guide only, and flags recomputed with `isNap` (`--reflag`). What they showed:

- A wider spread raises the hit rate, but only by widening the window; ±20 min was the best trade.
- `historyDays` 7 never reaches history-only (at most 7 samples); 21 was worse than 14.
- The blend thresholds, catnap cut-off, slot rule and `bedtimeWithin` either changed nothing or made
  it worse (a 25 min catnap cut-off clearly worse).
- Age guide only can score well, but only with a window far wider than history's.

Decided (2026-09-26): good enough. Babies skip naps, sometimes by hours, so a rough estimate is
what's wanted.

**Kept: spread ±20 min** (`NEXT_SLEEP_TUNING.spread`). Everything else stays at the design constants: no other knob improved the hit rate without widening the window. The slot rule has no measurable effect here (the band's range matters less than the history), but it's cheap and follows the guides, so it stays.

The final run met the targets (history windows hit at least 50 %, median width 45 min or less,
median miss 20 min or less). Where history counted, the tuned window beat the age guide narrowed to
the same width around its centre: history beats age at equal width.

What the replay showed beyond the numbers:
- **The nap window matters a lot.** `dayWindow` finds the morning wake only within ±2 h of the nap-window start, and a sleep running past the nap-window end counts as bedtime, so with 07:00–19:00 a family's late naps look like bedtime and most bedtimes are hidden. The UI step should make sure the nap window in Settings is easy to find.
- **Naps are centred** (median a few minutes late). **Bedtimes run late**, because with fewer than 10 logged bedtimes the age guide's last-window range (1:40–2:30 at 3–5 months) can be well short of a baby's real time awake before bed. More logged days fix this by themselves.
- **Still hidden bedtimes** come from three causes: "dropped" (the model expected one more nap and the baby stayed up for hours until bed; skipping the last nap isn't predictable from these inputs), "night" (an imported "nap" running past the nap-window end, which Molly counts as bedtime, or no morning wake found), and more than 6 h awake.

## Built in step 4

- `NextSleep` gained `slot` (`first` / `middle` / `last`) so the sheet can name the window ("Usual first wake window", "Usual wake window", "Usual time up before bed").
- New query `useRecentSleeps` (`['sleeps', childId]`, the last 15 days' sleeps), persisted with the cache and refreshed after every write. The dashboard merges it with the entries query by id (entries win), so a just-stopped sleep's guess counts at once. No prediction until it has loaded.
- Texts and bar geometry live in `features/dashboard/prediction-text.ts` (unit-tested); `Hero.tsx` `NextSleepBar` draws them, `WhySheet.tsx` is the sheet. The "Why ›" row is 44 px tall (the design's 28 px is below the touch minimum). The hero keeps its "Last feed" row whenever there's no prediction.
- The sheet's age row reads "4 months" (no "editable in Settings", since the guide isn't editable); "Weighted towards" is "Age guide", "Your logs and age" or "Your logs".
- e2e (`next-sleep.spec.ts`) sets the test child's birth date to 4 months and 5 days before the seeded day, and puts it back afterwards. Baby Buddy requires a birth date, so "no birth date" is covered by the unit tests only. The browser clock starts 30 s before the asserted time: a paused clock stops the app loading, and a clock started on the minute reads "24m" instead of "25m". `clock.fastForward('01:00')` is one *minute*.
- `errors.spec.ts` now expects 5 persisted queries (sleeps added).
- `edit.spec.ts` ("a sleep moves by five minutes") and `history.spec.ts` ("See all opens History") fail just after midnight with or without this work: their seeds cross midnight. Not fixed here.

## Built in step 5

- `ghostBlock(window, likely)` in `core/src/strip.ts`: the part of the likely window inside the Today card's window, or null when none of it is. `TodayCard` draws it in the sleep lane as a dashed `sleep-ink` border on `sleep-bg` (a dashed border on all four sides draws fine; only one-sided dashes fail on Android), at least `MIN_BLOCK_WIDTH` wide.
- Recent's `LikelyRow` sits above the entries once they've loaded: dashed dot, start time, "Nap likely" / "Bedtime likely", "until HH:MM". A plain `View`, not a button; screen readers get "Nap likely from 08:55 until 09:25. An estimate."
- Both come from the same `prediction` as the hero, so they go away together when a sleep starts or the window is dropped.

## Built in step 6

- `fetchSnapshot` also reads the last 15 days of sleeps and the children (for the birth date) and calls `nextSleep` with the device's nap window; the snapshot keeps only `nextSleep: { kind, start, end }`. Older caches parse with `nextSleep: null`.
- `widgetView` drops it again while a sleep timer is in the snapshot or once it's more than 45 min past the end, since a widget can draw from a stale cache. It hands the layouts three clock-time strings: `nap 08:55` / `bed 18:45` (1×1), `Nap 08:55 – 09:25` / `Bedtime …` (2×2), `nap 08:55 – 09:25` (rows, as `Awake 2h 34m · nap …`).
- Emulator (2026-09-26, test Baby Buddy, child 4 months, wake 07:00): 4×3 row `Awake 1h 14m · nap 08:15 – 09:05`; 2×2 `Nap 08:15 – 09:05` under the wake; 1×1 `nap 08:15` above Start (at 12 sp it clipped to `nap 08:…`, so it's 11 sp); after Start on the widget the text was gone on the next draw; tapping the row text opens the app on the hero. The Pixel launcher's 2-row Molly widget is still over 220 dp, so it drew the 4×3 layout; the 4×2 `Medium` layout uses the same `awake()` text.
- `pnpm install -r` of the APK briefly blanks the home-screen widgets until the launcher rebinds them (a few seconds).

## Look check (2026-09-26, emulator)

- Night theme at font scale 2.0: the hero's window label and state wrap onto two lines, the disclaimer wraps and its "›" drops to its own line, the dashed strip block and widgets are unchanged; nothing clips.

## Code facts found while planning

- `Sleep` has `nap: boolean` (`packages/api/src/types.ts`). `Child` has `birth_date` and `birth_time`; `useChildren()` fetches them, but nothing uses `birth_date` yet.
- `dayWindow` (`packages/core/src/day-window.ts`, from `implan-today-window`) returns `wake`, the morning wake that opened the current day. Counting windows since `wake` gives the slot number.
- There is no nap-window bar in the app yet, despite the design's "built on the nap-window bar from the redesign mock". The bar is new (`Awake` in `apps/molly/src/features/dashboard/Hero.tsx`). In the design the scale runs from the wake (0 %) to about 15 min past the window's end (100 %).
- The widget's headless refresh (`fetchSnapshot` in `apps/molly/src/widget/model.ts`) only fetches timers and the latest of each kind. New snapshot fields need backward-compatible parsing (see how `lastFeedingMethod` was added).
- There's a reusable bottom sheet in `apps/molly/src/components/sheet.tsx`. It has to be mounted outside the ScrollView (see `MedicationSheet`).

## Open

- Nothing open.
