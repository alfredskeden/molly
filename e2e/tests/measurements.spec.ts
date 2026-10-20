import { expect, test, type Page } from '@playwright/test';

import { openChildSettings, saveChanges, signInAs } from './session';
import { adminFetch, resetChild, testEnv } from './test-env';

type Child = { id: number; slug: string; first_name: string };
type Page_<T> = { results: T[] };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Baby Buddy's date for this many days ago. */
const daysAgo = (days: number) => {
  const date = new Date(Date.now() - days * DAY_MS);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const created: Child[] = [];

test.beforeEach(resetChild);

test.afterEach(async () => {
  for (const child of created.splice(0)) await adminFetch(`children/${child.slug}/`, { method: 'DELETE' });
});

async function logWeight(child: number, grams: number, date: string) {
  await adminFetch('weight/', { method: 'POST', body: JSON.stringify({ child, weight: grams, date }) });
}

async function measurements<T>(path: string, child = testEnv.childId): Promise<T[]> {
  return ((await adminFetch(`${path}/?child=${child}&limit=100`)) as Page_<T>).results;
}

const card = (page: Page) => page.getByLabel('Measurements', { exact: true }).filter({ visible: true });
const row = (page: Page, name: string) => card(page).getByRole('button', { name: new RegExp(`^${name}, `) });
const sheet = (page: Page) => page.getByLabel(/ entry$/).filter({ visible: true });

test('the child screen lists the five measurements; a row opens its screen and Back returns', async ({ page }) => {
  // Given
  await logWeight(testEnv.childId, 7050, daysAgo(5));
  await signInAs(page, testEnv.parentB);
  await openChildSettings(page, 'Test');

  // When
  await expect(row(page, 'Weight')).toContainText('7 050 g');
  for (const name of ['Height', 'Head circumference', 'Temperature', 'BMI']) await expect(row(page, name)).toContainText('None yet');
  await row(page, 'Weight').click();

  // Then
  await expect(page.getByRole('heading', { name: 'Weight', exact: true })).toBeVisible();
  await expect(page.getByLabel('7050 g', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Back to Test' }).click();
  await expect(row(page, 'Weight')).toBeVisible();
});

test('the + on a row logs a weight in grams, and the card shows it', async ({ page }) => {
  // Given
  await logWeight(testEnv.childId, 7000, daysAgo(5));
  await signInAs(page, testEnv.parentB);
  await openChildSettings(page, 'Test');

  // When
  await card(page).getByRole('button', { name: 'Add weight' }).click();
  await expect(sheet(page)).toContainText('Last 7 000 g');
  await sheet(page).getByRole('button', { name: 'Up 10 g' }).click();
  await sheet(page).getByRole('button', { name: 'Up 10 g' }).click();
  await expect(sheet(page)).toContainText('+20 g · steps of 10 g · tap to type');
  await sheet(page).getByRole('button', { name: 'Save weight' }).click();

  // Then
  await expect(sheet(page)).toHaveCount(0);
  await expect(row(page, 'Weight')).toContainText('7 020 g');
  // Dated by Baby Buddy's own today (its time zone, UTC in the test container), so only the value is checked.
  expect(await measurements<{ weight: number }>('weight')).toContainEqual(expect.objectContaining({ weight: 7020 }));
});

test('a typed value saved for yesterday, and a picked date, keep their value and date', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB);
  await openChildSettings(page, 'Test');

  // When
  await card(page).getByRole('button', { name: 'Add height' }).click();
  await sheet(page).getByTestId('measurement-value').fill('65,5');
  await sheet(page).getByRole('radio', { name: 'Yesterday' }).click();
  await sheet(page).getByRole('button', { name: 'Save height' }).click();
  await expect(sheet(page)).toHaveCount(0);
  await card(page).getByRole('button', { name: 'Add head' }).click();
  await sheet(page).getByTestId('measurement-value').fill('42.3');
  await sheet(page).getByRole('radio', { name: 'Pick date' }).click();
  await sheet(page).getByLabel('Date', { exact: true }).fill(daysAgo(10));
  await sheet(page).getByRole('button', { name: 'Save head' }).click();

  // Then
  await expect(sheet(page)).toHaveCount(0);
  expect(await measurements('height')).toContainEqual(expect.objectContaining({ height: 65.5, date: daysAgo(1) }));
  expect(await measurements('head-circumference')).toContainEqual(expect.objectContaining({ head_circumference: 42.3, date: daysAgo(10) }));
});

test('a temperature saves its time', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB);
  await openChildSettings(page, 'Test');
  const earlier = new Date(Date.now() - 2 * 60 * 60_000);
  const clock = `${String(earlier.getHours()).padStart(2, '0')}:${String(earlier.getMinutes()).padStart(2, '0')}`;

  // When
  await card(page).getByRole('button', { name: 'Add reading' }).click();
  await sheet(page).getByTestId('measurement-value').fill('38.4');
  if (earlier.getDate() !== new Date().getDate()) await sheet(page).getByRole('radio', { name: 'Yesterday' }).click();
  await sheet(page).getByLabel('Time', { exact: true }).fill(clock);
  await sheet(page).getByRole('button', { name: 'Save temperature' }).click();

  // Then
  await expect(sheet(page)).toHaveCount(0);
  const [reading] = await measurements<{ temperature: number; time: string }>('temperature');
  expect(reading?.temperature).toBe(38.4);
  expect(Math.abs(Date.parse(reading!.time) - earlier.getTime())).toBeLessThan(60_000);
  await row(page, 'Temperature').click();
  await expect(page.getByText(/^Fever since /)).toBeVisible();
});

test('a failed save shows the error toast and leaves nothing behind', async ({ page }) => {
  // Given
  await page.route('**/api/weight/', (route) => (route.request().method() === 'POST' ? route.fulfill({ status: 500, body: '{}' }) : route.fallback()));
  await signInAs(page, testEnv.parentB);
  await openChildSettings(page, 'Test');

  // When
  await card(page).getByRole('button', { name: 'Add weight' }).click();
  await sheet(page).getByRole('button', { name: 'Save weight' }).click();

  // Then
  await expect(page.getByText(/Nothing was saved/)).toBeVisible();
  await expect(row(page, 'Weight')).toContainText('None yet');
  expect(await measurements('weight')).toHaveLength(0);
});

test("a caregiver without Baby Buddy's height permission sees why, with no +", async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentA);

  // When
  await openChildSettings(page, 'Test');

  // Then
  await expect(row(page, 'Height')).toContainText('Needs permission in Baby Buddy');
  await expect(card(page).getByRole('button', { name: 'Add height' })).toHaveCount(0);
  await expect(card(page).getByRole('button', { name: 'Add weight' })).toBeVisible();
});

test('weight shows the WHO ranges and centile only once girl or boy is set', async ({ page }) => {
  // Given
  await logWeight(testEnv.childId, 6500, daysAgo(40));
  await logWeight(testEnv.childId, 7000, daysAgo(8));
  await signInAs(page, testEnv.parentB);
  await openChildSettings(page, 'Test');
  await row(page, 'Weight').click();
  await expect(page.getByText('Set girl or boy on the child screen to see the WHO ranges')).toBeVisible();
  await expect(page.getByText(/centile/)).toHaveCount(0);

  // When
  await page.getByRole('link', { name: 'Back to Test' }).click();
  await page.getByRole('radio', { name: 'Girl' }).click();
  await saveChanges(page);
  await row(page, 'Weight').click();

  // Then
  await expect(page.getByText('WHO girls', { exact: true })).toBeVisible();
  await expect(page.getByText(/centile/)).toBeVisible();
  await expect(page.getByText(/about \d+ g a week/)).toBeVisible();
});

test('over a year, Since birth widens the weight chart', async ({ page }) => {
  // Given
  const otto = (await adminFetch('children/', {
    method: 'POST',
    body: JSON.stringify({ first_name: 'Otto', last_name: 'Test', birth_date: daysAgo(700) }),
  })) as Child;
  created.push(otto);
  await logWeight(otto.id, 3500, daysAgo(700));
  await logWeight(otto.id, 10500, daysAgo(200));
  await logWeight(otto.id, 12000, daysAgo(10));
  await signInAs(page, testEnv.parentB);
  await openChildSettings(page, 'Otto');
  await row(page, 'Weight').click();
  await expect(page.getByLabel('Weight chart, 2 weights', { exact: true })).toBeVisible();

  // When
  await page.getByRole('radio', { name: 'Since birth' }).click();

  // Then
  await expect(page.getByLabel('Weight chart, 3 weights', { exact: true })).toBeVisible();
  await expect(page.getByText('about', { exact: false })).toContainText('a month');
});
