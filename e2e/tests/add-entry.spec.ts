import { expect, test, type Page } from '@playwright/test';

import { ALL_DAY, signInAs } from './session';
import { adminFetch, latest, resetChild, runningTimers, testEnv } from './test-env';

test.beforeEach(resetChild);

const button = (page: Page, name: string | RegExp) =>
  page.getByRole('button', typeof name === 'string' ? { name, exact: true } : { name });
const pad = (value: number) => String(value).padStart(2, '0');
const clock = (time: Date | string) => {
  const date = new Date(time);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000);
const sheet = (page: Page) => page.getByLabel('New entry', { exact: true });
const note = (page: Page) => sheet(page).getByText(/^(No end time|Saved|Start is|End |Write what)/);

async function openAdd(page: Page) {
  await signInAs(page, testEnv.parentB, { napWindow: ALL_DAY });
  await button(page, 'Add entry').click();
  await expect(sheet(page)).toBeVisible();
}

async function typeClockTime(page: Page, label: 'Start' | 'End' | 'Time', time: Date) {
  const input = sheet(page).getByLabel(label, { exact: true });
  await input.fill(clock(time));
  await input.blur();
}

test('1j: a sleep with no end starts a sleep timer backdated to its start', async ({ page }) => {
  // Given
  await openAdd(page);
  const start = ago(50);

  // When
  await typeClockTime(page, 'Start', start);

  // Then
  await expect(note(page)).toHaveText(/^No end time, so a sleep timer starts (49|50)m ago\. Add an end to save it as finished\.$/);

  // When
  await button(page, 'Start sleep timer').click();

  // Then
  await expect(page.getByRole("status")).toHaveText(/^Sleep started (49|50)m ago$/);
  await expect(sheet(page)).toHaveCount(0);
  await expect(button(page, /^Stop sleep, (49|50) minutes$/)).toBeVisible();
  const [timer] = await runningTimers();
  expect(clock((await adminFetch(`timers/${timer!.id}/`)).start)).toBe(clock(start));
});

test('a feed with an end saves as finished, with the side chosen', async ({ page }) => {
  // Given
  await openAdd(page);
  await sheet(page).getByRole('radio', { name: 'Feed', exact: true }).click();
  await typeClockTime(page, 'Start', ago(40));
  await button(page, 'Add end time').click();
  await typeClockTime(page, 'End', ago(20));

  // When
  await sheet(page).getByRole('radio', { name: 'Right', exact: true }).click();
  await expect(note(page)).toHaveText('Saved as a finished feed, 20m. No timer.');
  await button(page, 'Save feed').click();

  // Then
  await expect(page.getByRole('status')).toHaveText(/^Feed saved · Right · 20m$/);
  expect(await latest('feedings')).toMatchObject({ method: 'right breast', type: 'breast milk' });
  expect(await runningTimers()).toEqual([]);
});

test('a finished sleep saves as a nap by the nap window', async ({ page }) => {
  // Given
  await openAdd(page);
  await typeClockTime(page, 'Start', ago(90));
  await button(page, 'Add end time').click();

  // When
  await button(page, 'Save sleep').click();

  // Then
  await expect(page.getByRole('status')).toHaveText(/^Sleep saved · 30m$/);
  expect(await latest('sleep')).toMatchObject({ nap: true });
});

test('an end before the start, or in the future, is refused in danger and Save does nothing', async ({ page }) => {
  // Given
  await openAdd(page);
  await typeClockTime(page, 'Start', ago(30));
  await button(page, 'Add end time').click();

  // When
  await typeClockTime(page, 'End', ago(40));

  // Then
  await expect(note(page)).toHaveText('End must be after start');

  // When
  await button(page, 'Save sleep').click();

  // Then
  await expect(sheet(page)).toBeVisible();
  expect(await latest('sleep')).toBeUndefined();

  // When
  await typeClockTime(page, 'End', new Date(Date.now() + 10 * 60_000));

  // Then: a later clock time means yesterday, so the end is before the start
  await expect(note(page)).toHaveText('End must be after start');
});

test('a start in the future is refused', async ({ page }) => {
  // Given
  await openAdd(page);

  // When
  await sheet(page).getByRole('button', { name: 'Start 5 minutes later' }).click();

  // Then
  await expect(note(page)).toHaveText('Start is in the future');
});

test('a typed time later than now means that time yesterday', async ({ page }) => {
  // Given
  await openAdd(page);
  await sheet(page).getByRole('radio', { name: 'Diaper', exact: true }).click();
  const later = new Date(Date.now() + 10 * 60_000);

  // When
  await typeClockTime(page, 'Time', later);
  await button(page, 'Save diaper').click();

  // Then
  await expect(page.getByRole('status')).toHaveText('Diaper saved · Wet');
  const saved = new Date((await latest<{ time: string }>('changes'))!.time);
  expect(clock(saved)).toBe(clock(later));
  expect(Date.now() - saved.getTime()).toBeGreaterThan(23 * 60 * 60_000);
});

test('another medicine needs a name, and Vitamin D takes an optional note', async ({ page }) => {
  // Given
  await openAdd(page);
  await sheet(page).getByRole('radio', { name: 'Medicine', exact: true }).click();
  await sheet(page).getByRole('radio', { name: 'Other', exact: true }).click();

  // When
  await button(page, 'Save medicine').click();

  // Then
  await expect(note(page)).toHaveText('Write what was given');
  expect(await latest('medication')).toBeUndefined();

  // When
  await sheet(page).getByLabel('What was given', { exact: true }).fill('Paracetamol 2.5 ml');
  await button(page, 'Save medicine').click();

  // Then
  await expect(page.getByRole('status')).toHaveText('Paracetamol 2.5 ml saved');
  expect(await latest('medication')).toMatchObject({ name: 'Paracetamol 2.5 ml' });

  // When
  await button(page, 'Add entry').click();
  await sheet(page).getByRole('radio', { name: 'Medicine', exact: true }).click();
  await sheet(page).getByLabel('Note (optional)', { exact: true }).fill('with the morning feed');
  await expect(note(page)).toHaveText(/ with your note\.$/);
  await button(page, 'Save medicine').click();

  // Then
  await expect(page.getByRole('status')).toHaveText('Vitamin D saved');
  const given = async () =>
    ((await adminFetch(`medication/?child=${testEnv.childId}`)) as { results: { name: string; notes: string | null }[] }).results;
  await expect.poll(given).toContainEqual(expect.objectContaining({ name: 'Vitamin D', notes: 'with the morning feed' }));
});
