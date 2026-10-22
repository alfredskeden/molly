import { describe, expect, it } from 'vitest';

import { instantFeeding } from './optimistic';

describe('the guess of an instant feed', () => {
  const now = new Date('2026-10-20T12:00:00Z');

  it('is a minute long, ending now, with no notes for milk', () => {
    // When
    const feeding = instantFeeding({ type: 'breast milk', method: 'left breast', amount: null }, 3, now);

    // Then
    expect(feeding).toMatchObject({ child: 3, start: '2026-10-20T11:59:00.000Z', end: '2026-10-20T12:00:00.000Z', notes: null });
  });

  it("carries a meal's food as its notes", () => {
    // When
    const feeding = instantFeeding({ type: 'solid food', method: 'parent fed', amount: 0, notes: 'Carrot' }, 3, now);

    // Then
    expect(feeding).toMatchObject({ type: 'solid food', amount: 0, notes: 'Carrot' });
  });
});
