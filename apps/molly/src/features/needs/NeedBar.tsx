import type { Need } from '@molly/core';
import { View } from 'react-native';

import { needTone, type NeedsLook } from '@/theme/need-look';

const SEGMENTS = 10;

/**
 * A need as ten segments (the design's 7 px bar with 2 px gaps), lit up to its value in its colour. On a
 * running tile's solid card the unlit ones are see-through white. Decoration: the tile says it in words.
 */
export function NeedBar({ need, look, testID }: { need: Need; look: NeedsLook; testID?: string }) {
  const { color } = needTone(look, need.value);
  const off = need.running ? look.offRunning : look.off;
  return (
    <View testID={testID} className="flex-row gap-0.5" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
      {Array.from({ length: SEGMENTS }, (_, index) => (
        // A segment is lit once the value is past its first 2 % (the design's `val > j * 10 + 2`).
        <View key={index} className="h-[7px] flex-1 rounded-[2px]" style={{ backgroundColor: need.value > index * 10 + 2 ? color : off }} />
      ))}
    </View>
  );
}
