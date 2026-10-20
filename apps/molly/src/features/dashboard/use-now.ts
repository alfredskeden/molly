import { useMemo, useSyncExternalStore } from 'react';

/**
 * One clock for every `useNow`, ticking just after each whole second while anything listens: two
 * timers on screen (the ring's centre, a running tile) always show the same second.
 */
const listeners = new Set<() => void>();
let current = Date.now();
let timeout: ReturnType<typeof setTimeout> | undefined;

function tick() {
  current = Date.now();
  listeners.forEach((listener) => listener());
  schedule();
}

function schedule() {
  timeout = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    current = Date.now();
    schedule();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) clearTimeout(timeout);
  };
}

/** Per interval: the time it last crossed a step, so a snapshot stays the same number until the next step. */
const crossed = new Map<number, number>();

function readFor(intervalMs: number) {
  return () => {
    const time = listeners.size > 0 ? current : Date.now();
    const last = crossed.get(intervalMs);
    if (last !== undefined && Math.floor(last / intervalMs) === Math.floor(time / intervalMs)) return last;
    crossed.set(intervalMs, time);
    return time;
  };
}

/** The time, re-rendering when it crosses a whole `intervalMs` (aligned to the clock: every minute on the minute). */
export function useNow(intervalMs = 10_000): Date {
  const read = useMemo(() => readFor(intervalMs), [intervalMs]);
  const at = useSyncExternalStore(subscribe, read, read);
  return useMemo(() => new Date(at), [at]);
}
