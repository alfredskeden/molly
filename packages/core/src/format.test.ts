import { describe, expect, it } from 'vitest';

import { agoText } from './format';

const at = (clock: string, day = 24) => {
  const [hours = 0, minutes = 0] = clock.split(':').map(Number);
  return new Date(2026, 8, day, hours, minutes);
};

describe('when something happened', () => {
  it('is how long ago, for something in the last 12 hours', () => {
    // When
    const text = agoText(at('09:32'), at('11:40'));

    // Then
    expect(text).toBe('2h 8m ago');
  });

  it('is just now within the minute', () => {
    // When
    const text = agoText(new Date(at('11:40').getTime() - 20_000), at('11:40'));

    // Then
    expect(text).toBe('just now');
  });

  it('is its clock time once it is longer ago than that', () => {
    // When
    const text = agoText(at('22:30', 23), at('11:40'));

    // Then
    expect(text).toBe('22:30');
  });
});
