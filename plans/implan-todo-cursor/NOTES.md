# Notes

## Decisions (planning, 2026-11-15)

- Screen behaviour: no TDD, no unit tests (no core logic). Android is checked by hand on the emulator (`emulator-5554` only, never the developer's phone); the web gets a Playwright check in `e2e/tests/todo.spec.ts`.
- Fix in the shared place the cause lives in (`Sheet` or one sheet text field), never per field.
- Confirm the cause with throwaway builds before changing code (MAIN step 2); the hypotheses are from reading only.
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
- The to-do sheet itself was not reached: the app was on "Molly can't sign in" (the test Baby Buddy had been recreated, so the old key was gone), and typing the test key into the emulator was left for MAIN step 1.

## Upstream reading

Nothing found that matches this exact setup (Fabric Android, field inside Reanimated-animated sheet). Related:

- Expo's controlled-components guide: on the New Architecture the cursor stays put while `onChangeText` returns the text unchanged; transforms make Fabric remap the cursor and it can miss. Our fields don't transform. <https://docs.expo.dev/guides/controlled-components/>
- `selection` prop broken on Android after 0.73, New Architecture label (we don't use `selection`): <https://github.com/facebook/react-native/issues/44171>
- Fabric commit changing how Android `TextInput` applies selection when attached to the window: <https://github.com/facebook/react-native/commit/1656394bae16cc54fb38687d38bcbf85138c98a2>
- Android `TextInput` layout lagging text on the New Architecture (layout commits and text state interacting): <https://github.com/facebook/react-native/issues/46813>
- A text field's cursor resetting when its container resizes (Titanium, not React Native; same mechanism as hypothesis 1): <https://jira-archive.titaniumsdk.com/TIMOB/TIMOB-8765.json>

## Cleanup sweep (planning)

- **Refactor (before the fix, MAIN step 3):** five free-text `TextInput`s repeat placeholder colour + `rounded-chip border bg-bg px-3.5 font-sans font-bold text-ink`: `TodoSheet.tsx` 134 and 172, `AddSheet.tsx` 269 (`NoteInput`), `FoodField.tsx` 27, `MeasurementSheet.tsx` 195, plus `Field` in `ui.tsx` 240. One `TextBox` in `ui.tsx` gives the fix one home if the cause is in the field (hypothesis 3) and keeps sheet fields alike. `NoteInput` would become a one-line use of it (or go).
- **Remove (after the fix, MAIN step 5):** the step 2 diagnostics (`onSelectionChange` logging, the no-`scroll` / no-`capped` / `autoCorrect` trials). They're never committed; the step checks the diff.
- **Keep:** the root `onTouch*` Tap log lines in `_layout.tsx` are the tool for step 1, not scaffolding of this issue. `keyboardShouldPersistTaps="handled"` stays (#28's first-tap fix). The hidden digit inputs keep `caretHidden` / `contextMenuHidden`.
- **Docs:** `Sheet`'s doc comment says "Taps in it count while the keyboard is open"; add the cursor rule there once known. `plans/implan-todo-keyboard/MAIN.md` describes the animated cap as current; if step 4 changes it, add a line there pointing here.
- **Spotted, not in scope:** none.

## Open

- If the fix needs the scroll sheet's height cap to stop following the keyboard frame by frame (hypothesis 1), the sheet would resize in one step when the keyboard finishes opening instead of gliding with it. Is that acceptable, or should it keep gliding (harder: animate only a transform and mask the bottom)?
- If only turning off autocorrect / suggestions fixes it (hypothesis 3): accept losing keyboard suggestions in to-do text and notes?
