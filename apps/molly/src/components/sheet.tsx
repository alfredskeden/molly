import { useEffect, type ReactNode } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  FadeOut,
  interpolate,
  ReduceMotion,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Bow, useOrnaments } from '@/theme/Bow';

import { CloseButton, Text } from './ui';

/** In with the sheet spring (about 300 ms, a touch of give), out faster on a strong ease-out; none with Remove animations. */
const ENTER = SlideInDown.springify().duration(300).dampingRatio(0.8).reduceMotion(ReduceMotion.System);
const EXIT = SlideOutDown.duration(200).easing(Easing.bezier(0.23, 1, 0.32, 1)).reduceMotion(ReduceMotion.System);
const SCRIM_IN = FadeIn.duration(200).reduceMotion(ReduceMotion.System);
const SCRIM_OUT = FadeOut.duration(200).reduceMotion(ReduceMotion.System);

/** A drag past this share of the sheet's height, or a flick heading there, closes it. */
const CLOSE_SHARE = 0.35;

/** Where a flick would come to rest if it kept slowing down (Apple's decay), in px from its velocity. */
function project(velocity: number) {
  'worklet';
  const rate = 0.998;
  return ((velocity / 1000) * rate) / (1 - rate);
}

/** Upward past the open position resists instead of following the finger. */
function rubberband(overshoot: number, dimension: number) {
  'worklet';
  return (overshoot * dimension * 0.55) / (dimension + 0.55 * Math.abs(overshoot));
}

export function Sheet({
  label,
  title,
  spokenTitle,
  onScrimPress,
  scrimLabel = 'Close',
  scroll,
  children,
}: {
  label: string;
  title?: string;
  spokenTitle?: string;
  onScrimPress: () => void;
  scrimLabel?: string;
  scroll?: boolean;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // Both on the UI thread: the keyboard's real position frame by frame (0 → minus its height), and the drag.
  const keyboard = useReanimatedKeyboardAnimation().height;
  const drag = useSharedValue(0);
  const dragStart = useSharedValue(0);
  const sheetHeight = useSharedValue(height);
  const reduced = useReducedMotion();
  const ornaments = useOrnaments();
  // Android's back closes the sheet, as the scrim does, instead of leaving the screen under it.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onScrimPress();
      return true;
    });
    return () => subscription.remove();
  }, [onScrimPress]);
  const bottom = insets.bottom + 28;

  // A pan down on the handle or the header closes past a distance or a flick, and springs back otherwise.
  // Only the top takes it, so the content's own scrolling never closes the sheet. Settled in `onFinalize`, so a
  // cancelled pan doesn't leave the sheet half-open.
  const pan = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .onStart(() => {
      dragStart.set(drag.get());
    })
    .onUpdate((event) => {
      const next = dragStart.get() + event.translationY;
      drag.set(next >= 0 ? next : rubberband(next, sheetHeight.get()));
    })
    .onFinalize((event) => {
      const settle = { duration: 300, dampingRatio: 0.8, velocity: event.velocityY, reduceMotion: ReduceMotion.System };
      if (drag.get() + project(event.velocityY) > sheetHeight.get() * CLOSE_SHARE) {
        drag.set(
          withSpring(sheetHeight.get(), { ...settle, dampingRatio: 1, overshootClamping: true }, (finished) => {
            if (finished) scheduleOnRN(onScrimPress);
          }),
        );
      } else {
        drag.set(withSpring(0, settle));
      }
    });

  // A floating keyboard reports less than the nav bar's inset: the sheet keeps what the keyboard doesn't cover.
  const lifted = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.max(0, -keyboard.get() - insets.bottom) }],
  }));
  const dragged = useAnimatedStyle(() => ({ transform: [{ translateY: drag.get() }] }));
  const scrimFade = useAnimatedStyle(() => ({
    opacity: interpolate(drag.get(), [0, sheetHeight.get()], [1, 0], Extrapolation.CLAMP),
  }));

  const header = (
    <>
      {/* The handle's touch area is taller than it looks; the drag works from the whole header. Ribbon ties a bow there. */}
      <View className="-my-2 self-stretch py-2">
        {ornaments ? (
          <View className="self-center">
            <Bow size={34} color={ornaments.bow.color} shade={ornaments.bow.shade} />
          </View>
        ) : (
          <View className="h-[5px] w-10 self-center rounded-sm bg-line" />
        )}
      </View>
      {title && (
        <View className="-mb-1 flex-row items-center justify-between pt-1.5">
          <Text role="heading" accessibilityLabel={spokenTitle} className="pl-1 text-[22px] font-display">
            {title}
          </Text>
          <CloseButton onPress={onScrimPress} />
        </View>
      )}
    </>
  );
  return (
    <View className="absolute inset-0">
      <Animated.View entering={SCRIM_IN} exiting={SCRIM_OUT} className="absolute inset-0">
        <Animated.View style={scrimFade} className="absolute inset-0">
          <Pressable accessibilityLabel={scrimLabel} onPress={onScrimPress} className="absolute inset-0 bg-scrim" />
        </Animated.View>
      </Animated.View>
      <Animated.View
        entering={reduced ? undefined : ENTER}
        exiting={reduced ? undefined : EXIT}
        className="absolute bottom-0 left-0 right-0"
      >
        <Animated.View style={lifted}>
          <Animated.View
            accessibilityLabel={label}
            className="rounded-t-sheet bg-surface"
            style={[dragged, { maxHeight: scroll ? height * 0.82 : undefined }]}
            onLayout={(event) => sheetHeight.set(event.nativeEvent.layout.height)}
          >
            {scroll ? (
              <>
                <GestureDetector gesture={pan}>
                  <View className="gap-3.5 px-4 pt-2.5">{header}</View>
                </GestureDetector>
                <ScrollView contentContainerStyle={{ paddingBottom: bottom }} className="px-4 pt-1.5">
                  {children}
                </ScrollView>
              </>
            ) : (
              <View className="gap-4 px-4 pt-2.5" style={{ paddingBottom: bottom }}>
                <GestureDetector gesture={pan}>
                  <View className="gap-4">{header}</View>
                </GestureDetector>
                {children}
              </View>
            )}
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/**
 * The screen under a sheet: hidden from TalkBack while `sheetOpen`, so swiping never reaches a button under
 * the scrim. Wraps the screen's body, not the sheets.
 */
export function BehindSheet({ sheetOpen, children }: { sheetOpen: boolean; children: ReactNode }) {
  return (
    <View className="flex-1" importantForAccessibility={sheetOpen ? 'no-hide-descendants' : 'auto'}>
      {children}
    </View>
  );
}
