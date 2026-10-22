import { pastBoxesSpoken, type PastBox } from '@molly/core';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import type { FilledSymbol } from '@/theme/symbols';
import { TrackerIcon } from '@/theme/TrackerIcon';

const LOOK: Record<PastBox['kind'], { icon: FilledSymbol; ink: 'sleep-ink' | 'feed-ink' | 'diaper-ink' | 'med-ink' }> = {
  sleep: { icon: 'bedtime', ink: 'sleep-ink' },
  nap: { icon: 'partly_cloudy_day', ink: 'sleep-ink' },
  feed: { icon: 'breastfeeding', ink: 'feed-ink' },
  diaper: { icon: 'baby_changing_station', ink: 'diaper-ink' },
  med: { icon: 'medication', ink: 'med-ink' },
};

/** Under a past ring in place of the tiles: four boxes of what it held, read as one line. */
export function PastStats({ title, boxes }: { title: string; boxes: PastBox[] }) {
  return (
    <View accessible accessibilityLabel={pastBoxesSpoken(title, boxes)} className="flex-row gap-2">
      {boxes.map((box) => (
        // Slept gets more room, as in the Today sheet: `11h 55m`; narrow screens and large fonts wrap it.
        <View key={box.kind} className={`${box.kind === 'sleep' ? 'flex-[1.25]' : 'flex-1'} gap-0.5 rounded-box border-card border-edge bg-surface px-2.5 pb-3 pt-2.5`}>
          <TrackerIcon name={LOOK[box.kind].icon} size={20} ribbonSize={26} color={LOOK[box.kind].ink} light="surface" />
          <Text className="text-[19px] font-display tabular-nums">
            {box.value}
          </Text>
          <Text numberOfLines={1} adjustsFontSizeToFit className="text-xs font-bold text-muted">
            {box.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
