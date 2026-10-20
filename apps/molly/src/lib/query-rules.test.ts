import { BabyBuddyError } from '@molly/api';
import { describe, expect, it } from 'vitest';

import { shouldPersist, shouldRetry } from './query-rules';

describe('retrying a failed read', () => {
  it.each(['unreachable', 'server'] as const)('retries %s once', (kind) => {
    // Given
    const error = new BabyBuddyError(kind);

    // When
    const retries = [shouldRetry(0, error), shouldRetry(1, error)];

    // Then
    expect(retries).toEqual([true, false]);
  });

  it.each(['unauthorized', 'forbidden', 'notFound', 'validation'] as const)('never retries %s', (kind) => {
    // Given
    const error = new BabyBuddyError(kind);

    // When
    const retry = shouldRetry(0, error);

    // Then
    expect(retry).toBe(false);
  });

  it('retries a failure that is not Baby Buddy’s once', () => {
    // Given
    const error = new Error('storage');

    // When
    const retries = [shouldRetry(0, error), shouldRetry(1, error)];

    // Then
    expect(retries).toEqual([true, false]);
  });
});

describe('what the persisted cache keeps', () => {
  const settled = { key: ['timer', 1, 'sleep'], status: 'success', guessed: false } as const;

  it('keeps a dashboard query with data', () => {
    // Given
    const query = settled;

    // When
    const kept = shouldPersist(query);

    // Then
    expect(kept).toBe(true);
  });

  it('keeps the last good data while it is being refetched', () => {
    // Given
    const query = { ...settled, key: ['entries', 1] };

    // When
    const kept = shouldPersist(query);

    // Then
    expect(kept).toBe(true);
  });

  it("keeps Life Sim's rhythm, fetched once per day or night", () => {
    // Given
    const query = { ...settled, key: ['rhythm', 1, 'day', 1760247600000] };

    // When
    const kept = shouldPersist(query);

    // Then
    expect(kept).toBe(true);
  });

  it('keeps the recent bottles, where the bottle amount starts', () => {
    // Given
    const query = { ...settled, key: ['bottles', 1] };

    // When
    const kept = shouldPersist(query);

    // Then
    expect(kept).toBe(true);
  });

  it('never keeps a guess', () => {
    // Given
    const query = { ...settled, guessed: true };

    // When
    const kept = shouldPersist(query);

    // Then
    expect(kept).toBe(false);
  });

  it('never keeps a query that has no data yet or failed first', () => {
    // Given
    const queries = [{ ...settled, status: 'pending' }, { ...settled, status: 'error' }] as const;

    // When
    const kept = queries.map(shouldPersist);

    // Then
    expect(kept).toEqual([false, false]);
  });

  it('never keeps what a cold start doesn’t need', () => {
    // Given
    const query = { ...settled, key: ['past', 1] };

    // When
    const kept = shouldPersist(query);

    // Then
    expect(kept).toBe(false);
  });
});
