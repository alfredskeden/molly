import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/ui';

/** Fast loads never flash: a skeleton only shows once data has been missing this long. */
export const SKELETON_DELAY_MS = 300;

/** True once `pending` has lasted SKELETON_DELAY_MS; false again as soon as it ends. */
export function useSkeleton(pending: boolean) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!pending) return;
    const timeout = setTimeout(() => setShown(true), SKELETON_DELAY_MS);
    return () => {
      clearTimeout(timeout);
      setShown(false);
    };
  }, [pending]);
  return pending && shown;
}

/** A pulsing placeholder shape. The pulse holds still when the system asks for less motion. */
export function Bone({ className }: { className: string }) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    opacity.set(withRepeat(withTiming(0.45, { duration: 700 }), -1, true));
  }, [opacity, reduceMotion]);
  const pulse = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <Animated.View style={pulse}>
      <View className={className} />
    </Animated.View>
  );
}

/** Hidden from screen readers: `LoadingAnnouncement` speaks for the whole dashboard. */
const HIDDEN = { 'aria-hidden': true } as const;

/** A past page still loading: the card's shape, so the swipe lands on something steady. */
export function PageSkeleton() {
  return (
    <View testID="skeleton-page" className="gap-2.5 rounded-card border-card border-edge bg-surface shadow-card px-4 py-3.5">
      <View {...HIDDEN} className="gap-2.5">
        <Bone className="h-4 w-32 rounded-[7px] bg-line" />
        <Bone className="h-3.5 w-48 rounded-[7px] bg-line" />
        <View className="gap-1 pt-4">
          {[0, 1, 2, 3, 4].map((lane) => (
            <Bone key={lane} className="h-3.5 rounded-[5px] bg-line" />
          ))}
        </View>
      </View>
    </View>
  );
}

// Full class names, spelled out so Tailwind finds them.
const MID = { sleep: 'bg-sleep-mid/50', feed: 'bg-feed-mid/50', diaper: 'bg-diaper-mid/50', med: 'bg-med-mid/50' };

/** A tile's status line while the entries it describes are loading. */
export function SubtitleSkeleton({ tone, testID }: { tone: keyof typeof MID; testID?: string }) {
  return (
    <View testID={testID} {...HIDDEN} className="py-0.5">
      <Bone className={`h-3 w-24 rounded-md ${MID[tone]}`} />
    </View>
  );
}

/**
 * Says "Loading today" once when the skeleton appears. Android and iOS take an announcement;
 * react-native-web ignores those, so the web gets a polite live region instead.
 */
export function LoadingAnnouncement({ loading }: { loading: boolean }) {
  useEffect(() => {
    if (loading && Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility('Loading today');
  }, [loading]);
  if (Platform.OS !== 'web') return null;
  return (
    <View aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 }}>
      <Text>{loading ? 'Loading today' : ''}</Text>
    </View>
  );
}
