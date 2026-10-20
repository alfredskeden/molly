# Instant feeds

## Outcome

Parents stop timing feeds. With the new per-device setting **Time feeds** off (the default), tapping Feed saves a finished feed right away instead of starting a timer:

```
Feed tile ─► Left | Right | Both | Bottle
               │      │      │       │
               └──────┴──────┘       ▼
                  saved now      ┌─────────────────────┐
                                 │  −5    130 ml    +5  │  ← starts at the last bottle
                                 │        [ Save ]      │     tap the number to type it
                                 └─────────────────────┘
                                         │
                                       saved now
```

A saved instant feed ends now and started one minute earlier (see Decisions). The toast that follows is the same one a stopped feed gets today: **Adjust time** (moves the whole feed) and **Edit**.

With Time feeds on, everything works as today, except that Bottle in the app's stop picker now asks for the amount too.

## Why

Today a feed means: Start, wait, open the stop picker, pick the side or Bottle, and for a bottle open the editor to fix the amount (it's always saved at the child's default bottle, 120 ml unless changed). The parents never use the duration. They want one tap for a breastfeed and a quick amount for a bottle.

## The pieces

### The setting

`feedTimer: boolean` in `Settings` (`apps/molly/src/storage/types.ts`), default `false`, parsed like `haptics`, kept on sign-out (`settingsAfterSignOut`) because it belongs to the device. Shown as a switch in Settings, labelled **Time feeds** with a line saying what off means (draft wording, to be reviewed). Web and Android alike.

### Pure rules (`packages/core`, TDD)

- **Instant feed times**: `instantFeedTimes(now, lastFeedEnd?) → { start, end }`. `end = now`, `start = now − 1 min`, but never before the end of the child's previous feed (Baby Buddy refuses overlapping feeds; see `implan-molly/NOTES.md` "Confirmed against the live API"). Whether a zero-length feed is accepted when the previous one ended this minute is checked in step 1.
- **Last bottle**: `lastBottle(feedings, defaults) → BottleDefaults`. The newest feeding with method `bottle` and an amount gives `type` and `amount`. With none, the child's bottle prefs (`childPrefs(...).bottle`, default `DEFAULT_BOTTLE`). Extends `packages/core/src/feeding.ts`.
- **Amount stepping and typing**: −5 / +5 never go below 5 ml. Typed digits make a whole number of up to 3 digits, and an empty or zero value can't be saved. Mirror the typed time in `adjust.ts` (`typedDigit` / `typedTime`) in shape, not by sharing code.

### Writes (`apps/molly/src/actions/trackers.ts`)

- `logFeed(client, { child, button, bottle, now, lastFeedEnd })` posts a finished feeding (`client.logFeeding`, which already exists for Add entry) with `feedingForStop(button, bottle)` and the instant times. It returns `{ type: 'stopped', created: { kind: 'feeding', entry } }` like a timer stop, so toasts, optimistic updates and the widget's `applyOutcome` treat it the same way. Unit tests use the fake client, as for the other actions.
- `stopFeeding` and `addEntry` already take `bottle: BottleDefaults`. The app now passes the amount the parent chose, not the child's prefs.
- **Adjust time on an instant feed** moves start and end together (the one-minute length stays). Today a stopped feed's Adjust moves only its `end` (`adjustTime`, `AdjustTarget`), so this needs a target the toast can tell apart, e.g. kind `feedingAt`.
- Optimistic: an instant feed adds a guessed finished feeding (negative id) to the `entries` cache, as Add entry's save does (`src/features/dashboard/optimistic.ts`).

### App (`src/app/(main)/index.tsx` and `features/dashboard/`)

- **Feed tile** in instant mode opens the feed picker panel (the panel that replaces the tiles, today `stopFeed`) with Left / Right / Both / Bottle. Left / Right / Both save at once and close the panel. Its words come from each theme's `copy.ts` (today the tile says Start / Stop feed per theme), so every theme needs an instant-mode label: draft them and list them for a wording review.
- **Bottle amount row**: one shared component (−5, the big amount, +5, Save). It starts at `lastBottle(...)`, and tapping the amount opens the number keyboard through a see-through `TextInput` over the number, as `AdjustSheet` does (`features/toast/toast.tsx`, not `opacity: 0`, which hides it from TalkBack). Build it from the existing `StepperRow` (`Editor.tsx`) where that fits. It is used in three places:
  1. the instant feed picker's Bottle,
  2. the timer stop picker's Bottle (Time feeds on, or a timer started on the other parent's phone),
  3. Add entry's Bottle (`features/add/AddSheet.tsx`, `add-model.ts`), in both modes.
- A feed timer that's already running (started on another phone, or before the setting changed) shows and stops exactly as today, whatever this phone's setting is.
- The last bottle in the app comes from the feedings the dashboard already has (the `entries` query). If that window can miss the last bottle, use a `limit=1` fetch instead (step 1 checks the filter).

### Widget (Android)

- In instant mode the Feed row shows the side buttons directly, the same buttons each layout shows today while a feed timer runs (Left / Right / Bottle, plus Both where today's layout has it). They are new intents (e.g. `FEED_LOG_LEFT` …) in `src/widget/model.ts` that call `logFeed`, with pending label `Saving…` and the usual `applyOutcome`.
- **Bottle on the widget saves the last bottle at once**: no amount step. The refresh's snapshot gains the last bottle's type and amount (`lastBottle` over what it fetches, falling back to the child's prefs), and the toast-less fix is to open the app and edit.
- The widget reads the device setting when it draws and when it handles a tap. A tap whose intent no longer matches the setting (setting changed between draw and tap) does what the button said.
- A running feed timer still draws as today (stop buttons), in either mode.

### Lock-screen notification

No change. It only exists while a timer runs, and its Left / Right / Bottle stop buttons keep saving the last bottle like the widget (switch `FEED_STOP_BOTTLE` to `lastBottle` too, so both surfaces agree).

## Decisions and why

- **Off by default, per device**: decided. Each parent's phone or browser decides; there's no shared config (as with every other setting).
- **One minute, ending now**: a real start and end keep every existing rule working (ring marks, totals, `drank`, needs, the editor's "end a minute after start"), and a one-minute feed draws as a mark, not an arc. It also keeps a distance from Baby Buddy's overlap check.
- **No timer in instant mode**: the setting decides. Logging a past or long feed is what Add entry is for.
- **Bottle amount starts at the last bottle**: amounts creep up week by week, so the last one is usually a tap or two away. Type follows the last bottle too, with no choice on the row; change it in the editor if needed.
- **Widget Bottle saves without asking**: speed over confirmation there. The app's Edit fixes a wrong amount.
- **Same amount row everywhere in the app**: one control, one habit, and a timed bottle stop no longer saves a wrong default.
- **No design file**: reuse the picker panel and `StepperRow` styling. A look review at the end, as usual.

## Boundaries

- No change to sleep, diapers, medicine, predictions, the ring's drawing, `drank` or needs. They read feedings as before.
- The child's bottle prefs stay (fallback when there's no earlier bottle). No new per-child setting.
- No undo button. Edit and Delete in the editor cover mistakes.
- Baby Buddy timers named `molly:feeding` still work and stay the shared state for parents who keep timing.

## Steps

1. [x] Baby Buddy facts, as `packages/api` integration tests against the test container (`pnpm bb:up && pnpm bb:seed`): a finished feeding one minute long; one whose start equals the previous feed's end; one with start = end; the `method=bottle` (and `limit=1`) filter on `/api/feedings/`; an end a few seconds in the future (a fast phone clock). Record the answers in `NOTES.md` and `implan-molly/NOTES.md`, and adjust `instantFeedTimes` if needed.
2. [x] Core, TDD: `instantFeedTimes`, `lastBottle`, amount stepping and typing.
3. [x] Writes: `logFeed`, instant Adjust time (start and end together), optimistic guess; unit tests with the fake client.
4. [x] Setting: `feedTimer` in `Settings` (parse, default, sign-out), the switch in Settings.
5. [x] App: instant feed picker on the Feed tile, the shared bottle amount row in all three places, per-theme labels drafted. Playwright cases (see `TEST_STRATEGY.md`).
6. [x] Widget and notification: instant feed buttons, last bottle in the snapshot, `FEED_STOP_BOTTLE` on the last bottle. Check on emulator-5554.
7. [ ] Look review (web and emulator, Molly Classic and a decorated theme, day and night, largest font, TalkBack), the wording review, then add the plan to the list in `CLAUDE.md`.

## Assumptions

- A feed's `type` for Left / Right / Both stays `breast milk` (`feedingForStop`).
- Baby Buddy stamps nothing for a finished feeding: Molly sends start and end, as Add entry already does.
- The other parent may still be in timer mode, so both kinds of feed show up in the same lists and must look the same once saved.
