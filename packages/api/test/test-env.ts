import { createClient } from '../src/index';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} missing from e2e/.env.test; rerun pnpm bb:seed`);
  return value;
}

export const testEnv = {
  baseUrl: required('BB_URL'),
  childId: Number(required('BB_CHILD_ID')),
  admin: { id: Number(required('BB_ADMIN_ID')), token: required('BB_ADMIN_KEY') },
  /** No `core.delete_timer`: can't stop or cancel another parent's timer. Caregiver measurements only (weight, temperature). */
  parentA: { id: Number(required('BB_PARENT_A_ID')), token: required('BB_PARENT_A_KEY') },
  /** Has `core.delete_timer`, and may view and add height, head circumference and BMI. */
  parentB: { id: Number(required('BB_PARENT_B_ID')), token: required('BB_PARENT_B_KEY') },
};

export function clientAs(user: { token: string }) {
  return createClient({ baseUrl: testEnv.baseUrl, token: user.token });
}

/** Raw admin call, independent of the client under test. */
async function adminFetch(path: string, init?: RequestInit) {
  const response = await fetch(`${testEnv.baseUrl}/api/${path}`, {
    ...init,
    headers: { Authorization: `Token ${testEnv.admin.token}`, 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error(`admin ${init?.method ?? 'GET'} ${path}: ${response.status}`);
  return response.status === 204 ? null : response.json();
}

export async function resetTimers() {
  const page = (await adminFetch('timers/?limit=1000')) as { results: { id: number }[] };
  for (const timer of page.results) await adminFetch(`timers/${timer.id}/`, { method: 'DELETE' });
}

const MEASUREMENT_PATHS = ['weight', 'height', 'head-circumference', 'temperature', 'bmi'] as const;

export async function countEntries(kind: 'sleep' | 'feedings' | 'changes' | 'medication' | (typeof MEASUREMENT_PATHS)[number]) {
  const page = (await adminFetch(`${kind}/?child=${testEnv.childId}&limit=1`)) as { count: number };
  return page.count;
}

export async function resetEntries() {
  for (const kind of ['sleep', 'feedings', 'changes', 'medication', 'notes', ...MEASUREMENT_PATHS] as const) {
    const page = (await adminFetch(`${kind}/?child=${testEnv.childId}&limit=1000`)) as {
      results: { id: number }[];
    };
    for (const entry of page.results) await adminFetch(`${kind}/${entry.id}/`, { method: 'DELETE' });
  }
}

/** A second child for the tests that need several; delete it again with `deleteChild`. */
export async function createChild(firstName: string): Promise<number> {
  const child = (await adminFetch('children/', {
    method: 'POST',
    body: JSON.stringify({ first_name: firstName, last_name: 'Test', birth_date: '2026-01-15' }),
  })) as { id: number; slug: string };
  return child.id;
}

export async function deleteChild(id: number) {
  const page = (await adminFetch('children/?limit=1000')) as { results: { id: number; slug: string }[] };
  const child = page.results.find((candidate) => candidate.id === id);
  if (child) await adminFetch(`children/${child.slug}/`, { method: 'DELETE' });
}
