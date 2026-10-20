import { describe, expect, it } from 'vitest';

import { decideTimerAction, stopFailureOutcome } from './timer';

const running = { id: 7, start: '2026-09-20T12:15:00Z' };

describe('timer decisions', () => {
  it('start with no timer running creates one', () => {
    // Given
    const current = null;

    // When
    const decision = decideTimerAction('start', current);

    // Then
    expect(decision).toEqual({ type: 'create' });
  });

  it('start with a timer running is already running since its start', () => {
    // Given
    const current = running;

    // When
    const decision = decideTimerAction('start', current);

    // Then
    expect(decision).toEqual({ type: 'alreadyRunning', since: '2026-09-20T12:15:00Z' });
  });

  it('stop with a timer running consumes it', () => {
    // Given
    const current = running;

    // When
    const decision = decideTimerAction('stop', current);

    // Then
    expect(decision).toEqual({ type: 'consume', timerId: 7 });
  });

  it('stop with no timer running is already stopped', () => {
    // Given
    const current = null;

    // When
    const decision = decideTimerAction('stop', current);

    // Then
    expect(decision).toEqual({ type: 'alreadyStopped' });
  });

  it('a stop that finds the timer gone is already stopped', () => {
    // Given
    const error = 'notFound';

    // When
    const outcome = stopFailureOutcome(error);

    // Then
    expect(outcome).toEqual({ type: 'alreadyStopped' });
  });

  it('a stop that is forbidden needs the delete_timer permission', () => {
    // Given
    const error = 'forbidden';

    // When
    const outcome = stopFailureOutcome(error);

    // Then
    expect(outcome).toEqual({ type: 'permissionNeeded' });
  });

  it.each(['unreachable', 'unauthorized', 'validation', 'server'] as const)(
    'a stop that fails as %s reports the error',
    (error) => {
      // Given
      const kind = error;

      // When
      const outcome = stopFailureOutcome(kind);

      // Then
      expect(outcome).toEqual({ type: 'failed', error: kind });
    },
  );
});
