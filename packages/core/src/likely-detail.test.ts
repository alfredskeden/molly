import { describe, expect, it } from 'vitest';

import { sleep } from '../test/fixtures';
import { likelyDetail, likelySlots } from './likely-detail';
import type { PastDay } from './next-sleep';

/** Thursday 24 September 2026, local time; `day` back for an earlier one. */
const at = (clock: string, day = 24) => {
  const [hours = 0, minutes = 0] = clock.split(':').map(Number);
  return new Date(2026, 8, day, hours, minutes);
};
const likely = (start: string, end: string, skipped = false, kind: 'nap' | 'bedtime' = 'nap') => ({
  kind,
  start: at(start),
  end: at(end),
  skipped,
});
const plan = [likely('12:56', '13:26'), likely('15:20', '15:50'), likely('18:30', '19:00', false, 'bedtime')];
const logged = (day: number, from: string, to: string) => sleep({ start: at(from, day).toISOString(), end: at(to, day).toISOString() });
/** A past day that woke at 07:00, with its naps as `[from, to]` clock times on that day, and its bedtime (that day, or a time). */
const pastDay = (day: number, naps: [string, string][], bedtime: string | Date | null = null): PastDay => ({
  wake: at('07:00', day),
  naps: naps.map(([from, to]) => logged(day, from, to)),
  bedtime: bedtime
    ? sleep({ start: (typeof bedtime === 'string' ? at(bedtime, day) : bedtime).toISOString(), end: at('06:30', day + 1).toISOString() })
    : null,
});

describe('which likely sleep is which', () => {
  it('are none without a plan', () => {
    // When
    const slots = likelySlots([], 1);

    // Then
    expect(slots).toEqual([]);
  });

  it('numbers the naps after the ones logged so far, and names bedtime', () => {
    // When
    const slots = likelySlots(plan, 1);

    // Then
    expect(slots).toEqual([2, 3, 'bedtime']);
  });

  it('gives a skipped nap no name, so the next one takes its number', () => {
    // When
    const slots = likelySlots([likely('12:56', '13:26', true), ...plan.slice(1)], 1);

    // Then
    expect(slots).toEqual([null, 2, 'bedtime']);
  });
});

describe('the panel of a likely sleep', () => {
  it('is nothing for a sleep the plan no longer has', () => {
    // When
    const detail = likelyDetail(plan, 4, 1, [], at('11:40'));

    // Then
    expect(detail).toBeNull();
  });

  it('gives the next nap its number, its clock times and how soon it opens', () => {
    // When
    const detail = likelyDetail(plan, 2, 1, [], at('11:40'));

    // Then
    expect(detail).toMatchObject({ slot: 2, next: true, range: '12:56 – 13:26', when: 'in 1h 16m' });
  });

  it('says how long is left while the window is open', () => {
    // When
    const detail = likelyDetail(plan, 2, 1, [], at('13:06'));

    // Then
    expect(detail?.when).toBe('20m left');
  });

  it('says how long ago the window closed once it has', () => {
    // When
    const detail = likelyDetail(plan, 2, 1, [], at('13:40'));

    // Then
    expect(detail?.when).toBe('14m ago');
  });

  it('gives a later nap its own number, and it is not the next', () => {
    // When
    const detail = likelyDetail(plan, 3, 1, [], at('11:40'));

    // Then
    expect(detail).toMatchObject({ slot: 3, next: false, range: '15:20 – 15:50', when: 'in 3h 40m' });
  });

  it('names bedtime', () => {
    // When
    const detail = likelyDetail(plan, 'bedtime', 1, [], at('11:40'));

    // Then
    expect(detail).toMatchObject({ slot: 'bedtime', next: false, range: '18:30 – 19:00' });
  });
});

describe('how the same sleep went on past days', () => {
  it('is left out without past days', () => {
    // When
    const detail = likelyDetail(plan, 2, 1, [], at('11:40'));

    // Then
    expect(detail).toMatchObject({ yesterday: null, usually: null });
  });

  it("gives yesterday's nap in the same place of the day, its start and length", () => {
    // Given
    const days = [pastDay(23, [['09:00', '09:45'], ['13:05', '14:10']])];

    // When
    const detail = likelyDetail(plan, 2, 1, days, at('11:40'));

    // Then
    expect(detail?.yesterday).toEqual({ start: '13:05', length: '1h 5m' });
  });

  it('gives the median start and the median length over the past days as usual', () => {
    // Given
    const days = [
      pastDay(23, [['09:00', '09:45'], ['13:05', '14:10']]),
      pastDay(22, [['09:00', '09:45'], ['13:20', '13:50']]),
      pastDay(21, [['09:00', '09:45'], ['12:50', '14:00']]),
    ];

    // When
    const detail = likelyDetail(plan, 2, 1, days, at('11:40'));

    // Then
    expect(detail?.usually).toEqual({ start: '13:05', length: '1h 5m' });
  });

  it('gives usual only when yesterday had no nap in that place', () => {
    // Given
    const days = [pastDay(23, [['09:00', '09:45']]), pastDay(22, [['09:00', '09:45'], ['13:20', '13:50']])];

    // When
    const detail = likelyDetail(plan, 2, 1, days, at('11:40'));

    // Then
    expect(detail).toMatchObject({ yesterday: null, usually: { start: '13:20', length: '30m' } });
  });

  it('gives usual only when the latest logged day was before yesterday', () => {
    // Given
    const days = [pastDay(22, [['09:00', '09:45'], ['13:20', '13:50']])];

    // When
    const detail = likelyDetail(plan, 2, 1, days, at('11:40'));

    // Then
    expect(detail).toMatchObject({ yesterday: null, usually: { start: '13:20', length: '30m' } });
  });

  it('gives bedtime its start only', () => {
    // Given
    const days = [pastDay(23, [['09:00', '09:45']], '18:40'), pastDay(22, [['09:00', '09:45']], '19:00')];

    // When
    const detail = likelyDetail(plan, 'bedtime', 1, days, at('11:40'));

    // Then
    expect(detail).toMatchObject({ yesterday: { start: '18:40', length: null }, usually: { start: '18:50', length: null } });
  });

  it('counts a bedtime after midnight as late, not early', () => {
    // Given
    const days = [pastDay(23, [], '23:30'), pastDay(22, [], at('00:30', 23))];

    // When
    const detail = likelyDetail(plan, 'bedtime', 1, days, at('11:40'));

    // Then
    expect(detail?.usually).toEqual({ start: '00:00', length: null });
  });
});

describe('the rest of the day after a likely sleep', () => {
  it('lists every later sleep in order, with its clock times', () => {
    // When
    const detail = likelyDetail(plan, 2, 1, [], at('11:40'));

    // Then
    expect(detail?.later).toEqual([
      { slot: 3, range: '15:20 – 15:50' },
      { slot: 'bedtime', range: '18:30 – 19:00' },
    ]);
  });

  it('is empty after bedtime', () => {
    // When
    const detail = likelyDetail(plan, 'bedtime', 1, [], at('11:40'));

    // Then
    expect(detail?.later).toEqual([]);
  });

  it('holds only bedtime after a later nap', () => {
    // When
    const detail = likelyDetail(plan, 3, 1, [], at('11:40'));

    // Then
    expect(detail?.later).toEqual([{ slot: 'bedtime', range: '18:30 – 19:00' }]);
  });

  it('leaves out skipped naps', () => {
    // Given
    const withSkip = [likely('12:56', '13:26'), likely('15:20', '15:50', true), likely('17:00', '17:30'), plan[2]!];

    // When
    const detail = likelyDetail(withSkip, 2, 1, [], at('11:40'));

    // Then
    expect(detail?.later).toEqual([
      { slot: 3, range: '17:00 – 17:30' },
      { slot: 'bedtime', range: '18:30 – 19:00' },
    ]);
  });
});
