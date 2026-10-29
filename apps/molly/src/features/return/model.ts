// What the app does when it comes back to the foreground, without React or React Native, so it can be unit-tested.

/** On Android, this long away (or more) and Molly comes back on the live ring. */
export const AWAY_MS = 60_000;

/** `stay`: nothing changes. `showLive`: the dashboard goes to now (the web). `goLive`: back to the dashboard, then now (Android). */
export type ReturnAnswer = 'stay' | 'showLive' | 'goLive';

/** When the app last left `active`; null while it's in the foreground. */
export type ReturnState = { leftAt: number | null };

export const START: ReturnState = { leftAt: null };

/** What else decides a return: the Tap log on screen, and whether Molly itself sent the parent out (a trip). */
export type ReturnContext = { platform: 'android' | 'web'; tapLog: boolean; trip: boolean };

/**
 * One `AppState` change. Leaving is the first change away from `active` (later ones don't move the time);
 * coming back to `active` answers from the time away. A change to `active` with no leave before it stays.
 */
export function onAppState(state: ReturnState, status: string, now: number, context: ReturnContext): { state: ReturnState; answer: ReturnAnswer } {
  if (status !== 'active') return { state: state.leftAt === null ? { leftAt: now } : state, answer: 'stay' };
  return { state: START, answer: state.leftAt === null ? 'stay' : answerFor(now - state.leftAt, context) };
}

function answerFor(away: number, { platform, tapLog, trip }: ReturnContext): ReturnAnswer {
  if (platform === 'web') return 'showLive';
  if (trip || tapLog || away < AWAY_MS) return 'stay';
  return 'goLive';
}

/** One "Changes not saved" when going live drops any draft with changes. */
export function toastOnReturn(answer: ReturnAnswer, drafts: Iterable<boolean>): boolean {
  return answer === 'goLive' && [...drafts].some(Boolean);
}
