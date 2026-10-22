# Solid food

GitHub issue #1. Design: `Molly Solid Food.dc.html` (private design source; what it shows is written out below). Branch `feature/solid-food` from `develop`, PR with `--base develop`.

## Outcome

A per-child **Solid food** switch. When it is on, Feed gets a fifth option, **Solids** (icon `restaurant`). Tapping it asks "What did she eat?", and Save writes a Baby Buddy feeding:

| Field | Value |
| --- | --- |
| `type` | `solid food` |
| `method` | `parent fed` (always; self fed isn't offered) |
| `amount` | `0` (no amount is asked for) |
| `notes` | the food, e.g. `Carrot, Porridge` |
| `start` / `end` | instant: one minute ending now, as other instant feeds. Time feeds on: the timer's span |

```
Feed ─► [ Left ][ Right ][ Both ]
        [  Bottle  ][  Solids  ]──► ┌──────────────────────────────┐
                                    │ What did she eat?            │
                                    │ [ Carrot, Porridge        ]  │ ← keyboard opens at once
                                    │ (✓Carrot)(✓Porridge)(+Banana)│ ← five recent foods
                                    │ [          Save          ]   │ ← off while empty
                                    └──────────────────────────────┘
```

Off (the default), nothing changes for that child: Feed keeps its four options.

## What it looks like (from the design)

1. **The setting**: on the child screen (`apps/molly/src/app/(main)/child/[id]/index.tsx`), a switch row "Solid food" / "Adds Solids to Feed", in the same card as and above "Vitamin D reminder". When the Vitamin D row is hidden (no notifications, e.g. web), the card holds the Solid food row alone.
2. **Feed with five options**: Left / Right / Both on the first row, Bottle / Solids on the second. The same layout for the instant picker ("Feed", Time feeds off) and the stop picker ("Stop and save as", Time feeds on, with Edit start and Cancel feed under it). Every option stays one tap to reach.
3. **The Solids panel** replaces the picker, like the Bottle panel does:
   - Title "Solids" with a close button.
   - The question, 22 px heavy text: "What did she eat?", "What did he eat?" or "What did Ella eat?" (see Decisions).
   - A 60 px text field with a 2 px `feed-mid` border, placeholder "e.g. Carrot purée", focused when the panel opens.
   - Up to five chips (40 px pills) of recent foods. Off: `+` and surface colours. On: `✓` with `feed-bg` / `feed-ink` / `feed-mid` edge. Tapping a chip adds or removes it; the field shows the chosen chips joined with ", ". Typing in the field takes over, and the chips then show as off.
   - Save (58 px, `check` icon). With an empty or blank field it is greyed out (`line` / `muted`) and does nothing.
   - Toast: "Feed saved · Carrot, Porridge".
4. **Everywhere else a feed shows**:
   - **Today sheet / timeline row**: the food is the title (one line, ellipsis), "12:10 · Solids" is below it, and the icon is `restaurant`. There's no amount or duration on the right. A solid without notes reads "No food noted".
   - **Editor**: the feed kind row has a fifth segment, Solids. With Solids chosen, the amount row is replaced by a food field labelled "What she ate" (same pronoun rule). Add entry's feed kind row gets the same fifth segment and the same field.

## The pieces

### API (`packages/api`)

- `NewFeeding` and `StopFeeding` (`src/types.ts`) gain an optional `notes`. `editEntry` can already patch it.
- A fetch of the child's recent solid feedings for the chips, shaped like `getRecentBottles` (`src/client.ts`, about line 195), filtered by type or method, whichever step 1 confirms.

### Rules (`packages/core`, TDD)

- **Solid or milk**: `isSolidFeed(feeding)` is true for method `parent fed` or `self fed`. Put it in `feeding.ts`, and use it in place of `drank.ts`'s private `SOLIDS`.
- **Milk-only "last feed"**: `lastOfEach` (`latest.ts`) picks the newest *milk* feeding, and `needs.ts` (`rhythm`, `lastFeed`) uses milk feeds only. `totalsBetween` (`totals.ts`) keeps counting every feeding. The widget's last side and "last feed" follow automatically, because they read `lastOfEach`. `logFeed`'s overlap guard keeps using the newest feeding of any kind (`client.getLatestEntry('feeding')`, `apps/molly/src/actions/trackers.ts:160`), which is correct: Baby Buddy refuses overlaps with solids too.
- **Payload**: `FeedingStopButton` gains `'solids'`, and `feedingForStop('solids', bottle, food)` gives `{ type: 'solid food', method: 'parent fed', amount: 0, notes: food }`. Trim the food. The caller never passes an empty one.
- **Recent foods**: `recentFoods(feedings, limit = 5)` takes solid feedings and returns food names (rule in `NOTES.md`). **Chip toggling**: a pure function from (chosen chips, typed text, tapped chip) to the new field text, so the panel stays thin.
- **Wording**: `eatQuestion(name, sex)` gives "What did she / he / {name} eat?", and `ateLabel(name, sex)` gives "What she / he / {name} ate".
- **Child prefs**: `ChildPrefs.solids: boolean`, default `false` (`children.ts`). Parse it in `parseChildPrefs` (`apps/molly/src/storage/types.ts`); a missing value means off.

### App (`apps/molly`)

- **Child screen**: the switch row, saved with the child's other prefs.
- **Picker** (`features/dashboard/Picker.tsx`): `columns` also accepts a list of per-row counts (`[3, 2]`), so rows aren't left to wrapping. A plain number keeps today's behaviour for Diaper and Medicine.
- **Feed options** (`src/app/(main)/index.tsx`, `FEEDING_STOPS`, `feedOptionsFor`): add Solids when `childPrefs.solids` is on. Its icon is `restaurant` (add the glyph to `theme/symbols.ts`; Ribbon shows it in its circle, and Safari falls back to the glyph). Solids opens a new panel state (e.g. `'solidsNow'` / `'solidsStop'`, beside `bottleNow` / `bottleStop`). Save calls `logFeed` or `stopFeeding` with the food.
- **Solids panel**: a new `features/feed/SolidsPanel.tsx` next to `BottlePanel.tsx`. It gets the recent foods from a query keyed by child, plus the solids in the dashboard's `entries` (as `useLastBottle` does in `features/dashboard/queries.ts`).
- **Writes** (`actions/trackers.ts`): `logFeed`, `stopFeeding` and `addEntry` pass the food through `feedingForStop`. `FEED_BUTTONS` gains Solids. The optimistic guess (`features/dashboard/optimistic.ts`, `fed`) carries `notes`.
- **Text**: `METHOD_LABELS` `parent fed` / `self fed` become "Solids" (Feed tile, widget side, toasts). In `timeline-text.ts` (`describeEntry`, `spokenEntry`), a solid feed's title is its food ("No food noted" when blank) and its detail is "HH:MM · Solids". Its toast (`outcome-messages.ts`) is "Feed saved · {food}", with no "ml" and no duration. Ring marks (`features/ring/model.ts`, `FEED_ICONS`) use `restaurant`, and the spoken mark names the food.
- **Editor** (`editor-model.ts`, `index.tsx` about lines 947–971, `Editor.tsx`): the draft gains `notes`, and `patchOf` / `isChanged` include it. `withMethod` sets the type for every method: sides give `breast milk`, bottle gives the bottle type and amount, solids give `solid food` with amount `0`. Leaving solids for a side or bottle clears the solid type and amount but keeps the notes. The Solids segment shows when the setting is on or the entry is already solid. `withDraft` (optimistic edit, `index.tsx` about line 184) copies notes too.
- **Add entry** (`features/add/add-model.ts`, `AddSheet.tsx`): `FeedKind` gains Solids, `addProblem` requires a food for it, and the food field reuses the editor's.
- **Themes**: `Copy.solids` is the button label and panel title in each theme (Solids, Bonus snack, Space food, Half-time snack, solids, Nibbles, Solids, Meal; the table is in `NOTES.md`). It is spoken as "Solids". Life Sim's toast lead for a meal is "Nom nom!". The icon is the knife and fork (`restaurant`) in every theme, inside Ribbon's circle too.

### Not changed

- The widget and the lock-screen notification get no Solids button; their Left / Right / Bottle stay as they are.
- `drank` behaves the same (solids were already left out of the ml line); only its rule now comes from `isSolidFeed`.
- Bottle, nap predictions, `dayPlan`, diapers and medicine are untouched.

## Decisions and why

- **Per child, off by default**: a newborn sibling keeps four options while a toddler gets five.
- **No amount, saved as 0**: the parents don't weigh meals, so the food is what's worth logging. `0` rather than leaving it out keeps the entry explicit in Baby Buddy.
- **Food required**: a meal with no food says nothing. Save stays off rather than showing an error.
- **Pronoun from the child's sex, else the name**: Molly never guesses a pronoun. "What did Ella eat?" reads naturally when the sex isn't set.
- **Recent foods from Baby Buddy's own notes**: no list to maintain, and both parents see the same chips.
- **Counts in totals, not in "last feed" or needs**: a lunch doesn't replace milk, so the Feed tile's "last fed" clock and the hunger need keep following milk. A meal is still something the baby ate that day, so "N feeds" includes it.
- **App only**: a meal needs a food typed in, which the widget can't ask for, and the notification already has Android's maximum of three actions.

## Steps

Each step lands with `pnpm check` green. TDD for `packages/core` and the plain-TS app models (Given / When / Then, zero → one → many, then boundaries); integration tests against the container for `packages/api`.

1. [x] **Confirm against the live API** (`pnpm bb:up && pnpm bb:seed`, then add to `packages/api/src/entries.int.test.ts`): each item under "Facts to confirm" in `NOTES.md`. Record the results in `NOTES.md` and in `implan-molly/NOTES.md` "Confirmed against the live API". Add `notes` to `NewFeeding` / `StopFeeding`, and add the recent-solids fetch.
2. [x] **Refactor first, core**: extract `isSolidFeed` and use it in `drank` (tests stay green). Then, test-first: `lastOfEach` and `needs` skip solids; `totalsBetween` still counts them.
3. [x] **Core rules**: `feedingForStop('solids', …)`, `recentFoods`, chip toggling, `eatQuestion` / `ateLabel`, and `ChildPrefs.solids` with its default.
4. [x] **Setting**: `parseChildPrefs` (unit test in the storage tests), and the switch on the child screen.
5. [x] **Picker and Solids panel**: per-row `columns`, the Solids option in both feed pickers, the `restaurant` glyph, `SolidsPanel`, the writes in `trackers.ts` (unit tests with the fake client), the optimistic guess, `Copy.solids` in every theme, and Life Sim's meal toast lead.
6. [ ] **Showing a meal**: `METHOD_LABELS`, `timeline-text.ts`, toasts and ring marks (unit tests in their `*.test.ts`); the editor (`editor-model.test.ts`, including the `withMethod` fix) and Add entry (`add-model.test.ts`).
7. [ ] **Playwright** (`e2e/tests/solid-food.spec.ts`, see `TEST_STRATEGY.md`), and update any existing spec that assumed four feed options or the "Parent fed" label.
8. [ ] **Docs and wrap-up**: in `CLAUDE.md`, the Trackers line mentions solids (per-child, app only, not in `lastOfEach`). Add this plan to `plans/README.md`. Run the `implan-cleanup` wrap-up sweep. Look review on web and on the emulator (every theme's feed picker and wording, the Solids panel, the Today row, the editor). Rewrite issue #1 in Gherkin. Open the PR to `develop`.

## Assumptions

- Baby Buddy's feeding enums already include `solid food` and `parent fed` (`packages/api/src/enums.ts`), and the integration tests already post every value.
- Feeding notes are never written or read by Molly today, so there's nothing to migrate or protect.
- A child's prefs live on the device (`settings.children[childId]`). Each parent turns Solid food on for their own phone, like the bottle prefs.
