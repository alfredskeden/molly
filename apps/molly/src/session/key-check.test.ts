import { BabyBuddyError, type Profile } from '@molly/api';
import { describe, expect, it, vi } from 'vitest';

import { checkKey, checkKeyOnce, watchRefusals } from './key-check';

const profile: Profile = {
  user: { id: 1, username: 'parent_a', first_name: '', last_name: '', email: '', is_staff: false },
  language: 'en-US',
  timezone: 'Europe/Stockholm',
  api_key: 'key',
};
const refused = (kind: 'forbidden' | 'unauthorized' | 'unreachable') => () => Promise.reject(new BabyBuddyError(kind));

describe('checking the key after a refusal', () => {
  it('a profile that still loads means the key works', async () => {
    // Given
    const client = { getProfile: () => Promise.resolve(profile) };

    // When
    const verdict = await checkKey(client);

    // Then
    expect(verdict).toBe('keyWorks');
  });

  it('a refused profile means the key is rejected', async () => {
    // Given
    const client = { getProfile: refused('unauthorized') };

    // When
    const verdict = await checkKey(client);

    // Then
    expect(verdict).toBe('invalidKey');
  });

  it('several refusals at once ask Baby Buddy only once', async () => {
    // Given
    const getProfile = vi.fn(refused('forbidden'));

    // When
    const verdicts = await Promise.all([checkKeyOnce({ getProfile }, 'key'), checkKeyOnce({ getProfile }, 'key')]);

    // Then
    expect(verdicts).toEqual(['invalidKey', 'invalidKey']);
    expect(getProfile).toHaveBeenCalledTimes(1);
  });
});

describe('watching a client for refusals', () => {
  it('reports a refused request and still fails it', async () => {
    // Given
    const onRefused = vi.fn();
    const client = watchRefusals({ findTimer: refused('forbidden') }, onRefused);

    // When
    const result = client.findTimer();

    // Then
    await expect(result).rejects.toThrow('forbidden');
    expect(onRefused).toHaveBeenCalledOnce();
  });

  it('ignores failures that are not refusals', async () => {
    // Given
    const onRefused = vi.fn();
    const client = watchRefusals({ findTimer: refused('unreachable') }, onRefused);

    // When
    await client.findTimer().catch(() => undefined);

    // Then
    expect(onRefused).not.toHaveBeenCalled();
  });
});
