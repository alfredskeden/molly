# Notes

## Sources

- GitHub issue #1 "Handling of solid foods": a setting to turn on solid food logging, a Solids option under Feed, always parent fed, and the food written to the feeding's notes field.
- Design: `Molly Solid Food.dc.html` (private design source, not in the repo). Sections: 1 the setting, 2 Feed with five options, 3 After Solids, 4 Today row and editor. The text in `MAIN.md` follows the design's latest version, which dropped the amount.

## Decisions (from the developer)

- **No amount.** It is always saved as `0`, and the food is the entry. Save stays off until the food field has text.
- **The question uses the child's pronoun when the child's sex is set**, and the child's name when it isn't: girl gives "What did she eat?", boy gives "What did he eat?", unset gives "What did Ella eat?". The same rule drives the editor's "What she ate" label. The sex is the existing `ChildPrefs.sex` (`girl | boy | null`, set on the child screen as "Girl or boy").
- **A meal counts only in the feed totals** ("N feeds", the ring's stat boxes, Recent days). The Feed tile's "last feed", the usual feed gap (`rhythm`) and the hunger need (`needs`) follow milk feeds only.
- **App only.** No Solids button on the widget or the lock-screen notification. The widget's last side ignores solids, because it reads the last milk feed.

## Decisions (made while planning; change if wrong)

- **Instant meals take the usual instant-feed span**: one minute ending now, never before the previous feeding's end (`instantFeedTimes`). The design says start = end; one minute keeps the overlap rule and the ring's mark the same as other instant feeds.
- **What counts as solid** is decided by the method (`parent fed` or `self fed`), the rule `drank` already uses. Molly writes only `parent fed`, but entries added in Baby Buddy itself may be `self fed`.
- **Recent foods** come from this child's newest solid feedings: split each note on commas, trim, keep each food once (ignoring case, the newest spelling wins), newest first, at most 5.
- **Chips after typing** (step 3): the field is the only state. A chip is on when every food in the field is a chip (ignoring case); anything else typed turns all of them off. Tapping a chip then adds it after the typed text ("Pea purée, Banana"), so nothing typed is lost. Core: `recentFoods`, `chosenFoods`, `tapFood` in `solids.ts`.
- **The editor shows the Solids segment** whenever the setting is on, or when the entry being edited is already solid, so an old meal still edits correctly after the setting is turned off.

## Cleanup sweep (planning)

- **Duplicated rule**: `SOLIDS` in `packages/core/src/drank.ts:12` is private. The new "milk feeds only" filter needs the same rule in `lastOfEach` (`packages/core/src/latest.ts:10`), in `needs.ts` (`rhythm` at about line 77, `lastFeed` at about line 106), and through `lastOfEach` in the widget's `lastFeedingMethod` (`apps/molly/src/widget/model.ts:365`). Extract it once (step 2).
- **Picker layout**: `columns: number` (`apps/molly/src/features/dashboard/Picker.tsx:52,84`) can't do 3 + 2. Diaper (`columns={3}`) and Medicine (`columns={1}`) use it too (`index.tsx:1194,1196`), so the change has to keep a plain number working.
- **Existing editor bug** exposed by solids: `withMethod` (`apps/molly/src/features/dashboard/editor-model.ts:83-87`) only resets type and amount when leaving `bottle`. A `parent fed` entry switched to Left would keep `type: 'solid food'`. A `parent fed` entry today also opens with no kind selected, because `FEEDING_STOPS` lacks it.
- **Labels**: `METHOD_LABELS` (`timeline-text.ts:11-12`) says "Parent fed" / "Self fed". These show on the Feed tile, in toasts and as the widget's side. They become "Solids".
- No dead code, flags, dependencies or assets are made obsolete by this plan.

## Confirmed against the live API (step 1, v2.11.0-ls251, 2026-10-22)

- `GET /api/feedings/?type=solid food` filters by type: milk feeds are left out, `self fed` meals are included. `getRecentSolids(child)` uses it (one page of 20).
- `POST /api/feedings/` with `timer` accepts `notes` and keeps it.
- `amount: 0` is accepted and comes back as `0` (not `null`).
- The widget snapshot read the server's newest feeding (`getLatestEntries`), any kind. When that one is a meal, the refresh now also fetches `getRecentFeedings(child)` (one page of 20, every kind) and takes the newest milk feed from it. The hunger moodlet ("milk-drunk") follows milk feeds too.
- The food chips (`useRecentFoods`, query key `['solids', childId]`, persisted like `bottles`) merge `getRecentSolids` with the dashboard's entries.
- The optimistic instant feed is built by `instantFeeding` (`optimistic.ts`), so the guess carrying the food is unit-tested.
- Life Sim's meal lead: `Toast.saved` is `true | 'meal'`; `'meal'` picks `toastLeads.meal` ("Nom nom!").
- `withMethod` now sets the type for every kind: a side is always breast milk (before, side to side kept the old type). A `self fed` meal shows as Solids in the editor (its value maps to `parent fed`).
- Add entry offers Solids only for a finished feed: the feed kind row shows only with an end, so a meal never starts a timer there.
- The recent-solids query runs only while the child's Solid food setting is on, so a child without it makes no extra request (and the persisted cache holds the same six queries as before).
- No existing Playwright spec assumed four feed options or "Parent fed", so none needed changing. `day-plan.spec.ts` "a sleep of 15 minutes or more after the skip ends it" failed once in a full run and passed on rerun (time of day dependent, unrelated).
- An empty `notes` string is never sent (Save is off without food), so its behaviour doesn't matter.

## Theme wording and icon (decided)

The developer asked for playful wording per theme, written to match each theme's voice in `apps/molly/src/theme/copy.ts`. A new `Copy.solids` is the Solids button label and the Solids panel's title. The question and the Today row stay plain ("What did she eat?", "12:10 · Solids"), and the spoken label is always "Solids" (the `spoken(copy…, PLAIN…)` pattern).

| Theme (`copy.ts`) | Feed is called | `solids` |
| --- | --- | --- |
| `classic` | Feed | Solids |
| `arcade` | Power-up | Bonus snack |
| `space` | Refuel | Space food |
| `score` | Water break | Half-time snack |
| `term` | feed | solids |
| `safari` | Munch | Nibbles |
| `ribbon` | Feed (plain words) | Solids |
| `sim` | Feed | Meal |

Life Sim's toast lead for a meal (`sim-words.ts` `toastLeads`, today `feed: 'Milk drunk!'`) is **"Nom nom!"**. That needs a lead chosen by the saved feed, not only by tone (`NEED_OF` in `features/toast/toast.tsx`).

**Icon**: the knife and fork (`restaurant`) in every theme for now. Ribbon shows it as a glyph in its usual circle (no drawn picture); Safari's pictured buttons fall back to the glyph too.
