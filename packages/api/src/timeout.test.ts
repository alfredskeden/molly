import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';

import { createClient } from './client';
import { BabyBuddyError } from './errors';

let server: Server | undefined;

/** A server that takes the request and never answers, like a connection a router silently dropped. */
async function silentServer(): Promise<string> {
  server = createServer(() => undefined);
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

afterEach(async () => {
  server?.closeAllConnections();
  await new Promise((resolve) => server?.close(resolve));
  server = undefined;
});

describe('a request Baby Buddy never answers', () => {
  it('gives up after the timeout as unreachable', async () => {
    // Given
    const client = createClient({ baseUrl: await silentServer(), token: 'any', timeoutMs: 50 });

    // When
    const result = client.getProfile().catch((error: unknown) => error);

    // Then
    expect(await result).toEqual(new BabyBuddyError('unreachable'));
  });
});

describe('a request the caller cancels', () => {
  it('stops at once and fails as the abort, not as unreachable', async () => {
    // Given
    const client = createClient({ baseUrl: await silentServer(), token: 'any', timeoutMs: 5_000 });
    const controller = new AbortController();
    const result = client.getProfile({ signal: controller.signal }).catch((error: unknown) => error);

    // When
    controller.abort();

    // Then
    expect(await result).toMatchObject({ name: 'AbortError' });
  });

  it('still gives up after the timeout as unreachable when never cancelled', async () => {
    // Given
    const client = createClient({ baseUrl: await silentServer(), token: 'any', timeoutMs: 50 });
    const controller = new AbortController();

    // When
    const result = client.getProfile({ signal: controller.signal }).catch((error: unknown) => error);

    // Then
    expect(await result).toEqual(new BabyBuddyError('unreachable'));
  });
});
