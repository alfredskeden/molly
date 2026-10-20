import { describe, expect, it } from 'vitest';

import { sleep } from '../test/fixtures';
import { napReminderAt, placeOf, reminderFor, type NapReminder } from './nap-reminder';

/** Thursday 24 September 2026, local time. */
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
/** The day window that started with the 07:00 wake. */
const today = { kind: 'day' as const, start: at('07:00') };
/** A reminder set at 11:40 for the sleep at `place`: the nap's place in the day, skipped naps counted, or bedtime. */
const reminder = (place: NapReminder['place'], setAt = '11:40'): NapReminder => ({ place, day: at('07:00').toISOString(), setAt: at(setAt).toISOString() });
const input = (stored: NapReminder | null, overrides: Partial<Parameters<typeof napReminderAt>[0]> = {}) => ({
  reminder: stored,
  plan,
  napsSoFar: 1,
  window: today,
  running: null,
  sleeps: [],
  allowed: true,
  now: at('11:45'),
  ...overrides,
});

describe('when a nap reminder rings', () => {
  it('is never without a stored reminder', () => {
    // When
    const ring = napReminderAt(input(null));

    // Then
    expect(ring).toBeNull();
  });

  it('is at the start of the sleep it was set for', () => {
    // When
    const ring = napReminderAt(input(reminder(2)));

    // Then
    expect(ring).toEqual({ at: at('12:56'), slot: 2, start: at('12:56'), end: at('13:26') });
  });

  it('follows its sleep when a log moves it', () => {
    // Given
    const moved = [likely('13:10', '13:40'), ...plan.slice(1)];

    // When
    const ring = napReminderAt(input(reminder(2), { plan: moved }));

    // Then
    expect(ring?.at).toEqual(at('13:10'));
  });

  it('is at bedtime for a bedtime reminder', () => {
    // When
    const ring = napReminderAt(input(reminder('bedtime')));

    // Then
    expect(ring?.at).toEqual(at('18:30'));
  });

  it('rings at once when the window opened before it could', () => {
    // When
    const ring = napReminderAt(input(reminder(2), { now: at('13:00') }));

    // Then
    expect(ring?.at).toEqual(at('12:56'));
  });

  it.each([
    ['a sleep runs', { running: { start: at('11:50').toISOString() } }],
    ['a sleep started after it was set', { sleeps: [sleep({ start: at('11:42').toISOString(), end: at('11:44').toISOString() })] }],
    ['its nap was skipped', { plan: [likely('12:56', '13:26', true), ...plan.slice(1)] }],
    ['the plan has no such sleep any more', { plan: plan.slice(2) }],
    ['the day it was set on is over', { window: { kind: 'day' as const, start: at('07:05', 25) } }],
    ['the night has come', { window: { kind: 'night' as const, start: at('18:40') } }],
    ['its window has ended', { now: at('13:27') }],
    ['notifications are not allowed', { allowed: false }],
  ])('is cancelled once %s', (_case, overrides) => {
    // When
    const ring = napReminderAt(input(reminder(2), overrides));

    // Then
    expect(ring).toBeNull();
  });

  it('stays for a sleep that ended before it was set', () => {
    // Given
    const morningNap = sleep({ start: at('09:00').toISOString(), end: at('10:00').toISOString() });

    // When
    const ring = napReminderAt(input(reminder(2), { sleeps: [morningNap] }));

    // Then
    expect(ring?.at).toEqual(at('12:56'));
  });
});

describe('the reminder a bell sets', () => {
  it('is for the nap tapped, on the day window it was set in, set now', () => {
    // When
    const stored = reminderFor(plan, 2, 1, today, at('11:40'));

    // Then
    expect(stored).toEqual(reminder(2));
  });

  it('counts a skipped nap before it, so a skip later on never moves it to another nap', () => {
    // Given
    const withSkip = [likely('12:56', '13:26', true), ...plan.slice(1)];

    // When
    const stored = reminderFor(withSkip, 2, 1, today, at('11:40'));

    // Then
    expect(stored?.place).toBe(3);
  });

  it('is for bedtime when bedtime is tapped', () => {
    // When
    const stored = reminderFor(plan, 'bedtime', 1, today, at('11:40'));

    // Then
    expect(stored?.place).toBe('bedtime');
  });

  it('cannot be set once the window has opened', () => {
    // When
    const stored = reminderFor(plan, 2, 1, today, at('12:56'));

    // Then
    expect(stored).toBeNull();
  });
});

describe("a likely sleep's place in the day", () => {
  it('is the nap number with skipped naps counted', () => {
    // Given
    const withSkip = [likely('12:56', '13:26', true), ...plan.slice(1)];

    // When
    const place = placeOf(withSkip, 2, 1);

    // Then
    expect(place).toBe(3);
  });

  it('is bedtime for bedtime', () => {
    // When
    const place = placeOf(plan, 'bedtime', 1);

    // Then
    expect(place).toBe('bedtime');
  });

  it('is nothing for a sleep the plan does not have', () => {
    // When
    const place = placeOf(plan, 5, 1);

    // Then
    expect(place).toBeNull();
  });
});
