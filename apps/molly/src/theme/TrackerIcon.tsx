import { useOrnaments } from './Bow';
import { Glyph } from './Glyph';
import { RibbonIcon, type RibbonKind } from './RibbonIcon';
import type { FilledSymbol } from './symbols';
import { useTheme } from './theme';
import type { Palette } from './tokens';

/** The tracker glyphs Ribbon draws its own pictures for. */
const RIBBON_KINDS: Partial<Record<FilledSymbol, RibbonKind>> = {
  bedtime: 'sleep',
  breastfeeding: 'feed',
  water_full: 'bottle',
  baby_changing_station: 'diaper',
  medication: 'med',
};

type Colour = keyof Palette | `#${string}`;

/**
 * A tracker's filled glyph, or in a theme with ornaments (Ribbon) its picture of it. `kind` picks the picture
 * where the glyph alone doesn't say (a diaper change drawn as a drop); other glyphs stay glyphs. `light`: the
 * colour it sits on; `accent`: the picture's cheeks and bows, the theme's bow unless given. `ribbonSize`: the
 * design's size for the picture where it differs from the glyph's.
 */
export function TrackerIcon({
  name,
  kind,
  size,
  ribbonSize,
  color,
  light,
  accent,
}: {
  name: FilledSymbol;
  kind?: RibbonKind;
  size: number;
  ribbonSize?: number;
  color: Colour;
  light: Colour;
  accent?: Colour;
}) {
  const ornaments = useOrnaments();
  const { palette } = useTheme();
  const picture = kind ?? RIBBON_KINDS[name];
  if (!ornaments || !picture) return <Glyph name={name} filled size={size} color={color} />;
  const resolve = (colour: Colour) => (colour.startsWith('#') ? colour : palette[colour as keyof Palette]);
  return (
    <RibbonIcon
      kind={picture}
      size={ribbonSize ?? size}
      ink={resolve(color)}
      light={resolve(light)}
      accent={accent ? resolve(accent) : ornaments.bow.color}
    />
  );
}
