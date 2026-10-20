import { describe, expect, it } from 'vitest';

import { clientAs, testEnv } from '../test/test-env';
import { createClient } from './index';

describe('connecting to Baby Buddy', () => {
  it('returns the profile with the user id for a valid key', async () => {
    // Given
    const client = clientAs(testEnv.parentA);

    // When
    const profile = await client.getProfile();

    // Then
    expect(profile.user.id).toBe(testEnv.parentA.id);
  });

  it('rejects a wrong key as unauthorized', async () => {
    // Given
    const client = createClient({ baseUrl: testEnv.baseUrl, token: 'not-a-real-key' });

    // When
    const request = client.getProfile();

    // Then
    await expect(request).rejects.toMatchObject({ kind: 'unauthorized' });
  });

  it('reports a host that cannot be reached as unreachable', async () => {
    // Given
    const client = createClient({ baseUrl: 'http://127.0.0.1:1', token: testEnv.parentA.token });

    // When
    const request = client.getProfile();

    // Then
    await expect(request).rejects.toMatchObject({ kind: 'unreachable' });
  });

  it('reports a URL that answers with a web page instead of the API as unreachable', async () => {
    // Given
    const client = createClient({ baseUrl: `${testEnv.baseUrl}/admin`, token: testEnv.parentA.token });

    // When
    const request = client.getProfile();

    // Then
    await expect(request).rejects.toMatchObject({ kind: 'unreachable' });
  });

  it('lists the children with id, name, birth date and slug', async () => {
    // Given
    const client = clientAs(testEnv.parentA);

    // When
    const children = await client.listChildren();

    // Then
    expect(children).toContainEqual(
      expect.objectContaining({
        id: testEnv.childId,
        first_name: 'Test',
        last_name: 'Baby',
        birth_date: '2026-04-27',
        slug: 'test-baby',
      }),
    );
  });
});
