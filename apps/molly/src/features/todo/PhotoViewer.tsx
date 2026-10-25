import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pressable } from '@/components/pressable';
import { Text } from '@/components/ui';
import { Glyph } from '@/theme/Glyph';

const MAX_ZOOM = 4;

/**
 * An item's photo over the list: dark, fitted, pinch to zoom (double tap back to fitted), with the item's
 * text, label and date under it and Edit. Android's back closes it.
 */
export function PhotoViewer({
  uri,
  text,
  detail,
  onEdit,
  onClose,
}: {
  uri: string;
  text: string;
  /** `Buy · Tomorrow 14:30`. */
  detail: string;
  onEdit: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const scale = useSharedValue(1);
  const start = useSharedValue(1);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [onClose]);

  const pinch = Gesture.Pinch()
    .onStart(() => {
      start.set(scale.get());
    })
    .onUpdate((event) => {
      scale.set(Math.min(MAX_ZOOM, Math.max(1, start.get() * event.scale)));
    });
  const reset = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scale.set(withTiming(1, { duration: 200 }));
    });
  const zoomed = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  // Reanimated's views take `style` only: NativeWind drops their `className` on the web.
  return (
    <View
      accessibilityViewIsModal
      className="absolute inset-0 bg-black"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}
    >
      <View className="flex-row justify-end px-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close photo"
          onPress={onClose}
          className="h-12 w-12 items-center justify-center active:opacity-70"
        >
          <Glyph name="close" size={26} color="#ffffff" />
        </Pressable>
      </View>
      <View className="flex-1 overflow-hidden">
        {loading && (
          <View className="absolute inset-0 items-center justify-center">
            <ActivityIndicator color="#ffffff" />
          </View>
        )}
        <GestureDetector gesture={Gesture.Simultaneous(pinch, reset)}>
          <Animated.View style={[StyleSheet.absoluteFill, zoomed]}>
            <Image
              source={{ uri }}
              accessibilityLabel={`Photo: ${text}`}
              contentFit="contain"
              onLoad={() => setLoading(false)}
              onError={() => setLoading(false)}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </GestureDetector>
      </View>
      <View className="flex-row items-center gap-3 px-5 pt-3">
        <View className="flex-1">
          <Text className="text-title font-display text-white">{text}</Text>
          <Text className="text-sm font-bold text-white opacity-70">{detail}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onEdit}
          className="h-12 flex-row items-center gap-1.5 rounded-button border-2 border-white px-4 active:opacity-70"
        >
          <Glyph name="edit" size={18} color="#ffffff" />
          <Text className="text-label font-extrabold text-white">Edit</Text>
        </Pressable>
      </View>
    </View>
  );
}
