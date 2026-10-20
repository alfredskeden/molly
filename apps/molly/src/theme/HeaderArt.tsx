import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HEADER_SIZE } from './art';
import { useTheme } from './theme';
import { THEMES } from './themes';

/** An SVG (ASCII) as an image source. Base64: Android's image loader (Glide) reads no other data URI. */
export const svgSource = (svg: string) => ({ uri: `data:image/svg+xml;base64,${btoa(svg)}` });

/** The design's pattern area (170 px from the top of the phone) below its 36 px status bar. */
const HEIGHT = HEADER_SIZE.height - 36;

/**
 * The theme's header pattern, behind the top of a Screen's content (it scrolls away with it). Nothing for
 * a theme without one (Classic).
 */
export function HeaderArt() {
  const { look, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const art = THEMES[look][scheme].header;
  if (!art) return null;
  return (
    <Image
      aria-hidden
      source={svgSource(art.header)}
      contentFit="cover"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + HEIGHT }}
    />
  );
}
