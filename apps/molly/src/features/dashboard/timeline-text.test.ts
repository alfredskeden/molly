import type { Change, Feeding, Medication, Sleep } from '@molly/api';
import { describe, expect, it } from 'vitest';

import { describeEntry, METHOD_LABELS, spokenEntry } from './timeline-text';

const feeding: Feeding = {
  id: 1,
  child: 1,
  start: '2026-09-24T08:15:00+02:00',
  end: '2026-09-24T08:32:00+02:00',
  duration: '00:17:00',
  type: 'breast milk',
  method: 'left breast',
  amount: null,
  notes: null,
  tags: [],
};
const nap: Sleep = {
  id: 2,
  child: 1,
  start: '2026-09-24T07:56:00+02:00',
  end: '2026-09-24T09:08:00+02:00',
  duration: '01:12:00',
  nap: true,
  notes: null,
  tags: [],
};
const change: Change = {
  id: 3,
  child: 1,
  time: '2026-09-24T09:10:00+02:00',
  wet: true,
  solid: true,
  color: 'brown',
  amount: null,
  notes: null,
  tags: [],
};
const vitamin: Medication = { id: 4, child: 1, name: 'Vitamin D', time: '2026-09-24T08:35:00+02:00', notes: null, tags: [] };

describe('rows read by a screen reader', () => {
  it.each([
    [{ kind: 'feeding', at: feeding.start, entry: feeding } as const, 'Feed at 08:15, Left, 17 minutes. Edit.'],
    [
      { kind: 'feeding', at: feeding.start, entry: { ...feeding, method: 'bottle', amount: 120 } } as const,
      'Feed at 08:15, Bottle, 120 ml. Edit.',
    ],
    [{ kind: 'sleep', at: nap.start, entry: nap } as const, 'Nap at 07:56, 1 hour 12 minutes. Edit.'],
    [{ kind: 'change', at: change.time, entry: change } as const, 'Diaper at 09:10, Wet + dirty, brown. Edit.'],
    [{ kind: 'medication', at: vitamin.time, entry: vitamin } as const, 'Vitamin D at 08:35, medication. Edit.'],
  ])('%#: reads as "%s"', (item, spoken) => {
    // Given
    const row = item;

    // When
    const label = spokenEntry(row);

    // Then
    expect(label).toBe(spoken);
  });
});

describe('a meal', () => {
  const meal: Feeding = { ...feeding, end: '2026-09-24T08:16:00+02:00', type: 'solid food', method: 'parent fed', amount: 0, notes: 'Carrot, Porridge' };

  it('has its food as the title and the time and Solids as the detail', () => {
    // When
    const row = describeEntry({ kind: 'feeding', at: meal.start, entry: meal });

    // Then
    expect(row).toEqual({ title: 'Carrot, Porridge', detail: '08:15 · Solids' });
  });

  it('says no food was noted when its notes are blank', () => {
    // When
    const row = describeEntry({ kind: 'feeding', at: meal.start, entry: { ...meal, notes: '  ' } });

    // Then
    expect(row.title).toBe('No food noted');
  });

  it('reads as Solids with its food', () => {
    // When
    const label = spokenEntry({ kind: 'feeding', at: meal.start, entry: meal });

    // Then
    expect(label).toBe('Solids at 08:15, Carrot, Porridge. Edit.');
  });

  it.each(['parent fed', 'self fed'] as const)('is labelled Solids when %s', (method) => {
    // When
    const label = METHOD_LABELS[method];

    // Then
    expect(label).toBe('Solids');
  });
});
