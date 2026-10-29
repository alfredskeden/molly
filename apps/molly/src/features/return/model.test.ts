import { describe, expect, it } from 'vitest';

import { AWAY_MS, onAppState, START, toastOnReturn, type ReturnContext, type ReturnState } from './model';

const android: ReturnContext = { platform: 'android', tapLog: false, trip: false };
const web: ReturnContext = { platform: 'web', tapLog: false, trip: false };
const SECOND = 1000;

/** Leaves at 0 and comes back `away` ms later; the answer to the return. */
function awayFor(away: number, context: ReturnContext, status: 'background' | 'inactive' = 'background') {
  const left = onAppState(START, status, 0, context).state;
  return onAppState(left, 'active', away, context).answer;
}

describe('the app coming back', () => {
  it('stays when nothing has changed since start', () => {
    // When
    const { answer } = onAppState(START, 'active', 5 * 60 * SECOND, android);

    // Then
    expect(answer).toBe('stay');
  });

  it('goes live on Android after a minute away', () => {
    // When
    const answer = awayFor(AWAY_MS, android);

    // Then
    expect(answer).toBe('goLive');
  });

  it('goes live on Android after much longer away', () => {
    // When
    const answer = awayFor(3 * 60 * 60 * SECOND, android);

    // Then
    expect(answer).toBe('goLive');
  });

  it('stays on Android after less than a minute away', () => {
    // When
    const answer = awayFor(AWAY_MS - SECOND, android);

    // Then
    expect(answer).toBe('stay');
  });

  it('stays on Android when the return ends a trip Molly started, however long', () => {
    // When
    const answer = awayFor(30 * 60 * SECOND, { ...android, trip: true });

    // Then
    expect(answer).toBe('stay');
  });

  it('stays on Android while the Tap log is on screen, however long', () => {
    // When
    const answer = awayFor(30 * 60 * SECOND, { ...android, tapLog: true });

    // Then
    expect(answer).toBe('stay');
  });

  it.each([
    ['a quick switch', SECOND, false],
    ['a long time away', 30 * 60 * SECOND, false],
    ['a trip', 30 * 60 * SECOND, true],
  ])('shows live on the web after %s', (_, away, trip) => {
    // When
    const answer = awayFor(away, { ...web, trip });

    // Then
    expect(answer).toBe('showLive');
  });

  it('counts the time away from the first change away from active', () => {
    // Given
    const inactive = onAppState(START, 'inactive', 0, android).state;
    const background = onAppState(inactive, 'background', 30 * SECOND, android).state;

    // When
    const { answer } = onAppState(background, 'active', AWAY_MS, android);

    // Then
    expect(answer).toBe('goLive');
  });

  it('stays on a second active with no leave between', () => {
    // Given
    const back = onAppState(onAppState(START, 'background', 0, android).state, 'active', AWAY_MS, android).state;

    // When
    const { answer } = onAppState(back, 'active', 10 * AWAY_MS, android);

    // Then
    expect(answer).toBe('stay');
  });

  it('measures the next time away from its own leave', () => {
    // Given
    const back = onAppState(onAppState(START, 'background', 0, android).state, 'active', 10 * AWAY_MS, android).state;
    const leftAgain = onAppState(back, 'background', 20 * AWAY_MS, android).state;

    // When
    const { answer } = onAppState(leftAgain, 'active', 20 * AWAY_MS + 5 * SECOND, android);

    // Then
    expect(answer).toBe('stay');
  });

  it('keeps no leave time once back', () => {
    // Given
    const left: ReturnState = onAppState(START, 'background', 0, android).state;

    // When
    const { state } = onAppState(left, 'active', AWAY_MS, android);

    // Then
    expect(state).toEqual(START);
  });
});

describe('"Changes not saved" on the return', () => {
  it('is asked for when going live drops a draft with changes', () => {
    // When
    const toast = toastOnReturn('goLive', [false, true]);

    // Then
    expect(toast).toBe(true);
  });

  it.each([
    ['no drafts open', 'goLive', []],
    ['only unchanged drafts', 'goLive', [false, false]],
    ['a changed draft when staying', 'stay', [true]],
    ['a changed draft on the web', 'showLive', [true]],
  ] as const)('is not asked for with %s', (_, answer, drafts) => {
    // When
    const toast = toastOnReturn(answer, drafts);

    // Then
    expect(toast).toBe(false);
  });
});
