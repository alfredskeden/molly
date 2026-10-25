import { describe, expect, it } from 'vitest';

import { fitLongEdge, photoName } from './photo-model';

describe('photo size', () => {
  it('leaves a photo within 1600 px alone', () => {
    // Given
    const [width, height] = [1600, 1200];

    // When
    const resize = fitLongEdge(width, height);

    // Then
    expect(resize).toBeNull();
  });

  it('brings the long edge of a landscape or portrait photo down to 1600 px', () => {
    // Given
    const photos = [
      [4032, 3024],
      [3024, 4032],
    ] as const;

    // When
    const resizes = photos.map(([width, height]) => fitLongEdge(width, height));

    // Then
    expect(resizes).toEqual([{ width: 1600 }, { height: 1600 }]);
  });
});

describe('photo name', () => {
  it('is the random bytes as hex, a .jpg', () => {
    // Given
    const random = Uint8Array.from([0, 15, 160, 255]);

    // When
    const name = photoName(random);

    // Then
    expect(name).toBe('000fa0ff.jpg');
  });
});
