import { expect, test, type Page } from '@playwright/test';

import { ALL_DAY, signInAs } from './session';
import { adminFetch, latest, resetChild, testEnv } from './test-env';

test.beforeEach(resetChild);

const MINUTE = 60_000;
const button = (page: Page, name: string | RegExp) =>
  page.getByRole('button', typeof name === 'string' ? { name, exact: true } : { name });
const minutesAgo = (iso: string) => Math.round((Date.now() - Date.parse(iso)) / MINUTE);

async function medicationCount() {
  return ((await adminFetch(`medication/?child=${testEnv.childId}&limit=1`)) as { count: number }).count;
}

async function vitaminD(page: Page) {
  await button(page, 'Medicine').click();
  await button(page, 'Vitamin D').click();
}

test('Vitamin D logs from the Medicine picker and shows on the ring and its tile', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { napWindow: ALL_DAY });

  // When
  await vitaminD(page);

  // Then
  await expect(page.getByRole('status')).toHaveText('Vitamin D saved');
  await expect(button(page, 'Adjust time')).toBeVisible();
  await expect.poll(() => latest('medication')).toMatchObject({ name: 'Vitamin D', dosage: null, dosage_unit: '' });
  await expect(button(page, /^Vitamin D \d\d:\d\d$/)).toBeVisible();
  await expect(button(page, 'Medicine').getByText('just now', { exact: true })).toBeVisible();
});

test("Adjust time after Vitamin D moves the entry's time", async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB);
  await vitaminD(page);
  await expect(page.getByRole('status')).toHaveText('Vitamin D saved');

  // When
  await button(page, 'Adjust time').click();
  await expect(page.getByText('When was it?')).toBeVisible();
  await page.getByRole('radio', { name: '30m', exact: true }).click();
  await button(page, 'Set time').click();

  // Then
  await expect(page.getByRole('status')).toHaveText(/^Time set to \d\d:\d\d$/);
  const medication = await latest<{ time: string }>('medication');
  expect(minutesAgo(medication!.time)).toBe(30);
});

test('with no medicine logged the tile says not yet', async ({ page }) => {
  // When
  await signInAs(page, testEnv.parentB, { napWindow: ALL_DAY });

  // Then
  await expect(button(page, 'Medicine').getByText('not yet', { exact: true })).toBeVisible();
});

test('a refused medicine log rolls back and shows a failure toast', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { napWindow: ALL_DAY });
  await expect(button(page, 'Medicine').getByText('not yet', { exact: true })).toBeVisible();
  await page.route(`${testEnv.baseUrl}/api/**`, (route) => route.abort('connectionrefused'));

  // When
  await vitaminD(page);

  // Then
  await expect(page.getByText("Can't reach Baby Buddy. Nothing was saved.")).toBeVisible();
  await expect(button(page, 'Medicine').getByText('not yet', { exact: true })).toBeVisible();
  await expect(button(page, /^Vitamin D \d\d:\d\d$/)).toHaveCount(0);
  expect(await medicationCount()).toBe(0);
});
