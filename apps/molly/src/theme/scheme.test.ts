import { describe, expect, it } from 'vitest';

import { resolveScheme } from './scheme';

describe('resolving the theme', () => {
  it('follows a dark system as night', () => {
    // Given
    const preference = 'system';

    // When
    const scheme = resolveScheme(preference, 'dark');

    // Then
    expect(scheme).toBe('night');
  });

  it.each(['light', null])('follows a %s system as day', (system) => {
    // Given
    const preference = 'system';

    // When
    const scheme = resolveScheme(preference, system);

    // Then
    expect(scheme).toBe('day');
  });

  it.each([
    ['day', 'dark'],
    ['night', 'light'],
  ] as const)('uses a chosen %s theme over a %s system', (preference, system) => {
    // Given
    const chosen = preference;

    // When
    const scheme = resolveScheme(chosen, system);

    // Then
    expect(scheme).toBe(preference);
  });
});
