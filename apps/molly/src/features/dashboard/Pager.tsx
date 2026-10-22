import type { RingPager } from '@molly/core';
import { View } from 'react-native';

import { IconButton, InkButton, Text } from '@/components/ui';
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
  return (
    <View className="min-h-[62px] flex-row items-center gap-2 px-4 pt-1.5">
      <View className="flex-1 items-start">
        <IconButton icon="chevron_left" size={28} label={previous.spoken} disabled={!previous.enabled} pending={waiting} onPress={onPrevious} />
      </View>
      <View className="shrink items-center">
        <Text accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit className="text-[22px] font-display leading-7 tracking-display-0_5">
          {title}
        </Text>
        <View className="flex-row items-center gap-1">
          <Glyph name={night ? 'bedtime' : 'wb_sunny'} filled size={16} color={night ? 'sleep-ink' : 'med-ink'} />
          <Text numberOfLines={1} className="text-sm font-bold text-muted">
            {date}
          </Text>
        </View>
      </View>
      <View className="flex-1 items-end">
        {next.live ? (
          <InkButton label={next.title} trailing="chevron_right" accessibilityLabel={next.spoken} onPress={onNext} />
        ) : (
          <IconButton icon="chevron_right" size={28} label={next.spoken} onPress={onNext} />
        )}
      </View>
    </View>
  );
}
