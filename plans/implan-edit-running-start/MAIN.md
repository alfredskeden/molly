# Edit a running timer's start

Context: the Molly system plan in [`../implan-molly/MAIN.md`](../implan-molly/MAIN.md) (architecture, Baby Buddy facts in its `NOTES.md`). This feature builds on what the redesign already shipped (hero, toast, `adjustTime`, optimistic updates) and doesn't change that plan. The Definition of Done is in [`TEST_STRATEGY.md`](TEST_STRATEGY.md).

**Outcome:** a parent can move a running feeding's or sleep's start at any time, straight from the dashboard. Today the only way is "Adjust time" in the toast right after Start, and the toast is gone after 6 s. A late start is often noticed much later.

## Scope

In: the web app and the Android app, for the timer the hero shows, whoever started it.

Out: the tile of the other running timer (both can run at once), the widget, the lock-screen notification, typed times. Widgets and the notification pick up the new start on their next refresh. The toast's Adjust time sheet stays as it is.

## How it works

- The hero's big timer becomes a button (accessible name "Edit start time").
- Tapping it opens a small popup over a dimmed backdrop. It shows "Started at HH:MM", the elapsed time, and −5 / +5 min.
- Tapping outside closes it. If the time changed, it saves. If not, nothing is sent. There is no reset or cancel: step back with −5 / +5.
- Saving calls `adjustTime(client, { target: { kind: 'timer', id }, time })` from `src/actions/trackers.ts`. It's optimistic, like other writes (`src/features/dashboard/optimistic.ts`): the hero shows the new start at once, a toast says "Start moved to HH:MM", then the usual refetch. A refusal rolls back with the usual failure toast. A timer the other parent stopped meanwhile (404) shows a toast and the refetched truth.

## Decisions

| Decision | Why |
| --- | --- |
| Tap the big timer, not a new button | Keeps the hero uncluttered |
| Tap outside saves; no undo | −5 / +5 already undo each other |
| The new start is never after now (+5 stops at now), and never before the end of the last entry of its kind (sleep or feeding). A button at its limit is disabled | Baby Buddy refuses future times. It accepts a timer start that overlaps the last sleep or feeding, but then refuses the Stop ("Another entry intersects…", `../implan-molly/NOTES.md`) |

## Steps

- [x] **1. Start rule (TDD, `packages/core`).** Next to `adjustedTime` in `src/adjust.ts`: the next start from the current one, a ±5 min step, now, and an optional earliest time. Never after now, never before the earliest, and whether each direction can still move. First check against the live API whether Baby Buddy also refuses an overlapping feeding on stop; if it does, feedings use the last feeding's end as their earliest time too. Record the answer under "Confirmed against the live API" in `../implan-molly/NOTES.md`, and in this plan's `NOTES.md`.
- [x] **2. Popup and wiring.** The big timer as a button, the popup (`src/features/dashboard/`, semantic theme classes, `Text` from `@/components/ui`), save on outside tap as above. Earliest time from `LastOfEach` (the last sleep's or feeding's end). Playwright spec as in `TEST_STRATEGY.md`.
