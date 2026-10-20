import { describe, expect, it } from 'vitest';

import { feeding, sleep } from '../test/fixtures';
import { entrySavedFromTimer } from './stale';

const NONE = { sleep: [], feeding: [], change: [], medication: [] };

describe('finding the entry another phone saved from a timer', () => {
  it('finds nothing when there are no entries', () => {
    // Given
    const timerStart = '2026-09-24T07:56:00Z';

    // When
    const found = entrySavedFromTimer('sleep', timerStart, NONE);

    // Then
    expect(found).toBeNull();
  });

  it('finds the entry of that tracker that starts in the same minute as the timer', () => {
    // Given
    const nap = sleep({ start: '2026-09-24T07:56:41Z', end: '2026-09-24T09:08:00Z' });

    // When
    const found = entrySavedFromTimer('sleep', '2026-09-24T07:56:12Z', { ...NONE, sleep: [nap] });

    // Then
    expect(found).toBe(nap);
  });

  it('finds nothing when the entries start in another minute', () => {
    // Given
    const earlierNap = sleep({ start: '2026-09-24T07:55:59Z', end: '2026-09-24T09:08:00Z' });

    // When
    const found = entrySavedFromTimer('sleep', '2026-09-24T07:56:12Z', { ...NONE, sleep: [earlierNap] });

    // Then
    expect(found).toBeNull();
  });

  it('finds nothing when only another tracker has an entry from that minute', () => {
    // Given
    const bottle = feeding({ start: '2026-09-24T07:56:00Z', end: '2026-09-24T08:10:00Z' });

    // When
    const found = entrySavedFromTimer('sleep', '2026-09-24T07:56:12Z', { ...NONE, feeding: [bottle] });

    // Then
    expect(found).toBeNull();
  });

  it('finds the newest when several entries of that tracker start in that minute', () => {
    // Given
    const cutShort = sleep({ start: '2026-09-24T07:56:00Z', end: '2026-09-24T08:30:00Z' });
    const saved = sleep({ start: '2026-09-24T07:56:30Z', end: '2026-09-24T09:08:00Z' });

    // When
    const found = entrySavedFromTimer('sleep', '2026-09-24T07:56:12Z', { ...NONE, sleep: [cutShort, saved] });

    // Then
    expect(found).toBe(saved);
  });
});
