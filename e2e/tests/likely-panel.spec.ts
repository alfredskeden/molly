import { expect, test, type Page } from '@playwright/test';

import { signInAs } from './session';
import { adminFetch, resetChild, testEnv } from './test-env';

/**
 * The likely-sleep panel (plans/implan-nap-detail). As in day-plan.spec: the day is seeded into yesterday,
 * the browser clock set on it, and the child is 4 months and a few days old, so every window comes from the
 * age guide. Woke 06:40, napped 08:40–09:25; at 10:50 nap 2 is open, then nap 3, nap 4 and bedtime 18:59.
 */
const yesterday = (hours: number, minutes = 0, dayOffset = 0) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1 + dayOffset, hours, minutes);
};
const isoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

let childSlug: string;
let seededBirthDate: string;

test.beforeEach(async () => {
  await resetChild();
  const children = (await adminFetch('children/')) as { results: { id: number; slug: string; birth_date: string }[] };
  const child = children.results.find((candidate) => candidate.id === testEnv.childId)!;
  childSlug = child.slug;
  seededBirthDate = child.birth_date;
  const day = yesterday(12);
  const born = new Date(day.getFullYear(), day.getMonth() - 4, day.getDate() - 5);
  await adminFetch(`children/${childSlug}/`, { method: 'PATCH', body: JSON.stringify({ birth_date: isoDate(born) }) });
});

test.afterEach(async () => {
  await adminFetch(`children/${childSlug}/`, { method: 'PATCH', body: JSON.stringify({ birth_date: seededBirthDate }) });
  await resetChild();
});

const post = (path: string, body: object) =>
  adminFetch(path, { method: 'POST', body: JSON.stringify({ child: testEnv.childId, ...body }) });

async function morning() {
  await post('sleep/', { start: yesterday(19, 30, -1).toISOString(), end: yesterday(6, 40).toISOString(), nap: false });
  await post('sleep/', { start: yesterday(8, 40).toISOString(), end: yesterday(9, 25).toISOString(), nap: true });
}

async function openAt(page: Page, hours: number, minutes: number) {
  await page.clock.install({ time: new Date(yesterday(hours, minutes).getTime() + 1_000) });
  await signInAs(page, testEnv.parentB);
}

const row = (page: Page) => page.getByTestId('window-row');
const button = (page: Page, name: string | RegExp) => page.getByRole('button', { name, exact: typeof name === 'string' });
const panel = (page: Page, title: string) => page.getByLabel(title, { exact: true });
const sleepTile = (page: Page) => page.getByRole('button', { name: /^Start sleep/ }).first();

test('the row opens the panel for the next nap in place of the row and tiles', async ({ page }) => {
  // Given
  await morning();
  await openAt(page, 10, 50);

  // When
  await row(page).click();

  // Then
  const nap2 = panel(page, 'Nap 2 likely');
  await expect(nap2).toBeVisible();
  await expect(nap2).toContainText('1h 5m left');
  await expect(nap2).toContainText('Then nap 3');
  await expect(nap2).toContainText('Bedtime18:59');
  await expect(nap2).toContainText('Later times shift as you log · Based on age (4 months) only · not medical advice');
  await expect(row(page)).toHaveCount(0);
  await expect(button(page, /^Feed|^Start feeding/)).toHaveCount(0);
  await expect(button(page, /^Remind me/)).toHaveCount(0);
});

test('a later ghost opens its own panel, without Why or Skip, and a second tap closes it', async ({ page }) => {
  // Given
  await morning();
  await openAt(page, 10, 50);

  // When
  await button(page, /^Nap 3 likely \d\d:\d\d to \d\d:\d\d$/).click();

  // Then
  const nap3 = panel(page, 'Nap 3 likely');
  await expect(nap3).toContainText('in 2h 28m');
  await expect(nap3).not.toContainText('Then nap 3');
  await expect(button(page, 'Why this window?')).toHaveCount(0);
  await expect(button(page, /^Skip /)).toHaveCount(0);
  await expect(button(page, /^Nap 3 likely /)).toHaveAttribute('aria-expanded', 'true');

  // When
  await button(page, /^Nap 3 likely /).click();

  // Then
  await expect(nap3).toHaveCount(0);
  await expect(row(page)).toBeVisible();
});

test('Close, Today and Add each bring the tiles back', async ({ page }) => {
  // Given
  await morning();
  await openAt(page, 10, 50);

  // When
  await row(page).click();
  await button(page, 'Close').click();

  // Then
  await expect(panel(page, 'Nap 2 likely')).toHaveCount(0);
  await expect(row(page)).toBeVisible();

  // When
  await row(page).click();
  await button(page, 'Today').click();
  await page.getByLabel('Today', { exact: true }).getByRole('button', { name: 'Close', exact: true }).first().click();

  // Then
  await expect(panel(page, 'Nap 2 likely')).toHaveCount(0);
  await expect(row(page)).toBeVisible();

  // When
  await row(page).click();
  await button(page, 'Add entry').click();
  await page.getByRole('button', { name: 'Close', exact: true }).first().click();

  // Then
  await expect(panel(page, 'Nap 2 likely')).toHaveCount(0);
  await expect(row(page)).toBeVisible();
});

test('Why opens where the window came from', async ({ page }) => {
  // Given
  await morning();
  await openAt(page, 10, 50);
  await row(page).click();

  // When
  await button(page, 'Why this window?').click();

  // Then
  await expect(page.getByLabel('Why this window', { exact: true })).toContainText('Age guide');
});

test('Skip from the panel skips the next nap and closes the panel', async ({ page }) => {
  // Given
  await morning();
  await openAt(page, 10, 50);
  await row(page).click();

  // When
  await button(page, 'Skip nap 2').click();

  // Then
  await expect(page.getByRole('status')).toHaveText(/^Nap skipped/);
  await expect(button(page, 'Undo')).toBeVisible();
  await expect(panel(page, 'Nap 2 likely')).toHaveCount(0);
  await expect(row(page)).toBeVisible();
});

test('bedtime has no Skip', async ({ page }) => {
  // Given
  await morning();
  await openAt(page, 10, 50);

  // When
  await button(page, /^Bedtime likely /).click();

  // Then
  await expect(panel(page, 'Bedtime likely')).toBeVisible();
  await expect(button(page, /^Skip /)).toHaveCount(0);
});

test('Start sleep from the panel starts the sleep and closes the panel', async ({ page }) => {
  // Given
  await morning();
  await openAt(page, 10, 50);
  await row(page).click();

  // When
  await panel(page, 'Nap 2 likely').getByRole('button', { name: 'Start sleep', exact: true }).click();

  // Then
  await expect(button(page, /^Stop sleep, /)).toBeVisible();
  await expect(panel(page, 'Nap 2 likely')).toHaveCount(0);
  await expect(sleepTile(page)).toHaveCount(0);
});
