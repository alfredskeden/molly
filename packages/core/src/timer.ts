import type { BabyBuddyErrorKind, Timer } from '@molly/api';

export type TimerIntent = 'start' | 'stop';

export type RunningTimer = Pick<Timer, 'id' | 'start'>;

export type TimerDecision =
  | { type: 'create' }
  | { type: 'consume'; timerId: number }
  | { type: 'alreadyRunning'; since: string }
  | { type: 'alreadyStopped' };

export function decideTimerAction(intent: TimerIntent, running: RunningTimer | null): TimerDecision {
  if (intent === 'start') return running ? { type: 'alreadyRunning', since: running.start } : { type: 'create' };
  return running ? { type: 'consume', timerId: running.id } : { type: 'alreadyStopped' };
}

export type StopFailureOutcome =
  | { type: 'alreadyStopped' }
  | { type: 'permissionNeeded' }
  | { type: 'failed'; error: BabyBuddyErrorKind };

/** The other parent may have stopped the timer first (gone), or own it (forbidden). */
export function stopFailureOutcome(error: BabyBuddyErrorKind): StopFailureOutcome {
  if (error === 'notFound') return { type: 'alreadyStopped' };
  if (error === 'forbidden') return { type: 'permissionNeeded' };
  return { type: 'failed', error };
}
