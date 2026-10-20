import { Asset } from 'expo-asset';

import type { Look } from './themes';

// The bundled files, served from Molly's own origin: the CSP allows fonts only from 'self', and there
// are no runtime CDNs. One family per face with a file per weight, as on Android, so `font-bold` picks the
// file. Only the chosen theme's faces are fetched.
const FACES: Record<string, [weight: number, file: number][]> = {
  Nunito: [
    [500, require('@expo-google-fonts/nunito/500Medium/Nunito_500Medium.ttf')],
    [600, require('@expo-google-fonts/nunito/600SemiBold/Nunito_600SemiBold.ttf')],
    [700, require('@expo-google-fonts/nunito/700Bold/Nunito_700Bold.ttf')],
    [800, require('@expo-google-fonts/nunito/800ExtraBold/Nunito_800ExtraBold.ttf')],
    [900, require('@expo-google-fonts/nunito/900Black/Nunito_900Black.ttf')],
  ],
  PixelifySans: [[700, require('@expo-google-fonts/pixelify-sans/700Bold/PixelifySans_700Bold.ttf')]],
  SpaceMono: [
    [400, require('@expo-google-fonts/space-mono/400Regular/SpaceMono_400Regular.ttf')],
    [700, require('@expo-google-fonts/space-mono/700Bold/SpaceMono_700Bold.ttf')],
  ],
  ChakraPetch: [
    [700, require('@expo-google-fonts/chakra-petch/700Bold/ChakraPetch_700Bold.ttf')],
  ],
  IBMPlexSans: [
    [400, require('@expo-google-fonts/ibm-plex-sans/400Regular/IBMPlexSans_400Regular.ttf')],
    [500, require('@expo-google-fonts/ibm-plex-sans/500Medium/IBMPlexSans_500Medium.ttf')],
    [600, require('@expo-google-fonts/ibm-plex-sans/600SemiBold/IBMPlexSans_600SemiBold.ttf')],
    [700, require('@expo-google-fonts/ibm-plex-sans/700Bold/IBMPlexSans_700Bold.ttf')],
  ],
  BebasNeue: [
    [400, require('@expo-google-fonts/bebas-neue/400Regular/BebasNeue_400Regular.ttf')],
  ],
  Barlow: [
    [500, require('@expo-google-fonts/barlow/500Medium/Barlow_500Medium.ttf')],
    [600, require('@expo-google-fonts/barlow/600SemiBold/Barlow_600SemiBold.ttf')],
    [700, require('@expo-google-fonts/barlow/700Bold/Barlow_700Bold.ttf')],
    [800, require('@expo-google-fonts/barlow/800ExtraBold/Barlow_800ExtraBold.ttf')],
  ],
  VT323: [
    [400, require('@expo-google-fonts/vt323/400Regular/VT323_400Regular.ttf')],
  ],
  JetBrainsMono: [
    [400, require('@expo-google-fonts/jetbrains-mono/400Regular/JetBrainsMono_400Regular.ttf')],
    [500, require('@expo-google-fonts/jetbrains-mono/500Medium/JetBrainsMono_500Medium.ttf')],
    [700, require('@expo-google-fonts/jetbrains-mono/700Bold/JetBrainsMono_700Bold.ttf')],
    [800, require('@expo-google-fonts/jetbrains-mono/800ExtraBold/JetBrainsMono_800ExtraBold.ttf')],
  ],
  DMSerifDisplay: [
    [400, require('@expo-google-fonts/dm-serif-display/400Regular/DMSerifDisplay_400Regular.ttf')],
  ],
  Fredoka: [
    [600, require('@expo-google-fonts/fredoka/600SemiBold/Fredoka_600SemiBold.ttf')],
  ],
  Mulish: [
    [500, require('@expo-google-fonts/mulish/500Medium/Mulish_500Medium.ttf')],
    [600, require('@expo-google-fonts/mulish/600SemiBold/Mulish_600SemiBold.ttf')],
    [700, require('@expo-google-fonts/mulish/700Bold/Mulish_700Bold.ttf')],
    [800, require('@expo-google-fonts/mulish/800ExtraBold/Mulish_800ExtraBold.ttf')],
    [900, require('@expo-google-fonts/mulish/900Black/Mulish_900Black.ttf')],
  ],
  Sniglet: [
    [800, require('@expo-google-fonts/sniglet/800ExtraBold/Sniglet_800ExtraBold.ttf')],
  ],
  Quicksand: [
    [500, require('@expo-google-fonts/quicksand/500Medium/Quicksand_500Medium.ttf')],
    [600, require('@expo-google-fonts/quicksand/600SemiBold/Quicksand_600SemiBold.ttf')],
    [700, require('@expo-google-fonts/quicksand/700Bold/Quicksand_700Bold.ttf')],
  ],
};

const loaded = new Map<string, Promise<void>>();

function loadFamily(family: string): Promise<void> {
  let faces = loaded.get(family);
  if (!faces) {
    const fonts = (FACES[family] ?? []).map(
      ([weight, file]) => new FontFace(family, `url(${Asset.fromModule(file).uri})`, { weight: String(weight) }),
    );
    fonts.forEach((face) => document.fonts.add(face));
    // A missing font shouldn't keep the app from starting: fall back to the system font.
    faces = Promise.all(fonts.map((face) => face.load().catch(() => undefined))).then(() => undefined);
    loaded.set(family, faces);
  }
  return faces;
}

/** Resolves once every weight of the look's faces is ready, so no frame shows the fallback font. */
export async function loadFonts(look: Look): Promise<void> {
  await Promise.all([...new Set([look.fonts.display, look.fonts.button ?? look.fonts.display, look.fonts.body])].map(loadFamily));
}
