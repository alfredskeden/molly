# Notes: day plan

## Decisions (2026-09-26)

- Build the design's choices: labels **2a** (stems above), skips **2d** (tagged note), later naps **outline**, accuracy line **on**, and its section 05 decisions (whole day on the strip; age-only days show the whole day too, since the disclaimer already says it's from age only).
- **Widgets honour skips**: the widget refresh fetches `molly-skip` notes so the widget agrees with the hero after a skip. Still next sleep only.
- **No "other phone" wording or device id.** Skip notes are plain text; the hero reads the same on both phones.
- **Undo retags** the note to `molly-skip-undone` (parents can't delete notes, see below). The note stays in Baby Buddy as a record.
- **The replay scores later planned sleeps** (step 3), as a sanity check with no target.
- **The sleep total counts the running sleep**, on Today and Tonight (asked for after seeing `0m sleep` at 22:43). Not in the design; step 1.
- Flat plan, steps in `MAIN.md`.

## Defaults chosen during planning (overturn if tests or the replay say otherwise)

- Active skips apply by order (oldest takes the next unskipped nap) rather than by matching window times, so two phones with slightly different nap-window settings still agree. The hatched block uses the window stored in the note.
- With several skips, bedtime moves earlier by the skipped naps' usual lengths added up, capped at 60 min in total. The design only shows one skip.
- Crowded stem labels: logged ones are dropped before likely ones. The design's "dropped, logged before likely" is read this way; revisit on first sight of the strip if it looks wrong.
- The day's strip end follows the bedtime window only when there is a plan; otherwise `dayWindow` as today.

## Baby Buddy notes, confirmed against the test instance (v2.11.0, :4778, 2026-09-26)

- `/api/notes/` fields: `id` (read-only), `child` (required), `note` (required string), `image` (optional upload), `time` (optional datetime), `tags` (list of names).
- `POST` with `tags: ["molly-skip"]` returns 201 for both `parent_a` and `parent_b`. The first use creates the tag (both have `core.add_tag`).
- `GET ?tags=molly-skip&min_time=…&child=…` filters exactly: a note retagged to `molly-skip-undone` no longer matches `molly-skip`.
- **`DELETE /api/notes/{id}/` is 403 for both parents** (`"You do not have permission to perform this action."`): needs `core.delete_note`, which `docs/setup.md` doesn't ask for. Hence Undo by retagging.
- `PATCH` of `tags` or `note` returns 200 for both parents.
- **The time filter is `date_min`**, as for medication (checked by the step 5 integration test: a note
  from 8 days back drops out). `min_time` in the probe above was ignored by the server.
- A bad key on a note request is `unauthorized`, as for every kind. No seeded parent is refused a
  note write, so a permission `forbidden` on notes can't be provoked; it goes through the same
  `errorKindFor` (unit-tested in `errors.test.ts`).
- The api client's page collector is shared by `listEntries` and `listNotes`.
- The probe's notes and tags were deleted afterwards with the admin key; the instance is as seeded.

## Found while building (2026-09-26, overnight run)

- **Skipping an earlier nap can move bedtime later than the unskipped plan.** The rules chain the
  whole day from the nap that opens 30 min after the skipped window, so bedtime lands later, and the
  skip then moves it at most 60 min earlier. Unit test "opens the next nap 30 minutes after an earlier
  skipped window": age guide only, woke 06:40, skip the 07:55 nap → bedtime 19:14 instead of 18:39.
  Built as written; worth a look with the replay once real skips exist.
- **The drop rule follows the first unskipped sleep.** `nextSleep` drops a window 45 min after it
  ends; with a skip, the skipped nap would drop the whole plan (and the new bedtime with it) 45 min
  after the skipped window. `dayPlan` applies the drop to the first sleep that isn't skipped instead.
- **Bedtime's floor never makes bedtime later.** Moved bedtime = max(bedtime − earlier, min(bedtime,
  last wake + last-window low end)), so a bedtime already before the floor isn't pushed back.
- `replayPlans` (core) scores planned nap N against the day's Nth nap of 15 min or more and planned
  bedtime against the logged one; days without a logged bedtime are left out. `pnpm replay:naps`
  prints it after the existing table. `--set` takes `DAY_PLAN_TUNING` keys too.

- **Crowded likely labels: the next sleep and bedtime stay.** At phone width an age-only day
  (four naps) has the last nap's label and bedtime's overlapping; the rule "logged before likely"
  said nothing about two likely ones, so the later nap's label is dropped, never bedtime. Unit test
  in `strip.test.ts`.
- `windowsBefore(entries, napWindow, now, days = 7, running = null)`: the extra `running` makes the
  live window (a running bedtime is Tonight) the same as the dashboard's. From Tonight it gives 15
  pages (the day that just ended plus 7 days of nights and days), from Today 14.
- A past day ends at its logged bedtime (design: `Saturday 06:40 – 19:25`); a past night ends at the
  next nap-window start, as a live night does.
- `todayStrip` lost its `napWindow` argument with the marker.
- Skipping: the hero's `Skip nap` / `Undo skip` follow the design (Undo skip replaces Skip nap, so a
  second skip in one wake needs Undo first on screen, though core handles several). The Why sheet
  has the same button and closes first. The toast after a skip has `Undo`; undoing says `Skip undone`.
  A 401/403 on the note goes through the key check, then shows a permission toast naming
  `core.add_note`, `core.change_note`, `core.add_tag`.
- The hero's disclaimer link (`Why ›`, `›`) is now inline in the disclaimer text, so it wraps with
  it beside the skip button (next-sleep spec's exact text match became a prefix match).
- **Pager**: React Native's `PanResponder` + `Animated`, not Gesture Handler / Reanimated: the app
  has no `GestureHandlerRootView`, and the responder system takes mouse drags on web as well as
  touch (the Playwright specs swipe with the mouse). Three pages are drawn (older, current, newer)
  and slid; a quarter of the card's width turns the page. The pager is one adjustable element for
  screen readers (`Day and night pages`, value = the page's title, span and totals; web gets
  `aria-valuetext`). `Back to now ›` is in each past page's header, so it slides with its page (decided 2026-09-27); inside the adjustable pager, screen readers page with its actions instead.
- **Past data is fetched ahead** (decided 2026-09-27, after the swipe felt laggy on a phone):
  2 s after the dashboard's first load, so the first swipe lands on a ready page; polled only while a
  past page shows. The first load itself fetches what it did before. A skeleton page stands in if a
  swipe beats the fetch. Contents: every entry of the last 8 days and
  sleeps 15 days before that for the Likely lane. The skips query reads 8 days (7 plus today).
- **Smoother swipe**: the slide runs on the native driver (off the JS thread; web has none), a flick
  turns the page as well as a quarter-width drag, and the card resets under the new page in a layout
  effect, so there's no frame of the old page after a turn. The dots are a small hint now: at most
  five, a pill for the current page, not a count of pages.
- Past-page totals use the new `totalsBetween(entries, from, to)` (core), which clips at both ends;
  `todaysTotals` is now built on it.
- `likelyFor` names each window by the logged sleep (`nap` flag), so a bedtime Molly had shown a nap
  window for counts as the bedtime in the accuracy line.
- Stems: a label that would run past the strip's end sits on its stem's left, like bedtime's; logged
  sleeps use their own `nap` flag (a bedtime at 18:40 is inside the nap window by the clock).
- Not in Playwright: the snap-back when the app returns from the background (web has no AppState
  change to fake reliably); on the device checklist.
- Not in Playwright: a child with no birth date (Baby Buddy needs one; the unit tests cover it).

## Replay on real logs (step 3)

Replayed on one family's real logs (not committed), nap window 07:00–19:00, default tuning. The logs
were fetched into a temporary folder for the run and deleted afterwards; no key or log in any file.

- The next sleep (unchanged `nextSleep`) lands in its window about half the time, with a median miss
  of 0 and a window about 40 min wide.
- Whole-day plans from the morning wake: nap 1 does as well as the next sleep; later naps as planned
  from the morning are rough (about 1 in 5 in their window, median miss over half an hour), and
  bedtime planned from the morning is rarely in its window.
- The plan chained more naps on a median day than the baby took, and planned bedtime started later
  than the real one (big outliers come from days with logging gaps).
- `napLength` 60 / 75 / 90 changes nothing: every slot has logged nap lengths, so the default is unused.
- Later naps as planned from the morning are rough. Live, each one becomes the next sleep once the
  nap before it is logged, and that is scored by the next-sleep numbers.

**Decision (2026-09-27): stop the chain at the usual number of naps.** Built as: once
the day has as many naps as the median of past days with a logged bedtime (needs 3 such days,
`DAY_PLAN_TUNING.napCountFrom`), the next planned sleep is bedtime. That bedtime never starts more
than `bedtimeWithin` (60 min) before the usual bedtime: without that limit the same logs gave
bedtime a much larger median miss (hours), because the 14-day nap count lags when a baby adds or
drops a nap and the evening after an early last nap is longer than the logged ones. With the rule
(nap count + limit, as built), far fewer naps are planned that never happen, later naps score about
the same, and bedtime is no worse than before. Planned bedtime from the morning stays rough; live
it's recomputed after every nap.

- **The rules must work for any child** (decided 2026-09-27). Everything here comes from each
  child's own last 14 days and the age guide; one family's logs are a check, not a target. Those
  logs ran late compared with the 07:00–19:00 default (3–4 naps, a late last nap and a late bedtime).

## Open

- None.
