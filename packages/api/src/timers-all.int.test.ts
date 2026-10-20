import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { clientAs, createChild, deleteChild, resetTimers, testEnv } from '../test/test-env';

let otherChild: number;

beforeAll(async () => {
  otherChild = await createChild('Otto');
});

afterAll(async () => {
  await resetTimers();
  await deleteChild(otherChild);
});

beforeEach(async () => {
  await resetTimers();
});

describe("every child's running timers", () => {
  it('are none when no timer runs', async () => {
    // Given
    const client = clientAs(testEnv.parentA);

    // When
    const timers = await client.listTimers({ name: 'molly:sleep' });

    // Then
    expect(timers).toEqual([]);
  });

  it("list the running sleep of two children at once, and neither child's other timers", async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    await client.startTimer({ child: testEnv.childId, name: 'molly:sleep' });
    await client.startTimer({ child: otherChild, name: 'molly:sleep' });
    await client.startTimer({ child: otherChild, name: 'molly:feeding' });

    // When
    const timers = await client.listTimers({ name: 'molly:sleep' });

    // Then
    expect(timers.map((timer) => timer.child).sort()).toEqual([testEnv.childId, otherChild].sort());
    expect(timers.every((timer) => timer.name === 'molly:sleep')).toBe(true);
  });

  it('leave out a sleep that was stopped', async () => {
    // Given
    const client = clientAs(testEnv.parentB);
    const stopped = await client.startTimer({ child: otherChild, name: 'molly:sleep' });
    await client.startTimer({ child: testEnv.childId, name: 'molly:sleep' });
    await client.stopSleep({ timer: stopped.id, nap: true });

    // When
    const timers = await client.listTimers({ name: 'molly:sleep' });

    // Then
    expect(timers.map((timer) => timer.child)).toEqual([testEnv.childId]);
  });
});
