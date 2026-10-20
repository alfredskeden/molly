import { expect, test, type Page } from '@playwright/test';

import { ALL_DAY, backToDashboard, openChildren, openChildSettings, openSettings, saveChanges, signInAs } from './session';
import { adminFetch, resetChild, testEnv } from './test-env';

type Child = { id: number; slug: string; first_name: string };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Born this many days ago, as Baby Buddy's date. */
const bornDaysAgo = (days: number) => {
  const date = new Date(Date.now() - days * DAY_MS);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const created: Child[] = [];

async function createChild(firstName: string, days: number): Promise<Child> {
  const child = (await adminFetch('children/', {
    method: 'POST',
    body: JSON.stringify({ first_name: firstName, last_name: 'Test', birth_date: bornDaysAgo(days) }),
  })) as Child;
  created.push(child);
  return child;
}

test.beforeEach(resetChild);

test.afterEach(async () => {
  for (const child of created.splice(0)) await adminFetch(`children/${child.slug}/`, { method: 'DELETE' });
});

/** Every child with the all-day nap window, so the Today card and Recent don't depend on the time of day. */
const allDay = (...children: Child[]) => ({
  children: Object.fromEntries([testEnv.childId, ...children.map((child) => child.id)].map((id) => [id, { napWindow: ALL_DAY }])),
});

const header = (page: Page) => page.getByRole('heading').first();

async function logDiaper(child: number, solid: boolean) {
  await adminFetch('changes/', {
    method: 'POST',
    body: JSON.stringify({ child, time: new Date(Date.now() - 5 * 60_000).toISOString(), wet: true, solid }),
  });
}

async function switchTo(page: Page, name: string) {
  await openChildren(page);
  await page.getByRole('button', { name: new RegExp(`^${name}\\b`) }).click();
}

const wetDiaper = (page: Page) => page.getByRole('button', { name: /^Diaper \d\d:\d\d, Wet$/ });

test("with two children, the header shows the first, and its name opens the sheet that switches", async ({ page }) => {
  // Given
  const otto = await createChild('Otto', 10);
  await logDiaper(testEnv.childId, false);
  await logDiaper(otto.id, true);
  await signInAs(page, testEnv.parentB, allDay(otto));
  await expect(header(page)).toHaveText('Test');
  await expect(wetDiaper(page)).toBeVisible();

  // When
  await openChildren(page);
  await expect(page.getByRole('button', { name: /^Test, .*Showing$|^Test, Showing$/ })).toBeVisible();
  await page.getByRole('button', { name: /^Otto\b/ }).click();

  // Then
  await expect(page.getByRole('status')).toHaveText('Showing Otto');
  await expect(header(page)).toHaveText('Otto');
  await expect(page.getByRole('button', { name: /^Diaper \d\d:\d\d, Wet \+ dirty$/ })).toBeVisible();
  await expect(wetDiaper(page)).toHaveCount(0);
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('molly.settings'))) ?? '{}')).toMatchObject({
    childId: otto.id,
  });
});

test('with three children, the sheet reaches each of them', async ({ page }) => {
  // Given
  const otto = await createChild('Otto', 10);
  const mia = await createChild('Mia', 40);
  await signInAs(page, testEnv.parentB, allDay(otto, mia));
  await expect(header(page)).toHaveText('Test');

  // When / Then
  for (const name of ['Otto', 'Mia', 'Test']) {
    await switchTo(page, name);
    await expect(header(page)).toHaveText(name);
  }
});

test('the sheet says which child sleeps and how long the others are awake', async ({ page }) => {
  // Given
  const otto = await createChild('Otto', 10);
  const end = new Date(Date.now() - 85 * 60_000);
  await adminFetch('sleep/', {
    method: 'POST',
    body: JSON.stringify({ child: testEnv.childId, start: new Date(end.getTime() - 30 * 60_000).toISOString(), end: end.toISOString() }),
  });
  await adminFetch('timers/', {
    method: 'POST',
    body: JSON.stringify({ child: otto.id, name: 'molly:sleep', start: new Date(Date.now() - 42 * 60_000).toISOString() }),
  });
  await signInAs(page, testEnv.parentB, allDay(otto));

  // When
  await openChildren(page);

  // Then
  await expect(page.getByRole('button', { name: /^Test, Awake 1h 2[56]m, Showing$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Otto, Sleeping 4[23]m$/ })).toBeVisible();
});

test("with one child the name is plain text, not a button", async ({ page }) => {
  // When
  await signInAs(page, testEnv.parentB, { napWindow: ALL_DAY });

  // Then
  await expect(header(page)).toHaveText('Test');
  await expect(page.getByRole('button', { name: /^Children, showing / })).toHaveCount(0);
});

test('switching back to a child shows its data at once from the cache', async ({ page }) => {
  // Given
  const otto = await createChild('Otto', 10);
  await logDiaper(testEnv.childId, false);
  await signInAs(page, testEnv.parentB, allDay(otto));
  await expect(wetDiaper(page)).toBeVisible();
  await switchTo(page, 'Otto');
  await expect(header(page)).toHaveText('Otto');
  await expect(wetDiaper(page)).toHaveCount(0);

  // When: Baby Buddy answers slowly from now on
  await page.route(`${testEnv.baseUrl}/api/**`, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 4000));
    await route.continue().catch(() => undefined);
  });
  await switchTo(page, 'Test');

  // Then
  await expect(header(page)).toHaveText('Test');
  await expect(wetDiaper(page)).toBeVisible({ timeout: 1500 });
});

test('Settings lists every child; a hidden child leaves the sheet, and the last one stays shown', async ({ page }) => {
  // Given
  const otto = await createChild('Otto', 10);
  await signInAs(page, testEnv.parentB, allDay(otto));
  await openSettings(page);
  await expect(page.getByRole('button', { name: /^Test, \d+ \w+( \d+ \w+)?$/ }).filter({ visible: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Otto, 1 week', exact: true }).filter({ visible: true })).toBeVisible();

  // When
  await page.getByRole('button', { name: /^Otto, / }).filter({ visible: true }).click();
  await page.getByRole('switch', { name: 'Show in Molly' }).filter({ visible: true }).click();
  await saveChanges(page);

  // Then
  await expect(page.getByRole('status')).toHaveText("Otto's settings saved");
  await page.getByRole('link', { name: 'Back to Settings' }).filter({ visible: true }).click();
  await expect(page.getByRole('button', { name: 'Otto, 1 week · hidden', exact: true }).filter({ visible: true })).toBeVisible();
  await page.getByRole('button', { name: /^Test, / }).filter({ visible: true }).click();
  await page.getByRole('switch', { name: 'Show in Molly' }).filter({ visible: true }).click();
  await expect(page.getByRole('switch', { name: 'Show in Molly' }).filter({ visible: true })).toBeChecked();
  await page.getByRole('link', { name: 'Back to Settings' }).filter({ visible: true }).click();
  await page.getByRole('link', { name: 'Back', exact: true }).filter({ visible: true }).click();
  await expect(page.getByRole('button', { name: /^Children, showing / })).toHaveCount(0);
});

test('hiding the child on screen shows the next shown child', async ({ page }) => {
  // Given
  const otto = await createChild('Otto', 10);
  await signInAs(page, testEnv.parentB, allDay(otto));

  // When
  await openChildSettings(page, 'Test');
  await page.getByRole('switch', { name: 'Show in Molly' }).filter({ visible: true }).click();
  await saveChanges(page);
  await backToDashboard(page);

  // Then
  await expect(header(page).filter({ visible: true })).toHaveText('Otto');
});

test('each child keeps its own day and night, after a reload too', async ({ page }) => {
  // Given
  const otto = await createChild('Otto', 10);
  await signInAs(page, testEnv.parentB, allDay(otto));
  await openChildSettings(page, 'Otto');
  await page.getByRole('button', { name: 'Day starts 15 minutes later' }).filter({ visible: true }).click();
  await saveChanges(page);
  await expect(page.getByRole('status')).toHaveText("Otto's settings saved");

  // When
  await page.reload();

  // Then
  await expect(page.getByLabel('Day starts 00:15', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Back to Settings' }).click();
  await page.getByRole('button', { name: /^Test, / }).filter({ visible: true }).click();
  await expect(page.getByLabel('Day starts 00:00', { exact: true }).filter({ visible: true })).toBeVisible();
});

test("a child's colour is one of five, chosen on its screen", async ({ page }) => {
  // Given
  const otto = await createChild('Otto', 10);
  await signInAs(page, testEnv.parentB, allDay(otto));
  await openChildSettings(page, 'Otto');
  const colours = page.getByRole('radiogroup', { name: 'Colour' }).filter({ visible: true });
  await expect(colours.getByRole('radio')).toHaveCount(5);
  await expect(colours.getByRole('radio', { checked: true })).toHaveCount(1);

  // When
  await colours.getByRole('radio', { name: 'Mint' }).click();
  await saveChanges(page);

  // Then
  await expect(colours.getByRole('radio', { name: 'Mint' })).toBeChecked();
  await expect(page.getByRole('status')).toHaveText("Otto's settings saved");
  const settings = JSON.parse((await page.evaluate(() => localStorage.getItem('molly.settings'))) ?? '{}');
  expect(settings.children[otto.id]).toMatchObject({ hue: 2 });
});
