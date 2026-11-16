# Notes

## Decisions (planning, 2026-11-15)

- Screen behaviour: no TDD, no unit tests (no core logic). Android is checked by hand on the emulator (`emulator-5554` only, never the developer's phone); the web gets a Playwright check in `e2e/tests/todo.spec.ts`.
- Fix in the shared place the cause lives in (`Sheet` or one sheet text field), never per field.
- ~~Confirm the cause with throwaway builds before changing code~~: dropped 2026-11-16 (see Decided after planning); the hypotheses are from reading only and the fix covers 1 and 2 together.
- No `MENTAL_MODEL.md`: one component tree, a handful of hypotheses.

## Versions (`apps/molly/package.json`)

- `react-native` 0.86.3 (New Architecture / Fabric), `react` 19.2.3, `expo` ~57.0.26, React Compiler on (`app.json`).
- `react-native-gesture-handler` ~2.32.0, `react-native-reanimated` 4.5.1, `react-native-worklets` 0.10.1.
- `react-native-keyboard-controller` 1.21.9, `nativewind` ^4.2.7, `react-native-web` ~0.21.0.

## Facts from the code

Line numbers on `develop` at `414159d`.

**The to-do fields** (`apps/molly/src/features/todo/TodoSheet.tsx`)

- Item text `TextInput` at 134–143: `value={draft.text}`, `onChangeText={(text) => set({ text })}` (no transform; `set` at 91 merges into `draft` with a functional update), `autoFocus={!item}`, `returnKeyType="done"`, className `min-h-[52px] rounded-chip border border-line bg-bg px-3.5 font-sans text-title font-bold text-ink`. Autocorrect and capitalisation are left at their defaults (on).
- New label `TextInput` at 172–182: `value={naming}`, `onChangeText={setNaming}`, `autoFocus`, `onSubmitEditing={addLabel}`. Mounted when "+ New label" is tapped (`naming !== null`, 170).
- Neither has `selection`, `onSelectionChange`, `selectTextOnFocus`, `caretHidden`, `contextMenuHidden` or `editable`. No `Pressable` / `TouchableWithoutFeedback` wraps them; the nearest parents are plain `View`s (133, 171).
- The sheet is mounted from `app/(main)/todo.tsx` 144–162 with `key={editingItem?.id ?? 'new'}`: stable while open. The screen re-renders it on `useNow(60_000)` (42), once a minute; `useUnsavedOnReturn` (`features/return/ReturnProvider.tsx` 88–93) writes to a plain `Map` in an effect, no re-render. `tapLog` (`tap-log/log.android.ts`) only appends to AsyncStorage, no React state.

**The sheet** (`apps/molly/src/components/sheet.tsx`)

- Drag `Pan` at 93–113 (`activeOffsetY([-10, 10])`), attached with `GestureDetector` only around the header: 168 (scroll sheets) and 183 (plain sheets). No `simultaneousWithExternalGesture` / `blocksExternalGesture`; nothing gesture-handler wraps the content.
- Scroll sheets: plain React Native `ScrollView` at 173 with `keyboardShouldPersistTaps="handled"` (174), added in #28 (`plans/implan-todo-keyboard/`) so the first tap on a chip with the keyboard up counts.
- Animated ancestors of every field: entering/exiting layout animation (`SlideInDown` springified, 158), `lifted` translateY from the keyboard (116, 159), and on scroll sheets `capped` (120) animating `maxHeight` per keyboard frame together with the drag `translateY`, on the view with `onLayout` → `sheetHeight` (160). `capped` came with #28.
- Scroll sheets: `TodoSheet`, `TodaySheet`, `ThemeSheet`, `GuideNote`; only `TodoSheet` has text fields. Non-scroll sheets with fields: `AddSheet`, `MeasurementSheet`, the toast's `AdjustSheet`; the Solids panel and the dashboard editor host `FoodField`.

**Root** (`apps/molly/src/app/_layout.tsx` 34–48): `GestureHandlerRootView` with `onTouchStart` / `onTouchEnd` / `onTouchCancel` logging to the Tap log, then `KeyboardProvider`. A `touch cancel` line while tapping in a field means a native gesture took the touch.

**Other text fields**

- `Field` (`components/ui.tsx` 235–249): `autoCapitalize="none"`, `autoCorrect={false}`, theme placeholder colour, same classes as the to-do text plus `py-3`. Used only by onboarding (`features/onboarding/ConnectForm.tsx` 34, 41) inside `Screen` (`ui.tsx` 43–56), a `ScrollView` with `keyboardShouldPersistTaps="handled"`.
- `AddSheet`'s `NoteInput` (`features/add/AddSheet.tsx` 266–277) and `FoodField` (`features/feed/FoodField.tsx` 27–40): free text, controlled, no transforms; same classes as the to-do text (food: `h-[60px] border-2 border-feed-mid`).
- `MeasurementSheet` (`features/measurements/MeasurementSheet.tsx`): Notes 195–202 free text; value 113–127 and time 178–190 are `selectTextOnFocus` with a `typed` draft (the first tap selects all on purpose).
- `AddSheet` typed time 245–262: `selectTextOnFocus`, `maxLength={5}`.
- `BottleAmount` (`features/feed/BottleAmount.tsx` 50–66) and the toast's typed time (`features/toast/toast.tsx` 342–360): invisible digit catchers, `caretHidden` + `contextMenuHidden` on purpose. Not in scope.

## Seen on the emulator (2026-11-15)

- `molly` AVD (1080×2424), installed release `se.skedeback.molly` 1.3.0 (installed 2026-10-29, after the to-do sheet and #28). Test Baby Buddy up and seeded.
- Onboarding "Baby Buddy address" (`Field`, prefilled `http://10.0.2.2:4778`): a tap mid-text then typing `X` gave `http://X10.0.2.2:4778`. Cursor placement works there: a controlled `TextInput` in a `handled` `ScrollView` under the same root is fine.
- The to-do sheet itself was not reached: the app was on "Molly can't sign in" (the test Baby Buddy had been recreated, so the old key was gone), and typing the test key into the emulator was not done; reproduction was then dropped.

## Upstream reading

Nothing found that matches this exact setup (Fabric Android, field inside Reanimated-animated sheet). Related:

- Expo's controlled-components guide: on the New Architecture the cursor stays put while `onChangeText` returns the text unchanged; transforms make Fabric remap the cursor and it can miss. Our fields don't transform. <https://docs.expo.dev/guides/controlled-components/>
- `selection` prop broken on Android after 0.73, New Architecture label (we don't use `selection`): <https://github.com/facebook/react-native/issues/44171>
- Fabric commit changing how Android `TextInput` applies selection when attached to the window: <https://github.com/facebook/react-native/commit/1656394bae16cc54fb38687d38bcbf85138c98a2>
- Android `TextInput` layout lagging text on the New Architecture (layout commits and text state interacting): <https://github.com/facebook/react-native/issues/46813>
- A text field's cursor resetting when its container resizes (Titanium, not React Native; same mechanism as hypothesis 1): <https://jira-archive.titaniumsdk.com/TIMOB/TIMOB-8765.json>

## Cleanup sweep (planning)

- **Refactor (before the fix, MAIN step 3):** five free-text `TextInput`s repeat placeholder colour + `rounded-chip border bg-bg px-3.5 font-sans font-bold text-ink`: `TodoSheet.tsx` 134 and 172, `AddSheet.tsx` 269 (`NoteInput`), `FoodField.tsx` 27, `MeasurementSheet.tsx` 195, plus `Field` in `ui.tsx` 240. One `TextBox` in `ui.tsx` gives the fix one home if the cause is in the field (hypothesis 3) and keeps sheet fields alike. `NoteInput` would become a one-line use of it (or go).
- **Keep:** the root `onTouch*` Tap log lines in `_layout.tsx` are the tool for the developer's spot check, not scaffolding of this issue. `keyboardShouldPersistTaps="handled"` stays (#28's first-tap fix). The hidden digit inputs keep `caretHidden` / `contextMenuHidden`.
- **Docs:** `Sheet`'s doc comment says "Taps in it count while the keyboard is open"; add the cursor rule there once known. `plans/implan-todo-keyboard/MAIN.md` describes the animated cap as current; if step 4 changes it, add a line there pointing here.
- **Spotted, not in scope:** none.

## Open

None.

## Decided after planning (2026-11-16)

- **No reproduction, no cause hunt.** The developer: it should just work. The fix removes hypotheses 1 and 2 together instead of confirming one first; the Android checklist is theirs after merge.
- **The scroll sheet resizes in one step** when the keyboard has finished opening (and closing) instead of gliding with it frame by frame.
- **Autocorrect and suggestions stay on** in free-text fields.

## Implementation (2026-11-16)

- **`TextBox`** (`components/ui.tsx`): base classes `rounded-chip bg-bg px-3.5 font-sans font-bold text-ink`, theme placeholder colour, `underlineColorAndroid="transparent"`; a default `border border-line` unless the caller's `className` has a `border-` class (FoodField's `border-2 border-feed-mid`), since NativeWind doesn't let a later class reliably win over an earlier one of the same kind. Callers add height and text size. Used by the to-do text and New label, Add entry's medication note (`NoteInput` removed), `FoodField`, the measurement Notes, and `Field` (onboarding).
- **Left as plain `TextInput` on purpose** (not free text, a different face and padding): Add entry's typed time (`AddSheet.tsx` `TimeRow`, `selectTextOnFocus`), the measurement value (`MeasurementSheet.tsx`, `selectTextOnFocus`, display face), and the hidden digit catchers (`BottleAmount`, the toast's typed time). So `placeholderTextColor={palette.muted}` still appears in `AddSheet.tsx` and `MeasurementSheet.tsx` for those two typed fields, plus `ui.tsx`.
- **`Sheet`**: `useKeyboardHandler` (`react-native-keyboard-controller` 1.21.9) sets a `settled` shared value from `onEnd`'s `event.height` (positive px, 0 when closed) and a `moving` flag from `onStart`/`onEnd`; `capped`'s `maxHeight` reads `settled`, not the per-frame keyboard height, so the scroll sheet's layout changes once per keyboard move. `lifted` still follows the keyboard frame by frame (a transform). `onLayout` doesn't write `sheetHeight` while `moving`. On mount `settled` starts from the current keyboard height (a sheet opened with the keyboard up). On the web the keyboard context is a no-op: `settled` stays 0, the cap is the old 82 %.
- **Gesture-handler's `ScrollView`** in `Sheet` (`react-native-gesture-handler` 2.32): it's `createNativeWrapper(RNScrollView)`, so NativeWind's `className` doesn't reach the inner scroll view; the old `px-4 pt-1.5` became `style={{ paddingHorizontal: 16, paddingTop: 6 }}`. `keyboardShouldPersistTaps="handled"` kept. The header `Pan` is only on the header, so no `simultaneousWithExternalGesture` / `Gesture.Native()` was needed.
- **Formatter**: the repo has no Prettier config; running Prettier with defaults reformats every file. Don't.
- **e2e and parallel work**: `pnpm e2e` owns `localhost:8080` and `--force-recreate`s the shared `molly-web` container, so two worktrees running it at once break each other's runs (a run here failed halfway when another started). A worktree's `e2e/.env.test` can go stale (403 on admin calls); `pnpm bb:seed` is idempotent and rewrites it without changing keys.

## Checked (2026-11-16)

- `pnpm check` green. `pnpm e2e`: 260 tests, 259 passed on the full run; `instant-feeds` "a finished bottle saves the amount on its row" failed once (amount 115 for 105, another write on the shared Baby Buddy) and passed on its own rerun. `todo.spec.ts` 24/24 including the two new cursor tests.
- Emulator (`emulator-5554`, `molly` AVD, arm64 release build of this branch): the app starts with no `ReactNativeJS` / `AndroidRuntime` errors; on onboarding the address field (`Field`, now on `TextBox`) takes a tap mid-text: tapping inside `http://10.0.2.2:4778` and typing `X` gave `http://10.0.X2.2:4778`. The to-do sheet itself wasn't reached (signing in on the emulator wasn't done), so the Android checklist in `TEST_STRATEGY.md` stays the developer's, as decided.
- Cleanup sweep at wrap-up: `NoteInput` removed (planned); no other code made obsolete. The remaining raw `TextInput`s are the deliberate typed and hidden fields listed under Implementation.
