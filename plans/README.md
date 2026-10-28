# Plans

How Molly was built, one folder per plan. Each has `MAIN.md` (the steps, with `[x]` progress), `NOTES.md` (verified facts, versions, decisions, open questions) and usually `TEST_STRATEGY.md` (Definition of Done). Design files named in a plan (`Molly Ring v4.dc.html`…) come from a private design source and aren't in the repo.

"Open items left" means the code is in; what's left is listed in that plan's `TEST_STRATEGY.md` or `NOTES.md` (usually manual look reviews or checks on a physical phone).

| Plan | What | Status |
| --- | --- | --- |
| [implan-molly](implan-molly/MAIN.md) | The system design and the confirmed Baby Buddy API facts; phases `mvp` and `redesign` | Done, except the widget picker previews |
| [implan-medication](implan-medication/MAIN.md) | Medication tracker | Done |
| [implan-edit-running-start](implan-edit-running-start/MAIN.md) | Edit a running timer's start | Done |
| [implan-polish](implan-polish/MAIN.md) | Polish pass | Done |
| [implan-edit-stale](implan-edit-stale/MAIN.md) | Edit screen never seeds from a stale cached copy | Done |
| [implan-today-window](implan-today-window/MAIN.md) | Today follows the baby's day (morning wake → bedtime, then Tonight), `dayWindow` | Open items left |
| [implan-next-nap](implan-next-nap/MAIN.md) | Next likely sleep while awake, `nextSleep` | Open items left |
| [implan-day-plan](implan-day-plan/MAIN.md) | Every likely sleep until bedtime, Skip nap, accuracy line, `dayPlan` | Open items left |
| [implan-days](implan-days/MAIN.md) | Past days and nights (later replaced by the ring's Recent days) | Open items left |
| [implan-themes](implan-themes/MAIN.md) | Six themes with fonts, patterns and playful labels | Open items left |
| [implan-tap-feedback](implan-tap-feedback/MAIN.md) | Every tap that waits on Baby Buddy shows at once that it was heard | Open items left |
| [implan-live-updates](implan-live-updates/MAIN.md) | Android 16 Live Updates for the sleep and feeding notifications | Open items left |
| [implan-vitamin-d-reminder](implan-vitamin-d-reminder/MAIN.md) | Vitamin D reminder after a sleep stops | Open items left |
| [implan-children](implan-children/MAIN.md) | Two or three children: switching, per-child settings, per-child widgets | Open items left |
| [implan-instant-taps](implan-instant-taps/MAIN.md) | Taps that land at once and never die; Tap log | Open items left |
| [implan-ring-redesign](implan-ring-redesign/MAIN.md) | The clock-ring dashboard | Open items left |
| [implan-plan-while-asleep](implan-plan-while-asleep/MAIN.md) | The day's plan keeps showing while a nap runs | Open items left |
| [implan-nap-or-night](implan-nap-or-night/MAIN.md) | Nap or night decided by when a sleep happened, `isNightSleep` | Open items left |
| [implan-expo-review](implan-expo-review/MAIN.md) | Fixes from a review against the Expo skills | Open items left |
| [implan-nap-detail](implan-nap-detail/MAIN.md) | The likely-sleep panel and nap reminders | Open items left |
| [implan-typed-time-and-nap-clock](implan-typed-time-and-nap-clock/MAIN.md) | Typed times in Adjust time; nap clock time in the window row | Open items left |
| [implan-measurements](implan-measurements/MAIN.md) | Weight, height, head, temperature and BMI with WHO bands | Open items left |
| [implan-development](implan-development/MAIN.md) | Sourced age guide per child | Done |
| [implan-recent-days-order](implan-recent-days-order/MAIN.md) | Recent days cards: one morning, night then day | Open items left |
| [implan-ribbon-theme](implan-ribbon-theme/MAIN.md) | Ribbon theme with ornaments | Open items left |
| [implan-life-sim-theme](implan-life-sim-theme/MAIN.md) | Life Sim theme with the needs layer | Open items left |
| [implan-instant-feeds](implan-instant-feeds/MAIN.md) | Feeds logged at once instead of timed | Open items left |
| [implan-ribbon-icons](implan-ribbon-icons/MAIN.md) | Ribbon's bow and tracker pictures | Done |
| [implan-day-ml-total](implan-day-ml-total/MAIN.md) | About how much the baby drank per day and night | Done |
| [implan-open-source](implan-open-source/MAIN.md) | Making the repo public | Done |
| [implan-today-sheet-card](implan-today-sheet-card/MAIN.md) | Today sheet covers Recent days' top card (last night + today), with the ml line | Done |
| [implan-half-side-feeds](implan-half-side-feeds/MAIN.md) | A feed from one breast counts half the default bottle in the ml line | Done |
| [implan-ring-day-nav](implan-ring-day-nav/MAIN.md) | Past ring header becomes a pager (‹ ›, `Today ›`) with stat boxes, issue #3 | Done |
| [implan-web-sheets](implan-web-sheets/MAIN.md) | Web sheets keep their surface and sit on the bottom; wide windows get a centred column, issue #5 | Open items left |
| [implan-solid-food](implan-solid-food/MAIN.md) | Per-child Solid food setting: Solids under Feed, the food in the feeding's notes, issue #1 | Done |
| [implan-day-night](implan-day-night/MAIN.md) | Day and night from the child's rhythm: learned usual wake and bedtime, age-based thresholds, nap flag on save, issue #14 | Done (sanity run on own logs and device checks open) |
| [implan-early-wake](implan-early-wake/MAIN.md) | A morning wake near "Day starts" starts the day even with a later learned wake; learned times on the child screen | Open items left |
| [implan-night-ends-at-wake](implan-night-ends-at-wake/MAIN.md) | Past nights end where the next day starts (the next morning wake), no overlap or gap with the day, issue #23 | Open items left |
| [implan-todo](implan-todo/MAIN.md) | Shared to-do list on Baby Buddy notes: labels as tags, dates, photos, Android reminders, issue #22 | Open items left |
| [implan-on-time-wake](implan-on-time-wake/MAIN.md) | A wake within 30 min of the usual wake starts the day at once; back asleep within the threshold undoes it, issue #29 | Done |
| [implan-todo-keyboard](implan-todo-keyboard/MAIN.md) | Scroll sheets shrink with the keyboard and keep the first tap, issue #28 | Done |
| [implan-todo-read-only](implan-todo-read-only/MAIN.md) | Items open read-only first; New until opened on this phone; Mark unread, issue #30 | Done |
| [implan-todo-quiet](implan-todo-quiet/MAIN.md) | Turn off one item's reminder ("Remind me" switch, shared `molly-todo-quiet` tag), issue #36 | Planned |
