import { describe, expect, it } from 'vitest';

import { weekWindow } from './weeks';

const NOW = new Date('2026-09-24T09:14:00+02:00');

describe("Recent days' weeks", () => {
  it('end at the next midnight, and each earlier one is the week before', () => {
    // Given
    const weeks = [0, 1];

    // When
    const windows = weeks.map((week) => weekWindow(week, NOW));

    // Then
    expect(windows).toEqual([
      { from: new Date('2026-09-18T00:00:00+02:00'), to: new Date('2026-09-25T00:00:00+02:00') },
      { from: new Date('2026-09-11T00:00:00+02:00'), to: new Date('2026-09-18T00:00:00+02:00') },
    ]);
  });
});
