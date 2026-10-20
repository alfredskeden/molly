# Expo review

Context: the system plan in [`../implan-molly/MAIN.md`](../implan-molly/MAIN.md) and the root `CLAUDE.md`. Where the findings came from, the decisions and what's left out on purpose are in [`NOTES.md`](NOTES.md). The picture is in [`MENTAL_MODEL.md`](MENTAL_MODEL.md), and the Definition of Done is in [`TEST_STRATEGY.md`](TEST_STRATEGY.md).

**Outcome:** the fixes from a review of the app against the official Expo agent skills. That means six real bugs gone, a quieter JS thread (fewer re-renders, no blocking native calls, fewer requests per tap), SDK-aligned dependencies, a shell that recovers from errors, and sheets and tappables that behave like the skill's recipes. Nothing changes in what Molly shows or how it predicts.

The Expo skills are installed as a Claude Code plugin. Load the matching skill before a step when it helps (`expo-data-fetching` for steps 2–3, `expo-router` for step 4, `expo-module` for step 5, `expo-upgrade` for step 6, `expo-animation` / `expo-design-system` for steps 7–8). `CLAUDE.md` wins where they disagree: no EAS, `npx expo install` for app dependencies, semantic colour classes, `'use no memo'` in widget files.

## Bugs

1. **A poll can overwrite a tap mid-write.** `guess` in `src/features/dashboard/optimistic.ts` calls `cancelQueries`, which only cancels fetches already running. The 30 s `refetchInterval` (`POLL_MS` in `queries.ts`) and refetch-on-focus keep running. A poll that lands during the server check and the write (up to 15 s each) puts the old state back, then the refresh flips it again. Fix: count the writes in progress, set the polling queries' `refetchInterval` to `false` and skip focus refetches while the count is above zero. The existing undo-on-failure stays.
2. **Android Back on Settings or Recent days goes to the hidden dashboard.** The `BackHandler` effect in `src/app/(main)/index.tsx` stays registered while the dashboard is in the background, and it runs before React Navigation's own handler. Open Settings from a past window (`viewKey` set), press Back: the dashboard resets and Settings stays open. Fix: register it only while the dashboard has focus (`useFocusEffect`, or `useIsFocused()` in the guard).
3. **The splash can stay up forever.** `SessionProvider` (`src/session/session.tsx`) and the theme provider (`src/theme/theme.tsx`) load from storage with no `.catch`. SecureStore throws after a keystore reset or a backup restore, and `localStorage` throws in a private browser window. The state stays `loading` and `SplashScreen.hideAsync` never runs. Fix: on failure fall back to `signedOut` and the default theme.
4. **A notification tap can leave the notification stuck.** `startTask` in `modules/molly-notify/.../ActionWorker.kt` checks `currentReactContext`, then adds a `ReactInstanceEventListener`, then calls `host.start()`. If React finishes starting in that gap, the task never runs. The notification stays on `showPending`'s "Stopping…" with no buttons until WorkManager kills the worker, and nothing redraws it. Fix: check the context again after adding the listener and start the task once (`AtomicBoolean`). Add a timeout that sets `Result.failure()`. On failure or `onStopped`, redraw the notification from the widget cache (or at least restore its buttons).
5. **Edits and deletes reach the prediction late.** `useRecentEntries().sleep` and `useRecentSleeps` (`queries.ts`) fetch overlapping sleeps, and both poll. `guessEntries` (`optimistic.ts`) updates `entries` and `past`, but not `sleeps`. After an edit the ring shows the new sleep while the prediction still uses the old one. Fix: one source for the dashboard's sleeps (take them from the `sleeps` query), or include `sleeps` in the guess. Prefer the single source, since it also removes a request every 30 s.
6. **Unknown 4xx counts as a refused key.** `errorKindFor` in `packages/api/src/errors.ts` ends with `return 'unauthorized'`. A 405, 408, 409, 413 or a proxy's 429 then runs the key check and shows a permission toast. Fix: map them to `server`, or to a new `unexpected` kind if `server`'s wording doesn't fit (check the toast texts in `outcome-messages.ts`).

## JS-thread load

Owned here, not by `implan-instant-taps` (see `NOTES.md`).

- **The whole dashboard re-renders every second.** `useNow(1000)` at the top of `(main)/index.tsx` re-runs `dayPlan`, `dayWindow`, the ring's sleeps, marks and ghosts, and redraws every SVG node every second. Only the ring's centre timer and a running tile need seconds. Fix: the screen ticks once a minute. A small leaf component owns the 1 s tick for the centre text, and `Tiles.tsx` already has its own. Better still, one shared clock aligned to the second, so the centre and the tile never show different seconds.
- **Notification calls block the JS thread.** `show`, `keepOnly`, `showReminder` and `keepOnlyReminders` in `MollyNotifyModule.kt` are sync `Function`s that make Android system calls, touch SharedPreferences and draw a bitmap, and `syncNotifications` (`src/notification/sync.android.ts`) makes four or more per refresh. Make them, and `liveUpdates`, `AsyncFunction`. Check whether the order between calls matters (`keepOnly` after `show`): if it does, `await` them in sequence in `syncNotifications`. `freshConnections` stays sync, since it must finish before the next request.
- **Cancelled requests keep running.** No query function passes TanStack's `signal` on, and `request` in `packages/api/src/client.ts` only has its own timeout controller. Add an optional `signal` to the client's calls, combine it with the timeout (`AbortSignal.any`, or listen and abort), and pass `({ signal })` from each `queryFn`. A cancelled request must still fail as something the app ignores, not as `unreachable`.
- **Retries.** `retry: 1` for every error (`src/lib/query.tsx`). Retry only `unreachable` / `server`, never 4xx. Keep the predicate a pure function so it can be unit-tested.

## Hygiene

- **Versions:** `npx expo install --fix` (expo, expo-router, and others are behind SDK 57's expected versions), then a clean prebuild.
- **Unused native packages:** remove `expo-symbols`, `expo-glass-effect`, `@expo/ui`, `expo-device`, `expo-web-browser`. Search the whole repo (`app.json` plugins too) before removing each one.
- **The patched widget library:** pin `react-native-android-widget` to exactly `0.22.1` in `apps/molly/package.json`. The patch in `patches/` only fits that version.
- **Fewer refetches per tap:** the invalidation after a write (`queries.ts`, around `invalidateQueries`) refetches about 10 keys, including `history`, which no longer exists. Drop `history`. Give `past` and `days` `refetchType: 'none'` unless their screen is showing, so a tap stops refetching 17 days and every loaded week.
- **`staleTime`:** `settings` (local storage, invalidated on save) can be `Infinity`; `children` a few minutes.
- **The persisted cache:** `shouldPersist` (`src/lib/query.tsx`) skips queries that are mid-refetch. Coming back to the app refetches everything, so if Android kills Molly during that refetch, the next cold start has no timer or entries and shows the skeleton. Persist the last good data whatever the fetch status. Also, the "ended", "edited" and "deleted" guesses carry no negative id, so `holdsGuess` lets them be saved, against `CLAUDE.md`'s rule. Mark guessed queries some other way (for example, a set of keys with a write in progress, which is the same counter bug 1 needs).
- **Paging:** `collect` in `client.ts` pages newest-first by offset. An entry added between pages repeats one item, so dedupe by id.
- **Router:** add `src/app/+not-found.tsx` that redirects to `/`, so a stale web bookmark doesn't hit the default "Unmatched Route". Add `export const unstable_settings = { anchor: 'index' }` to `(main)/_layout.tsx`, so a reload on `/settings` or `/child/3` has the dashboard underneath. Then check that `goBack` in `ui.tsx` and the child screen's `replace('/settings')` still make sense.
- **Error boundary:** export `ErrorBoundary` from `src/app/_layout.tsx` (and `(main)/_layout.tsx`), as a themed screen with "Try again" (`retry`). Without it, a render error in the dashboard is a blank screen in a release build.
- **`Color.parseColor`** in `Notifier.kt` throws on a malformed colour, which crashes the process when reached from `ActionReceiver`. Wrap it in `runCatching` with a fallback colour.
- **Skeleton:** `opacity.value` → `.get()` / `.set()` (`src/features/dashboard/Skeleton.tsx`), the form that's safe with the React Compiler.

## Sheets

`src/components/sheet.tsx` is shared by every sheet (Add, Today, Theme, Lock screen, Why, Children…).

- **Motion:** a slide in and out (`translateY` from 100%, spring about 300 ms, damping ratio about 0.8), with the scrim fading. Respect Remove animations through the existing `useReducedMotion` (`ReduceMotion.System` as well).
- **Drag to dismiss:** a pan down on the handle or the sheet's top closes it past a distance or speed threshold, and springs back otherwise. Use Gesture Handler with Reanimated, following the skill's recipe. The pan must not steal scrolls inside a sheet's content, and must end on cancel and finalize, not only `onEnd`.
- **Keyboard:** replace the `Keyboard.addListener('keyboardDidShow')` state with `react-native-keyboard-controller` (`KeyboardProvider` at the root, the sheet translated by the keyboard height on the UI thread). Install it with `npx expo install`, rebuild with a clean prebuild, and check that the web bundle still builds (it's a no-op there).
- **TalkBack:** while a sheet is open, set `importantForAccessibility="no-hide-descendants"` on the screen body behind it, so TalkBack can't reach buttons under the scrim. This probably needs an open-sheet flag the screen can read (context in `sheet.tsx`).

## Accessibility and polish

- **Tappables with no press feedback:** `Segment` and `ToggleRow` (`ui.tsx`), the Add sheet's kind chips, "Not now" in `LockScreenSheet.tsx`, and the links in `KeyRejected.tsx` and `toast.tsx`. Add `active:opacity-70` on rows and links, and a background highlight on segments and chips. Cap every press scale at 0.97 (ring marks and cap use 0.92, `IconButton` 0.94). The ripple is `implan-instant-taps` step 3's; don't add it here.
- **Timer labels:** the ring centre (`Ring.tsx`) and running tiles (`Tiles.tsx`) put seconds in their `accessibilityLabel`, so TalkBack may re-read them every second. Speak minutes only.
- **The Add sheet's button:** it fades when the entry has a problem but stays pressable, and the reason is only in the live-region text. Add `accessibilityHint={problem}`.
- **`Segment` hit size:** options are 44 high with 4 px slop. Make them reach 48 dp.
- **Type and radius tokens:** add Tailwind `fontSize` keys for the repeated sizes (`text-[13px]` ×29, `text-[15px]` ×26, `text-[17px]` ×10). Name them by role (`caption`, `label`, `body`…, check `tailwind.config.js` and `themes.ts` first, since themes set fonts) and replace the arbitrary values. Map `rounded-[18px]` / `rounded-[10px]` (`ThemeSheet.tsx`, `LockScreenSheet.tsx`) onto existing radius tokens. Every theme must look the same afterwards.

## Shape

```
packages/api/src/errors.ts, client.ts                 4xx mapping, signal, paging dedupe (unit tests)
apps/molly/src/lib/query.tsx                          retry predicate, persist rule, staleTime
apps/molly/src/features/dashboard/                    optimistic.ts (write counter), queries.ts (polling, sleeps, invalidation), use-now.ts, Skeleton.tsx
apps/molly/src/app/                                   +not-found.tsx, _layout.tsx (ErrorBoundary), (main)/_layout.tsx (anchor), (main)/index.tsx (back handler, minute tick)
apps/molly/src/session/session.tsx, src/theme/theme.tsx   storage failure fallback
apps/molly/modules/molly-notify/android/...           ActionWorker.kt, MollyNotifyModule.kt, Notifier.kt
apps/molly/src/notification/sync.android.ts           awaits the now-async calls
apps/molly/src/components/sheet.tsx, ui.tsx           sheet motion / drag / keyboard / TalkBack, press feedback
apps/molly/package.json, tailwind.config.js           versions, removals, pin, keyboard-controller, type tokens
```

## Steps

Work through them in order. Each lands on its own; commit after each. Mark a step `[x]` when it's fully done, and record findings and surprises in [`NOTES.md`](NOTES.md). Run `pnpm check` after every step, and rebuild with `pnpm android:release` after native or dependency changes.

- [x] **1. API client.** Unknown 4xx mapping (bug 6), optional `signal` combined with the timeout, paging dedupe. TDD in `packages/api` (`errors.test.ts`, `timeout.test.ts`; integration tests only where Baby Buddy's real behaviour matters).
- [x] **2. Data layer.** Write counter that pauses polling and focus refetch (bug 1), single source for sleeps (bug 5), `signal` passed from every `queryFn`, retry predicate, `staleTime`, trimmed invalidation, the persist rule. Pure pieces (retry predicate, persist predicate) get unit tests.
- [x] **3. Dashboard tick.** Minute tick for the screen, 1 s leaf for the centre and tiles, one aligned clock. Emulator check: the centre and a running tile tick together and the ring is unchanged.
- [x] **4. App shell.** Back handler on focus only (bug 2), storage failure fallback (bug 3), `ErrorBoundary`, `+not-found`, `anchor`. Emulator and web checks as in `TEST_STRATEGY.md`.
- [x] **5. Native module.** `ActionWorker` race and recovery (bug 4), async notification calls, `parseColor` guard. Rebuild, emulator checks. Add a pointer in `implan-instant-taps/NOTES.md` saying the JS-load fixes from steps 2, 3 and 5 landed.
- [x] **6. Dependencies.** `npx expo install --fix`, remove the five unused packages, pin the widget library, add `react-native-keyboard-controller`. Clean prebuild, `pnpm android:release`, web bundle check, `npx expo-doctor` all green.
- [x] **7. Sheets.** Motion, drag to dismiss, keyboard, TalkBack hiding. Emulator look review in both themes, plus web.
- [x] **8. Accessibility and polish.** Missing press feedback, scale cap, timer labels, the Add button's hint, `Segment` size, type and radius tokens, Skeleton `.get()` / `.set()`.
- [x] **9. Wrap up.** Add this plan to "Where things stand" in the root `CLAUDE.md`, tick `TEST_STRATEGY.md`, and list what's left for a physical phone.

## Out of scope

- The native ripple and the widget's native pressed draw (`implan-instant-taps` steps 3–4), and the app freeze itself (its step 2).
- AsyncStorage → `expo-sqlite`, the cleartext setting, Help as a modal, moving `ConnectionSheet`, inline sheets → routes (reasons in `NOTES.md`).
- Any change to what Molly shows, predicts or saves.
- Testing on a physical phone (listed in `NOTES.md` for later).
