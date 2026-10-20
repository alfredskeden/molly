import { useSyncExternalStore } from 'react';

let inProgress = 0;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

/**
 * A write is on its way to Baby Buddy: polls and focus refetches stop until it's done, since one that
 * lands mid-write would put the old state back over the tap's guess. Returns the release, safe to call
 * twice.
 */
export function holdPolls(): () => void {
  inProgress += 1;
  notify();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    inProgress -= 1;
    notify();
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const writing = () => inProgress > 0;

/** For the polling queries: no interval and no refetch on focus while a write is in progress. */
export function usePolling(pollMs: number | false) {
  const held = useSyncExternalStore(subscribe, writing, writing);
  return { refetchInterval: held ? false : pollMs, refetchOnWindowFocus: !held };
}
