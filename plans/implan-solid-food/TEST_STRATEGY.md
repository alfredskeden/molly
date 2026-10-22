# Test strategy: done when every box is ticked

Tests come first for `packages/core` and the plain-TS app models (Vitest, Given / When / Then, zero → one → many, then boundaries and errors). `packages/api` is tested against the real container. Screens are covered by Playwright against the built web image, and looks by a manual review.

## API integration (`packages/api/src/entries.int.test.ts`, container from `pnpm bb:up && pnpm bb:seed`)

- [x] A finished feeding with `type: 'solid food'`, `method: 'parent fed'`, `amount: 0` and `notes` comes back with `amount` `0` and the notes unchanged.
- [x] Stopping a `molly:feeding` timer with those fields and `notes` keeps the notes.
- [x] The recent-solids fetch returns only that child's solid feedings, newest first. The filter it uses is recorded in `NOTES.md` and in `implan-molly/NOTES.md`.

## Unit (Vitest)

### `packages/core`

- [x] `isSolidFeed`: true for `parent fed` and `self fed`, false for the sides and `bottle`. `drank` tests stay green unchanged after it switches to `isSolidFeed`.
- [x] `lastOfEach`: a meal newer than the last milk feed leaves `feeding` as the milk feed. With only meals, it is `null`.
- [x] `needs` / `rhythm`: a meal doesn't refill the feed need and doesn't change the usual feed gap.
- [x] `totalsBetween`: a meal still counts in `feedings`.
- [x] `feedingForStop('solids', bottle, '  Carrot ')` gives `solid food` / `parent fed` / `0` / `'Carrot'`. The other buttons are unchanged, and carry no notes.
- [x] `recentFoods`:
  - none → `[]`
  - one note → its food
  - `"Carrot, Porridge"` → two foods
  - duplicates in different case are kept once, with the newest spelling
  - order is newest first
  - at most 5
  - blank or missing notes are skipped
  - milk feeds are ignored
- [x] Chip toggling: tapping an off chip adds it ("Carrot" → "Carrot, Porridge"); tapping an on chip removes it; typed text that isn't the chips' join turns every chip off.
- [x] `eatQuestion` / `ateLabel`: girl gives she, boy gives he, `null` gives the name.
- [x] `childPrefs`: `solids` defaults to `false`, and a stored `true` is kept.

### `apps/molly`

- [x] `parseChildPrefs`: `solids: true` round-trips; a missing or non-boolean value gives `false`.
- [x] `trackers.ts` with the fake client:
  - `logFeed` with Solids posts the solid payload with notes and the instant times
  - `stopFeeding` with Solids posts `timer`, the payload and notes
  - `addEntry` with Solids posts the payload with notes
- [x] `optimistic.ts`: the guessed meal carries its notes.
- [x] `timeline-text.ts`: a meal's title is its food, or "No food noted" when it has none; its detail is "HH:MM · Solids"; its spoken text names the food. `METHOD_LABELS` says "Solids" for `parent fed` and `self fed`.
- [x] `outcome-messages.ts`: an instant or stopped meal's toast is "Feed saved · Carrot, Porridge" (with the theme's `feed` word), with no ml and no duration.
- [x] Ring marks: a meal uses the `restaurant` icon and its spoken text names the food.
- [x] `editor-model.ts`:
  - a solid entry's draft has `method: 'parent fed'` and its notes
  - changing the notes marks the draft changed and patches `notes`
  - `withMethod` from solids to Left gives `breast milk` with no amount
  - `withMethod` from Bottle to Solids gives `solid food` with amount `0`
  - `withMethod` from Left to Bottle is unchanged
- [x] `add-model.ts`: Solids without food has a problem; with food, none; a side never needs one. Only Solids saves the typed food (`feedingForStop` drops it for milk, tested in core).
- [x] Widget model: with a meal newer than the last milk feed, the snapshot's last side is the milk feed's side.

## Playwright (`e2e/tests/solid-food.spec.ts`, seeded Baby Buddy, classic theme unless said)

- [x] With Solid food off (the default), Feed shows exactly Left, Right, Both and Bottle.
- [x] Turning it on on the child screen adds Solids. The picker shows Left / Right / Both on one row and Bottle / Solids on the next (checked by the buttons' positions).
- [x] Solids opens the panel with the field focused. The question uses the child's name while "Girl or boy" is unset, and "she" after Girl is chosen.
- [x] Save is disabled while the field is empty or only spaces.
- [x] Typing "Carrot purée" and saving writes a feeding with `solid food`, `parent fed`, `amount` 0 and notes "Carrot purée" (checked through the API), and the toast says "Feed saved · Carrot purée".
- [x] With earlier meals "Carrot, Porridge" and "Banana", the chips are Banana, Carrot, Porridge. Tapping Banana then Carrot saves "Banana, Carrot".
- [x] The Today sheet row shows the food as its title and "HH:MM · Solids" below it.
- [x] After a bottle and then a meal, the Feed tile's last feed is still the bottle.
- [x] With Time feeds on: start a feed, then "Stop and save as" → Solids → food → Save. This writes a solid feeding spanning the timer.
- [x] Editor: a meal opens with Solids selected and the food field filled; changing the food and Done patches the notes. With Solid food turned off, the same meal still opens with Solids selected.
- [x] Add entry: Feed kind Solids with a food saves a meal.
- [x] Another child with Solid food off still shows four options (per-child setting).
- [x] Existing feed specs still pass, updated wherever they assumed four options or the "Parent fed" label.

## Manual look review (web and emulator-5554)

- [x] Feed picker with five options in every theme. The labels fit on one line at 412 px wide: Solids, Bonus snack, Space food, Half-time snack, solids, Nibbles, Meal.
- [x] The knife and fork shows in every theme, inside Ribbon's circle too.
- [x] The Solids panel matches the design: field border, chips on and off, Save greyed out. The keyboard opens on Android without covering Save.
- [x] The Today row, the ring mark and the editor's five-segment row (14 px labels fit) match the design.
- [ ] Life Sim's meal toast leads with "Nom nom!".
- [ ] TalkBack reads the Solids button as "Solids" in every theme.

## Wrap-up

- [x] `drank.ts` no longer has its own `SOLIDS`; nothing else in the code lists `parent fed` / `self fed` apart from `isSolidFeed`, `METHOD_LABELS` and the API enums.
- [x] The `implan-cleanup` wrap-up sweep has run and its findings are applied or noted.
- [x] `CLAUDE.md` Trackers line and `plans/README.md` updated.
- [ ] Issue #1 rewritten in Gherkin.
- [x] `pnpm check` and `pnpm e2e` green; PR open against `develop`.
