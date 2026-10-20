import { describe, expect, it, vi } from 'vitest';

import { answerStrength, HAPTICS, hapticPlayer, type HapticAction, type Strength } from './model';

describe('the haptics map', () => {
  it.each<[string, HapticAction, Strength]>([
    ['Start sleep, Start feed', 'startTimer', 'medium'],
    ['Stop sleep, Left / Right / Both / Bottle', 'stopTimer', 'success'],
    ['Wet, Dirty, Both, Vitamin D, medication saved', 'log', 'light'],
    ['Cancel feeding, Cancel sleep', 'cancel', 'light'],
    ['Chips: side, type, colour, filters, Day/Night, ago chips', 'choose', 'selection'],
    ['−5 / +5 min, −10 / +10 ml, 1 min earlier / later', 'step', 'selection'],
    ['Delete entry (first tap arms it)', 'armDelete', 'warning'],
  ])('%s plays %s → %s', (_, action, strength) => {
    // Given
    const map = HAPTICS;

    // When
    const played = map[action];

    // Then
    expect(played).toBe(strength);
  });
});

describe("Baby Buddy's answer after the tap", () => {
  it.each([
    [{ type: 'alreadyRunning', since: '2026-09-24T07:02:00Z', user: 3 } as const, 'warning'],
    [{ type: 'alreadyStopped' } as const, 'warning'],
    [{ type: 'failed', error: 'unreachable' } as const, 'error'],
    [{ type: 'permissionNeeded' } as const, 'error'],
  ])('%o adds the %s haptic', (outcome, strength) => {
    // Given
    const answer = outcome;

    // When
    const played = answerStrength(answer);

    // Then
    expect(played).toBe(strength);
  });

  it('a write Baby Buddy accepted adds nothing: the tap already played', () => {
    // Given
    const answer = { type: 'cancelled' } as const;

    // When
    const played = answerStrength(answer);

    // Then
    expect(played).toBeNull();
  });
});

describe('playing haptics', () => {
  it('plays the strength while haptics are on', () => {
    // Given
    const play = vi.fn();
    const haptic = hapticPlayer(play, true);

    // When
    haptic('medium');

    // Then
    expect(play).toHaveBeenCalledWith('medium');
  });

  it('plays nothing once the parent turned haptics off', () => {
    // Given
    const play = vi.fn();
    const haptic = hapticPlayer(play, false);

    // When
    haptic('success');
    haptic(null);

    // Then
    expect(play).not.toHaveBeenCalled();
  });
});
