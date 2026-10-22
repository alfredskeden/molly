import type { Feeding } from '@molly/api';
import type { DayWindow } from '@molly/core';
import { describe, expect, it } from 'vitest';

import { ringMarks } from './model';

const window: DayWindow = {
  kind: 'day',
  start: new Date('2026-09-24T07:00:00+02:00'),
  end: new Date('2026-09-24T19:00:00+02:00'),
  wake: new Date('2026-09-24T07:00:00+02:00'),
  clock: false,
};

const meal: Feeding = {
  id: 5,
  child: 1,
  start: '2026-09-24T12:10:00+02:00',
  end: '2026-09-24T12:11:00+02:00',
  duration: '00:01:00',
  type: 'solid food',
  method: 'parent fed',
  amount: 0,
  notes: 'Carrot',
  tags: [],
};

describe('a meal on the ring', () => {
  it('is marked with the knife and fork and read with its food', () => {
    // Given
    const entries = { sleep: [], feeding: [meal], change: [], medication: [] };

    // When
    const [mark] = ringMarks(window, entries, null);

    // Then
    expect(mark).toMatchObject({ icon: 'restaurant', spoken: 'Solids 12:10, Carrot' });
  });
});
