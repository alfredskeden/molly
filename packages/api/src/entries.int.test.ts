import { beforeEach, describe, expect, it } from 'vitest';

import { clientAs, createChild, deleteChild, resetEntries, resetTimers, testEnv } from '../test/test-env';
import { DIAPER_COLORS, FEEDING_METHODS, FEEDING_TYPES } from './index';

beforeEach(resetEntries);

describe('logging entries', () => {
  it('logging a diaper change stores its time, wet and solid flags', async () => {
    // Given
    const client = clientAs(testEnv.parentA);

    // When
    const change = await client.logChange({
      child: testEnv.childId,
      time: '2026-09-20T07:30:00+02:00',
      wet: true,
      solid: false,
    });

    // Then
    expect(change).toMatchObject({ child: testEnv.childId, wet: true, solid: false });
    expect(new Date(change.time).toISOString()).toBe('2026-09-20T05:30:00.000Z');
  });

  it("logging a diaper change without a time stamps it with the server's clock", async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    const before = Date.now();

    // When
    const change = await client.logChange({ child: testEnv.childId, wet: true, solid: false });

    // Then
    expect(Math.abs(Date.parse(change.time) - before)).toBeLessThan(60_000);
  });

  it('a diaper change timed in the future is refused as validation', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    const inAMinute = new Date(Date.now() + 60_000).toISOString();

    // When
    const request = client.logChange({ child: testEnv.childId, time: inAMinute, wet: true, solid: false });

    // Then
    await expect(request).rejects.toMatchObject({
      kind: 'validation',
      fields: { time: ['Date/time can not be in the future.'] },
    });
  });

  it('a manual sleep with start and end round-trips', async () => {
    // Given
    const client = clientAs(testEnv.parentA);

    // When
    const sleep = await client.logSleep({
      child: testEnv.childId,
      start: '2026-09-20T13:00:00+02:00',
      end: '2026-09-20T14:30:00+02:00',
      nap: true,
    });

    // Then
    expect(sleep).toMatchObject({ child: testEnv.childId, nap: true, duration: '01:30:00' });
    expect(new Date(sleep.start).toISOString()).toBe('2026-09-20T11:00:00.000Z');
  });

  it('a manual feeding with start and end round-trips', async () => {
    // Given
    const client = clientAs(testEnv.parentA);

    // When
    const feeding = await client.logFeeding({
      child: testEnv.childId,
      start: '2026-09-20T09:00:00+02:00',
      end: '2026-09-20T09:20:00+02:00',
      type: 'breast milk',
      method: 'right breast',
    });

    // Then
    expect(feeding).toMatchObject({
      child: testEnv.childId,
      type: 'breast milk',
      method: 'right breast',
      duration: '00:20:00',
    });
  });

  it('invalid entry data surfaces as validation with the field errors', async () => {
    // Given
    const client = clientAs(testEnv.parentA);

    // When
    const request = client.logSleep({
      child: testEnv.childId,
      start: '2026-09-20T14:00:00+02:00',
      end: '2026-09-20T13:00:00+02:00',
      nap: true,
    });

    // Then
    await expect(request).rejects.toMatchObject({
      kind: 'validation',
      fields: { non_field_errors: ['Start time must come before end time.'] },
    });
  });
});

describe('reading entries', () => {
  it('latest sleep, feeding and change are empty for a child with no entries', async () => {
    // Given
    const client = clientAs(testEnv.parentA);

    // When
    const latest = await client.getLatestEntries(testEnv.childId);

    // Then
    expect(latest).toEqual({ sleep: null, feeding: null, change: null });
  });

  it('latest sleep, feeding and change return the newest of each', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    const child = testEnv.childId;
    const newerSleep = await client.logSleep({ child, start: '2026-09-21T13:00:00Z', end: '2026-09-21T14:00:00Z', nap: true });
    await client.logSleep({ child, start: '2026-09-20T13:00:00Z', end: '2026-09-20T14:00:00Z', nap: true });
    const newerFeeding = await client.logFeeding({
      child,
      start: '2026-09-21T09:00:00Z',
      end: '2026-09-21T09:10:00Z',
      type: 'breast milk',
      method: 'left breast',
    });
    await client.logFeeding({
      child,
      start: '2026-09-20T09:00:00Z',
      end: '2026-09-20T09:10:00Z',
      type: 'breast milk',
      method: 'left breast',
    });
    const newerChange = await client.logChange({ child, time: '2026-09-21T08:00:00Z', wet: true, solid: false });
    await client.logChange({ child, time: '2026-09-20T08:00:00Z', wet: true, solid: false });

    // When
    const latest = await client.getLatestEntries(child);

    // Then
    expect(latest).toEqual({ sleep: newerSleep, feeding: newerFeeding, change: newerChange });
  });

  it('reading one entry by kind and id returns it', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    const change = await client.logChange({ child: testEnv.childId, time: '2026-09-20T08:00:00Z', wet: true, solid: true });

    // When
    const read = await client.getEntry('change', change.id);

    // Then
    expect(read).toEqual(change);
  });

  it('listing a time window collects entries across every page', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    const child = testEnv.childId;
    await client.logChange({ child, time: '2026-09-19T23:00:00Z', wet: true, solid: false });
    await client.logChange({ child, time: '2026-09-20T06:00:00Z', wet: true, solid: false });
    await client.logChange({ child, time: '2026-09-20T09:00:00Z', wet: true, solid: false });
    await client.logChange({ child, time: '2026-09-20T12:00:00Z', wet: true, solid: false });

    // When
    const changes = await client.listEntries(
      'change',
      { child, date_min: '2026-09-20T00:00:00Z' },
      { pageSize: 2 },
    );

    // Then
    expect(changes.map((change) => new Date(change.time).toISOString())).toEqual([
      '2026-09-20T12:00:00.000Z',
      '2026-09-20T09:00:00.000Z',
      '2026-09-20T06:00:00.000Z',
    ]);
  });
});

describe('editing and deleting entries', () => {
  it('editing a sleep changes its nap flag, times and notes', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    const sleep = await client.logSleep({
      child: testEnv.childId,
      start: '2026-09-20T13:00:00Z',
      end: '2026-09-20T14:00:00Z',
      nap: true,
    });

    // When
    const edited = await client.editEntry('sleep', sleep.id, {
      nap: false,
      start: '2026-09-20T12:30:00Z',
      end: '2026-09-20T14:15:00Z',
      notes: 'woke up once',
    });

    // Then
    expect(edited).toMatchObject({ id: sleep.id, nap: false, duration: '01:45:00', notes: 'woke up once' });
  });

  it('editing a feeding changes its amount, method and tags', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    const feeding = await client.logFeeding({
      child: testEnv.childId,
      start: '2026-09-20T09:00:00Z',
      end: '2026-09-20T09:15:00Z',
      type: 'formula',
      method: 'bottle',
      amount: 90,
    });

    // When
    const edited = await client.editEntry('feeding', feeding.id, {
      amount: 110,
      method: 'parent fed',
      tags: ['mixed'],
    });

    // Then
    expect(edited).toMatchObject({ id: feeding.id, amount: 110, method: 'parent fed', tags: ['mixed'] });
  });

  it('editing a diaper change changes its color and notes', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    const change = await client.logChange({
      child: testEnv.childId,
      time: '2026-09-20T08:00:00Z',
      wet: false,
      solid: true,
    });

    // When
    const edited = await client.editEntry('change', change.id, { color: 'yellow', notes: 'blowout' });

    // Then
    expect(edited).toMatchObject({ id: change.id, color: 'yellow', notes: 'blowout' });
  });

  it('deleting a sleep, feeding and change removes each of them', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    const child = testEnv.childId;
    const sleep = await client.logSleep({ child, start: '2026-09-20T13:00:00Z', end: '2026-09-20T14:00:00Z', nap: true });
    const feeding = await client.logFeeding({
      child,
      start: '2026-09-20T09:00:00Z',
      end: '2026-09-20T09:10:00Z',
      type: 'breast milk',
      method: 'left breast',
    });
    const change = await client.logChange({ child, time: '2026-09-20T08:00:00Z', wet: true, solid: false });

    // When
    await client.deleteEntry('sleep', sleep.id);
    await client.deleteEntry('feeding', feeding.id);
    await client.deleteEntry('change', change.id);

    // Then
    expect(await client.getLatestEntries(child)).toEqual({ sleep: null, feeding: null, change: null });
  });
});

describe('enum values Molly sends', () => {
  it.each(FEEDING_TYPES)('feeding type "%s" is accepted', async (type) => {
    // Given
    const client = clientAs(testEnv.parentA);

    // When
    const feeding = await client.logFeeding({
      child: testEnv.childId,
      start: '2026-09-20T09:00:00Z',
      end: '2026-09-20T09:10:00Z',
      type,
      method: 'bottle',
    });

    // Then
    expect(feeding.type).toBe(type);
  });

  it.each(FEEDING_METHODS)('feeding method "%s" is accepted', async (method) => {
    // Given
    const client = clientAs(testEnv.parentA);

    // When
    const feeding = await client.logFeeding({
      child: testEnv.childId,
      start: '2026-09-20T09:00:00Z',
      end: '2026-09-20T09:10:00Z',
      type: 'breast milk',
      method,
    });

    // Then
    expect(feeding.method).toBe(method);
  });

  it.each(DIAPER_COLORS)('diaper color "%s" is accepted', async (color) => {
    // Given
    const client = clientAs(testEnv.parentA);
    const change = await client.logChange({
      child: testEnv.childId,
      time: '2026-09-20T08:00:00Z',
      wet: false,
      solid: true,
    });

    // When
    const edited = await client.editEntry('change', change.id, { color });

    // Then
    expect(edited.color).toBe(color);
  });
});

describe('solid food', () => {
  const meal = { type: 'solid food', method: 'parent fed', amount: 0 } as const;

  it('a meal with amount 0 and notes keeps both', async () => {
    // Given
    const client = clientAs(testEnv.parentA);

    // When
    const feeding = await client.logFeeding({
      child: testEnv.childId,
      start: '2026-09-20T12:00:00Z',
      end: '2026-09-20T12:01:00Z',
      ...meal,
      notes: 'Carrot, Porridge',
    });

    // Then
    expect(feeding).toMatchObject({ ...meal, notes: 'Carrot, Porridge' });
  });

  it('stopping a feeding timer as a meal keeps the notes', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    await resetTimers();
    const timer = await client.startTimer({ child: testEnv.childId, name: 'molly:feeding' });

    // When
    const feeding = await client.stopFeeding({ timer: timer.id, ...meal, notes: 'Banana' });

    // Then
    expect(feeding).toMatchObject({ ...meal, notes: 'Banana', start: timer.start });
  });

  it('recent feedings are every kind, newest first', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    await client.logFeeding({ child: testEnv.childId, start: '2026-09-20T09:00:00Z', end: '2026-09-20T09:10:00Z', type: 'breast milk', method: 'left breast' });
    await client.logFeeding({ child: testEnv.childId, start: '2026-09-20T12:00:00Z', end: '2026-09-20T12:01:00Z', ...meal, notes: 'Carrot' });

    // When
    const feedings = await client.getRecentFeedings(testEnv.childId);

    // Then
    expect(feedings.map((feeding) => feeding.method)).toEqual(['parent fed', 'left breast']);
  });

  it("recent solids are only that child's meals, newest first", async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    const sibling = await createChild('Sibling');
    try {
      await client.logFeeding({ child: testEnv.childId, start: '2026-09-20T08:00:00Z', end: '2026-09-20T08:01:00Z', ...meal, notes: 'Carrot' });
      await client.logFeeding({ child: testEnv.childId, start: '2026-09-20T09:00:00Z', end: '2026-09-20T09:10:00Z', type: 'breast milk', method: 'left breast' });
      await client.logFeeding({ child: testEnv.childId, start: '2026-09-20T12:00:00Z', end: '2026-09-20T12:01:00Z', type: 'solid food', method: 'self fed', notes: 'Banana' });
      await client.logFeeding({ child: sibling, start: '2026-09-20T13:00:00Z', end: '2026-09-20T13:01:00Z', ...meal, notes: 'Pear' });

      // When
      const solids = await client.getRecentSolids(testEnv.childId);

      // Then
      expect(solids.map((feeding) => feeding.notes)).toEqual(['Banana', 'Carrot']);
    } finally {
      await deleteChild(sibling);
    }
  });
});
