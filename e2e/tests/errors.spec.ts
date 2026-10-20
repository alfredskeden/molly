import { expect, test, type Page } from '@playwright/test';

import { ALL_DAY, signInAs } from './session';
import { adminFetch, resetChild, runningTimers, testEnv } from './test-env';

test.beforeEach(resetChild);


const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const storedCache = (page: Page) => page.evaluate(() => localStorage.getItem('molly.query-cache'));

test("while Baby Buddy can't be reached, the dashboard shows what it saw last, dimmed, and Retry recovers", async ({
  page,
}) => {
  // Given
  await signInAs(page, testEnv.parentB);
  await expect(button(page, 'Start sleep')).toBeVisible();
  // Both timers, entries (sleeps two weeks back included), skips, children and the recent bottles.
  await expect.poll(async () => JSON.parse((await storedCache(page)) ?? '{}').clientState?.queries?.length).toBe(6);
  const api = `${testEnv.baseUrl}/api/**`;
  await page.route(api, (route) => route.abort('connectionrefused'));

  // When
  await page.reload();

  // Then
  await expect(page.getByText(/^Showing what Molly saw (just now|\d+m ago)\. Taps won't save until it's back\.$/)).toBeVisible();
  await button(page, 'Start sleep').click();
  await expect(page.getByRole('status')).toHaveText("Can't reach Baby Buddy. Nothing was saved.");
  expect(await runningTimers()).toEqual([]);
  await page.unroute(api);
  await button(page, 'Retry').click();
  await expect(page.getByText("Can't reach Baby Buddy", { exact: true })).toHaveCount(0);
});

test('a rejected key opens "can\'t sign in", and a new key typed there keeps the address and child', async ({
  page,
}) => {
  // Given
  await signInAs(page, { id: testEnv.parentB.id, token: 'revoked-key' });
  await expect(page.getByRole('heading', { name: "Molly can't sign in to Baby Buddy" })).toBeVisible();

  // When
  await button(page, 'Type the key instead').click();
  await expect(page.getByLabel('Baby Buddy address')).toHaveValue(testEnv.baseUrl);
  await page.getByLabel('API key').fill(testEnv.parentB.token);
  await button(page, 'Connect').click();

  // Then
  await expect(button(page, 'Start sleep')).toBeVisible();
  const stored = await page.evaluate(() => ({
    credentials: JSON.parse(localStorage.getItem('molly.credentials') ?? '{}'),
    settings: JSON.parse(localStorage.getItem('molly.settings') ?? '{}'),
  }));
  expect(stored).toMatchObject({
    credentials: { baseUrl: testEnv.baseUrl, token: testEnv.parentB.token },
    settings: { childId: testEnv.childId },
  });
});

test('stopping a sleep another phone already saved names that entry and offers to edit it', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { napWindow: ALL_DAY });
  await button(page, 'Start sleep').click();
  await expect(page.getByRole('button', { name: /^Stop sleep, / })).toBeVisible();
  await expect.poll(async () => (await runningTimers()).length).toBe(1);
  const [timer] = await runningTimers();
  await adminFetch('sleep/', { method: 'POST', body: JSON.stringify({ timer: timer!.id, nap: true }) });

  // When
  await page.getByRole('button', { name: /^Stop sleep, / }).click();

  // Then
  await expect(page.getByRole('status')).toHaveText('Already stopped on another phone');
  await expect(page.getByText(/^Nap saved there · \d+m, ended (just now|\d+m ago)$/)).toBeVisible();
  await button(page, 'Edit').click();
  await expect(page.getByLabel('Edit Nap', { exact: true })).toBeVisible();
});
