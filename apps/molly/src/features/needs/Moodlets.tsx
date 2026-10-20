import { View } from 'react-native';

import { Text } from '@/components/ui';
import { Glyph } from '@/theme/Glyph';
import { needTone } from '@/theme/need-look';

import { MOODLET_GLYPHS } from './faces';
import type { NeedsView } from './use-needs';

/**
 * Life Sim's moodlets above the window row: one 30 px line of chips (what doesn't fit is cut off), good ones
 * edged green with `+n`, bad ones red with `−n`. Hidden with Playful labels off (they're all words), and
 * when there are none. Decoration.
 */
export function Moodlets({ needs }: { needs: NeedsView }) {
  if (!needs.words || needs.moodlets.length === 0) return null;
  const good = needTone(needs.look, 100);
  const bad = needTone(needs.look, 0);
  return (
    <View
      testID="moodlets"
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="h-[30px] flex-row flex-wrap gap-1.5 overflow-hidden"
    >
      {needs.moodlets.map((moodlet) => {
        const tone = moodlet.points > 0 ? good : bad;
        return (
          <View
            key={moodlet.key}
            className="h-[30px] flex-row items-center gap-[5px] rounded-full bg-surface pl-[7px] pr-2.5"
            style={{ borderWidth: 1.5, borderColor: tone.color }}
          >
            <Glyph name={MOODLET_GLYPHS[moodlet.key]} filled size={16} color={tone.ink as `#${string}`} />
            <Text maxFontSizeMultiplier={1.2} numberOfLines={1} className="text-xs font-extrabold">
              {needs.look.words.moodlets[moodlet.key]}
            </Text>
            <Text maxFontSizeMultiplier={1.2} className="text-xs font-black" style={{ color: tone.ink }}>
              {moodlet.points > 0 ? `+${moodlet.points}` : `−${-moodlet.points}`}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
