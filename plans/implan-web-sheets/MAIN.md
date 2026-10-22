# Web sheets and wide windows

GitHub issue #5.

## Outcome

On the web, every bottom sheet (`apps/molly/src/components/sheet.tsx`: Add entry, Today, Why, Children, Theme, Lock screen, measurements, guide notes) sits on the bottom of the screen with the theme's surface, rounded top corners and the scrim behind it, as on Android. Before, the sheet started at the top of the screen, had no background and no scrim, and the dashboard showed through it.

A wide browser window shows the app as a centred column at most 520 px wide, instead of stretching tiles, segmented controls and sheets edge to edge. Phones and Android don't change.

## The cause

NativeWind 4 turns `className` into styles only on components it knows (`cssInterop`). React Native's own `View` is one; Reanimated's `Animated.View` isn't. On Android the classes still reached the native view, on the web they were dropped, so the sheet's `Animated.View`s lost `absolute bottom-0 left-0 right-0`, `rounded-t-sheet bg-surface` and the scrim layers' `absolute inset-0`.

## The rules

- Reanimated views carry `style` only. Positioning uses `StyleSheet` (`absoluteFill`, `styles.bottom`); themed classes go on a plain `View` inside the animated one. The sheet body is now a plain `View` with `accessibilityLabel`, `rounded-t-sheet bg-surface` and the scroll sheets' `maxHeight`, inside the dragged `Animated.View` that measures the height for the drag.
- `ThemeProvider` wraps the app in a `View` that is `w-full max-w-[520px] flex-1 self-center` on the web and `flex-1` elsewhere. The page background outside the column is the theme's `bg-bg`.

## Steps

1. [x] Reproduce in the production web image (headless Chromium): sheet at the top, transparent, no scrim.
2. [x] Move the classes off the `Animated.View`s in `sheet.tsx`.
3. [x] Look pass on the web at 412 px and 1280 px: dashboard, Add entry, Today (day and night colours), Settings, Theme, Recent days, child, Development guide and its sheet, a measurement, Help, onboarding. Phone widths were fine; wide windows stretched everything.
4. [x] Cap the web app at a centred 520 px column in `ThemeProvider`.
5. [x] Playwright regression tests in `e2e/tests/shell.spec.ts` (fail on the old code, pass now).
6. [x] `pnpm check` and `pnpm e2e` green.
7. [ ] Manual checks in `TEST_STRATEGY.md` (Android emulator, real browsers).
