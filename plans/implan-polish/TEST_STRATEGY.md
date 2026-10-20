# Polish: Definition of Done

**Feature complete.** The release build was tested and signed off on a device; the visual and device items below are ticked on that sign-off, the rest by the automated checks and the emulator passes recorded in `NOTES.md`.

Done when every item below is true. The method follows [`../implan-molly/TEST_STRATEGY.md`](../implan-molly/TEST_STRATEGY.md): unit TDD for `packages/core`, integration tests against the real Baby Buddy container for `packages/api`, Playwright on the web image for flows (failures and slow responses simulated with `page.route`), manual review for looks, and a device checklist for Android-only behaviour.

## Nothing regresses

- [x] Every existing Playwright spec passes, and `pnpm check` is green (the web bundle still has no widget, notification or haptics native code).
- [x] Widget, lock-screen notification and their intents behave as before, apart from the invalid-key state.

## Domain (`packages/core`, unit TDD)

- [x] Invalid key vs permission: a 401/403 on a request plus a 401/403 on the profile check means invalid key; a 403 plus a good profile means a permission problem.
- [x] Stale timer: given a stopped timer's start and the refetched entries, the entry saved from it is found (same tracker, same start to the minute, newest if several); none when nothing matches or only another tracker matches.
- [x] History: entries group by local day, newest first; filters with none, one and several trackers selected; day summaries count only what the filter shows, with sleep clipped at midnight; an empty filtered result and an empty history are told apart.

## Baby Buddy client (`packages/api`, integration tests)

- [x] A closed date window (`*_min` + `*_max`, UTC) returns only that window for sleep, feeding, change and medication, across pages.
- [x] An entry saved by stopping a timer has the timer's start (recorded in `NOTES.md`).

## App units (Vitest in `apps/molly`)

- [x] Settings parse and default the new per-device fields (haptics on, History filter, "Not now" for the notification sheet), and keep unknown or broken values at their defaults.
- [x] Haptics: every action kind in the design's `HAPTICS` table maps to its strength; a refused optimistic action ends in the error strength; the Settings toggle off means no haptic.
- [x] Contrast: the design's `PASSES` pairs and the fixed findings (Today strip marks ≥ 3 : 1 in both themes, Night toast "Adjust time" ≥ 4.5 : 1, Cancel links ≥ 4.5 : 1) computed from `src/theme/tokens.ts` in both themes.

## App flows (Playwright on the web image)

- [x] Cold load with no cache and delayed API responses: the skeleton appears after 300 ms, not before; Diaper logs during it; Sleep and Feed buttons appear once timers load.
- [x] Reload with a cache: the cached dashboard shows at once with no skeleton, then updates.
- [x] Sign out clears the cache: signing in again starts cold.
- [x] Baby Buddy unreachable: the banner shows "Showing what Molly saw at HH:MM", the hero is dimmed with "as of HH:MM", a Start fails with the "Nothing was saved" toast, and Retry recovers once the API is back.
- [x] Bad key: a revoked key on the dashboard opens "Molly can't sign in to Baby Buddy"; typing a new key there keeps the address and child and lands back on the dashboard.
- [x] Missing permission (`parent_a` stopping `parent_b`'s timer) still shows the permission toast, not the invalid-key screen.
- [x] Stopped on another phone: after the other parent stops the timer, Stop shows "Already stopped on another phone" with the saved entry, the row is highlighted in Recent, and Edit opens it. Starting a timer the other parent already started shows "Already running since HH:MM".
- [x] History: "See all" opens it; chips filter and combine, All resets, the choice survives a reload; day headers show per-filter summaries; "Load earlier" adds the previous 7 days; rows open the edit screen.
- [x] History empty states: a filter with nothing this week shows the last matching entry and "Show everything"; a child with no entries shows "Nothing logged yet…".
- [x] Roles: tiles, chips and Recent / History rows are found by role and accessible name (e.g. "Feed at 08:15, Left, 17 minutes. Edit."), chips expose their selected state, and a ticking timer isn't a live region.

## Visual review (manual, web and Android, both themes)

- [x] Skeleton, banner, dimmed hero, invalid-key screen, stale-timer toast, History, the permission sheet and hero line match the design.
- [x] Day Today-strip marks are clearly visible and labelled.
- [x] Icon, adaptive icon, monochrome icon and favicon match the design's section 04; Expo's placeholder images are gone from `assets/images/`.

## Android (device checklist on a physical Android phone, release APK)

Add these to [`../implan-molly/phases/mvp/TEST_STRATEGY.md`](../implan-molly/phases/mvp/TEST_STRATEGY.md)'s device checklist.

- [x] Cold start after force-stop shows the cached dashboard; airplane mode shows the banner and the dimmed hero; turning it off refetches without a tap.
- [x] First timer start on a fresh install shows the permission sheet with the timer already running; Continue asks Android; "Not now" never shows the sheet again; the hero line's Turn on prompts again, or opens notification settings once Android has stopped prompting.
- [x] A widget or notification action with a revoked key shows "Can't sign in · Open Molly"; tapping it opens the invalid-key screen; a new key fixes both.
- [x] Haptics match the design's table; nothing when the Settings toggle is off or the system's touch feedback is off.
- [x] TalkBack: the Today card reads as one summary; tiles, chips and rows read with role and state; the running timer isn't read every second; start, stop and errors are announced once; "Tap again to delete" is announced.
- [x] Font size at 200 %: no clipped buttons, the hero timer stops growing, the stop buttons wrap one per row.
- [x] Every tap target in the design's findings is at least 48 dp (Back, Cancel, Delete, the Day / Night pill).
- [x] Remove animations on: no press scale.
- [x] Launcher icon in circle and squircle masks, themed (monochrome) icons on.
- [x] Splash: cold start with the Night override while the system is light shows the Night splash with no light flash, and the reverse; the icon sits inside the safe zone.
