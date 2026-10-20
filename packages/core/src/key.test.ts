import { describe, expect, it } from 'vitest';

import { keyCheckVerdict } from './key';

describe('telling a rejected key from a missing permission', () => {
  it('a refusal while the profile still loads is not a key problem', () => {
    // Given
    const profile = 'ok';

    // When
    const verdict = keyCheckVerdict(profile);

    // Then
    expect(verdict).toBe('keyWorks');
  });

  it('a refusal the profile check repeats means Baby Buddy rejects the key', () => {
    // Given
    const profile = 'forbidden';

    // When
    const verdict = keyCheckVerdict(profile);

    // Then
    expect(verdict).toBe('invalidKey');
  });

  it('a profile check that fails for another reason confirms nothing', () => {
    // Given
    const profile = 'unreachable';

    // When
    const verdict = keyCheckVerdict(profile);

    // Then
    expect(verdict).toBe('unconfirmed');
  });

  it('a profile check refused as a bad token means Baby Buddy rejects the key', () => {
    // Given
    const profile = 'unauthorized';

    // When
    const verdict = keyCheckVerdict(profile);

    // Then
    expect(verdict).toBe('invalidKey');
  });
});
