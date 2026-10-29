import { describe, expect, it } from 'vitest';

import { leaveOnPurpose, takeTrip } from './trip';

describe('a trip Molly started', () => {
  it('is not there when nothing marked one', () => {
    // When
    const trip = takeTrip();

    // Then
    expect(trip).toBe(false);
  });

  it('is there on the return after the mark', () => {
    // Given
    leaveOnPurpose();

    // When
    const trip = takeTrip();

    // Then
    expect(trip).toBe(true);
  });

  it('is used up by that return', () => {
    // Given
    leaveOnPurpose();
    takeTrip();

    // When
    const trip = takeTrip();

    // Then
    expect(trip).toBe(false);
  });
});
