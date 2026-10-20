import { beforeEach, describe, expect, it } from 'vitest';

import { clearCredentials, loadCredentials, saveCredentials } from './credentials';

const credentials = { baseUrl: 'https://baby.example.com', token: 'abc123', userId: 2 };

beforeEach(() => localStorage.clear());

describe('credentials on the web (localStorage)', () => {
  it('nothing is stored before onboarding', async () => {
    // Given
    const fresh = localStorage;

    // When
    const loaded = await loadCredentials();

    // Then
    expect(loaded).toBeNull();
    expect(fresh.length).toBe(0);
  });

  it('saved credentials load back', async () => {
    // Given
    await saveCredentials(credentials);

    // When
    const loaded = await loadCredentials();

    // Then
    expect(loaded).toEqual(credentials);
  });

  it('clearing removes them', async () => {
    // Given
    await saveCredentials(credentials);

    // When
    await clearCredentials();

    // Then
    expect(await loadCredentials()).toBeNull();
  });

  it.each(['{not json', '{"baseUrl":"https://baby.example.com"}'])(
    'a corrupt stored value (%s) loads as nothing',
    async (stored) => {
      // Given
      localStorage.setItem('molly.credentials', stored);

      // When
      const loaded = await loadCredentials();

      // Then
      expect(loaded).toBeNull();
    },
  );
});
