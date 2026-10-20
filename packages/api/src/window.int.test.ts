import { beforeEach, describe, expect, it } from 'vitest';

import { clientAs, resetEntries, testEnv } from '../test/test-env';

beforeEach(resetEntries);

// History loads a week at a time: [FROM, TO), in UTC, since an offset turns into a space in a query string.
const FROM = '2026-09-14T00:00:00Z';
const TO = '2026-09-21T00:00:00Z';
const child = testEnv.childId;
const iso = (time: string) => new Date(time).toISOString();

describe('listing a closed date window', () => {
  it('sleeps overlapping the window, including one that started before it, across pages', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    const sleep = (start: string, end: string) => client.logSleep({ child, start, end, nap: false });
    await sleep('2026-09-13T12:00:00Z', '2026-09-13T13:00:00Z');
    await sleep('2026-09-13T21:00:00Z', '2026-09-14T05:00:00Z');
    await sleep('2026-09-16T12:00:00Z', '2026-09-16T13:00:00Z');
    await sleep('2026-09-20T12:00:00Z', '2026-09-20T13:00:00Z');
    await sleep('2026-09-21T12:00:00Z', '2026-09-21T13:00:00Z');

    // When
    const sleeps = await client.listEntries('sleep', { child, end_min: FROM, start_max: TO }, { pageSize: 2 });

    // Then
    expect(sleeps.map((entry) => iso(entry.start))).toEqual([
      '2026-09-20T12:00:00.000Z',
      '2026-09-16T12:00:00.000Z',
      '2026-09-13T21:00:00.000Z',
    ]);
  });

  it('feedings that started inside the window, across pages', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    const feeding = (start: string, end: string) =>
      client.logFeeding({ child, start, end, type: 'breast milk', method: 'left breast' });
    await feeding('2026-09-13T23:50:00Z', '2026-09-14T00:10:00Z');
    await feeding('2026-09-14T06:00:00Z', '2026-09-14T06:20:00Z');
    await feeding('2026-09-17T06:00:00Z', '2026-09-17T06:20:00Z');
    await feeding('2026-09-20T23:00:00Z', '2026-09-20T23:20:00Z');
    await feeding('2026-09-21T06:00:00Z', '2026-09-21T06:20:00Z');

    // When
    const feedings = await client.listEntries('feeding', { child, start_min: FROM, start_max: TO }, { pageSize: 2 });

    // Then
    expect(feedings.map((entry) => iso(entry.start))).toEqual([
      '2026-09-20T23:00:00.000Z',
      '2026-09-17T06:00:00.000Z',
      '2026-09-14T06:00:00.000Z',
    ]);
  });

  it('diaper changes inside the window, across pages', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    for (const time of ['2026-09-13T23:00:00Z', '2026-09-14T01:00:00Z', '2026-09-18T09:00:00Z', '2026-09-20T22:00:00Z', '2026-09-21T01:00:00Z'])
      await client.logChange({ child, time, wet: true, solid: false });

    // When
    const changes = await client.listEntries('change', { child, date_min: FROM, date_max: TO }, { pageSize: 2 });

    // Then
    expect(changes.map((entry) => iso(entry.time))).toEqual([
      '2026-09-20T22:00:00.000Z',
      '2026-09-18T09:00:00.000Z',
      '2026-09-14T01:00:00.000Z',
    ]);
  });

  it('medication inside the window, across pages', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    for (const time of ['2026-09-13T23:00:00Z', '2026-09-14T01:00:00Z', '2026-09-18T09:00:00Z', '2026-09-20T22:00:00Z', '2026-09-21T01:00:00Z'])
      await client.logMedication({ child, name: 'Vitamin D', time });

    // When
    const medication = await client.listEntries('medication', { child, date_min: FROM, date_max: TO }, { pageSize: 2 });

    // Then
    expect(medication.map((entry) => iso(entry.time))).toEqual([
      '2026-09-20T22:00:00.000Z',
      '2026-09-18T09:00:00.000Z',
      '2026-09-14T01:00:00.000Z',
    ]);
  });
});

describe('the latest entry of one kind', () => {
  it('is the newest medication, however old', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    await client.logMedication({ child, name: 'Vitamin D', time: '2026-09-01T08:00:00Z' });
    await client.logMedication({ child, name: 'Paracetamol', time: '2026-09-15T08:00:00Z' });

    // When
    const latest = await client.getLatestEntry('medication', child);

    // Then
    expect(latest).toMatchObject({ name: 'Paracetamol' });
  });

  it('is null when that kind was never logged', async () => {
    // Given
    const client = clientAs(testEnv.parentA);

    // When
    const latest = await client.getLatestEntry('feeding', child);

    // Then
    expect(latest).toBeNull();
  });
});
