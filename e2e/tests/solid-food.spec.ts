import { expect, test, type Page } from '@playwright/test';

import { ALL_DAY, backToDashboard, openChildSettings, saveChanges, signInAs } from './session';
import { adminFetch, latest, resetChild, runningTimers, testEnv } from './test-env';

test.beforeEach(resetChild);

type Feeding = { start: string; end: string; type: string; method: string; amount: number | null; notes: string | null };
type Child = { id: number; slug: string };

const MINUTE = 60_000;
const button = (page: Page, name: string | RegExp) =>
  page.getByRole('button', typeof name === 'string' ? { name, exact: true } : { name });
const ago = (minutes: number) => new Date(Date.now() - minutes * MINUTE).toISOString();

/** The seeded child with Solid food on (and the all-day window, so every entry is on today's ring). */
const solidsOn = (more: Record<number, object> = {}) => ({
  children: { [testEnv.childId]: { napWindow: ALL_DAY, solids: true }, ...more },
});

async function seedMeal(minutesAgo: number, notes: string) {
  await adminFetch('feedings/', {
    method: 'POST',
    body: JSON.stringify({
      child: testEnv.childId,
      start: ago(minutesAgo + 1),
      end: ago(minutesAgo),
      type: 'solid food',
      method: 'parent fed',
      amount: 0,
      notes,
    }),
  });
}

async function openSolids(page: Page) {
  await button(page, 'Feed').click();
  await button(page, 'Solids').click();
}

const food = (page: Page) => page.getByTestId('food').filter({ visible: true });

test('with Solid food off, Feed offers the sides and Bottle only', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { napWindow: ALL_DAY });

  // When
  await button(page, 'Feed').click();

  // Then
  for (const name of ['Left', 'Right', 'Both breasts', 'Bottle']) await expect(button(page, name)).toBeVisible();
  await expect(button(page, 'Solids')).toHaveCount(0);
});

test('the Solid food switch adds Solids, the sides on one row and Bottle and Solids on the next', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { children: { [testEnv.childId]: { napWindow: ALL_DAY } } });
  await openChildSettings(page, 'Test');

  // When
  await page.getByRole('switch', { name: 'Solid food' }).filter({ visible: true }).click();
  await saveChanges(page);
  await backToDashboard(page);
  await button(page, 'Feed').click();

  // Then
  const top = async (name: string) => (await button(page, name).boundingBox())!.y;
  const [left, right, both, bottle, solids] = await Promise.all(['Left', 'Right', 'Both breasts', 'Bottle', 'Solids'].map(top));
  expect([right, both]).toEqual([left, left]);
  expect(solids).toBe(bottle);
  expect(bottle).toBeGreaterThan(left!);
});

test("Solids asks with the child's name, and with she once Girl is chosen", async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, solidsOn());

  // When
  await openSolids(page);

  // Then
  await expect(page.getByText('What did Test eat?', { exact: true })).toBeVisible();
  await expect(food(page)).toBeFocused();
  // Back to the picker, then to the tiles.
  await button(page, 'Close').click();
  await button(page, 'Close').click();
  await openChildSettings(page, 'Test');
  await page.getByRole('radio', { name: 'Girl' }).filter({ visible: true }).click();
  await saveChanges(page);
  await backToDashboard(page);
  await openSolids(page);
  await expect(page.getByText('What did she eat?', { exact: true })).toBeVisible();
});

test('Save does nothing while the food is empty or only spaces', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, solidsOn());
  await openSolids(page);

  // When
  await food(page).fill('   ');
  await button(page, 'Save, write what was eaten first').click();

  // Then
  await expect(food(page)).toBeVisible();
  expect(await latest('feedings')).toBeUndefined();
});

test('a typed food saves a parent-fed meal of no amount, and the toast names it', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, solidsOn());
  await openSolids(page);

  // When
  await food(page).fill('Carrot purée');
  await button(page, 'Save Carrot purée').click();

  // Then
  await expect(page.getByRole('status')).toHaveText(/^Feed saved · Carrot purée$/);
  const saved = await latest<Feeding>('feedings');
  expect(saved).toMatchObject({ type: 'solid food', method: 'parent fed', amount: 0, notes: 'Carrot purée' });
  expect(Date.parse(saved!.end) - Date.parse(saved!.start)).toBe(MINUTE);
});

test('the recent foods are chips, newest first, and tapping two saves both', async ({ page }) => {
  // Given
  await seedMeal(300, 'Carrot, Porridge');
  await seedMeal(200, 'Banana');
  await signInAs(page, testEnv.parentB, solidsOn());
  await openSolids(page);
  const chips = page.getByRole('checkbox');
  await expect(chips).toHaveText(['Banana', 'Carrot', 'Porridge']);

  // When
  await page.getByRole('checkbox', { name: 'Banana' }).click();
  await page.getByRole('checkbox', { name: 'Carrot' }).click();
  await button(page, 'Save Banana, Carrot').click();

  // Then
  await expect.poll(async () => (await latest<Feeding>('feedings'))?.notes).toBe('Banana, Carrot');
});

test("the Today sheet shows a meal's food with its time and Solids under it", async ({ page }) => {
  // Given
  await seedMeal(20, 'Pear');
  await signInAs(page, testEnv.parentB, solidsOn());

  // When
  await button(page, 'Today').click();

  // Then
  const row = page.getByRole('button', { name: /^Solids at \d\d:\d\d, Pear\. Edit\.$/ });
  await expect(row).toContainText('Pear');
  await expect(row).toContainText(/\d\d:\d\d · Solids/);
});

test('a meal after a bottle leaves the bottle as the last feed', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, solidsOn());
  await button(page, 'Feed').click();
  await button(page, 'Bottle').click();
  await button(page, /^Save \d+ millilitres$/).click();
  await expect(page.getByRole('status')).toHaveText(/^Feed saved · Bottle/);

  // When
  await openSolids(page);
  await food(page).fill('Rice');
  await button(page, 'Save Rice').click();
  await expect(page.getByRole('status')).toHaveText(/^Feed saved · Rice$/);

  // Then
  await expect(button(page, 'Feed')).toContainText('Bottle');
});

test('Time feeds on: a running feed stops as a meal spanning the timer', async ({ page }) => {
  // Given
  await adminFetch('timers/', { method: 'POST', body: JSON.stringify({ child: testEnv.childId, name: 'molly:feeding', start: ago(15) }) });
  await signInAs(page, testEnv.parentB, { ...solidsOn(), feedTimer: true });

  // When
  await button(page, /^Stop feed, /).click();
  await button(page, 'Solids').click();
  await food(page).fill('Porridge');
  await button(page, 'Save Porridge').click();

  // Then
  await expect(page.getByRole('status')).toHaveText(/^Feed saved · Porridge$/);
  const saved = await latest<Feeding>('feedings');
  expect(saved).toMatchObject({ type: 'solid food', method: 'parent fed', amount: 0, notes: 'Porridge' });
  expect(Math.round((Date.parse(saved!.end) - Date.parse(saved!.start)) / MINUTE)).toBe(15);
  expect(await runningTimers()).toEqual([]);
});

test('the editor opens a meal as Solids with its food, and Done saves a new food', async ({ page }) => {
  // Given
  await seedMeal(20, 'Carrot');
  await signInAs(page, testEnv.parentB, solidsOn());
  await button(page, /^Solids \d\d:\d\d, Carrot$/).click();
  await expect(page.getByRole('radio', { name: 'Solids', exact: true })).toBeChecked();

  // When
  await page.getByLabel('What Test ate', { exact: true }).fill('Carrot, Pea');
  await button(page, 'Done').click();

  // Then
  await expect(page.getByRole('status')).toHaveText('Changes saved');
  expect(await latest<Feeding>('feedings')).toMatchObject({ method: 'parent fed', notes: 'Carrot, Pea' });
});

test('with Solid food off, a meal still opens as Solids', async ({ page }) => {
  // Given
  await seedMeal(20, 'Carrot');
  await signInAs(page, testEnv.parentB, { napWindow: ALL_DAY });

  // When
  await button(page, /^Solids \d\d:\d\d, Carrot$/).click();

  // Then
  await expect(page.getByRole('radio', { name: 'Solids', exact: true })).toBeChecked();
  await expect(page.getByLabel('What Test ate', { exact: true })).toHaveValue('Carrot');
});

test('Add entry: a finished meal saves its food', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, solidsOn());
  await button(page, 'Add entry').click();
  const sheet = page.getByLabel('New entry', { exact: true });
  await sheet.getByRole('radio', { name: 'Feed', exact: true }).click();
  await button(page, 'Start 5 minutes earlier').click();
  await button(page, 'Add end time').click();
  await sheet.getByRole('radio', { name: 'Solids', exact: true }).click();

  // When
  await sheet.getByLabel('What Test ate', { exact: true }).fill('Yoghurt');
  await button(page, 'Save feed').click();

  // Then
  await expect.poll(() => latest<Feeding>('feedings')).toMatchObject({ type: 'solid food', method: 'parent fed', notes: 'Yoghurt' });
});

test('another child with Solid food off keeps four feed options', async ({ page }) => {
  // Given
  const otto = (await adminFetch('children/', {
    method: 'POST',
    body: JSON.stringify({ first_name: 'Otto', last_name: 'Test', birth_date: '2026-01-10' }),
  })) as Child;
  try {
    await signInAs(page, testEnv.parentB, { ...solidsOn({ [otto.id]: { napWindow: ALL_DAY } }), childId: otto.id });

    // When
    await button(page, 'Feed').click();

    // Then
    await expect(button(page, 'Bottle')).toBeVisible();
    await expect(button(page, 'Solids')).toHaveCount(0);
  } finally {
    await adminFetch(`children/${otto.slug}/`, { method: 'DELETE' });
  }
});
