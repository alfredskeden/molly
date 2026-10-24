import { expect, test, type Page } from '@playwright/test';

import { openChildSettings, signInAs } from './session';
import { adminFetch, latest, resetChild, testEnv } from './test-env';

test.beforeEach(resetChild);

/**
 * Days and nights by the child's rhythm (plans/implan-day-night). The days are seeded up to yesterday and the
 * browser clock set on yesterday, as Baby Buddy refuses entries in the future.
 */
const yesterday = (hours: number, minutes = 0, dayOffset = 0) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1 + dayOffset, hours, minutes);
};
const post = (path: string, body: object) =>
  adminFetch(path, { method: 'POST', body: JSON.stringify({ child: testEnv.childId, ...body }) });
const pad = (value: number) => String(value).padStart(2, '0');
const clock = (time: Date) => `${pad(time.getHours())}:${pad(time.getMinutes())}`;
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const sheet = (page: Page) => page.getByLabel('New entry', { exact: true });

/** The days before yesterday: asleep at `bed`, up at `wake` the next morning, with these naps. */
async function seedUsualDays(bed: [number, number], wake: [number, number], naps: [[number, number], [number, number]][]) {
  for (const back of [-5, -4, -3, -2]) {
    await post('sleep/', { start: yesterday(...bed, back - 1).toISOString(), end: yesterday(...wake, back).toISOString(), nap: false });
    for (const [from, to] of naps) {
      await post('sleep/', { start: yesterday(...from, back).toISOString(), end: yesterday(...to, back).toISOString(), nap: true });
    }
  }
}

/** Starts the browser clock just after `time`, as the clock runs on while the page loads. */
async function clockAt(page: Page, time: Date) {
  await page.clock.install({ time: new Date(time.getTime() + 1_000) });
}

/** Saves a finished sleep through Add entry, typed as clock times. */
async function addSleep(page: Page, from: Date, to: Date) {
  await button(page, 'Add entry').click();
  const typed = async (label: 'Start' | 'End', time: Date) => {
    const input = sheet(page).getByLabel(label, { exact: true });
    await input.fill(clock(time));
    await input.blur();
  };
  await typed('Start', from);
  await button(page, 'Add end time').click();
  await typed('End', to);
  await button(page, 'Save sleep').click();
  await expect(page.getByRole('status')).toHaveText(/^Sleep saved · /);
}

test('an evening catnap well before the usual bedtime saves as a nap', async ({ page }) => {
  // Given
  await seedUsualDays([21, 45], [7, 0], [[[9, 0], [10, 0]], [[13, 0], [14, 30]]]);
  await post('sleep/', { start: yesterday(21, 45, -1).toISOString(), end: yesterday(7, 0).toISOString(), nap: false });
  await clockAt(page, yesterday(20, 30));
  await signInAs(page, testEnv.parentB);
  await expect(page.getByText('Day started 07:00', { exact: true })).toBeVisible();

  // When
  await addSleep(page, yesterday(19, 30), yesterday(19, 55));

  // Then
  expect(await latest('sleep')).toMatchObject({ nap: true });
});

test('a sleep after an early wake saves as a nap, and the day starts at the wake', async ({ page }) => {
  // Given
  // Usually up at 08:10; a setting whose day starts at 08:30, so by the clock the 08:15 sleep would be the night.
  await seedUsualDays([21, 0], [8, 10], [[[9, 40], [10, 40]], [[13, 30], [14, 30]]]);
  await post('sleep/', { start: yesterday(20, 58, -1).toISOString(), end: yesterday(6, 31).toISOString(), nap: false });
  await clockAt(page, yesterday(10, 40));
  await signInAs(page, testEnv.parentB, { napWindow: { start: '08:30', end: '20:00' } });
  await expect(page.getByText('Day started 06:31', { exact: true })).toBeVisible();

  // When
  await addSleep(page, yesterday(8, 15), yesterday(10, 26));

  // Then
  expect(await latest('sleep')).toMatchObject({ nap: true });
  await expect(page.getByText('Day started 06:31', { exact: true })).toBeVisible();
});

test('the child screen calls Day starts and Day ends starting values', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB);

  // When
  await openChildSettings(page, 'Test');

  // Then
  await expect(page.getByText(/^Molly learns when this child usually wakes up and goes to bed\./).filter({ visible: true })).toBeVisible();
  await expect(page.getByLabel('Day starts 07:00', { exact: true }).filter({ visible: true })).toBeVisible();
});
