import { expect, test, type Page } from '@playwright/test';

import { ALL_DAY, signInAs } from './session';
import { adminFetch, resetChild, runningTimers, testEnv } from './test-env';

test.beforeEach(resetChild);

const MINUTE = 60_000;
const button = (page: Page, name: string | RegExp) =>
  page.getByRole('button', typeof name === 'string' ? { name, exact: true } : { name });
const pad = (value: number) => String(value).padStart(2, '0');
const clock = (time: Date | string) => {
  const date = new Date(time);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
const ago = (minutes: number) => new Date(Date.now() - minutes * MINUTE).toISOString();

async function runningTimer(name: 'molly:sleep' | 'molly:feeding', start: string) {
  await adminFetch('timers/', { method: 'POST', body: JSON.stringify({ child: testEnv.childId, name, start }) });
}

async function serverStart() {
  const [timer] = await runningTimers();
  return (await adminFetch(`timers/${timer!.id}/`)).start as string;
}

async function editFeedStart(page: Page) {
  await button(page, /^Stop feed, /).click();
  await button(page, 'Edit start').click();
}

test('with nothing logged, the centre says so instead of an empty time', async ({ page }) => {
  // When
  await signInAs(page, testEnv.parentB);

  // Then
  await expect(page.getByLabel('Awake –, No sleep logged yet', { exact: true })).toBeVisible();
  await expect(button(page, 'Feed').getByText('not yet', { exact: true })).toBeVisible();
  await expect(page.getByText(/NaN/)).toHaveCount(0);
});

test('a start shows on the tile before Baby Buddy answers', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { feedTimer: true });
  await expect(button(page, 'Start feeding')).toBeVisible();
  await page.route(`${testEnv.baseUrl}/api/timers/**`, async (route) => {
    if (route.request().method() === 'POST') await new Promise((resolve) => setTimeout(resolve, 3000));
    await route.continue();
  });

  // When
  const started = page.waitForResponse((response) => response.request().method() === 'POST');
  await button(page, 'Start feeding').click();

  // Then
  await expect(button(page, /^Stop feed, /)).toBeVisible({ timeout: 1500 });
  // Let the delayed write land, so it can't leak into the next test.
  await started;
  await expect(page.getByRole('status')).toHaveText(/^Feeding started just now$/);
});

test("when Baby Buddy says a timer already runs, the ring shows the server's timer", async ({ page }) => {
  // Given: the other parent's timer exists, but this page hasn't seen it yet.
  const staleView = `${testEnv.baseUrl}/api/timers/?child=${testEnv.childId}&name=molly%3Asleep`;
  await page.route(staleView, (route) => route.fulfill({ json: { count: 0, next: null, previous: null, results: [] } }));
  await signInAs(page, testEnv.parentB, { napWindow: ALL_DAY });
  await expect(button(page, 'Start sleep')).toBeVisible();
  const start = new Date(Date.now() - 20 * 60_000);
  await runningTimer('molly:sleep', start.toISOString());
  await page.unroute(staleView);

  // When
  await button(page, 'Start sleep').click();

  // Then
  await expect(page.getByRole('status')).toHaveText('Already running for 20m · started by someone else');
  await expect(page.getByLabel(/^Sleeping 20 minutes, (nap|night sleep) so far$/)).toBeVisible();
});

test("−5 and Done move a running feed's start", async ({ page }) => {
  // Given
  const start = ago(20);
  await runningTimer('molly:feeding', start);
  await signInAs(page, testEnv.parentB);

  // When
  await editFeedStart(page);
  await expect(page.getByLabel(`Start ${clock(start)}`, { exact: true })).toBeVisible();
  await button(page, 'Start 5 minutes earlier').click();
  await button(page, 'Done').click();

  // Then
  const moved = new Date(Date.parse(start) - 5 * MINUTE);
  await expect(page.getByRole('status')).toHaveText(`Start moved to ${clock(moved)}`);
  await expect(button(page, `Feeding since ${clock(moved)}. Stop and save`)).toBeVisible();
  await expect.poll(async () => Date.parse(await serverStart())).toBe(moved.getTime());
});

test('opening and closing without a change writes nothing', async ({ page }) => {
  // Given
  const start = ago(20);
  await runningTimer('molly:feeding', start);
  await signInAs(page, testEnv.parentB);
  const writes: string[] = [];
  page.on('request', (request) => {
    if (request.method() !== 'GET') writes.push(`${request.method()} ${request.url()}`);
  });

  // When
  await editFeedStart(page);
  await button(page, 'Start 5 minutes earlier').click();
  await button(page, 'Start 5 minutes later').click();
  await button(page, 'Done').click();

  // Then
  await expect(button(page, 'Done')).toBeHidden();
  await expect(page.getByRole('status')).toHaveCount(0);
  expect(writes).toEqual([]);
  expect(Date.parse(await serverStart())).toBe(Date.parse(start));
});

test("+5 can't go past a minute before now", async ({ page }) => {
  // Given
  await runningTimer('molly:feeding', ago(3));
  await signInAs(page, testEnv.parentB);

  // When
  await editFeedStart(page);
  await button(page, 'Start 5 minutes later').click();

  // Then
  // A minute before now: either side of a minute change while the test runs.
  const capped = [1, 0].map((minutes) => clock(new Date(Date.now() - (minutes + 1) * MINUTE)));
  await expect(page.getByLabel(new RegExp(`^Start (${capped.join('|')})$`))).toBeVisible();
});

test("a running sleep's start can't go before the last sleep's end", async ({ page }) => {
  // Given
  const lastEnd = ago(7);
  await adminFetch('sleep/', {
    method: 'POST',
    body: JSON.stringify({ child: testEnv.childId, start: ago(60), end: lastEnd, nap: true }),
  });
  await runningTimer('molly:sleep', ago(5));
  await signInAs(page, testEnv.parentB, { napWindow: ALL_DAY });

  // When
  await button(page, /^Sleeping since /).click();
  await button(page, 'Start 5 minutes earlier').click();
  await button(page, 'Done').click();

  // Then
  await expect(page.getByRole('status')).toHaveText(`Start moved to ${clock(lastEnd)}`);
  await expect.poll(async () => Date.parse(await serverStart())).toBe(Date.parse(lastEnd));
});

test('a refused start move rolls back and shows a failure toast', async ({ page }) => {
  // Given
  const start = ago(20);
  await runningTimer('molly:feeding', start);
  await signInAs(page, testEnv.parentB);
  await page.route(`${testEnv.baseUrl}/api/timers/*/`, (route) =>
    route.request().method() === 'PATCH'
      ? route.fulfill({ status: 400, json: { start: ['Date/time can not be in the future.'] } })
      : route.continue(),
  );

  // When
  await editFeedStart(page);
  await button(page, 'Start 5 minutes earlier').click();
  await button(page, 'Done').click();

  // Then
  await expect(page.getByRole('status')).toHaveText('Date/time can not be in the future.');
  await expect(button(page, `Feeding since ${clock(start)}. Stop and save`)).toBeVisible();
  expect(Date.parse(await serverStart())).toBe(Date.parse(start));
});
