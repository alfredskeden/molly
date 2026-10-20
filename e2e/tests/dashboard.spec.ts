import { expect, test, type Page } from '@playwright/test';

import { ALL_DAY, openSettings, signInAs } from './session';
import { adminFetch, latest, resetChild, runningTimers, testEnv } from './test-env';

type Sleep = { nap: boolean };
type Feeding = { id: number; type: string; method: string; amount: number | null };
type Change = { wet: boolean; solid: boolean };

const NEVER = { start: '00:00', end: '00:00' };

test.beforeEach(resetChild);

const button = (page: Page, name: string | RegExp) =>
  page.getByRole('button', typeof name === 'string' ? { name, exact: true } : { name });

test('a sleep started outside the nap window is logged as night sleep', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { napWindow: NEVER });
  await button(page, 'Start sleep').click();

  // When
  await button(page, /^Stop sleep, /).click();

  // Then
  await expect(page.getByRole('status')).toHaveText(/^Sleep saved · \d+m$/);
  expect(await latest<Sleep>('sleep')).toMatchObject({ nap: false });
});

const FEEDING_STOPS = [
  { label: 'Left', logged: { type: 'breast milk', method: 'left breast', amount: null } },
  { label: 'Right', logged: { type: 'breast milk', method: 'right breast', amount: null } },
  { label: 'Both breasts', logged: { type: 'breast milk', method: 'both breasts', amount: null } },
];

for (const { label, logged } of FEEDING_STOPS) {
  test(`stopping a feeding with ${label} logs ${logged.method}`, async ({ page }) => {
    // Given
    await signInAs(page, testEnv.parentB, { feedTimer: true });
    await button(page, 'Start feeding').click();
    await button(page, /^Stop feed, /).click();

    // When
    await button(page, label).click();

    // Then
    await expect(page.getByRole('status')).toHaveText(/^Feed saved · (Left|Right|Both) · \d+m$/);
    await expect.poll(() => latest<Feeding>('feedings')).toMatchObject(logged);
  });
}

const DIAPERS = [
  { label: 'Wet', logged: { wet: true, solid: false }, text: 'Wet' },
  { label: 'Dirty', logged: { wet: false, solid: true }, text: 'Dirty' },
  { label: 'Both', logged: { wet: true, solid: true }, text: 'Wet \\+ dirty' },
];

for (const { label, logged, text } of DIAPERS) {
  test(`logging a ${label} diaper puts it on the ring and on its tile`, async ({ page }) => {
    // Given
    await signInAs(page, testEnv.parentB, { napWindow: ALL_DAY });
    await button(page, 'Diaper').click();

    // When
    await button(page, label).click();

    // Then
    await expect(page.getByRole('status')).toHaveText(/^Diaper saved · /);
    await expect(button(page, 'Diaper').getByText('just now', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: new RegExp(`^Diaper \\d\\d:\\d\\d, ${text}$`) })).toBeVisible();
    await expect.poll(() => latest<Change>('changes')).toMatchObject(logged);
  });
}

test('cancelling the running sleep removes it without logging an entry', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { napWindow: ALL_DAY });
  await button(page, 'Start sleep').click();
  await button(page, /^Sleeping since \d\d:\d\d, /).click();

  // When
  await button(page, 'Cancel sleep').click();
  await button(page, 'Tap again to delete').click();

  // Then
  await expect(page.getByRole('status')).toHaveText('Sleep cancelled');
  await expect.poll(runningTimers).toEqual([]);
  expect(await latest('sleep')).toBeUndefined();
});

test("a timer the other parent starts appears within the poll, and stopping it shows on both", async ({ browser }) => {
  // Given
  const parentA = await (await browser.newContext()).newPage();
  const parentB = await (await browser.newContext()).newPage();
  await parentA.clock.install();
  await parentB.clock.install();
  await signInAs(parentA, testEnv.parentA);
  await signInAs(parentB, testEnv.parentB);
  await expect(button(parentB, 'Start sleep')).toBeVisible();
  await button(parentA, 'Start sleep').click();
  await parentA.getByText(/^Sleep started just now$/).waitFor();
  await parentB.clock.fastForward(31_000);
  await expect(button(parentB, /^Stop sleep, /)).toBeVisible();

  // When
  await button(parentB, /^Stop sleep, /).click();
  await parentB.getByText(/^Sleep saved · /).waitFor();
  await parentA.clock.fastForward(31_000);

  // Then
  await expect(button(parentA, 'Start sleep')).toBeVisible();
  expect(await runningTimers()).toEqual([]);
});

test("stopping the other parent's timer without permission shows the permission message", async ({ page }) => {
  // Given
  await adminFetch('timers/', {
    method: 'POST',
    body: JSON.stringify({ child: testEnv.childId, name: 'molly:sleep', user: testEnv.parentB.id }),
  });
  await signInAs(page, testEnv.parentA);

  // When
  await button(page, /^Stop sleep, /).click();

  // Then
  await expect(page.getByRole('status')).toContainText('needs permission to stop other people');
  expect(await runningTimers()).toHaveLength(1);
});

test('the permission message links to the permission setup', async ({ page }) => {
  // Given
  await adminFetch('timers/', {
    method: 'POST',
    body: JSON.stringify({ child: testEnv.childId, name: 'molly:sleep', user: testEnv.parentB.id }),
  });
  await signInAs(page, testEnv.parentA);
  await button(page, /^Stop sleep, /).click();

  // When
  await page.getByRole('link', { name: 'How to fix' }).click();

  // Then
  await expect(page.getByRole('heading', { name: 'Permissions for each parent' })).toBeVisible();
  await expect(page.getByText(/core.delete_timer/).filter({ visible: true })).toBeVisible();
});

test("the tiles show how long since the last of each, and the ring today's entries", async ({ page }) => {
  // Given
  const today = (hours: number, minutes = 0) => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes).toISOString();
  };
  const child = testEnv.childId;
  await adminFetch('sleep/', { method: 'POST', body: JSON.stringify({ child, start: today(0, 0), end: today(0, 1), nap: false }) });
  await adminFetch('feedings/', {
    method: 'POST',
    body: JSON.stringify({ child, start: today(0, 2), end: today(0, 3), type: 'formula', method: 'bottle', amount: 80 }),
  });
  await adminFetch('changes/', { method: 'POST', body: JSON.stringify({ child, time: today(0, 4), wet: true, solid: false }) });

  // When
  await signInAs(page, testEnv.parentB, { napWindow: ALL_DAY });

  // Then
  await expect(page.getByLabel(/^Awake \d+(h \d+)?m, since waking up$/)).toBeVisible();
  await expect(button(page, 'Feed').getByText(/ ago · Bottle$/)).toBeVisible();
  await expect(button(page, 'Diaper 00:04, Wet')).toBeVisible();
  await expect(button(page, 'Feed 00:02, Bottle, 80 ml')).toBeVisible();
  await expect(button(page, 'Night sleep 00:00 to 00:01, 1 minute')).toBeVisible();
});

test("while Baby Buddy is down, an action shows can't reach and nothing looks saved", async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB);
  await expect(button(page, 'Start sleep')).toBeVisible();
  await page.route(`${testEnv.baseUrl}/api/**`, (route) => route.abort('connectionrefused'));

  // When
  await button(page, 'Start sleep').click();

  // Then
  await expect(page.getByText("Can't reach Baby Buddy. Nothing was saved.")).toBeVisible();
  await expect(button(page, 'Start sleep')).toBeVisible();
  expect(await runningTimers()).toEqual([]);
});

test('back after closing settings leaves the dashboard instead of reopening settings', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB);
  await openSettings(page);
  await page.getByRole('link', { name: 'Back', exact: true }).click();
  await expect(button(page, 'Start sleep')).toBeVisible();

  // When
  await page.goBack();

  // Then
  await expect(page).not.toHaveURL(/\/settings/);
});
