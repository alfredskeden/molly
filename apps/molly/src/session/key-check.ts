import { BabyBuddyError, type BabyBuddyErrorKind, type Client } from '@molly/api';
import { keyCheckVerdict, type KeyVerdict } from '@molly/core';

/** A refusal is either a rejected key or a missing permission; only `checkKey` can tell which. */
export const isRefusal = (kind: BabyBuddyErrorKind) => kind === 'unauthorized' || kind === 'forbidden';

export const isRefusalError = (error: unknown) => error instanceof BabyBuddyError && isRefusal(error.kind);

/** Asks `GET /api/profile`, which needs no permission, whether the key itself still works. */
export async function checkKey(client: Pick<Client, 'getProfile'>): Promise<KeyVerdict> {
  try {
    await client.getProfile();
    return keyCheckVerdict('ok');
  } catch (error) {
    if (error instanceof BabyBuddyError) return keyCheckVerdict(error.kind);
    throw error;
  }
}

let inFlight: { token: string; verdict: Promise<KeyVerdict> } | null = null;

/** One check at a time per key: a refused dashboard fails several requests at once. */
export function checkKeyOnce(client: Pick<Client, 'getProfile'>, token: string): Promise<KeyVerdict> {
  if (inFlight?.token === token) return inFlight.verdict;
  const verdict = checkKey(client).finally(() => {
    if (inFlight?.verdict === verdict) inFlight = null;
  });
  inFlight = { token, verdict };
  return verdict;
}

/** The same client, calling `onRefused` whenever Baby Buddy refuses one of its requests. */
export function watchRefusals<T extends Record<string, unknown>>(client: T, onRefused: () => void): T {
  const watched = Object.entries(client).map(([name, method]) => {
    if (typeof method !== 'function') return [name, method];
    const call = async (...args: unknown[]) => {
      try {
        return await method(...args);
      } catch (error) {
        if (isRefusalError(error)) onRefused();
        throw error;
      }
    };
    return [name, call];
  });
  return Object.fromEntries(watched) as T;
}
