import { expect, test, type Page } from '@playwright/test';

import { ALL_DAY, signInAs } from './session';
import { latest, resetChild, testEnv } from './test-env';

type Change = { wet: boolean; solid: boolean };

test.beforeEach(resetChild);

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
// The design's fixed picture colours (src/theme/RibbonIcon.tsx): the drop's water, the poop's brown, the mother's skin.
const water = 'path[fill="#5eb6e6"]';
const brown = 'ellipse[fill="#a67351"]';
const skin = 'path[fill="#efccb6"]';

test("Ribbon's Diaper picker shows each diaper's picture, and Wet still logs a wet diaper", async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { look: 'ribbon', theme: 'day', napWindow: ALL_DAY });

  // When
  await button(page, 'Diaper').click();

  // Then
  await expect(button(page, 'Wet').locator(water)).toHaveCount(1);
  await expect(button(page, 'Wet').locator(brown)).toHaveCount(0);
  await expect(button(page, 'Dirty').locator(water)).toHaveCount(0);
  await expect(button(page, 'Dirty').locator(brown)).not.toHaveCount(0);
  await expect(button(page, 'Both').locator(water)).toHaveCount(1);
  await expect(button(page, 'Both').locator(brown)).not.toHaveCount(0);

  // And
  await button(page, 'Wet').click();
  await expect(page.getByRole('status')).toHaveText(/^Diaper saved · /);
  await expect.poll(() => latest<Change>('changes')).toMatchObject({ wet: true, solid: false });
});

test("Ribbon's Feed picker shows the nursing mother on the breasts and not on Bottle", async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { look: 'ribbon', theme: 'day', napWindow: ALL_DAY });

  // When
  await button(page, 'Feed').click();

  // Then
  await expect(button(page, 'Left').locator(skin)).not.toHaveCount(0);
  await expect(button(page, 'Right').locator(skin)).not.toHaveCount(0);
  await expect(button(page, 'Both breasts').locator(skin)).not.toHaveCount(0);
  await expect(button(page, 'Bottle').locator(skin)).toHaveCount(0);
});

test("Classic's Diaper picker draws no Ribbon pictures", async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { look: 'classic', theme: 'day', napWindow: ALL_DAY });

  // When
  await button(page, 'Diaper').click();

  // Then
  await expect(button(page, 'Wet')).toBeVisible();
  await expect(page.locator(`${water}, ${brown}`)).toHaveCount(0);
});
