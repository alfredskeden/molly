import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

import { appended, isStall, parseTapLog, type TapLogLine } from './model';

const KEY = 'molly.tap-log';
const MAX_LINES = 600;
const TICK_MS = 100;

/** Null until the stored log is read; lines logged meanwhile wait in `early`. */
let lines: TapLogLine[] | null = null;
let early: TapLogLine[] = [];
let loading: Promise<void> | null = null;
let tasks = 0;
let started = false;

function load() {
  loading ??= AsyncStorage.getItem(KEY)
    .catch(() => null)
    .then((stored) => {
      lines = early.reduce((all, line) => appended(all, line, MAX_LINES), parseTapLog(stored));
      early = [];
      write();
    });
  return loading;
}

/**
 * Sent to storage straight away, not batched: if the JS thread then blocks for good, the native side still
 * writes what was logged just before. AsyncStorage writes in order, so the last write wins.
 */
function write() {
  if (lines) AsyncStorage.setItem(KEY, JSON.stringify(lines)).catch(() => undefined);
}

/** Adds a line to the Tap log (Settings, long-press the version line). */
export function tapLog(text: string) {
  const line = { at: Date.now(), text };
  if (!lines) {
    early.push(line);
    void load();
    return;
  }
  lines = appended(lines, line, MAX_LINES);
  write();
}

/**
 * Watches the JS thread for this runtime (the app's, or a headless task's in a fresh process): a line for
 * every tick that comes late (`stall`), and for the app coming and going.
 */
export function startTapLog() {
  if (started) return;
  started = true;
  void load();
  let last = Date.now();
  let wasActive = AppState.currentState === 'active';
  setInterval(() => {
    const now = Date.now();
    const active = AppState.currentState === 'active';
    const lateMs = now - last - TICK_MS;
    if (isStall({ lateMs, active, wasActive, task: tasks > 0 })) tapLog(`stall ${lateMs} ms`);
    last = now;
    wasActive = active;
  }, TICK_MS);
  AppState.addEventListener('change', (status) => tapLog(`app ${status}`));
}

/** Marks a headless task as running, so stalls while it runs count; call the result when it ends. */
export function tapLogTask(text: string): () => void {
  tapLog(text);
  tasks += 1;
  return () => {
    tasks -= 1;
  };
}

export async function readTapLog(): Promise<TapLogLine[]> {
  await load();
  return lines ?? [];
}

export async function clearTapLog() {
  await load();
  lines = [];
  write();
}
