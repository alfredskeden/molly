// The web's photo: a file from the browser's chooser. Android's camera and library: photo.native.ts.
import type { NoteImage } from '@molly/api';
import { getRandomBytes } from 'expo-crypto';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { fitLongEdge, PHOTO_QUALITY, photoName } from './photo-model';

export type PhotoSource = 'camera' | 'library';

/** A picked photo, shrunk and ready to upload; `uri` shows it in the sheet before it's saved. */
export type PickedPhoto = { uri: string; image: NoteImage };

/** Only "Choose a photo" on the web. */
export const PHOTO_SOURCES: readonly PhotoSource[] = ['library'];

/**
 * A photo from the browser's file chooser, downscaled to 1600 px on the long edge as a JPEG under a random
 * name. Read back as base64 rather than fetched: the CSP's `connect-src` allows only Baby Buddy.
 */
export async function pickPhoto(_source: PhotoSource): Promise<PickedPhoto | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  const context = ImageManipulator.manipulate(asset.uri);
  const resize = fitLongEdge(asset.width, asset.height);
  if (resize) context.resize(resize);
  const saved = await (await context.renderAsync()).saveAsync({ compress: PHOTO_QUALITY, format: SaveFormat.JPEG, base64: true });
  const bytes = Uint8Array.from(atob(saved.base64 ?? ''), (char) => char.charCodeAt(0));
  return { uri: saved.uri, image: { name: photoName(getRandomBytes(16)), blob: new Blob([bytes], { type: 'image/jpeg' }) } };
}
