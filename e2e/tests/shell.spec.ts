import { expect, test, type Page } from '@playwright/test';

import { signInAs } from './session';
import { resetChild, testEnv } from './test-env';

test.beforeEach(resetChild);

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

test('an unknown address opens the dashboard, not an unmatched route', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB);
  await expect(button(page, 'Start sleep')).toBeVisible();

  // When
  await page.goto('/no-such-page');

  // Then
  await expect(button(page, 'Start sleep')).toBeVisible();
  await expect(page.getByText('Unmatched Route')).toHaveCount(0);
});

test('an unknown address while signed out opens onboarding', async ({ page }) => {
  // Given
  const signedOut = page;

  // When
  await signedOut.goto('/no-such-page');

  // Then
  await expect(page.getByLabel('Baby Buddy address')).toBeVisible();
});

for (const path of ['/settings', '/recent-days']) {
  test(`reloading ${path}, Back lands on the dashboard`, async ({ page }) => {
    // Given
    await signInAs(page, testEnv.parentB);
    await page.goto(path);

    // When
    await page.getByRole('link', { name: /^Back/ }).filter({ visible: true }).first().click();

    // Then
    await expect(button(page, 'Start sleep')).toBeVisible();
  });
}

test("reloading a child's screen, Back goes to Settings, then the dashboard", async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB);
  await page.goto(`/child/${testEnv.childId}`);

  // When
  await page.getByRole('link', { name: 'Back to Settings' }).filter({ visible: true }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await page.getByRole('link', { name: 'Back', exact: true }).filter({ visible: true }).click();

  // Then
  await expect(button(page, 'Start sleep')).toBeVisible();
});

test('storage that cannot be read ends on onboarding, not on the splash', async ({ page }) => {
  // Given
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error('storage unavailable');
    };
  });

  // When
  await page.goto('/');

  // Then
  await expect(page.getByLabel('Baby Buddy address')).toBeVisible();
});

test('a sheet sits on the bottom of the screen with its own surface', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB);

  // When
  await button(page, 'Add entry').click();

  // Then
  const sheet = page.getByLabel('New entry', { exact: true });
  await expect(sheet).toBeVisible();
  // Polled: the sheet slides in from below.
  await expect
    .poll(async () => Math.round(await sheet.evaluate((node) => node.getBoundingClientRect().bottom)))
    .toBe(page.viewportSize()!.height);
  expect((await sheet.boundingBox())!.y).toBeGreaterThan(0);
  expect(await sheet.evaluate((node) => getComputedStyle(node).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
});

test('a wide browser window shows the app in a centred phone-width column', async ({ page }) => {
  // Given
  await page.setViewportSize({ width: 1280, height: 800 });
  await signInAs(page, testEnv.parentB);

  // When
  await button(page, 'Add entry').click();

  // Then
  const box = (await page.getByLabel('New entry', { exact: true }).boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(520);
  expect(Math.round(box.x + box.width / 2)).toBe(640);
});
