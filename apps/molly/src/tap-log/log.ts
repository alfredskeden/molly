import type { TapLogLine } from './model';

/** The Tap log is Android only (see log.android.ts); on web nothing is logged. */
export function tapLog(_text: string) {}

export function startTapLog() {}

export function tapLogTask(_text: string): () => void {
  return () => {};
}

export async function readTapLog(): Promise<TapLogLine[]> {
  return [];
}

export async function clearTapLog() {}
