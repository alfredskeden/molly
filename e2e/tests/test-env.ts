import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const envFile = join(__dirname, '..', '.env.test');
if (!existsSync(envFile)) throw new Error('e2e/.env.test missing: run pnpm bb:up && pnpm bb:seed');

const env = Object.fromEntries(
  readFileSync(envFile, 'utf8')
    .split('\n')
    .map((line) => /^([A-Z0-9_]+)=(.*)$/.exec(line.trim()))
    .filter((match) => match !== null)
    .map((match) => [match[1], match[2]]),
);

export const testEnv = {
  baseUrl: env.BB_URL as string,
  childId: Number(env.BB_CHILD_ID),
  adminToken: env.BB_ADMIN_KEY as string,
  /** No delete_timer. */
  parentA: { id: Number(env.BB_PARENT_A_ID), token: env.BB_PARENT_A_KEY as string },
  /** Has delete_timer. */
  parentB: { id: Number(env.BB_PARENT_B_ID), token: env.BB_PARENT_B_KEY as string },
};

export async function adminFetch(path: string, init?: RequestInit) {
  const response = await fetch(`${testEnv.baseUrl}/api/${path}`, {
    ...init,
    headers: { Authorization: `Token ${testEnv.adminToken}`, 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error(`admin ${init?.method ?? 'GET'} ${path}: ${response.status}`);
  return response.status === 204 ? null : response.json();
}

type Page<T> = { results: T[] };

const MEASUREMENTS = ['weight', 'height', 'head-circumference', 'temperature', 'bmi'] as const;

export async function resetChild() {
  const timers = (await adminFetch('timers/?limit=1000')) as Page<{ id: number }>;
  for (const timer of timers.results) await adminFetch(`timers/${timer.id}/`, { method: 'DELETE' });
  for (const kind of ['sleep', 'feedings', 'changes', 'medication', 'notes', ...MEASUREMENTS]) {
    const entries = (await adminFetch(`${kind}/?child=${testEnv.childId}&limit=1000`)) as Page<{ id: number }>;
    for (const entry of entries.results) await adminFetch(`${kind}/${entry.id}/`, { method: 'DELETE' });
  }
}

export async function latest<T>(kind: 'sleep' | 'feedings' | 'changes' | 'medication'): Promise<T | undefined> {
  return ((await adminFetch(`${kind}/?child=${testEnv.childId}&limit=1`)) as Page<T>).results[0];
}

export async function runningTimers() {
  return ((await adminFetch(`timers/?child=${testEnv.childId}`)) as Page<{ id: number; name: string; user: number }>).results;
}
