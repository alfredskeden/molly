import { describe, expect, it } from 'vitest';

import { errorKindFor } from './errors';

describe('mapping failed responses to error kinds', () => {
  it('a server error surfaces as server', () => {
    // Given
    const status = 502;

    // When
    const kind = errorKindFor(status, null);

    // Then
    expect(kind).toBe('server');
  });
});

describe('a client error Baby Buddy has no meaning for', () => {
  it.each([405, 408, 409, 413, 429])('%i surfaces as server, never as a refused key', (status) => {
    // Given
    const body = { detail: 'Request was throttled.' };

    // When
    const kind = errorKindFor(status, body);

    // Then
    expect(kind).toBe('server');
  });

  it('401 still surfaces as unauthorized', () => {
    // Given
    const status = 401;

    // When
    const kind = errorKindFor(status, null);

    // Then
    expect(kind).toBe('unauthorized');
  });

  it('a 403 for a bad token still surfaces as unauthorized', () => {
    // Given
    const body = { detail: 'Invalid token.' };

    // When
    const kind = errorKindFor(403, body);

    // Then
    expect(kind).toBe('unauthorized');
  });

  it('any other 403 still surfaces as forbidden', () => {
    // Given
    const body = { detail: 'You do not have permission to perform this action.' };

    // When
    const kind = errorKindFor(403, body);

    // Then
    expect(kind).toBe('forbidden');
  });
});
