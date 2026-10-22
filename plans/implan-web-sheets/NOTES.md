# Notes

## Confirmed

- NativeWind 4.2 (`react-native-css-interop`) with Reanimated 4.5 and React Native Web 0.21: `className` on `Animated.View` from `react-native-reanimated` has no effect on the web. The DOM shows only RNW's own class (`css-g5y9jx`), computed background `rgba(0, 0, 0, 0)`. Plain `View`s and `Pressable`s in the same tree keep their classes. `prefers-reduced-motion` makes no difference.
- Only `sheet.tsx` put `className` on a Reanimated view (`Skeleton.tsx` uses `style` only). Keep it that way: new animated views take `style`, classes go on a plain child.
- The dashboard sizes the ring from the window height only (`ringArea` in `(main)/index.tsx`), so capping the width on the web doesn't break it.

## Decisions

- **Plain Views instead of `cssInterop(Animated.View, …)`**: registering the interop would also change the Android path, which works today, and relies on Reanimated keeping NativeWind's `$$css` style objects on the web. Moving classes to plain Views works the same on both.
- **520 px column on the web only**: the app is designed for a phone. On a laptop the tiles grew to 620 px each and the sheets ran the full window. Android tablets and foldables keep the full width (out of scope).
- The scrim covers the column, not the whole window: the sheet belongs to the column.

## Open

- Not checked in a desktop Safari / Firefox or in mobile Safari (headless Chromium only).
