import { expect, test, type Page } from '@playwright/test';

import { signInAs } from './session';
import { adminFetch, resetChild, testEnv } from './test-env';

/**
 * The day is seeded into yesterday and the browser clock set on it (Baby Buddy refuses entries in the
 * future). The child is made 4 months and a few days old on that day, so the age guide is the 3–5
 * month band: 1h 15m – 2h 05m for the first window of the day, 1h 40m – 2h 30m before bed.
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
  // Specs that don't reset first (onboarding) expect no running timer.
  await resetChild();
});

const post = (path: string, body: object) =>
  adminFetch(path, { method: 'POST', body: JSON.stringify({ child: testEnv.childId, ...body }) });

/** Woke at 06:40 on the day `dayOffset` from yesterday, after a night from 19:30. */
const morning = (dayOffset = 0) =>
  post('sleep/', {
    start: yesterday(19, 30, dayOffset - 1).toISOString(),
    end: yesterday(6, 40, dayOffset).toISOString(),
    nap: false,
  });
const nap = (from: [number, number], to: [number, number], dayOffset = 0) =>
  post('sleep/', { start: yesterday(...from, dayOffset).toISOString(), end: yesterday(...to, dayOffset).toISOString(), nap: true });

const row = (page: Page) => page.getByTestId('window-row');
const ghostLabel = (page: Page, text: string) => page.getByText(text, { exact: true });

/** Starts the browser clock at `time`; it keeps running while the page loads. */
async function clockAt(page: Page, time: Date) {
  await page.clock.install({ time });
}

test('before the window, the row under the ring says when it opens and how soon', async ({ page }) => {
  // Given
  await morning();
  await clockAt(page, yesterday(7, 30));

  // When
  await signInAs(page, testEnv.parentB);

  // Then
  await expect(row(page)).toContainText('Nap 1 likely07:55in 25m');
  await expect(row(page)).toContainText(/Based on age \(4 months\) only · not medical advice/);
});

test('the window shows as a dashed ghost on the ring with how soon it opens, and goes while a sleep runs', async ({ page }) => {
  // Given
  await morning();
  await clockAt(page, yesterday(7, 30));
  await signInAs(page, testEnv.parentB);
  await expect(ghostLabel(page, 'in 25m').first()).toBeVisible();
  await expect(ghostLabel(page, '08:45')).toHaveCount(0);

  // When
  await page.getByRole('button', { name: 'Start sleep', exact: true }).click();

  // Then
  await expect(page.getByRole('button', { name: /^Stop sleep, / })).toBeVisible();
  await expect(ghostLabel(page, 'in 25m')).toHaveCount(0);
  await expect(row(page)).toHaveCount(0);
});

test('the window opens, passes, and is gone 45 minutes after its end', async ({ page }) => {
  // Given
  await morning();
  await clockAt(page, yesterday(8, 0));
  await signInAs(page, testEnv.parentB);
  await expect(row(page)).toContainText('45m left');

  // When
  await page.clock.fastForward('01:00:00');

  // Then
  await expect(row(page)).toContainText('15m ago');

  // When
  await page.clock.fastForward('31:00');

  // Then
  await expect(row(page)).toHaveCount(0);
});

test('with days of history, the row opens where the window came from', async ({ page }) => {
  // Given
  for (const day of [-3, -2, -1]) {
    await morning(day);
    await nap([8, 40], [9, 40], day);
  }
  await morning();
  // Over an hour after the 06:40 wake: before that it's still the night.
  await clockAt(page, yesterday(7, 45));
  await signInAs(page, testEnv.parentB);
  await expect(row(page)).toContainText('Nap 1 likely07:58in 13m');

  // When
  await row(page).click();
  await page.getByRole('button', { name: 'Why this window?', exact: true }).click();

  // Then
  const sheet = page.getByLabel('Why this window', { exact: true });
  await expect(sheet).toContainText('Awake for1h 05m');
  await expect(sheet).toContainText('Usual first wake windowlast 14 days · 3 days1h 40m – 2h 20m');
  await expect(sheet).toContainText('Age guide4 months1h 15m – 2h 05m');
  await expect(sheet).toContainText('Weighted towardsYour logs and age');

  // When
  await page.getByRole('button', { name: 'Done', exact: true }).click();

  // Then
  await expect(sheet).toHaveCount(0);
});

test('in the evening, bedtime is next', async ({ page }) => {
  // Given
  await morning();
  await nap([15, 45], [17, 15]);
  await clockAt(page, yesterday(17, 30));

  // When
  await signInAs(page, testEnv.parentB);

  // Then
  await expect(row(page)).toContainText('Bedtime likely');
  await expect(row(page)).toContainText('18:55–19:45');
  await expect(row(page)).toContainText('in 1h 25m');
  await row(page).click();
  await expect(page.getByRole('button', { name: /^Skip / })).toHaveCount(0);
});

test('while a nap runs the window is the one after it', async ({ page }) => {
  // Given
  await morning();
  await adminFetch('timers/', {
    method: 'POST',
    body: JSON.stringify({ child: testEnv.childId, name: 'molly:sleep', start: yesterday(7, 10).toISOString() }),
  });
  await clockAt(page, yesterday(7, 30));

  // When
  await signInAs(page, testEnv.parentB);

  // Then
  await expect(page.getByRole('button', { name: /^Stop sleep, / })).toBeVisible();
  await expect(row(page)).toContainText('Nap 2 likely');
  await row(page).click();
  await expect(page.getByRole('button', { name: /^Skip / })).toHaveCount(0);
});
