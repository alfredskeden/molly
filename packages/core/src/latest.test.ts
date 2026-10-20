import { describe, expect, it } from 'vitest';

import { change, feeding, sleep } from '../test/fixtures';
import { lastOfEach } from './latest';

describe('last of each', () => {
  it('is empty for a child with no entries', () => {
    // Given
    const entries = { sleep: [], feeding: [], change: [], medication: [] };

    // When
    const last = lastOfEach(entries);

    // Then
    expect(last).toEqual({ sleep: null, feeding: null, change: null });
  });

  it('returns the only entry of each kind', () => {
    // Given
    const onlySleep = sleep({ start: '2026-09-20T11:00:00Z', end: '2026-09-20T12:00:00Z' });
    const onlyFeeding = feeding({ start: '2026-09-20T09:00:00Z', end: '2026-09-20T09:15:00Z' });
    const onlyChange = change({ time: '2026-09-20T08:00:00Z' });

    // When
    const last = lastOfEach({ sleep: [onlySleep], feeding: [onlyFeeding], change: [onlyChange], medication: [] });

    // Then
    expect(last).toEqual({ sleep: onlySleep, feeding: onlyFeeding, change: onlyChange });
  });

  it('returns the newest entry of each kind whatever the input order', () => {
    // Given
    const newerSleep = sleep({ start: '2026-09-20T13:00:00Z', end: '2026-09-20T14:00:00Z' });
    const olderSleep = sleep({ start: '2026-09-20T09:00:00Z', end: '2026-09-20T10:00:00Z' });
    const newerFeeding = feeding({ start: '2026-09-20T12:00:00Z', end: '2026-09-20T12:10:00Z' });
    const olderFeeding = feeding({ start: '2026-09-20T08:00:00Z', end: '2026-09-20T08:10:00Z' });
    const newerChange = change({ time: '2026-09-20T11:00:00Z' });
    const olderChange = change({ time: '2026-09-20T07:00:00Z' });

    // When
    const last = lastOfEach({
      sleep: [olderSleep, newerSleep],
      feeding: [olderFeeding, newerFeeding],
      change: [olderChange, newerChange],
      medication: [],
    });

    // Then
    expect(last).toEqual({ sleep: newerSleep, feeding: newerFeeding, change: newerChange });
  });
});
