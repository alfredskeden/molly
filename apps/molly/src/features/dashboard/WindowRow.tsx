import type { WindowRow as Row } from '@molly/core';
import { View } from 'react-native';

import { Pressable } from '@/components/pressable';
import { Text } from '@/components/ui';

/**
 * Under the ring on the live day: the next likely sleep with its clock (`Nap 2 likely 12:56 in 1h 16m`,
 * `Bedtime likely 18:30–19:00 in 1h 30m`), the rest of the plan and the disclaimer. Tapping it opens the
 * likely-sleep panel for that sleep, which has Why and Skip.
 */
export function WindowRow({
  row,
  disclaimer,
  spoken,
  onOpen,
}: {
  row: Row;
  /** `Estimate · not medical advice`, or `Based on age (4 months) only · …` without logs to go on. */
  disclaimer: string;
  spoken: string;
  onOpen: () => void;
}) {
  return (
    <Pressable
      testID="window-row"
      accessibilityRole="button"
      accessibilityLabel={`${spoken} Show details`}
      onPress={onOpen}
      className="active:opacity-70"
    >
      <View className="min-h-9 flex-row items-center gap-2.5 px-1.5">
        <View aria-hidden className="h-3.5 w-3.5 rounded-full border-2 border-dashed border-sleep-mid bg-sleep-bg" />
        <Text numberOfLines={2} maxFontSizeMultiplier={1.4} className="flex-1 text-label font-extrabold">
          {row.title}
        </Text>
        <Text numberOfLines={1} maxFontSizeMultiplier={1.4} className="shrink-0 text-caption font-bold tabular-nums text-muted">
          {row.range}
        </Text>
        <Text numberOfLines={1} maxFontSizeMultiplier={1.4} className="shrink-0 text-right text-label font-extrabold tabular-nums">
          {row.when}
        </Text>
      </View>
      <View className="gap-0.5 pl-[30px] pr-1.5">
        {row.then && <Text className="text-caption font-bold tabular-nums">{row.then}</Text>}
        <Text className="text-xs font-bold text-muted">{disclaimer}</Text>
      </View>
    </Pressable>
  );
}
