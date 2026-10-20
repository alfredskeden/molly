# Notes

## Decisions

- Setting per device, Android and web, off by default (instant feeds), named "Time feeds" (draft).
- Instant feed: end now, start one minute before.
- No timer in instant mode; a timer from another phone still shows and stops.
- Bottle amount row starts at the last bottle (type too), falls back to the child's bottle prefs. −5 / +5, tap the number to type.
- Widget: side buttons directly; Bottle saves the last bottle with no amount step.
- Toast after an instant feed: Adjust time + Edit, as after a stop.
- Same amount row in the timer stop picker (app) and Add entry.
- No design file.

## Facts from the code

- Stop picker: `FEEDING_STOPS` and panel `stopFeed` in `src/app/(main)/index.tsx`; bottle from `feedingForStop` (`packages/core/src/feeding.ts`) with `useChildPrefs().bottle`.
- `DEFAULT_BOTTLE` = formula, 120 ml (`packages/core/src/children.ts`).
- Widget intents `FEED_START`, `FEED_STOP_LEFT|RIGHT|BOTTLE|BOTH` in `src/widget/model.ts`. Notification Left / Right / Bottle in `src/notification/model.ts`.
- `adjustTime` moves only a stopped feed's `end` today.
- The editor already has a feed amount ±5 stepper (`StepperRow` in `features/dashboard/Editor.tsx`).

## Baby Buddy answers (step 1, v2.11.0 test container; `packages/api/src/instant-feeds.int.test.ts`)

- A finished feeding one minute long is accepted (`duration` `00:01:00`).
- A feeding starting exactly at the previous one's end is accepted, and so is a zero-length one there (start = end, `00:00:00`). So `instantFeedTimes` can clamp the start to the previous end with no extra rule.
- Only the **start** is checked against the server clock: an end in the future (tested +1 min and +2 h) is accepted, a start in the future is 400 `{"start":["Date/time can not be in the future."]}`. An instant feed from a phone clock up to a minute fast still saves (its start is now − 1 min).
- `method=bottle` filters `/api/feedings/` (an unknown value is 400 on `method`), newest first with `limit`. `amount__isnull` is not a filter (ignored). The client's `getRecentBottles(child)` reads one page of 10 bottles; `lastBottle` picks the newest with an amount from it.

## Writes (step 3)

- `logFeed` looks up the previous feed itself (`getLatestEntry('feeding', child)`, now in `TrackerClient`) instead of taking `lastFeedEnd`: the server's newest feed also covers the other parent's, which a cache can miss. One extra GET, as stops look the timer up first.
- The outcome is `stopped` with `instant: true`. `outcomeToast` then says `Feed saved · Left` (a bottle `· Bottle 135 ml`), no duration, and Adjust targets `{ kind: 'feedingAt', id, lengthMs }` titled "When was it?" with no `after`; `adjustTime` PATCHes start and end together.
- Optimistic `fed(...)` in `optimistic.ts` adds a one-minute guess (negative id) to the `entries` cache.

## App (step 5)

- Feed tile: a running feed timer opens the stop picker as before; otherwise Time feeds on starts a timer, off opens the instant picker (panel `feed`, title `copy.feedAs`). Bottle in either picker opens the amount row (`BottlePanel`, panels `bottleStop` / `bottleNow`; X goes back to its picker). Screen readers hear the instant tile as plain `Feed`, like Diaper and Medicine.
- The amount row (`features/feed/BottleAmount.tsx`, state `amount-input.ts`) is `StepButton`s (now exported from `ui.tsx`) around a big number with the see-through `TextInput` (testID `bottle-amount`); the amount reads "Amount 130 millilitres", Save "Save 130 millilitres". Add entry shows it under the Bottle segment for a finished bottle; an empty typed amount blocks Save ("Type an amount").
- Last bottle in the app: `useLastBottle` (`queries.ts`) over the `bottles` query (`getRecentBottles`, persisted, not polled) plus the entries' feedings, falling back to the child's bottle. The bottle type saved is always the last bottle's.
- The instant toast has Edit too (opens the feed in the editor): today's stop toast has only Adjust time.
- E2E: timer-mode specs pass `feedTimer: true`; new `e2e/tests/instant-feeds.spec.ts`. `errors.spec.ts` counts 6 persisted queries (bottles).

### Drafted words (wording not yet reviewed)

- Settings switch: **Time feeds** — "Start and stop a timer for each feed. Off, one tap saves the feed".
- Instant picker title `feedAs`: Classic `Save feed as`, Arcade `Power-up with`, Mission Control `Refuel with`, Match Day `Water break with`, Terminal `feed --side`, Safari `Which side?`, Ribbon `Save feed as`, Life Sim `Feed with`.
- Amount panel title `Bottle` (plain, every theme); toast `Feed saved · Left` / `Feed saved · Bottle 135 ml`; Adjust sheet title "When was it?".

## Widget and notification (step 6)

- Intents `FEED_LOG_LEFT|RIGHT|BOTTLE|BOTH` run `logFeed` (pending `Saving…`). `widgetView` takes `feedTimer` (sync and task handler pass the setting); `feeding.instant` draws Left / Right / Bottle in place of Start (Medium's lead tile: all four, two rows); 1×1 Feed opens the app (`+ Feed`). A running timer's stop buttons win in every layout.
- The snapshot keeps `lastBottle` (`getRecentBottles` per refresh, `lastBottle` falling back to the child's bottle; old caches load it as null). `tapContext` gives the tapped child's snapshot's `lastBottle` as the bottle, so the widget's Bottle and the notification's `FEED_STOP_BOTTLE` both save the last bottle. `applyOutcome` moves `lastBottle` after a saved bottle; an instant feed (`outcome.instant`) leaves a running feed timer and the lock-screen timers alone.
- Emulator-5554 (fresh release build, test Baby Buddy, Life Sim): app Feed → Bottle → typed 95 → Save saved 95 ml, one minute, no timer; widget showed Left / Right / Bottle, Bottle showed `Saving…` then `Saved` and saved 95 ml (the last bottle), no timer; Time feeds on redrew the widget with Start; widget Start, then the notification's Bottle stopped it at 95 ml. Emulator left with Time feeds off.

## Look review (step 7)

- Web (390 px): Classic day and night, Ribbon day: picker, amount row and toast. Emulator: Life Sim night at font scale 2.0: picker and amount row fit, the amount stays on one line.
- Found and fixed: with Adjust time and Edit both on it, the toast squeezed its words to three lines (`Feed / saved · / Left`). A toast with more than one action now puts them on a row of their own under the words (`toast.tsx`, `actionRow`); one action stays inline as before.
- Not yet done: a real TalkBack pass on the emulator (the labels are checked by Playwright: `Amount 130 millilitres`, `Save 130 millilitres`, `More: +5 ml`, the typing field `bottle-amount` with its hint).

## Open
- Wording review of the drafted words above (step 7).
- TalkBack pass over the picker, amount row and typing field.
