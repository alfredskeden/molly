import { beforeEach, describe, expect, it } from 'vitest';

import { clientAs, countEntries, resetEntries, testEnv } from '../test/test-env';

beforeEach(resetEntries);

describe('logging measurements', () => {
  it('a weight in grams is kept as grams', async () => {
    // Given
    const client = clientAs(testEnv.parentA);

    // When
    const weight = await client.logMeasurement('weight', {
      child: testEnv.childId,
      weight: 7050,
      date: '2026-09-23',
      notes: 'after the bath',
    });

    // Then
    expect(weight).toMatchObject({ child: testEnv.childId, weight: 7050, date: '2026-09-23', notes: 'after the bath' });
  });

  it('height, head circumference and BMI keep their value and date', async () => {
    // Given
    const client = clientAs(testEnv.parentB);
    const child = testEnv.childId;

    // When
    const height = await client.logMeasurement('height', { child, height: 65.5, date: '2026-09-23' });
    const head = await client.logMeasurement('head', { child, head_circumference: 42.3, date: '2026-09-23' });
    const bmi = await client.logMeasurement('bmi', { child, bmi: 16.3, date: '2026-09-23' });

    // Then
    expect([height, head, bmi]).toMatchObject([
      { height: 65.5, date: '2026-09-23' },
      { head_circumference: 42.3, date: '2026-09-23' },
      { bmi: 16.3, date: '2026-09-23' },
    ]);
  });

  it('a temperature keeps its time', async () => {
    // Given
    const client = clientAs(testEnv.parentA);

    // When
    const temperature = await client.logMeasurement('temperature', {
      child: testEnv.childId,
      temperature: 36.9,
      time: '2026-09-23T07:40:00+02:00',
    });

    // Then
    expect(temperature.temperature).toBe(36.9);
    expect(new Date(temperature.time).toISOString()).toBe('2026-09-23T05:40:00.000Z');
  });

  it('a weight dated in the future is refused as validation', async () => {
    // Given
    const client = clientAs(testEnv.parentA);

    // When
    const request = client.logMeasurement('weight', { child: testEnv.childId, weight: 7000, date: '2099-01-01' });

    // Then
    await expect(request).rejects.toMatchObject({
      kind: 'validation',
      fields: { date: ['Date can not be in the future.'] },
    });
  });

  it("a caregiver without Baby Buddy's height permission is refused as forbidden", async () => {
    // Given
    const client = clientAs(testEnv.parentA);

    // When
    const request = client.logMeasurement('height', { child: testEnv.childId, height: 65.5, date: '2026-09-23' });

    // Then
    await expect(request).rejects.toMatchObject({ kind: 'forbidden' });
    expect(await countEntries('height')).toBe(0);
  });
});

describe('reading measurements', () => {
  it('listing weights collects every page, newest date first', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    const child = testEnv.childId;
    await client.logMeasurement('weight', { child, weight: 3400, date: '2026-04-27' });
    await client.logMeasurement('weight', { child, weight: 7050, date: '2026-09-23' });
    await client.logMeasurement('weight', { child, weight: 6580, date: '2026-09-07' });

    // When
    const weights = await client.listMeasurements('weight', child, { pageSize: 2 });

    // Then
    expect(weights.map((weight) => [weight.date, weight.weight])).toEqual([
      ['2026-09-23', 7050],
      ['2026-09-07', 6580],
      ['2026-04-27', 3400],
    ]);
  });

  it('listing temperatures gives the newest time first', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    const child = testEnv.childId;
    await client.logMeasurement('temperature', { child, temperature: 38.4, time: '2026-09-26T20:00:00Z' });
    await client.logMeasurement('temperature', { child, temperature: 36.9, time: '2026-09-27T22:00:00Z' });

    // When
    const temperatures = await client.listMeasurements('temperature', child);

    // Then
    expect(temperatures.map((temperature) => temperature.temperature)).toEqual([36.9, 38.4]);
  });

  it("listing a measurement without Baby Buddy's view permission is refused as forbidden", async () => {
    // Given
    const client = clientAs(testEnv.parentA);

    // When
    const request = client.listMeasurements('bmi', testEnv.childId);

    // Then
    await expect(request).rejects.toMatchObject({ kind: 'forbidden' });
  });
});
