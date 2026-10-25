import type { NoteImage } from '@molly/api';
import { getRandomBytes } from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { fitLongEdge, PHOTO_QUALITY, photoName } from './photo-model';

export type PhotoSource = 'camera' | 'library';

/** A picked photo, shrunk and ready to upload; `uri` shows it in the sheet before it's saved. */
export type PickedPhoto = { uri: string; image: NoteImage };

export const PHOTO_SOURCES: readonly PhotoSource[] = ['camera', 'library'];

/**
 * A photo from the camera or the library (Android's photo picker, no permission), downscaled to 1600 px
 * on the long edge as a JPEG under a random name. Null when cancelled or the camera isn't allowed.
 */
export async function pickPhoto(source: PhotoSource): Promise<PickedPhoto | null> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
  if (source === 'camera' && !(await ImagePicker.requestCameraPermissionsAsync()).granted) return null;
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  const context = ImageManipulator.manipulate(asset.uri);
  const resize = fitLongEdge(asset.width, asset.height);
  if (resize) context.resize(resize);
  const saved = await (await context.renderAsync()).saveAsync({ compress: PHOTO_QUALITY, format: SaveFormat.JPEG });
  // Expo's fetch sends a File under its own name, so the file itself gets the random one. The moved
  // File object keeps its old path: use the destination's.
  const file = new File(Paths.cache, photoName(getRandomBytes(16)));
  new File(saved.uri).move(file);
  return { uri: file.uri, image: { name: file.name, blob: file } };
}
