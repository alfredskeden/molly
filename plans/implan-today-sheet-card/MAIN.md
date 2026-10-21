# Today sheet covers the whole card: night and day, with ml drunk

GitHub issue #2.

## Outcome

The Today sheet (the history button's sheet) covers the same span as the top card on Recent days, not just the live window. Its four boxes count over that span, and a new line under them says roughly how much the baby drank, using the same rule as Recent days.

| When the sheet opens | Span (same as Recent days' top card) | Title |
| --- | --- | --- |
| During the day | Last night + today so far | `Today` |
| At night | Tonight so far (the card has no day yet) | `Tonight` |

```
┌ Today ─────────────────────────────── × ┐
│ [12h 40m]  [3]       [7]     [5]        │
│ slept today sleeps   feeds   diapers    │
│               ≈ 840 ml                  │
│ Recent · tap to edit                    │
│ …                                       │
```

Before, by day the boxes counted only from the morning wake, so last night's sleep and feeds were missing. The parent couldn't see the morning-to-morning picture that Recent days shows, or check it while fixing entries in the list below.

## The rule

The span is the current card from `recentDays` (`src/features/days/recent.ts`). Build it from the dashboard's own entries: `recentDays(liveWindow, windowsBefore(loaded, napWindow, now, 1, sleepRunning))[0]`. Check that this gives last night by day. `loaded` (`useRecentEntries`) holds sleeps for 14 days and feeds, diapers and medicine since yesterday's midnight, which covers last night. No new query.

- **From:** the card's night start, or the day's start when the card has no night.
- **To:** now. The card is always the live one, so it ends at now.
- **Slept:** `todaysTotals(entries, from, sleepRunning, now).sleepMs`. Sleeps are clipped at `from`, and a running sleep counts, as today.
- **Sleeps:** sleeps that started in the span, plus one if a sleep is running. The label is `sleep`/`sleeps` whenever the card has a night, and `nap`/`naps` only on a card with no night.
- **Feeds, diapers:** `todaysTotals` counts from `from`.
- **ml line:** `drankText(drank(entries.feeding, from, now, bottle.amount))`, with the same text, spoken text and absence rules as Recent days' card. Breastfeeds and bottles without ml use the child's default bottle amount, marked `≈`. With no default, the line counts them instead. With no feeds, there is no line.

The labels `slept today` / `slept tonight` and the titles `Today` / `Tonight` stay. The card is called Today on Recent days too.

## Where it lives

- `src/features/days/recent.ts`: two new pure helpers next to `recentDays`.
  - `cardSpan(card, now) → { from, to }`: the span rule. Recent days' `drankLine` uses it too, so both screens agree.
  - `cardStats(card, entries, running, now) → TodayStats`: the boxes.
  - Unit-tested in `recent.test.ts`.
- `src/app/(main)/recent-days.tsx`: `drankLine` becomes `drankText(drank(…cardSpan…))`. It stays local or moves to `recent.ts`; pick whichever leaves less duplication.
- `src/features/dashboard/TodaySheet.tsx`: takes a `drank: { text, spoken } | null` prop and renders it as a centred muted line under the boxes, styled like Recent days. Its spoken text goes into the boxes' accessible label after the diapers. Update the doc comment ("the live window's totals" → the card's).
- `src/app/(main)/index.tsx`: `todayStats` goes. The sheet gets `cardStats` and the ml line. Read the default from `useChildPrefs().bottle.amount`, which may already be in scope.

## Decisions and why

- **Same span as Recent days' top card.** One meaning of "today" across the app. At night the sheet still shows tonight only, as Recent days' Tonight card does.
- **Boxes stay, no mini rings.** The sheet keeps its look. Only the numbers widen, and the ml line is added.
- **`sleeps` once a night is in the span.** The count includes night sleeps, so `naps` would be wrong.
- **No new fetch.** The dashboard's entries already cover last night.

## Boundaries

- The Recent list (latest six, tap to edit) and the Recent days row don't change.
- No change to `drank`, `drankText`, `todaysTotals`, `recentDays`'s grouping, widgets or notifications.
- Recent days' cards still show what they show. Only their span code is shared.

## Steps

1. [x] **Refactor first:** add `cardSpan` to `recent.ts` (TDD) and make Recent days' `drankLine` use it. Recent days' e2e stays green.
2. [x] `cardStats` in `recent.ts` (TDD, see `TEST_STRATEGY.md`).
3. [x] Wire the sheet: remove `todayStats` from `index.tsx`, pass `cardStats` and the ml line, add the line and its spoken text in `TodaySheet.tsx`, and update the doc comments in both files.
4. [x] Playwright in `e2e/tests/recent-days.spec.ts`: update `1e` and the running-nap case to the new totals, and add the ml and night cases (see `TEST_STRATEGY.md`).
5. [x] Docs: in `plans/implan-day-ml-total/MAIN.md` and `NOTES.md`, change "Recent days only / not on the Today sheet" to point here. In `plans/implan-ring-redesign/MAIN.md` (Today sheet section), say the boxes count the current card, pointing here. Add this plan to `plans/README.md`.
6. [x] Look review (web and emulator-5554, a plain and a decorated theme, day and night, largest font).

## Assumptions

- `windowsBefore` with `loaded` gives last night as its first window by day. If it doesn't (no wake logged, a nap-window fallback), the card has no night, the span starts at the day, and the label says `naps`. That is the same as Recent days.
- A running feeding is a timer, not an entry, so it isn't counted in feeds or ml until it stops. This is unchanged.
