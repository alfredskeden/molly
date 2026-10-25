// Photo sizing and naming, without the native modules, so it can be unit-tested.

/** The long edge of an uploaded photo: plenty for a label or a receipt, small on Baby Buddy's disk. */
export const PHOTO_LONG_EDGE = 1600;
export const PHOTO_QUALITY = 0.8;

/** The resize that brings the long edge down to `max`; null when the photo is small enough already. */
export function fitLongEdge(width: number, height: number, max = PHOTO_LONG_EDGE): { width: number } | { height: number } | null {
  if (Math.max(width, height) <= max) return null;
  return width >= height ? { width: max } : { height: max };
}

/**
 * Baby Buddy serves photos to anyone with the URL, so the file name is the secret: 128 random bits as hex,
 * `9f86d081884c7d659a2feaa0c55ad015.jpg`.
 */
export function photoName(random: Uint8Array): string {
  return `${[...random].map((byte) => byte.toString(16).padStart(2, '0')).join('')}.jpg`;
}
