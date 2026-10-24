import { describe, expect, it } from 'vitest';

import { PROFILES, profileDays } from '../test/day-fixtures';
import { replayDays, scoreDays } from './replay';

describe.each(PROFILES)('the made-up child at $name', (profile) => {
  it.each([
    ['the default setting', { start: '07:00', end: '19:00' }],
    ['a setting an hour early', { start: '06:00', end: '18:00' }],
    ['a setting 90 min late', { start: '08:30', end: '20:00' }],
  ])('gets at least as many wakes and bedtimes right by its rhythm as by %s alone', (_, napWindow) => {
    // Given
    const { sleeps, truth } = profileDays(profile, 28, 1);

    // When
    // The first 3 days teach the rhythm; they aren't scored.
    const scores = scoreDays(replayDays(sleeps, profile.birthDate, napWindow), truth.slice(3));

    // Then
    expect(scores.new.wake.right).toBeGreaterThanOrEqual(scores.old.wake.right);
    expect(scores.new.bedtime.right).toBeGreaterThanOrEqual(scores.old.bedtime.right);
  });
});
