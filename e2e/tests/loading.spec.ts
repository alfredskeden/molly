import { expect, test, type Page } from '@playwright/test';

import { ALL_DAY, signInAs, signOutFromSettings } from './session';
import { latest, resetChild, testEnv } from './test-env';

test.beforeEach(resetChild);

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const storedCache = (page: Page) => page.evaluate(() => localStorage.getItem('molly.query-cache'));

/** Holds every read from Baby Buddy until the returned function is called. Writes go through. */
async function holdReads(page: Page) {
  let release = () => {};
  const released = new Promise<void>((resolve) => (release = resolve));
  await page.route(`${testEnv.baseUrl}/api/**`, async (route) => {
    if (route.request().method() === 'GET') await released;
    await route.continue();
  });
  return release;
}

test('a cold load shows the skeleton only after a moment, and a diaper can be logged meanwhile', async ({ page }) => {
  // Given
  const release = await holdReads(page);
  await signInAs(page, testEnv.parentB);
  await expect(button(page, 'Diaper')).toBeVisible();
  await expect(page.getByTestId('skeleton-ring')).toHaveCount(0);
  await expect(page.getByTestId('skeleton-ring')).toBeVisible();
  await expect(page.getByTestId('skeleton-sleep')).toBeVisible();
  await expect(button(page, 'Start sleep')).toHaveCount(0);

  // When
  await button(page, 'Diaper').click();
  await button(page, 'Wet').click();

  // Then
  await expect(page.getByRole('status')).toHaveText(/^Diaper saved · /);
  release();
  await expect(button(page, 'Start sleep')).toBeVisible();
  await expect(page.getByTestId('skeleton-ring')).toHaveCount(0);
  await expect.poll(() => latest('changes')).toMatchObject({ wet: true, solid: false });
});

test('a reload shows the cached dashboard at once, without a skeleton', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { napWindow: ALL_DAY });
  await button(page, 'Diaper').click();
  await button(page, 'Wet').click();
  const row = page.getByRole('button', { name: /^Diaper \d\d:\d\d, Wet$/ });
  await expect(row).toBeVisible();
  await expect.poll(() => storedCache(page)).toContain('"wet":true');
  await holdReads(page);

  // When
  await page.reload();

  // Then
  await expect(row).toBeVisible();
  await expect(button(page, 'Start sleep')).toBeVisible();
  // Past the skeleton delay, with every read still held.
  await page.waitForTimeout(500);
  await expect(page.getByTestId('skeleton-ring')).toHaveCount(0);
});

test('signing out removes the cached dashboard from the device', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB);
  await expect(button(page, 'Start sleep')).toBeVisible();
  await expect.poll(() => storedCache(page)).not.toBeNull();

  // When
  await signOutFromSettings(page);

  // Then
  await expect.poll(() => storedCache(page)).toBeNull();
});
