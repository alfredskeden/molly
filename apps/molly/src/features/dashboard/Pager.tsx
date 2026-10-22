import type { RingPager } from '@molly/core';
import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';

import { FIXED_SCALE, IconButton, InkButton, Text } from '@/components/ui';
import { Glyph } from '@/theme/Glyph';

type Step = RingPager<{ kind: 'day' | 'night'; start: Date }>;

/**
 * A past ring's header (design `Molly Ring v5`): `‹` to the window before, the shown window's title over its
 * date, and `›` to the one after, or on the newest past ring an ink pill naming the live one (`Today ›`).
 */
export function Pager({
  title,
  date,
  night,
  previous,
  next,
  waiting,
  onPrevious,
  onNext,
}: {
  title: string;
  date: string;
  night: boolean;
  previous: Step['previous'];
  next: Step['next'];
  /** The window before is being fetched, and has taken long enough to show it. */
  waiting: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  // Both sides as wide as the wider button (the pill), so the title stays centred and takes the room between.
  const [widths, setWidths] = useState({ left: 0, right: 0 });
  const measure = (key: 'left' | 'right') => (event: LayoutChangeEvent) => {
    const width = Math.ceil(event.nativeEvent.layout.width);
    setWidths((current) => (current[key] === width ? current : { ...current, [key]: width }));
  };
  const side = Math.max(widths.left, widths.right);
  return (
    <View className="min-h-[62px] flex-row items-center gap-2 px-4 pt-1.5">
      <View className="items-start" style={{ minWidth: side }}>
        <View onLayout={measure('left')}>
          <IconButton icon="chevron_left" size={28} label={previous.spoken} disabled={!previous.enabled} pending={waiting} onPress={onPrevious} />
        </View>
      </View>
      <View className="min-w-0 flex-1 items-center">
        {/* Fills the column, so a long title (`Wednesday night`) at a large font shrinks to fit instead of being cut. */}
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={FIXED_SCALE}
          className="self-stretch text-center text-[22px] font-display tracking-display-0_5"
        >
          {title}
        </Text>
        <View className="flex-row items-center gap-1">
          <Glyph name={night ? 'bedtime' : 'wb_sunny'} filled size={16} color={night ? 'sleep-ink' : 'med-ink'} />
          <Text numberOfLines={1} maxFontSizeMultiplier={FIXED_SCALE} className="shrink text-sm font-bold text-muted">
            {date}
          </Text>
        </View>
      </View>
      <View className="items-end" style={{ minWidth: side }}>
        <View onLayout={measure('right')}>
          {next.live ? (
            <InkButton label={next.title} trailing="chevron_right" accessibilityLabel={next.spoken} onPress={onNext} />
          ) : (
            <IconButton icon="chevron_right" size={28} label={next.spoken} onPress={onNext} />
          )}
        </View>
      </View>
    </View>
  );
}
