import Svg, { Path } from 'react-native-svg';

import { FILLED, OUTLINED, type FilledSymbol, type OutlinedSymbol } from './symbols';
import { useTheme } from './theme';
import type { Palette } from './tokens';

type Props = {
  size: number;
  /** A palette colour of the current theme, or a `#rrggbb` (a child's colour). */
  color: keyof Palette | `#${string}`;
} & ({ name: FilledSymbol; filled: true } | { name: OutlinedSymbol; filled?: false });

/** A Material Symbols Rounded glyph. Decorative: whatever holds it says what it means. */
export function Glyph({ name, filled, size, color }: Props) {
  const { palette } = useTheme();
  const d = filled ? FILLED[name as FilledSymbol] : OUTLINED[name as OutlinedSymbol];
  return (
    <Svg aria-hidden width={size} height={size} viewBox="0 -960 960 960">
      <Path d={d} fill={color.startsWith('#') ? color : palette[color as keyof Palette]} />
    </Svg>
  );
}
