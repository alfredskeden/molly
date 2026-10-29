import { beforeEach, describe, expect, it } from 'vitest';

import { awayOnPurpose, leaveOnPurpose, tripOnAppState } from './trip';

/** A promise and the way to settle it, standing in for the camera or a permission prompt. */
function pending() {
  let settle = () => {};
  const promise = new Promise<void>((resolve) => {
    settle = resolve;
  });
  return { promise, settle };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('a trip Molly started', () => {
  beforeEach(async () => {
    // A return with nothing marked: the module starts each test clean.
    tripOnAppState('background');
    tripOnAppState('active');
    tripOnAppState('active');
  });

  it('is not there when nothing marked one', () => {
    // When
    tripOnAppState('background');
    const trip = tripOnAppState('active');

    // Then
    expect(trip).toBe(false);
  });

  it('keeps the return after a one-off leave (a link, Android settings)', () => {
    // Given
    leaveOnPurpose();
    tripOnAppState('background');

    // When
    const trip = tripOnAppState('active');

    // Then
    expect(trip).toBe(true);
  });

  it('is used up by that return', () => {
    // Given
    leaveOnPurpose();
    tripOnAppState('background');
    tripOnAppState('active');
    tripOnAppState('background');

    // When
    const trip = tripOnAppState('active');

    // Then
    expect(trip).toBe(false);
  });

  it('keeps every return while the action that left is still running (Android flickers before the camera opens)', async () => {
    // Given
    const camera = pending();
    void awayOnPurpose(() => camera.promise);
    tripOnAppState('background');
    tripOnAppState('active');
    tripOnAppState('background');

    // When
    const trip = tripOnAppState('active');

    // Then
    expect(trip).toBe(true);
  });

  it('keeps the return that comes after the action has settled', async () => {
    // Given
    const camera = pending();
    const away = awayOnPurpose(() => camera.promise);
    tripOnAppState('background');
    camera.settle();
    await away;

    // When
    const trip = tripOnAppState('active');

    // Then
    expect(trip).toBe(true);
  });

  it('ends once the action has settled with the app back', async () => {
    // Given
    const camera = pending();
    const away = awayOnPurpose(() => camera.promise);
    tripOnAppState('background');
    tripOnAppState('active');
    camera.settle();
    await away;
    tripOnAppState('background');

    // When
    const trip = tripOnAppState('active');

    // Then
    expect(trip).toBe(false);
  });

  it('ends when the action fails too', async () => {
    // Given
    const away = awayOnPurpose(() => Promise.reject(new Error('no camera')));
    await away.catch(() => undefined);
    await flush();
    tripOnAppState('background');

    // When
    const trip = tripOnAppState('active');

    // Then
    expect(trip).toBe(false);
  });

  it('gives back what the action gave', async () => {
    // When
    const result = await awayOnPurpose(async () => 'photo');

    // Then
    expect(result).toBe('photo');
  });
});
