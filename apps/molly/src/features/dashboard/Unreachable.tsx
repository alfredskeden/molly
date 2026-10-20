import { View } from 'react-native';

import { Pressable } from '@/components/pressable';
import { Text } from '@/components/ui';

/**
 * Baby Buddy doesn't answer. Says how old the screen is and that taps won't save; buttons stay usable
 * and fail with the usual toast. `asOf` is null when nothing has loaded yet.
 */
export function UnreachableBanner({ asOf, onRetry }: { asOf: string | null; onRetry: () => void }) {
  return (
    <View className="flex-row items-center gap-3 rounded-card border-[1.5px] border-danger bg-surface py-3.5 pl-4 pr-3.5">
      <View className="h-2.5 w-2.5 rounded-full bg-danger" />
      <View accessibilityLiveRegion="polite" className="flex-1 gap-0.5">
        <Text className="text-label font-display">Can&apos;t reach Baby Buddy</Text>
        <Text className="text-caption font-bold leading-[18px] text-muted">
          {asOf ? `Showing what Molly saw ${asOf}. ` : ''}Taps won&apos;t save until it&apos;s back.
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        className="min-h-11 justify-center rounded-chip bg-accent px-4 active:scale-[0.97]"
      >
        <Text className="text-label font-display text-on-accent">Retry</Text>
      </Pressable>
    </View>
  );
}
