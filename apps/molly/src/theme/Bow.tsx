import { View } from 'react-native';
import Svg, { G, Path, Rect } from 'react-native-svg';

import type { Ornaments } from './ornaments';
import { useTheme } from './theme';
import { THEMES } from './themes';

/** The chosen theme's ornaments (Ribbon's bow and teddy), or null. */
export function useOrnaments(): Ornaments | null {
  const { look, scheme } = useTheme();
  return THEMES[look][scheme].ornaments;
}

// The design's `Ribbon Bow`: a satin bow `size` wide and 0.98 × as high, drawn in its own 100 × 98 viewBox.
const H = 98;

/** Where the ring's cap sits in a bow `size` wide, px from its top left: the design puts it 24 px down an 84 px bow. */
export const bowKnot = (size: number) => ({ x: size / 2, y: (size * 24) / 84 });

/**
 * A satin bow (Ribbon): the ring's top, sheets, pickers, Settings. `size`: its width, px. Outlined and shaded in
 * `shade`, with white sheen on the loops and tails.
 */
export function Bow({ size, color, shade, tilt = 0 }: { size: number; color: string; shade: string; tilt?: number }) {
  return (
    <View aria-hidden pointerEvents="none" style={{ width: size, height: Math.round(size * 0.98), transform: [{ rotate: `${tilt}deg` }] }}>
      <Svg width="100%" height="100%" viewBox={`0 0 100 ${H}`} style={{ overflow: 'visible' }}>
        <BowParts color={color} shade={shade} />
      </Svg>
    </View>
  );
}

/** The design's sheen: a white stroke along a loop or a tail. */
function Sheen({ d, width, opacity }: { d: string; width: number; opacity: number }) {
  return <Path d={d} fill="none" stroke="#ffffff" strokeWidth={width} opacity={opacity} strokeLinecap="round" />;
}

/** The bow's shapes in a 100 × 98 box, for an `Svg` of its own or inside another one (`RibbonIcon`). */
export function BowParts({ color, shade }: { color: string; shade: string }) {
  const shading = { fill: shade, opacity: 0.5, stroke: 'none' } as const;
  return (
    <G stroke={shade} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round">
      <Path d="M45 34 C40 52 28 72 15 90 L28 86 L35 97 C43 78 49 58 53 37 Z" fill={color} />
      <Path d="M55 34 C60 52 72 72 85 90 L72 86 L65 97 C57 78 51 58 47 37 Z" fill={color} />
      <Path d="M45 35 C42 50 36 62 29 73 C37 64 44 52 49 37 Z" {...shading} />
      <Path d="M55 35 C58 50 64 62 71 73 C63 64 56 52 51 37 Z" {...shading} />
      <Sheen d="M41 50 C37 62 31 72 24 82" width={2.4} opacity={0.45} />
      <Sheen d="M59 50 C63 62 69 72 76 82" width={2.4} opacity={0.3} />
      <Path d="M46 25 C36 7 12 -1 5 13 C0 24 3 42 12 49 C21 55 36 45 46 37 Z" fill={color} />
      <Path d="M54 25 C64 7 88 -1 95 13 C100 24 97 42 88 49 C79 55 64 45 54 37 Z" fill={color} />
      <Path d="M46 28 C38 20 24 17 17 24 C22 31 34 35 46 35 Z" {...shading} />
      <Path d="M54 28 C62 20 76 17 83 24 C78 31 66 35 54 35 Z" {...shading} />
      <Path d="M12 44 C22 50 34 43 44 36" fill="none" strokeWidth={1.4} />
      <Path d="M88 44 C78 50 66 43 56 36" fill="none" strokeWidth={1.4} />
      <Sheen d="M10 19 C14 10 24 8 32 13" width={3.4} opacity={0.7} />
      <Sheen d="M90 19 C86 10 76 8 68 13" width={3.4} opacity={0.5} />
      <Rect x={40.5} y={20.5} width={19} height={21} rx={7.5} fill={color} />
      <Path d="M45 24 C47 30 47 33 45 38 M55 24 C53 30 53 33 55 38" fill="none" strokeWidth={1.4} />
      <Rect x={47.5} y={24} width={3.5} height={9} rx={1.75} fill="#ffffff" opacity={0.6} stroke="none" />
    </G>
  );
}
