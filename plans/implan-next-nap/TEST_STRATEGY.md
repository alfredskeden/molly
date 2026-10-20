# Next-nap prediction: Definition of Done

Done when every item below is true. The method follows [`../implan-molly/TEST_STRATEGY.md`](../implan-molly/TEST_STRATEGY.md): unit TDD for `packages/core` (Given / When / Then, zero → one → many, then boundaries), Playwright on the web image for screens with the clock fixed by `page.clock`, a manual device checklist for widgets, and manual review for looks. The replay (step 3) adds one more kind of evidence: numbers from real logs.

All times below assume the default nap window 07:00–19:00 and a child aged 4 months unless stated.

## Nothing regresses

- [ ] `pnpm check` is green, including `check:boundaries` (core and api import no React, Expo or `apps/`) and `check:web-bundle` (no widget code on web).
- [ ] Every existing Playwright spec still passes. The Today card, Recent, the running-sleep hero and History behave as before.

## Age guide (`packages/core`, unit TDD)

- [ ] Every band from `NOTES.md` is encoded with its source in a comment, and each age maps to the right band, including the day a band starts and month-end birthdays.
- [ ] Under 6 weeks and over 36 months: no guide.
- [ ] The first window of the day gets the low end of the band's range, the last window before bedtime the high end, and the ones in between the full range (or whatever slot rule the replay kept).

## `nextSleep` (`packages/core`, unit TDD)

- [ ] Hidden: a sleep timer running, no finished sleep in the last 6 h, no birth date, age outside the guide. Exactly 6 h since the anchor is still shown.
- [ ] Age only: one morning wake at 06:40 and no history gives the guide's first-window range from 06:40, `source: 'age'`.
- [ ] State: before the window, inside it, after it, and hidden from 45 min after its end (exactly 45 min is still `past`).
- [ ] History: with the same slot logged on N of the last 14 days, the window follows their median. At 2 samples it's age only. At 3 and 6 the blend sits between age and history. At 10 or more it's history only. (Or the tuned thresholds.)
- [ ] A catnap under 15 min neither moves the anchor nor counts as a slot. One of 15 min or more does both.
- [ ] Bedtime: when the window would start within 60 min of the median night-sleep start, it's `kind: 'bedtime'` with the last-window range. With fewer than 3 night sleeps logged, `napWindow.end` stands in, and a non-default nap window moves it.
- [ ] A skipped nap (awake past the window, no sleep logged) stays on the same slot and ends in `past`, never predicting the slot after.
- [ ] A day across a clock change gives the same window in local time as any other day.

## Replay against real logs (step 3)

- [x] `scripts/replay-naps.ts` replays real sleeps, fetched with GET requests only. The key is in no file, and neither it nor the raw logs are committed or printed.
- [x] Each prediction uses only the data logged before its `now` (30 min before the real sleep started). A unit test on the replay's slicing function shows a later sleep can't leak in.
- [x] The report gives, split by source (age / blend / history) and by nap vs bedtime: count, hit rate, median and 90th-percentile miss in minutes, and median window width. The baseline run (design constants) and the final run are both summed up in `NOTES.md`, with the constants chosen.
- [x] Windows driven by history beat age-only windows on the same days: a higher hit rate at a similar or narrower width.
- [x] Targets for the final run (provisional, confirmed after the baseline; met: see `NOTES.md`): history windows hit **at least 50 %** of naps and bedtimes, with a median width of **45 min or less** and a median miss of **20 min or less**.
- [x] The unit tests use the tuned constants.

## Dashboard (Playwright, fixed clock, seeded sleeps)

- [x] Before, at 08:30 with the window at 08:55 – 09:25: the hero reads "Awake for", the bar label reads `Nap likely 08:55 – 09:25` and `Opens in 25m`, and the disclaimer row reads `Estimate · not medical advice` and `Why ›`. The "Last feed" row is gone.
- [x] Open at 09:14: `Window open`. Past at 09:45: `Past the window`. At 10:15 (45 min after the end) the bar is gone.
- [x] Age only (a child with fewer than 3 matching days): the disclaimer reads `Based on age (N months) only · not medical advice`.
- [x] Bedtime in the evening: `Bedtime likely HH:MM – HH:MM`.
- [ ] A running sleep, or a child without a birth date: no bar, no ghost, and the hero is otherwise as before.
- [x] `Why ›` opens the sheet with awake since, the usual window for the slot (with the day and sample count), the age guide band and range, and "weighted towards". `Done` and the scrim close it.
- [x] The Today strip shows a dashed block over the window, and Recent starts with a `Nap likely … until …` row that can't be tapped. Both disappear when a sleep starts or the window is dropped.
- [ ] Two phones (two parents) with the same data show the same window.

## Widgets (unit tests, then device checklist)

- [x] Widget model unit tests: the snapshot carries the prediction, an old cache without it still parses and shows today's widgets, and a hidden prediction adds no text.
- [x] On the emulator: the 1×1 shows `nap 08:55`, the 2×2 shows `Nap 08:55 – 09:25` under awake-for, and the 4×2 and 4×3 sleep row show `Awake 2h 34m · nap 08:55 – 09:25`. They show clock times only, and tapping the text opens the app on the hero.
- [x] After a sleep is started from the widget, the prediction text is gone on the next draw.

## Looks (manual review, web and emulator)

- [ ] The hero bar, labels, disclaimer row, Why sheet and ghosts match design 1a in the Day and Night themes. The `past` state is neutral, never red.
- [ ] At the largest font scale nothing clips, and screen readers read the window as clock times plus its state.
