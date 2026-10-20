import { View } from 'react-native';

import { Text } from '@/components/ui';

// Written out so Tailwind finds every class (tokens: CHILD_COLOURS in src/theme/tokens.ts).
const BG = ['bg-child-1-bg', 'bg-child-2-bg', 'bg-child-3-bg', 'bg-child-4-bg', 'bg-child-5-bg'];
const INK = ['text-child-1-ink', 'text-child-2-ink', 'text-child-3-ink', 'text-child-4-ink', 'text-child-5-ink'];

export const childBg = (hue: number) => BG[hue % BG.length]!;
export const childInk = (hue: number) => INK[hue % INK.length]!;

/** The first letter of the first name, as the avatar shows it. */
export const initialOf = (name: string) => (Array.from(name.trim())[0] ?? '?').toUpperCase();

/**
 * A child's initial on its colour. `ring`: a 3 px ring in the page background, so stacked avatars read
 * apart. Decorative: whatever holds it says whose it is.
 */
export function Avatar({
  name,
  hue,
  size,
  ring = false,
  faded = false,
  square = false,
}: {
  name: string;
  hue: number;
  size: number;
  ring?: boolean;
  faded?: boolean;
  /** The ring design's rounded square (Settings, the child screen) instead of a circle. */
  square?: boolean;
}) {
  return (
    <View
      aria-hidden
      className={`items-center justify-center ${square ? '' : 'rounded-full'} ${childBg(hue)} ${ring ? 'border-[3px] border-bg' : ''} ${faded ? 'opacity-45' : ''}`}
      style={{ width: size, height: size, borderRadius: square ? Math.round(size * 0.31) : undefined }}
    >
      <Text
        className={`font-display ${childInk(hue)}`}
        style={{ fontSize: Math.round(size * 0.42), lineHeight: Math.round(size * 0.52) }}
        maxFontSizeMultiplier={1}
      >
        {initialOf(name)}
      </Text>
    </View>
  );
}
