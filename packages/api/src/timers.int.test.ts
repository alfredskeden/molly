import { beforeEach, describe, expect, it } from 'vitest';

import { clientAs, countEntries, resetEntries, resetTimers, testEnv } from '../test/test-env';

const sleepTimer = { child: testEnv.childId, name: 'molly:sleep' };
const feedingTimer = { child: testEnv.childId, name: 'molly:feeding' };

beforeEach(async () => {
  await resetTimers();
  await resetEntries();
});

describe('running timers', () => {
  it('finds no running sleep timer for a child without one', async () => {
    // Given
    const client = clientAs(testEnv.parentA);

    // When
    const timer = await client.findTimer(sleepTimer);

    // Then
    expect(timer).toBeNull();
  });

  it('starting sleep creates a molly:sleep timer that is found again by child and name', async () => {
    // Given
    const client = clientAs(testEnv.parentA);

    // When
    const started = await client.startTimer(sleepTimer);

    // Then
    const found = await client.findTimer(sleepTimer);
    expect(found).toMatchObject({
      id: started.id,
      child: testEnv.childId,
      name: 'molly:sleep',
      user: testEnv.parentA.id,
    });
  });

  it('starting a feeding creates a molly:feeding timer', async () => {
    // Given
    const client = clientAs(testEnv.parentA);

    // When
    await client.startTimer(feedingTimer);

    // Then
    const found = await client.findTimer(feedingTimer);
    expect(found).toMatchObject(feedingTimer);
  });

  it('does not find timers whose name only resembles a Molly timer', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    await client.startTimer({ child: testEnv.childId, name: 'molly:sleeping' });
    await client.startTimer({ child: testEnv.childId, name: 'MOLLY:SLEEP' });

    // When
    const timer = await client.findTimer(sleepTimer);

    // Then
    expect(timer).toBeNull();
  });
});

describe('stopping and cancelling timers', () => {
  it('stopping sleep creates a sleep with the given nap flag and removes the timer', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    const timer = await client.startTimer(sleepTimer);

    // When
    const sleep = await client.stopSleep({ timer: timer.id, nap: false });

    // Then
    expect(sleep).toMatchObject({ child: testEnv.childId, start: timer.start, nap: false });
    expect(await client.findTimer(sleepTimer)).toBeNull();
  });

  it('stopping a feeding creates a feeding with type, method and amount', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    const timer = await client.startTimer(feedingTimer);

    // When
    const feeding = await client.stopFeeding({
      timer: timer.id,
      type: 'formula',
      method: 'bottle',
      amount: 120,
    });

    // Then
    expect(feeding).toMatchObject({
      child: testEnv.childId,
      start: timer.start,
      type: 'formula',
      method: 'bottle',
      amount: 120,
    });
    expect(await client.findTimer(feedingTimer)).toBeNull();
  });

  it('stopping a timer that is already gone surfaces as notFound', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    const timer = await client.startTimer(sleepTimer);
    await client.stopSleep({ timer: timer.id, nap: true });

    // When
    const request = client.stopSleep({ timer: timer.id, nap: true });

    // Then
    await expect(request).rejects.toMatchObject({ kind: 'notFound' });
  });

  it("stopping the other parent's timer without delete_timer surfaces as forbidden and keeps the timer", async () => {
    // Given
    const timer = await clientAs(testEnv.parentB).startTimer(sleepTimer);
    const parentA = clientAs(testEnv.parentA);

    // When
    const request = parentA.stopSleep({ timer: timer.id, nap: true });

    // Then
    await expect(request).rejects.toMatchObject({ kind: 'forbidden' });
    expect(await parentA.findTimer(sleepTimer)).toMatchObject({ id: timer.id });
  });

  it("stopping the other parent's timer with delete_timer succeeds", async () => {
    // Given
    const timer = await clientAs(testEnv.parentA).startTimer(sleepTimer);
    const parentB = clientAs(testEnv.parentB);

    // When
    const sleep = await parentB.stopSleep({ timer: timer.id, nap: true });

    // Then
    expect(sleep).toMatchObject({ child: testEnv.childId, start: timer.start });
    expect(await parentB.findTimer(sleepTimer)).toBeNull();
  });

  it('cancelling a timer removes it without creating an entry', async () => {
    // Given
    const client = clientAs(testEnv.parentB);
    const timer = await client.startTimer(sleepTimer);
    const sleepsBefore = await countEntries('sleep');

    // When
    await client.cancelTimer(timer.id);

    // Then
    expect(await client.findTimer(sleepTimer)).toBeNull();
    expect(await countEntries('sleep')).toBe(sleepsBefore);
  });

  it('cancelling a timer that is already gone surfaces as notFound', async () => {
    // Given
    const client = clientAs(testEnv.parentB);
    const timer = await client.startTimer(sleepTimer);
    await client.cancelTimer(timer.id);

    // When
    const request = client.cancelTimer(timer.id);

    // Then
    await expect(request).rejects.toMatchObject({ kind: 'notFound' });
  });

  it('cancelling a timer without delete_timer surfaces as forbidden, even your own', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    const timer = await client.startTimer(sleepTimer);

    // When
    const request = client.cancelTimer(timer.id);

    // Then
    await expect(request).rejects.toMatchObject({ kind: 'forbidden' });
  });
});

describe("adjusting a timer's start", () => {
  it('moves a running timer to an earlier start', async () => {
    // Given
    const client = clientAs(testEnv.parentB);
    const timer = await client.startTimer(feedingTimer);
    const earlier = new Date(Date.parse(timer.start) - 10 * 60_000).toISOString();

    // When
    await client.updateTimer(timer.id, { start: earlier });

    // Then
    const found = await client.findTimer(feedingTimer);
    expect(Date.parse(found!.start)).toBe(Date.parse(earlier));
  });

  it('lets a caregiver without delete_timer move their own timer', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    const timer = await client.startTimer(sleepTimer);
    const earlier = new Date(Date.parse(timer.start) - 5 * 60_000).toISOString();

    // When
    const moved = await client.updateTimer(timer.id, { start: earlier });

    // Then
    expect(Date.parse(moved.start)).toBe(Date.parse(earlier));
  });

  it('refuses a start in the future as a validation error', async () => {
    // Given
    const client = clientAs(testEnv.parentB);
    const timer = await client.startTimer(feedingTimer);
    const later = new Date(Date.now() + 10 * 60_000).toISOString();

    // When
    const update = client.updateTimer(timer.id, { start: later });

    // Then
    await expect(update).rejects.toMatchObject({ kind: 'validation', fields: { start: [expect.any(String)] } });
  });
});
