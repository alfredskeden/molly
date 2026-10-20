/**
 * Requests every URL in the Development guide's `SOURCES` and lists the ones that don't answer 200.
 * Sends a browser's user agent (cdc.gov refuses scripts without one) and follows redirects, naming
 * where they land so moved pages can be updated.
 *
 *   pnpm check:sources
 */
import { SOURCES } from '../packages/core/src/development/sources';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const TIMEOUT_MS = 20_000;

type Result = { id: string; url: string; status: number | string; landed?: string };

async function check(id: string, url: string): Promise<Result> {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/pdf;q=0.9,*/*;q=0.8' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    await response.body?.cancel();
    return { id, url, status: response.status, ...(response.url !== url && { landed: response.url }) };
  } catch (error) {
    return { id, url, status: error instanceof Error ? error.message : String(error) };
  }
}

async function main(): Promise<number> {
  const results: Result[] = [];
  const entries = Object.entries(SOURCES);
  // A few at a time, to be polite to the sites.
  for (let index = 0; index < entries.length; index += 4) {
    results.push(...(await Promise.all(entries.slice(index, index + 4).map(([id, source]) => check(id, source.url)))));
  }

  const failed = results.filter((result) => result.status !== 200);
  const moved = results.filter((result) => result.status === 200 && result.landed);
  for (const result of moved) console.log(`moved   ${result.id}\n        ${result.url}\n     -> ${result.landed}`);
  for (const result of failed) console.log(`FAILED  ${result.id} (${result.status})\n        ${result.url}`);
  console.log(`\n${results.length - failed.length} of ${results.length} sources answer 200${moved.length ? `, ${moved.length} after a redirect` : ''}.`);
  return failed.length > 0 ? 1 : 0;
}

main().then((code) => process.exit(code));
