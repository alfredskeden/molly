import { beforeEach, describe, expect, it } from 'vitest';

import { clientAs, resetEntries, testEnv } from '../test/test-env';

beforeEach(resetEntries);

const breastfeed = { type: 'breast milk', method: 'left breast' } as const;

function minutesFrom(now: number, minutes: number) {
  return new Date(now + minutes * 60_000).toISOString();
}

describe('instant feeds', () => {
  it('a finished feeding one minute long is accepted', async () => {
    // Given
    const client = clientAs(testEnv.parentA);

    // When
    const feeding = await client.logFeeding({
      child: testEnv.childId,
      start: '2026-09-20T09:00:00Z',
      end: '2026-09-20T09:01:00Z',
      ...breastfeed,
    });

    // Then
    expect(feeding.duration).toBe('00:01:00');
  });

  it("a feeding starting exactly at the previous feeding's end is accepted", async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    await client.logFeeding({ child: testEnv.childId, start: '2026-09-20T09:00:00Z', end: '2026-09-20T09:01:00Z', ...breastfeed });

    // When
    const feeding = await client.logFeeding({
      child: testEnv.childId,
      start: '2026-09-20T09:01:00Z',
      end: '2026-09-20T09:02:00Z',
      ...breastfeed,
    });

    // Then
    expect(feeding.duration).toBe('00:01:00');
  });

  it("a zero-length feeding at the previous feeding's end is accepted", async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    await client.logFeeding({ child: testEnv.childId, start: '2026-09-20T09:00:00Z', end: '2026-09-20T09:01:00Z', ...breastfeed });

    // When
    const feeding = await client.logFeeding({
      child: testEnv.childId,
      start: '2026-09-20T09:01:00Z',
      end: '2026-09-20T09:01:00Z',
      ...breastfeed,
    });

    // Then
    expect(feeding.duration).toBe('00:00:00');
  });

  it('a feeding ending in the future is accepted (only the start is checked)', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    const now = Date.now();

    // When
    const feeding = await client.logFeeding({
      child: testEnv.childId,
      start: minutesFrom(now, -1),
      end: minutesFrom(now, 1),
      ...breastfeed,
    });

    // Then
    expect(feeding.duration).toBe('00:02:00');
  });

  it('a feeding starting in the future is refused as validation', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    const now = Date.now();

    // When
    const request = client.logFeeding({
      child: testEnv.childId,
      start: minutesFrom(now, 1),
      end: minutesFrom(now, 2),
      ...breastfeed,
    });

    // Then
    await expect(request).rejects.toMatchObject({
      kind: 'validation',
      fields: { start: ['Date/time can not be in the future.'] },
    });
  });
});

describe('recent bottles', () => {
  it('are empty for a child with no feedings', async () => {
    // Given
    const client = clientAs(testEnv.parentA);

    // When
    const bottles = await client.getRecentBottles(testEnv.childId);

    // Then
    expect(bottles).toEqual([]);
  });

  it('are only bottle feedings, newest first', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    const bottle = { type: 'formula', method: 'bottle' } as const;
    await client.logFeeding({ child: testEnv.childId, start: '2026-09-20T07:00:00Z', end: '2026-09-20T07:10:00Z', ...bottle, amount: 120 });
    await client.logFeeding({ child: testEnv.childId, start: '2026-09-20T09:00:00Z', end: '2026-09-20T09:10:00Z', ...bottle, amount: 130 });
    await client.logFeeding({ child: testEnv.childId, start: '2026-09-20T11:00:00Z', end: '2026-09-20T11:10:00Z', ...breastfeed });

    // When
    const bottles = await client.getRecentBottles(testEnv.childId);

    // Then
    expect(bottles.map((feeding) => feeding.amount)).toEqual([130, 120]);
  });
});
