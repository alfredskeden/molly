import { describe, expect, it } from 'vitest';

import { diaperFor } from './diaper';

describe('diaper buttons', () => {
  it('Wet logs wet only', () => {
    // Given
    const button = 'wet';

    // When
    const diaper = diaperFor(button);

    // Then
    expect(diaper).toEqual({ wet: true, solid: false });
  });

  it('Dirty logs solid only', () => {
    // Given
    const button = 'dirty';

    // When
    const diaper = diaperFor(button);

    // Then
    expect(diaper).toEqual({ wet: false, solid: true });
  });

  it('Both logs wet and solid', () => {
    // Given
    const button = 'both';

    // When
    const diaper = diaperFor(button);

    // Then
    expect(diaper).toEqual({ wet: true, solid: true });
  });
});
