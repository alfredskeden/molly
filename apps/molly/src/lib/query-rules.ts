import { BabyBuddyError } from '@molly/api';

/**
 * Only failures that may go away on their own are retried, once: no answer, or Baby Buddy's own
 * error. A refusal, a missing entry or a bad request answers the same the second time.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false;
  if (!(error instanceof BabyBuddyError)) return true;
  return error.kind === 'unreachable' || error.kind === 'server';
}

/**
 * What a cold start needs to draw the dashboard. Settings live in their own storage already. `rhythm`
 * (Life Sim's usual gaps) is fetched once per day or night window, so a restart mustn't fetch it again;
 * `bottles` gives the bottle amount row its start at once.
 */
const PERSISTED = new Set(['timer', 'entries', 'skips', 'children', 'lastSleep', 'rhythm', 'bottles']);

/**
 * `guessed`: the query's data was last set by a tap's guess, not fetched. A guess must never outlive
 * the app: a restart would show a timer Baby Buddy never had. Data being refetched is still the last
 * good answer, so it's kept: Android may kill Molly mid-refetch.
 */
export function shouldPersist(query: { key: readonly unknown[]; status: 'pending' | 'error' | 'success'; guessed: boolean }) {
  return PERSISTED.has(String(query.key[0])) && query.status === 'success' && !query.guessed;
}
