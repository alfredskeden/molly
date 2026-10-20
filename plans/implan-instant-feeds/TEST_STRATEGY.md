# Test strategy: done when every box is ticked

Follows the repo's method (`CLAUDE.md`, "Testing method"): core by TDD with Given / When / Then, `packages/api` against the real Baby Buddy container, screens by Playwright against the web image, widget and looks by manual review on emulator-5554. Physical-phone checks come after and aren't part of this list.

## Baby Buddy (integration, `packages/api`, test container)

- [x] A finished feeding one minute long is accepted.
- [x] A feeding starting exactly at the previous feeding's end is accepted (or the refusal is recorded and `instantFeedTimes` handles it).
- [x] Whether a zero-length feeding (start = end) is accepted is recorded.
- [x] Whether the last bottle with an amount can be fetched alone (`method=bottle`, `limit=1`) is recorded, and used where it can.
- [x] What happens to an end a few seconds in the future is recorded, and an instant feed from a slightly fast clock still saves.

## Core rules (Vitest, TDD)

- [x] Instant times: end is now, start one minute before; with a previous feed that ended under a minute ago, start is that end, never earlier.
- [x] Last bottle: zero feeds → the child's bottle prefs; one bottle with an amount → its type and amount; many → the newest; bottles without an amount and breastfeeds are skipped.
- [x] Amount stepping: +5 / −5 from the start value; never below 5.
- [x] Amount typing: digits build a whole number of at most 3 digits, extra digits are ignored, an empty or zero amount can't be saved.

## Writes (Vitest, fake client)

- [x] `logFeed` posts a finished feeding with the side's method and type, or the bottle's type and chosen amount, and the instant times; its outcome is `stopped` with the created feeding.
- [x] A failed `logFeed` reports the failure kind like the other actions (unreachable, forbidden, validation…).
- [x] Adjust time on an instant feed moves start and end together; on a timed feed it still moves only the end.
- [x] A stopped timed bottle and an Add entry bottle save the amount the parent chose, not the child's default.

## Setting

- [x] `feedTimer` defaults to off, parses safely from old stored settings, and survives sign-out.
- [x] Settings shows the Time feeds switch, and switching it changes the Feed tile at once.

## App (Playwright against the web image, seeded Baby Buddy)

- [x] Instant mode: Feed → Left saves a feed (it shows on the ring / Today sheet), no timer is started, and the toast offers Adjust time and Edit.
- [x] Instant mode: Feed → Bottle shows the amount row starting at the last bottle's amount; +5 twice then Save saves that amount (checked in Baby Buddy or the editor).
- [x] Typing an amount on the row saves the typed amount.
- [x] Adjust time on an instant feed moves the feed and keeps it one minute long.
- [x] Timer mode: Feed starts a timer; stopping with Bottle shows the amount row and saves the chosen amount.
- [x] A running feed timer (seeded, as if from the other phone) shows and stops in instant mode.
- [x] Add entry: Bottle shows the amount row and saves its amount.
- [x] `pnpm check` and `pnpm e2e` green.

## Widget and notification (emulator-5554, fresh release build)

- [x] Instant mode: the Feed row shows the side buttons; a tap shows `Saving…`, then the new last feed; no timer exists in Baby Buddy.
- [x] Widget Bottle saves the last bottle's type and amount.
- [x] Timer mode: the widget starts and stops feeds as today.
- [x] A running timer draws stop buttons in either mode; the lock-screen Bottle stops it with the last bottle's amount.
- [x] Changing the setting in the app redraws the widgets.

## Look review (manual: web and emulator, Molly Classic and a decorated theme, day and night, largest font)

- [x] The picker and the amount row sit where the tiles were and fit at the largest font; the amount stays on one line.
- [ ] TalkBack reads the amount row (buttons named, amount spoken in millilitres) and reaches the typing field.
- [ ] Every theme's instant-mode Feed label and the Settings wording are reviewed and approved.

## Wrap-up

- [x] Baby Buddy answers recorded in `NOTES.md` and `implan-molly/NOTES.md`; `MAIN.md` steps ticked; the plan added to the list in `CLAUDE.md`.
