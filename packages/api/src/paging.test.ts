import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';

import { createClient } from './client';

let server: Server | undefined;

/** Answers each `offset` with the page given for it, as `{ count, results }`. */
async function pagedServer(pages: Record<number, { count: number; ids: number[] }>): Promise<string> {
  server = createServer((request, response) => {
    const offset = Number(new URL(request.url ?? '', 'http://x').searchParams.get('offset'));
    const page = pages[offset] ?? { count: 0, ids: [] };
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ count: page.count, results: page.ids.map((id) => ({ id })) }));
  });
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

afterEach(async () => {
  await new Promise((resolve) => server?.close(resolve));
  server = undefined;
});

describe('collecting a list across pages', () => {
  it('returns every entry once when one is added between pages', async () => {
    // Given
    const baseUrl = await pagedServer({
      0: { count: 4, ids: [4, 3] },
      2: { count: 5, ids: [3, 2] },
      4: { count: 5, ids: [1] },
    });
    const client = createClient({ baseUrl, token: 'any' });

    // When
    const sleeps = await client.listEntries('sleep', { child: 1 }, { pageSize: 2 });

    // Then
    expect(sleeps.map(({ id }) => id)).toEqual([4, 3, 2, 1]);
  });
});
