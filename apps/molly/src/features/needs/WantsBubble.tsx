import { NEEDS_TUNING } from '@molly/core';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { Glyph } from '@/theme/Glyph';
import { needTone } from '@/theme/need-look';

import { NEED_GLYPHS } from './faces';
import type { NeedsView } from './use-needs';

/** The bubble's box in the ring's corner, px (design: 72 px, the 56 px bubble bottom-left, 6 px in). */
export const WANTS_BOX = { size: 72, inset: 6 };

/**
 * Life Sim's thought bubble: what the baby wants most (the lowest need under 60, sleep while asleep) as its
 * tracker's icon over `Wants`, ringed in that need's colour; a toy in the full colour when nothing is wanted.
 * Two small dots lead up to it. Decoration: the tiles say it all in words.
 */
export function WantsBubble({ needs, opacity }: { needs: NeedsView; opacity: number }) {
  const kind = needs.wants;
  const need = kind && needs.needs[kind];
  const asleep = needs.needs.sleep?.running ?? false;
  // Asleep: the calm colour the mood pill has then, not the sleep filling up.
  const tone = needTone(needs.look, asleep ? NEEDS_TUNING.running : need ? need.value : 100);
  return (
    <View
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{ width: WANTS_BOX.size, height: WANTS_BOX.size, opacity }}
    >
      <View className="absolute h-2 w-2 rounded-full bg-surface shadow-card" style={{ right: 2, top: 0 }} />
      <View className="absolute h-3 w-3 rounded-full bg-surface shadow-card" style={{ right: 10, top: 10 }} />
      <View
        className="absolute items-center justify-center rounded-full bg-surface"
        style={{ left: 0, bottom: 0, width: 56, height: 56, borderWidth: 2, borderColor: tone.color, gap: 1 }}
      >
        <Glyph name={kind ? NEED_GLYPHS[kind] : 'toys'} filled size={24} color={asleep ? 'sleep-ink' : (tone.ink as `#${string}`)} />
        {needs.words && (
          <Text maxFontSizeMultiplier={1} className="text-[8px] font-black uppercase tracking-[0.8px] text-muted">
            {needs.look.words.wants}
          </Text>
        )}
      </View>
    </View>
  );
}
