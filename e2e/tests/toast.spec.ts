import { expect, test, type Page } from '@playwright/test';

import { ALL_DAY, signInAs } from './session';
import { adminFetch, latest, resetChild, runningTimers, testEnv } from './test-env';

test.beforeEach(resetChild);

const MINUTE = 60_000;
const button = (page: Page, name: string | RegExp) =>
  page.getByRole('button', typeof name === 'string' ? { name, exact: true } : { name });

async function logDiaper(page: Page, kind: 'Wet' | 'Dirty' | 'Both') {
  await button(page, 'Diaper').click();
  await button(page, kind).click();
}

/** Adjust time → pick a chip → Set time. */
async function adjust(page: Page, chip: string) {
  await button(page, 'Adjust time').click();
  await page.getByRole('radio', { name: chip, exact: true }).click();
  await button(page, 'Set time').click();
  await expect(page.getByRole('status')).toHaveText(/^Time set to \d\d:\d\d$/);
}

const minutesAgo = (iso: string) => Math.round((Date.now() - Date.parse(iso)) / MINUTE);

test("adjusting after a start moves the timer's start", async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { feedTimer: true });
  await button(page, 'Start feeding').click();
  await expect(page.getByRole('status')).toHaveText(/^Feeding started just now$/);

  // When
  await adjust(page, '15m');

  // Then
  const [timer] = (await adminFetch(`timers/?child=${testEnv.childId}`)).results as { start: string }[];
  expect(minutesAgo(timer!.start)).toBe(15);
});

test("adjusting after a stop moves the entry's end", async ({ page }) => {
  // Given
  await adminFetch('timers/', {
    method: 'POST',
    body: JSON.stringify({ child: testEnv.childId, name: 'molly:sleep', start: new Date(Date.now() - 40 * MINUTE).toISOString() }),
  });
  await signInAs(page, testEnv.parentB);
  await button(page, /^Stop sleep, /).click();
  await expect(page.getByRole('status')).toHaveText(/^Sleep saved · 40m$/);

  // When
  await adjust(page, '10m');

  // Then
  const sleep = await latest<{ end: string }>('sleep');
  expect(minutesAgo(sleep!.end)).toBe(10);
  expect(await runningTimers()).toEqual([]);
});

test("adjusting after a diaper log moves the change's time", async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB);
  await logDiaper(page, 'Wet');
  await expect(page.getByRole('status')).toHaveText('Diaper saved · Wet');

  // When
  await adjust(page, '20m');

  // Then
  await expect.poll(async () => minutesAgo((await latest<{ time: string }>('changes'))!.time)).toBe(20);
});

test('one minute earlier or later moves the chosen time by a minute', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB);
  await logDiaper(page, 'Dirty');
  await button(page, 'Adjust time').click();
  await page.getByRole('radio', { name: '5m', exact: true }).click();

  // When
  await button(page, '1 min earlier').click();
  await button(page, '1 min earlier').click();
  await button(page, '1 min later').click();
  await button(page, 'Set time').click();

  // Then
  await expect(page.getByRole('status')).toHaveText(/^Time set to/);
  const change = await latest<{ time: string }>('changes');
  expect(minutesAgo(change!.time)).toBe(6);
});

test('choosing Now keeps the time Baby Buddy stamped', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB);
  await logDiaper(page, 'Both');
  await expect(page.getByRole('status')).toHaveText('Diaper saved · Wet + dirty');
  const stamped = (await latest<{ time: string }>('changes'))!.time;

  // When
  await button(page, 'Adjust time').click();
  await page.getByRole('radio', { name: 'Now', exact: true }).click();
  await button(page, 'Set time').click();

  // Then
  await expect(page.getByLabel('Adjust time')).toHaveCount(0);
  expect((await latest<{ time: string }>('changes'))!.time).toBe(stamped);
});

test('a cancel shows its toast without Adjust time', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { napWindow: ALL_DAY });
  await button(page, 'Start sleep').click();
  await button(page, /^Sleeping since /).click();

  // When
  await button(page, 'Cancel sleep').click();
  await button(page, 'Tap again to delete').click();

  // Then
  await expect(page.getByRole('status')).toHaveText('Sleep cancelled');
  await expect(button(page, 'Adjust time')).toHaveCount(0);
});

const clock = (date: Date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
/** Taps the big time and types `HH:MM` as four digits on the keyboard. */
async function typeTime(page: Page, which: 'Start' | 'End', time: string) {
  await page.getByLabel(new RegExp(`^${which} time `)).click();
  await page.keyboard.type(time.replace(':', ''));
}

test('a typed start time moves the running sleep to start then', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { napWindow: ALL_DAY });
  await button(page, 'Start sleep').click();
  await button(page, 'Adjust time').click();
  const typed = clock(new Date(Date.now() - 7 * MINUTE));

  // When
  await typeTime(page, 'Start', typed);
  await button(page, 'Set time').click();

  // Then
  await expect(page.getByRole('status')).toHaveText(`Time set to ${typed}`);
  const [timer] = (await adminFetch(`timers/?child=${testEnv.childId}`)).results as { start: string }[];
  expect(clock(new Date(timer!.start))).toBe(typed);
  await expect(button(page, new RegExp(`^Sleeping since ${typed}, `))).toBeVisible();
});

test('Set time is off until all four digits are typed', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB);
  await logDiaper(page, 'Wet');
  await button(page, 'Adjust time').click();

  // When
  await page.getByLabel(/^Start time /).click();
  await page.keyboard.type('08');

  // Then
  await expect(page.getByLabel(/^Start time 08:/)).toBeVisible();
  await expect(button(page, 'Set time')).toBeDisabled();
});

test('an end typed before the start cannot be set', async ({ page }) => {
  // Given
  await adminFetch('timers/', {
    method: 'POST',
    body: JSON.stringify({ child: testEnv.childId, name: 'molly:sleep', start: new Date(Date.now() - 40 * MINUTE).toISOString() }),
  });
  await signInAs(page, testEnv.parentB);
  await button(page, /^Stop sleep, /).click();
  await button(page, 'Adjust time').click();

  // When
  await typeTime(page, 'End', clock(new Date(Date.now() - 50 * MINUTE)));

  // Then
  await expect(page.getByText('Before it started', { exact: true })).toBeVisible();
  await expect(button(page, 'Set time')).toBeDisabled();
});

test('a chip tapped after typing wins over the typed time', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB);
  await logDiaper(page, 'Dirty');
  await button(page, 'Adjust time').click();
  await typeTime(page, 'Start', clock(new Date(Date.now() - 3 * MINUTE)));

  // When
  await page.getByRole('radio', { name: '15m', exact: true }).click();

  // Then
  await expect(page.getByRole('radio', { name: '15m', exact: true })).toBeChecked();
  await expect(page.getByLabel(`Start time ${clock(new Date(Date.now() - 15 * MINUTE))}`)).toBeVisible();
});
