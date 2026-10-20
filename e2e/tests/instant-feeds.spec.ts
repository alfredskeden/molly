import { expect, test, type Page } from '@playwright/test';

import { ALL_DAY, signInAs } from './session';
import { adminFetch, latest, resetChild, runningTimers, testEnv } from './test-env';

test.beforeEach(resetChild);

type Feeding = { start: string; end: string; type: string; method: string; amount: number | null };

const MINUTE = 60_000;
const button = (page: Page, name: string | RegExp) =>
  page.getByRole('button', typeof name === 'string' ? { name, exact: true } : { name });
const ago = (minutes: number) => new Date(Date.now() - minutes * MINUTE).toISOString();
const lengthOf = (feeding: Feeding) => Date.parse(feeding.end) - Date.parse(feeding.start);
const minutesAgo = (iso: string) => Math.round((Date.now() - Date.parse(iso)) / MINUTE);

async function seedBottle(amount: number, type = 'breast milk') {
  await adminFetch('feedings/', {
    method: 'POST',
    body: JSON.stringify({ child: testEnv.childId, start: ago(200), end: ago(190), type, method: 'bottle', amount }),
  });
}

test('Feed then Left saves a minute-long feed at once, with no timer', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { napWindow: ALL_DAY });

  // When
  await button(page, 'Feed').click();
  await button(page, 'Left').click();

  // Then
  await expect(page.getByRole('status')).toHaveText(/^Feed saved · Left$/);
  await expect(button(page, 'Adjust time')).toBeVisible();
  await expect(button(page, 'Edit')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Feed \d\d:\d\d, Left, / })).toBeVisible();
  const saved = await latest<Feeding>('feedings');
  expect(saved).toMatchObject({ method: 'left breast', type: 'breast milk' });
  expect(lengthOf(saved!)).toBe(MINUTE);
  expect(await runningTimers()).toEqual([]);
});

test('Bottle starts at the last bottle, and +5 twice saves that amount with its type', async ({ page }) => {
  // Given
  await seedBottle(130);
  await signInAs(page, testEnv.parentB, { napWindow: ALL_DAY });
  await button(page, 'Feed').click();
  await button(page, 'Bottle').click();
  await expect(page.getByLabel('Amount 130 millilitres', { exact: true })).toBeVisible();

  // When
  await button(page, 'More: +5 ml').click();
  await button(page, 'More: +5 ml').click();
  await button(page, 'Save 140 millilitres').click();

  // Then
  await expect(page.getByRole('status')).toHaveText(/^Feed saved · Bottle 140 ml$/);
  expect(await latest<Feeding>('feedings')).toMatchObject({ method: 'bottle', type: 'breast milk', amount: 140 });
});

test('a typed amount is the one saved', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { napWindow: ALL_DAY });
  await button(page, 'Feed').click();
  await button(page, 'Bottle').click();

  // When
  await page.getByTestId('bottle-amount').fill('95');
  await page.getByTestId('bottle-amount').blur();
  await button(page, 'Save 95 millilitres').click();

  // Then
  await expect.poll(() => latest<Feeding>('feedings')).toMatchObject({ method: 'bottle', amount: 95 });
});

test('Adjust time moves the whole instant feed, still a minute long', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { napWindow: ALL_DAY });
  await button(page, 'Feed').click();
  await button(page, 'Right').click();
  await expect(page.getByRole('status')).toHaveText(/^Feed saved · Right$/);

  // When
  await button(page, 'Adjust time').click();
  await page.getByRole('radio', { name: '15m', exact: true }).click();
  await button(page, 'Set time').click();

  // Then
  await expect(page.getByRole('status')).toHaveText(/^Time set to \d\d:\d\d$/);
  const moved = await latest<Feeding>('feedings');
  expect(minutesAgo(moved!.end)).toBe(15);
  expect(lengthOf(moved!)).toBe(MINUTE);
});

test("a feed timer from the other phone shows and stops as always, whatever this phone's setting", async ({ page }) => {
  // Given
  await adminFetch('timers/', { method: 'POST', body: JSON.stringify({ child: testEnv.childId, name: 'molly:feeding', start: ago(12) }) });
  await signInAs(page, testEnv.parentB, { napWindow: ALL_DAY });

  // When
  await button(page, /^Stop feed, /).click();
  await button(page, 'Left').click();

  // Then
  await expect(page.getByRole('status')).toHaveText(/^Feed saved · Left · 12m$/);
  expect(await runningTimers()).toEqual([]);
});

test('Time feeds on: Feed starts a timer again', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { napWindow: ALL_DAY, feedTimer: true });

  // When
  await button(page, 'Start feeding').click();

  // Then
  await expect(button(page, /^Stop feed, /)).toBeVisible();
  await expect.poll(async () => (await runningTimers()).map((timer) => timer.name)).toEqual(['molly:feeding']);
});

test('the Time feeds switch in Settings turns the Feed tile into a timer', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { napWindow: ALL_DAY });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();

  // When
  await page.getByRole('switch', { name: 'Time feeds' }).filter({ visible: true }).click();
  await page.getByRole('button', { name: 'Save changes', exact: true }).filter({ visible: true }).click();
  await page.getByRole('link', { name: 'Back', exact: true }).filter({ visible: true }).click();

  // Then
  await expect(button(page, 'Start feeding')).toBeVisible();
});

test('Add entry: a finished bottle saves the amount on its row', async ({ page }) => {
  // Given
  await seedBottle(110, 'formula');
  await signInAs(page, testEnv.parentB, { napWindow: ALL_DAY });
  await button(page, 'Add entry').click();
  const sheet = page.getByLabel('New entry', { exact: true });
  await sheet.getByRole('radio', { name: 'Feed', exact: true }).click();
  await button(page, 'Start 5 minutes earlier').click();
  await button(page, 'Add end time').click();
  await sheet.getByRole('radio', { name: 'Bottle', exact: true }).click();

  // When
  await button(page, 'Less: −5 ml').click();
  await button(page, 'Save feed').click();

  // Then
  await expect.poll(() => latest<Feeding>('feedings')).toMatchObject({ method: 'bottle', type: 'formula', amount: 105 });
});
