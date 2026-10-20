# More than one child

Context: the Molly system plan in [`../implan-molly/MAIN.md`](../implan-molly/MAIN.md) (architecture; Baby Buddy facts in its `NOTES.md`, "Confirmed against the live API"), the lock-screen notification after [`../implan-tap-feedback/`](../implan-tap-feedback/MAIN.md) and [`../implan-live-updates/`](../implan-live-updates/MAIN.md), and the Vitamin D reminder in [`../implan-vitamin-d-reminder/`](../implan-vitamin-d-reminder/MAIN.md). Decisions and findings are in [`NOTES.md`](NOTES.md), the picture in [`MENTAL_MODEL.md`](MENTAL_MODEL.md), the Definition of Done in [`TEST_STRATEGY.md`](TEST_STRATEGY.md).

Design source: `Molly Children.dc.html` (the board), `Molly Children Phone.dc.html` (the screens and their logic) and `Molly Children Widgets.dc.html` (widgets pinned to a child, notification avatars; added 2026-09-29, steps 8–10) (the private design source). Read the Phone file before building any screen: its `KIDS` data and `renderVals` show every state (stack layers while pulling, sheet rows, settings rows, onboarding button label).

**Outcome:** a family with two or three children in Baby Buddy uses Molly for all of them. One child is on screen at a time; the parent swipes the avatar stack to the next child or picks one in the Children sheet. A sleep running for another child is never out of sight. The lock screen shows every shown child's timers, widgets and notification buttons always act on the child they show, and nap window, bottle defaults, colour and the Vitamin D reminder are set per child. With one child, Molly looks and works as it does today, plus the avatar.

## Scope

In: web and Android app, widgets, lock-screen notifications, Vitamin D reminder, onboarding, Settings.

Out: a child chosen per widget instance, photos from Baby Buddy's `picture`, adding or editing children (name, birth date stay in Baby Buddy), a combined view of several children, the other-child strip for feedings.

## How it works

App paths (`src/…`, `modules/…`) are under `apps/molly/`.

### Which children, and which one is on screen

- **Children** come from Baby Buddy (`useChildren`, `listChildren`), in its order.
- **Per-child preferences**, per device, in `Settings` (`src/storage/types.ts`): `children: Record<childId, ChildPrefs>` with `ChildPrefs = { shown, hue, napWindow, bottle, vitaminDReminder }`. `childId` stays, meaning the child on screen. `napWindow`, `bottle` and `vitaminDReminder` leave the top level.
- A child with no entry yet (new in Baby Buddy, or the first read) gets defaults: shown, hue = its index in Baby Buddy's list mod 4, `DEFAULT_NAP_WINDOW`, the default bottle, reminder off. Old single-child settings migrate in `parseSettings`: their `napWindow`, `bottle` and `vitaminDReminder` become `children[childId]`.
- **Shown children** = Baby Buddy's children minus hidden ones, in Baby Buddy's order. The child on screen is always a shown one: if it's hidden or gone, the first shown child takes over. At least one child stays shown (the last shown child's Hidden button is disabled).
- Sign-out drops `children` and `childId` (ids belong to one Baby Buddy); theme, lock-screen, haptics and History filter stay as today.

Pure rules (`packages/core`, e.g. `children.ts`): `ageLabel(birthDate, now)` ("5 months", "2 years 4 months", "3 weeks" for the first weeks, singulars right), `shownChildren(children, prefs)`, `nextChild(shown, current)` (wraps), default prefs for a child, and the sheet / strip status (`Sleeping 42m`, `Awake 1h 25m`) from a running sleep timer or the last sleep end.

### Data per child

- Every query key already carries `childId`, so switching needs no new queries. Drop `childId` from the query provider key and the persisted-cache buster (`src/app/_layout.tsx`, `src/lib/query.tsx`): the persisted cache then holds each child's data and switching back is instant. Keep the `baseUrl|userId` part.
- **Running sleeps of every shown child** for the strip and the sheet: one query over Baby Buddy's timers named `molly:sleep` for all children (a new `listTimers({ name })` in `packages/api` if `/timers/?name=` without `child` returns every child's; check it against the container first). Last sleep end per shown child for the "Awake" status: the latest sleep per child (`getLatestEntry('sleep', child)`), only while the sheet is open or for the strip's children. Polled and invalidated like the other timer queries; persisted like `timer`.

### Dashboard (`src/app/(main)/index.tsx`)

- **Header**: the child's first name (large) and `age · weekday day month`, the avatar stack at the right, as in the design. It replaces whatever sits there now (app name fallback, any Settings button): the sheet is the way to Settings.
- **Avatar stack**: initial on the child's colour, 3 px ring in the page background. Up to three layers (front = child on screen, then the next ones in order). Pull down: the front shrinks and fades while the others move up a slot (the design's `SLOTS` and interpolation); past half of 60 px it switches on release, otherwise springs back. A tap (no movement) opens the sheet. One child: no pull. Build it with `react-native-gesture-handler` + `react-native-reanimated`. It must work with a mouse on web. Screen readers: the stack is one button "Children, showing Ella" with an accessibility action "Next child".
- **Toast** "Showing Otto" (with the avatar) after a pull or a sheet pick, about 1.8 s, through the app's existing toast if it fits.
- **Other-child strip**: when the child on screen has no sleep running and another shown child does, "Otto is sleeping · 42m" with Switch, under the header, in the sleep colours. Several → the first in order.
- **Children sheet**: a bottom sheet over a scrim: "Children", a row per shown child (big avatar, name, status in sleep ink when sleeping, "Showing" on the current one), a divider, Manage children › and Settings › (both open Settings). A row switches and closes; the current row just closes.
- Everything below the header (hero, Today, tiles, Recent, Days, History, the edit screens) is the child on screen's, as today.

### Settings and the child screen

- Settings (`src/app/(main)/settings.tsx`) starts with a **Children** card: a row per Baby Buddy child (avatar, faded when hidden; name; `age · Shown/Hidden`; ›). Under "For every child": theme, lock-screen timer, haptics, as today. The old "Child" picker and the top-level nap window / bottle / Vitamin D controls go; they move to the child screen.
- **Child screen** (a new route, e.g. `src/app/(main)/child/[id].tsx`, back to Settings): big avatar, name, `Born 3 March 2026 · 6 months`; In Molly Shown / Hidden; Colour (four swatches); Nap window; Bottle defaults; Vitamin D reminder (Android only, as today, with the permission flow). Footer "Name and birth date come from Baby Buddy." Saves the way Settings saves today.
- All labels plain, in every theme, except where `copy.ts` already has a playful label for the same thing.

### Onboarding

`src/app/onboarding/child.tsx` becomes "Which children?": copy "Molly shows one child at a time. Swipe down on the avatar to switch.", a ticked row per child, the button "Continue with N children" (disabled "Pick at least one"). Unticked children are saved hidden. The first ticked opens first. One child: skipped, as today (`chooseChild` in `packages/core/src/onboarding.ts` grows to return the picked set). `PendingOnboarding` and `signIn` carry the picked set; the checklist saves it. The key-rejected reconnect keeps the stored children and prefs.

### Colours

Four child colours as theme tokens in `src/theme/tokens.ts` (`child-1-bg` / `child-1-ink` … `child-4-*`, day and night; day values from the design: `oklch(0.86 0.07 h)` / `oklch(0.34 0.08 h)` for h = 350, 210, 145, 75). Every theme uses them (the Settings swatches must stay recognisable across themes, so no per-theme child hues). `hue` in prefs is the index 0–3.

### Widgets

- Each widget is **pinned to a child or follows the app** (`Molly Children Widgets.dc.html`, 1b). When a widget is added, a "Whose widget?" screen asks: "Follow the app" (first, ticked, "Whoever is on the dashboard"), then every shown child (avatar, name), and "Add widget". Long-press → reconfigure changes it later (`widgetFeatures: "reconfigurable"` on every widget in `app.json`, `registerWidgetConfigurationScreen`). With one shown child (or signed out) the screen doesn't ask: the widget follows the app.
- Pins are per device, `widgetId → childId | 'follow'` in their own AsyncStorage key, dropped when the widget is deleted. A pin to a child that's hidden or gone draws the app's child, as Follow does.
- The cache keeps the app's child's snapshot (`snapshot`, drawn by following widgets) and one snapshot per other pinned, shown child (`pinned`); the refresh fetches each. A tap acts on the child the widget drew, taken from the cache, never from settings at tap time.
- While more than one child is shown, every widget carries the child's avatar (initial on its colour) and, where there's room, first name (the 2×2 has an avatar + name row on top); one child looks as today.
- Nap window and bottle for a widget / notification write come from that child's prefs.

### Lock-screen notifications

- One sleep and one feeding notification **per shown child** whose timer this phone knows about. The rule stays the same: only from what this phone fetched, no background polling. The refresh fetches the running timers of every shown child (the same all-children timer list as the dashboard), and the widget cache keeps them per child.
- Kotlin (`modules/molly-notify/…/Notifier.kt`, `ActionReceiver.kt`, `MollyNotifyModule.kt`): notifications are told apart by child. Use the notification tag, or ids from child and tracker; PendingIntent request codes and the swiped-away key in `molly.notify` must include the child. The child id goes in the action extras, then through the worker into `notification/task.android.ts`, then into `runWidgetIntent`. The pending line keeps working per notification. Channels, importance and Live Updates promotion stay as they are.
- Title: with more than one shown child, the child's name leads ("Otto · Sleeping"); one child → as today. Wording is settled in the look review.
- With more than one shown child, the child's avatar replaces the tracker icon (the notification's small icon is the initial, its colour the child's), and the newest timer sorts on top.
- A child turned hidden, or signed out → its notifications go.

### Vitamin D reminder

- The switch is per child (child screen). A stop of child X on this phone checks child X's cycle only if X's switch is on. Everything else in `../implan-vitamin-d-reminder/MAIN.md` holds: the cycle, the name match, silent `molly.reminders`, Given now, Dismiss, and clearing on refresh.
- The widget cache keeps one reminder per child. Each is its own notification, with the child's name in the title when more than one child is shown. Given now logs for that notification's child.
- Wording from the design (decided 2026-09-29: everywhere, not only with several children): title `Vitamin D` (`Ella · Vitamin D` with several), text `Not given today` (the pending line or an error replace it), buttons **Given now** and **Later**. Later is today's Dismiss renamed: gone until the next check posts a new one. The Last-given line goes.

## Decisions

| Decision | Why |
| --- | --- |
| One child on screen, switch by swiping the stack or picking in the sheet | The design; big targets, one hand, no combined view to learn |
| Per-child prefs in local settings, keyed by Baby Buddy child id | Colour, shown and defaults are per device like today's settings; Baby Buddy has no place for them |
| `childId` keeps its name and means "child on screen" | Least churn; every query already keys by it |
| Persisted cache holds every child | Switching back is instant and offline-readable |
| Widgets pinned to a child or following the app, taps act on the drawn child | The widgets design (1b): one widget per child logs for both without opening the app. Replaces the planner's first call (widgets only follow the app) |
| Notifications for every shown child, child id in the extras | Two sleeping children must not share one notification or stop the wrong timer |
| Vitamin D reminder per child | The design lists it on the child screen; doses are per child |
| Four fixed child colours shared by every theme | Recognisable avatars everywhere; the design has four |
| Initials, no photos | `picture` loading with a token is unverified; initials are enough to tell three children apart |
| Prefs dropped on sign-out | Child ids belong to one Baby Buddy |
| New Baby Buddy children appear shown | A parent who adds a baby wants to see it |

## Shape

```
packages/core/src/children.ts                    age label, shown children, next child, status line, default prefs (pure)
packages/core/src/onboarding.ts                  chooseChild → the picked set
packages/api/src/client.ts                       listTimers({ name }) across children (if the container confirms)
apps/molly/src/storage/types.ts                  children prefs, migration, sign-out
apps/molly/src/session/session.tsx               shown children, prefs of a child, setChild / setChildPrefs
apps/molly/src/app/_layout.tsx, src/lib/query.tsx   cache key without childId
apps/molly/src/features/children/                queries (all running sleeps, last sleep per child), avatar, stack, sheet, strip
apps/molly/src/app/(main)/index.tsx              header, stack, strip, sheet, toast
apps/molly/src/app/(main)/settings.tsx           Children card, shared section
apps/molly/src/app/(main)/child/[id].tsx         child screen
apps/molly/src/app/onboarding/child.tsx          Which children?
apps/molly/src/theme/tokens.ts                   child-1…4 colours
apps/molly/src/widget/model.ts, refresh.ts       snapshot child, per-child timers and reminders, runWidgetIntent(intent, child)
apps/molly/src/notification/model.ts, sync.android.ts, task.android.ts   per-child notifications and titles
apps/molly/modules/molly-notify/android/…        per-child ids / tags, child in extras
e2e/tests/…                                      children specs
```

File names are a suggestion. Follow the file-suffix rule in the root `CLAUDE.md` (the `.android.tsx` file and its plain fallback share an extension; widget files start with `'use no memo';`).

## Steps

Work through them in order. Each lands on its own, green (`pnpm check`). Mark a step `[x]` when it's fully done, and record findings in [`NOTES.md`](NOTES.md). Method per kind of work follows the root `CLAUDE.md` and [`TEST_STRATEGY.md`](TEST_STRATEGY.md).

- [x] **1. Domain (TDD, `packages/core`).** `children.ts`: `ageLabel`, `shownChildren`, `nextChild`, default prefs, status line. `chooseChild` returns the picked set. Export from the index.
- [x] **2. Settings and session (TDD for parsing).** `children` prefs in `Settings`, defaults, migration from the single-child shape, sign-out. Session exposes shown children, the child on screen (falling back when hidden / gone) and setters. Every reader of the old top-level `napWindow` / `bottle` / `vitaminDReminder` reads the child's prefs instead (dashboard writes, widget refresh, reminder). Query provider key and cache buster without `childId`. The app still looks single-child after this step; existing Playwright specs pass, except that the Settings child switch spec may be updated when its control moves in step 5.
- [x] **3. API and children queries.** Check `/timers/?name=molly:sleep` without `child` against the container; add `listTimers` with an integration test (`packages/api/test/`). The all-children running-sleep query and the last-sleep-per-child query in `features/children/`, invalidated by writes like `timer`.
- [x] **4. Dashboard.** Child colour tokens, avatar, header with age, stack with pull and tap, toast, sheet, other-child strip. Playwright (web): two and three children created ad hoc like `dashboard.spec.ts` does today. Pick in the sheet, pull on the stack (mouse drag), the strip's Switch when another child's sleep runs, one child without a pull. Manual look on web.
- [x] **5. Settings, child screen, onboarding.** Children card, child screen (shown / hidden with the last-shown guard, colour, nap window, bottle, Vitamin D on Android), shared section; "Which children?" onboarding. Update `onboarding.spec.ts` and `dashboard.spec.ts` for the replaced behaviour; new specs for hide / show and the per-child nap window.
- [x] **6. Widgets and notifications (TDD for `widget/model.ts` and `notification/model.ts`).** Snapshot child, per-child timers and reminders in the cache, `runWidgetIntent` with a child, per-child notification content and titles, Kotlin ids / tags / extras, widget child badge. Rebuild (`pnpm android:release`, `docs/android-build.md`) and run the emulator list in `TEST_STRATEGY.md` on `emulator-5554`.
- [x] **7. Wrap up.** Update the root `CLAUDE.md`: add this plan to "Where things stand", and in Architecture mention per-child prefs and that `childId` is the child on screen. Mark the multi-child outline in `implan-molly/MAIN.md` as planned here. List what's left (look review, device checks) in `NOTES.md`.

Added with `Molly Children Widgets.dc.html` (2026-09-29):

- [x] **8. Widgets pinned to a child (TDD for `widget/model.ts`).** Pins store (parse, per widget id, dropped on delete), `pinned` snapshots in the cache and the refresh, `widgetView` / taps for a widget's child, "Whose widget?" configuration screen (`registerWidgetConfigurationScreen`, skipped with one shown child), `widgetFeatures: "reconfigurable"` in `app.json`, avatar + name on the widgets.
- [x] **9. Notification avatars and reminder wording (TDD for `notification/model.ts`).** Avatar (initial + child colour) in the notification content while several children are shown, drawn natively as the small icon; newest timer on top (sort key); reminder `Vitamin D` / `Not given today` / Given now + Later everywhere.
- [x] **10. Emulator checks and notes.** Rebuild, run the new emulator items in `TEST_STRATEGY.md` on `emulator-5554`, record findings in `NOTES.md`, update the root `CLAUDE.md` entry.
