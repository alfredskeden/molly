import { expect, test, type Page } from '@playwright/test';

import { signInAs } from './session';
import { adminFetch, resetChild, testEnv } from './test-env';

test.beforeEach(resetChild);

/**
 * The day is seeded into yesterday and the browser clock set to a time on it: Baby Buddy refuses entries
 * in the future, so a fixed "today at 23:10" would break whenever the real clock is earlier.
 */
const yesterday = (hours: number, minutes = 0, dayOffset = 0) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1 + dayOffset, hours, minutes);
};

async function seedDay() {
  const child = testEnv.childId;
  const post = (path: string, body: object) => adminFetch(path, { method: 'POST', body: JSON.stringify({ child, ...body }) });
  await post('sleep/', { start: yesterday(19, 30, -1).toISOString(), end: yesterday(6, 40).toISOString(), nap: false });
  await post('feedings/', {
    start: yesterday(8, 0).toISOString(),
    end: yesterday(8, 20).toISOString(),
    type: 'breast milk',
    method: 'left breast',
  });
  await post('sleep/', { start: yesterday(9, 30).toISOString(), end: yesterday(10, 30).toISOString(), nap: true });
  await post('changes/', { time: yesterday(12, 0).toISOString(), wet: true, solid: false });
}

const dateLine = (page: Page, title: string) => page.getByText(new RegExp(`^${title} · `));

test('in the evening the ring is Today from the morning wake', async ({ page }) => {
  // Given
  await seedDay();
  await page.clock.install({ time: yesterday(18, 20) });

  // When
  await signInAs(page, testEnv.parentB);

  // Then
  await expect(dateLine(page, 'Today')).toBeVisible();
  await expect(page.getByText('Day started 06:40', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Nap 09:30 to 10:30, / })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Diaper 12:00, Wet', exact: true })).toBeVisible();
});

test('still awake after the nap window, the day stretches past it', async ({ page }) => {
  // Given
  await seedDay();
  await page.clock.install({ time: yesterday(19, 20) });

  // When
  await signInAs(page, testEnv.parentB);

  // Then
  await expect(dateLine(page, 'Today')).toBeVisible();
  await expect(page.getByLabel('Awake 8h 50m, since the nap', { exact: true })).toBeVisible();
});

test('after bedtime the ring is Tonight, and the moon shows the day', async ({ page }) => {
  // Given
  await seedDay();
  const child = testEnv.childId;
  await adminFetch('sleep/', {
    method: 'POST',
    body: JSON.stringify({ child, start: yesterday(19, 25).toISOString(), end: yesterday(22, 30).toISOString(), nap: false }),
  });
  await adminFetch('feedings/', {
    method: 'POST',
    body: JSON.stringify({
      child,
      start: yesterday(22, 40).toISOString(),
      end: yesterday(22, 55).toISOString(),
      type: 'breast milk',
      method: 'right breast',
    }),
  });
  await page.clock.install({ time: yesterday(23, 10) });

  // When
  await signInAs(page, testEnv.parentB);

  // Then
  await expect(dateLine(page, 'Tonight')).toBeVisible();
  await expect(page.getByText('Bedtime 19:25', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Night sleep 19:25 to 22:30, / })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Feed 22:40, Right, 15 minutes', exact: true })).toBeVisible();

  // When
  await page.getByRole('button', { name: 'Switch to today', exact: true }).click();

  // Then
  await expect(page.getByRole('button', { name: /^Nap 09:30 to 10:30, / })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Diaper 12:00, Wet', exact: true })).toBeVisible();
});
