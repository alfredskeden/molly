import { View } from 'react-native';

import { Glyph } from '@/theme/Glyph';
import { needTone } from '@/theme/need-look';

import { MOOD_FACES } from './faces';
import type { NeedsView } from './use-needs';

/** The pill's size, px (design: 40 px tall, the 32 px cap, a 22 px face, 4 / 5 px padding, 2 px gap). */
export const MOOD_PILL = { height: 40, width: 4 + 32 + 2 + 22 + 5, cap: 32 };

/**
 * Life Sim's mood pill at the ring's top, in the colour of the average need: the cap's sun or moon in a
 * surface circle, then the mood's face. Drawn under the cap's button (which stays the tap target); decoration.
 */
export function MoodPill({ needs, night, opacity }: { needs: NeedsView; night: boolean; opacity: number }) {
  const mood = needs.mood!;
  const { color } = needTone(needs.look, mood.value);
  return (
    <View
      testID="mood-pill"
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="flex-row items-center rounded-full"
      // oklch(0.3 0.06 255 / .25)
      style={{ height: MOOD_PILL.height, gap: 2, paddingLeft: 4, paddingRight: 5, backgroundColor: color, boxShadow: '0 2px 6px #19283f40', opacity }}
    >
      <View className="items-center justify-center rounded-full bg-surface" style={{ width: MOOD_PILL.cap, height: MOOD_PILL.cap }}>
        <Glyph name={night ? 'bedtime' : 'wb_sunny'} filled size={19} color={night ? 'sleep-ink' : 'med-ink'} />
      </View>
      <Glyph name={MOOD_FACES[mood.mood]} filled size={22} color={needs.look.face as `#${string}`} />
    </View>
  );
}
