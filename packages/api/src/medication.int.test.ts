import { beforeEach, describe, expect, it } from 'vitest';

import { clientAs, countEntries, resetEntries, testEnv } from '../test/test-env';

beforeEach(resetEntries);

describe('logging medication', () => {
  it("logging a medication with only a name stamps it with the server's clock", async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    const before = Date.now();

    // When
    const medication = await client.logMedication({ child: testEnv.childId, name: 'Vitamin D' });

    // Then
    expect(medication).toMatchObject({ child: testEnv.childId, name: 'Vitamin D' });
    expect(Math.abs(Date.parse(medication.time) - before)).toBeLessThan(60_000);
  });

  it('logging a medication with a past time keeps that time', async () => {
    // Given
    const client = clientAs(testEnv.parentA);

    // When
    const medication = await client.logMedication({
      child: testEnv.childId,
      name: 'Paracetamol 2.5 ml',
      time: '2026-09-20T07:30:00+02:00',
    });

    // Then
    expect(new Date(medication.time).toISOString()).toBe('2026-09-20T05:30:00.000Z');
  });

  it('a medication timed in the future is refused as validation', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    const inAMinute = new Date(Date.now() + 60_000).toISOString();

    // When
    const request = client.logMedication({ child: testEnv.childId, name: 'Vitamin D', time: inAMinute });

    // Then
    await expect(request).rejects.toMatchObject({
      kind: 'validation',
      fields: { time: ['Date/time can not be in the future.'] },
    });
  });

  it('a medication with an empty name is refused as validation', async () => {
    // Given
    const client = clientAs(testEnv.parentA);

    // When
    const request = client.logMedication({ child: testEnv.childId, name: '' });

    // Then
    await expect(request).rejects.toMatchObject({
      kind: 'validation',
      fields: { name: ['This field may not be blank.'] },
    });
  });
});

describe('reading medication', () => {
  it('listing medication since a time collects only that window across every page', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    const child = testEnv.childId;
    await client.logMedication({ child, name: 'Vitamin D', time: '2026-09-19T23:00:00Z' });
    await client.logMedication({ child, name: 'Vitamin D', time: '2026-09-20T06:00:00Z' });
    await client.logMedication({ child, name: 'Paracetamol', time: '2026-09-20T09:00:00Z' });
    await client.logMedication({ child, name: 'Ibuprofen', time: '2026-09-20T12:00:00Z' });

    // When
    const medication = await client.listEntries(
      'medication',
      { child, date_min: '2026-09-20T00:00:00Z' },
      { pageSize: 2 },
    );

    // Then
    expect(medication.map((entry) => new Date(entry.time).toISOString())).toEqual([
      '2026-09-20T12:00:00.000Z',
      '2026-09-20T09:00:00.000Z',
      '2026-09-20T06:00:00.000Z',
    ]);
  });
});

describe('editing and deleting medication', () => {
  it("one parent can change the name, notes and time of the other parent's medication", async () => {
    // Given
    const medication = await clientAs(testEnv.parentA).logMedication({
      child: testEnv.childId,
      name: 'Vitamin D',
      time: '2026-09-20T08:00:00Z',
    });

    // When
    const edited = await clientAs(testEnv.parentB).editEntry('medication', medication.id, {
      name: 'Paracetamol 2.5 ml',
      notes: 'after the jab',
      time: '2026-09-20T07:45:00Z',
    });

    // Then
    expect(edited).toMatchObject({ id: medication.id, name: 'Paracetamol 2.5 ml', notes: 'after the jab' });
    expect(new Date(edited.time).toISOString()).toBe('2026-09-20T07:45:00.000Z');
  });

  it('a parent with delete_medication can delete a medication', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    const medication = await client.logMedication({ child: testEnv.childId, name: 'Vitamin D' });

    // When
    await client.deleteEntry('medication', medication.id);

    // Then
    expect(await countEntries('medication')).toBe(0);
  });
});
