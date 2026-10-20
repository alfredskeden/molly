# Notes

## Decisions (2026-09-25)

- Own plan, not a phase of `implan-molly`.
- Tap the hero's big timer → popup with −5 / +5 and the new start. Tap outside saves. No reset or cancel.
- Not on the other running timer's tile, the widget or the lock-screen notification.

## Confirmed against the live API (2026-09-25)

- Baby Buddy refuses the stop of an overlapping feeding, as it does a sleep ("Another entry intersects…"). A start exactly at the previous end is accepted. So feedings get an earliest time too: the last feeding's end, inclusive.
