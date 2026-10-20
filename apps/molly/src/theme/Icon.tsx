import { Image } from 'expo-image';

import { svgSource } from './HeaderArt';
import { iconSvg } from './icons';
import { useTheme } from './theme';
import { THEMES, type IconSlot } from './themes';

/** Whether the chosen theme puts pictures on its buttons (Safari). */
export function useHasIcons(): boolean {
  const { look, scheme } = useTheme();
  return THEMES[look][scheme].icons !== null;
}

/** The theme's picture for `slot` in `color` (`#rrggbb`), or nothing in a theme without pictures. */
export function Icon({ slot, color, size }: { slot: IconSlot; color: string; size: number }) {
  const { look, scheme } = useTheme();
  const name = THEMES[look][scheme].icons?.[slot];
  if (!name) return null;
  return <Image aria-hidden source={svgSource(iconSvg(name, color, size))} style={{ width: size, height: size }} />;
}
