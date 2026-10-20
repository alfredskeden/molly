import { expect, test, type Page } from '@playwright/test';

import { ALL_DAY, signInAs } from './session';
import { resetChild, testEnv } from './test-env';

test.beforeEach(resetChild);

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

test('tiles are buttons with their plain names, and a feed on the ring reads as one sentence', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { napWindow: ALL_DAY, feedTimer: true });
  await button(page, 'Start feeding').click();
  await page.getByRole('button', { name: /^Stop feed, / }).click();

  // When
  await button(page, 'Left').click();

  // Then
  for (const tile of ['Start sleep', 'Start feeding', 'Diaper', 'Medicine']) await expect(button(page, tile)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Feed \d\d:\d\d, Left, less than a minute$/ })).toBeVisible();
});

test('a running sleep is read as a duration and never as a live region', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { napWindow: ALL_DAY });

  // When
  await button(page, 'Start sleep').click();

  // Then
  const arc = page.getByRole('button', { name: /^Sleeping since \d\d:\d\d, less than a minute\. Edit start$/ });
  await expect(arc).toBeVisible();
  expect(await arc.evaluate((element) => element.closest('[aria-live]'))).toBeNull();
  // Minutes, not the ticking seconds on screen.
  const centre = page.getByLabel(/^Sleeping less than a minute, nap so far$/);
  expect(await centre.evaluate((element) => element.closest('[aria-live]'))).toBeNull();
});
