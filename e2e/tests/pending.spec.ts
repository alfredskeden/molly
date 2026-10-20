import { expect, test, type Page } from '@playwright/test';

import { ALL_DAY, signInAs } from './session';
import { adminFetch, latest, resetChild, testEnv } from './test-env';

test.beforeEach(resetChild);

const MINUTE = 60_000;
const ago = (minutes: number) => new Date(Date.now() - minutes * MINUTE).toISOString();
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const child = testEnv.childId;

/** Holds Baby Buddy's answers to `method` requests on `path` for `ms`, counting the requests. */
async function slow(page: Page, path: string, method: string, ms = 1500) {
  const sent = { count: 0 };
  await page.route(`${testEnv.baseUrl}/api/${path}`, async (route) => {
    if (route.request().method() !== method) return route.continue();
    sent.count += 1;
    await new Promise((resolve) => setTimeout(resolve, ms));
    await route.continue();
  });
  return sent;
}

/** Spinner, pending words, busy for screen readers, and further taps ignored. */
async function expectPending(page: Page, label: string) {
  const pending = button(page, label);
  await expect(pending).toBeVisible();
  await expect(pending).toHaveAttribute('aria-busy', 'true');
  await expect(pending).toBeDisabled();
  await expect(pending.getByRole('progressbar')).toBeVisible();
  await pending.click({ force: true });
}

async function openDiaper(page: Page) {
  await adminFetch('changes/', { method: 'POST', body: JSON.stringify({ child, time: ago(30), wet: true, solid: false }) });
  await signInAs(page, testEnv.parentB, { napWindow: ALL_DAY });
  await page.getByRole('button', { name: /^Diaper \d\d:\d\d, Wet$/ }).click();
  await expect(button(page, 'Done')).toBeVisible();
}

test("the editor's Done says Saving… while its save is on its way, and a second tap sends nothing", async ({ page }) => {
  // Given
  await openDiaper(page);
  const saves = await slow(page, 'changes/*/', 'PATCH');

  // When
  await page.getByRole('radio', { name: 'Both', exact: true }).click();
  await button(page, 'Done').click();

  // Then
  await expectPending(page, 'Saving…');
  await expect(page.getByRole('status')).toHaveText('Changes saved');
  expect(saves.count).toBe(1);
  expect(await latest('changes')).toMatchObject({ wet: true, solid: true });
});

test("the editor's Delete says Deleting… while its delete is on its way, and a second tap sends nothing", async ({ page }) => {
  // Given
  await openDiaper(page);
  const deletes = await slow(page, 'changes/*/', 'DELETE');

  // When
  await button(page, 'Delete').click();
  await button(page, 'Tap again to delete').click();

  // Then
  await expectPending(page, 'Deleting…');
  await expect(page.getByRole('status')).toHaveText('Entry deleted');
  expect(deletes.count).toBe(1);
});

test('Set time says Saving… while the new time is on its way, and a second tap sends nothing', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB);
  await button(page, 'Diaper').click();
  await button(page, 'Wet').click();
  await expect(page.getByRole('status')).toHaveText('Diaper saved · Wet');
  await button(page, 'Adjust time').click();
  await page.getByRole('radio', { name: '15m', exact: true }).click();
  const adjusts = await slow(page, 'changes/*/', 'PATCH');

  // When
  await button(page, 'Set time').click();

  // Then
  await expectPending(page, 'Saving…');
  await expect(page.getByRole('status')).toHaveText(/^Time set to \d\d:\d\d$/);
  expect(adjusts.count).toBe(1);
});

test('Load 3 more days says Loading… with the same pending look', async ({ page }) => {
  // Given
  await adminFetch('changes/', { method: 'POST', body: JSON.stringify({ child, time: ago(30), wet: true, solid: false }) });
  await signInAs(page, testEnv.parentB);
  await page.goto('/recent-days');
  await expect(button(page, 'Load 3 more days')).toBeVisible();
  await slow(page, '**', 'GET');

  // When
  await button(page, 'Load 3 more days').click();

  // Then
  await expectPending(page, 'Loading…');
});

test('Connect says Checking… with the same pending look', async ({ page }) => {
  // Given
  await page.goto('/');
  await page.getByLabel('Baby Buddy address').fill(testEnv.baseUrl);
  await page.getByLabel('API key').fill(testEnv.parentA.token);
  await slow(page, 'profile', 'GET');

  // When
  await button(page, 'Connect').click();

  // Then
  await expectPending(page, 'Checking…');
  await expect(page.getByText('Before you start')).toBeVisible();
});
