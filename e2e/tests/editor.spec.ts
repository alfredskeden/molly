import { expect, test, type Page } from '@playwright/test';

import { signInAs } from './session';
import { adminFetch, latest, resetChild, runningTimers, testEnv } from './test-env';

test.beforeEach(resetChild);

const button = (page: Page, name: string | RegExp) =>
  page.getByRole('button', typeof name === 'string' ? { name, exact: true } : { name });

/** The day is seeded into yesterday and the browser clock set on it: Baby Buddy refuses future entries. */
const yesterday = (hours: number, minutes = 0, dayOffset = 0) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1 + dayOffset, hours, minutes);
};
const iso = (hours: number, minutes: number, dayOffset = 0) => yesterday(hours, minutes, dayOffset).toISOString();
const post = (path: string, body: object) =>
  adminFetch(path, { method: 'POST', body: JSON.stringify({ child: testEnv.childId, ...body }) });
const clockAt = (page: Page, time: Date) => page.clock.install({ time });
const clockOf = (value: string) => {
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

type Sleep = { start: string; end: string };
type Feeding = { method: string; amount: number | null; start: string };
type Change = { wet: boolean; solid: boolean };

async function seedMorning() {
  await post('sleep/', { start: iso(19, 30, -2), end: iso(6, 50, -1), nap: false });
  await post('sleep/', { start: iso(19, 5, -1), end: iso(7, 13), nap: false });
  await post('feedings/', { start: iso(22, 30, -1), end: iso(22, 50, -1), type: 'breast milk', method: 'left breast' });
  await post('sleep/', { start: iso(9, 32), end: iso(10, 41), nap: true });
  await post('feedings/', { start: iso(10, 45), end: iso(11, 3), type: 'breast milk', method: 'left breast' });
  await post('changes/', { time: iso(11, 10), wet: true, solid: false });
}

async function openAt(page: Page, hours = 11, minutes = 40) {
  await clockAt(page, yesterday(hours, minutes));
  await signInAs(page, testEnv.parentB);
}

test('1b: tapping a nap opens it, +5 on End and Done saves the new end', async ({ page }) => {
  // Given
  await seedMorning();
  await openAt(page);

  // When
  await button(page, 'Nap 09:32 to 10:41, 1 hour 9 minutes').click();

  // Then
  const editor = page.getByLabel('Edit Nap', { exact: true });
  await expect(editor.getByText('1h 9m · ended 59m ago', { exact: true })).toBeVisible();
  await expect(editor.getByLabel('Start 09:32', { exact: true })).toBeVisible();
  await expect(editor.getByLabel('End 10:41', { exact: true })).toBeVisible();

  // When
  await button(page, 'End 5 minutes later').click();
  await button(page, 'Done').click();

  // Then
  await expect(page.getByRole('status')).toHaveText('Changes saved');
  await expect(button(page, 'Nap 09:32 to 10:46, 1 hour 14 minutes')).toBeVisible();
  expect(clockOf((await latest<Sleep>('sleep'))!.end)).toBe('10:46');
});

test('the close X drops the changes', async ({ page }) => {
  // Given
  await seedMorning();
  await openAt(page);
  await button(page, 'Nap 09:32 to 10:41, 1 hour 9 minutes').click();
  await button(page, 'End 5 minutes later').click();

  // When
  await button(page, 'Close without saving').click();

  // Then
  await expect(button(page, 'Nap 09:32 to 10:41, 1 hour 9 minutes')).toBeVisible();
  expect(clockOf((await latest<Sleep>('sleep'))!.end)).toBe('10:41');
});

test("a sleep's end never moves past now, nor its length under a minute", async ({ page }) => {
  // Given
  await post('sleep/', { start: iso(11, 30), end: iso(11, 37), nap: true });
  await openAt(page);
  await button(page, /^Nap 11:30 to 11:37, /).click();

  // When
  await button(page, 'End 5 minutes later').click();

  // Then
  await expect(page.getByLabel('End 11:40', { exact: true })).toBeVisible();

  // When
  for (let i = 0; i < 3; i++) await button(page, 'End 5 minutes earlier').click();

  // Then
  await expect(page.getByLabel('End 11:31', { exact: true })).toBeVisible();
});

test('Delete removes the entry after a second tap', async ({ page }) => {
  // Given
  await seedMorning();
  await openAt(page);
  await button(page, 'Diaper 11:10, Wet').click();

  // When
  await button(page, 'Delete').click();
  await button(page, 'Tap again to delete').click();

  // Then
  await expect(page.getByRole('status')).toHaveText('Entry deleted');
  await expect(button(page, 'Diaper 11:10, Wet')).toBeHidden();
  expect(await latest('changes')).toBeUndefined();
});

test("a feed's side can be changed", async ({ page }) => {
  // Given
  await seedMorning();
  await openAt(page);
  await button(page, 'Feed 10:45, Left, 18 minutes').click();

  // When
  await page.getByRole('radio', { name: 'Right', exact: true }).click();
  await button(page, 'Done').click();

  // Then
  await expect(page.getByRole('status')).toHaveText('Changes saved');
  expect(await latest<Feeding>('feedings')).toMatchObject({ method: 'right breast' });
});

test('a nap can be saved as night sleep, and the title follows', async ({ page }) => {
  // Given
  await seedMorning();
  await openAt(page);
  await button(page, 'Nap 09:32 to 10:41, 1 hour 9 minutes').click();
  await expect(page.getByRole('radio', { name: 'Nap', exact: true })).toBeChecked();

  // When
  await page.getByRole('radio', { name: 'Night sleep', exact: true }).click();
  await button(page, 'Done').click();

  // Then
  await expect(page.getByRole('status')).toHaveText('Changes saved');
  await expect(button(page, 'Night sleep 09:32 to 10:41, 1 hour 9 minutes')).toBeVisible();
  expect(await latest<Sleep & { nap: boolean }>('sleep')).toMatchObject({ nap: false });
});

test('moving only the times of a sleep keeps how it was saved', async ({ page }) => {
  // Given
  await seedMorning();
  await openAt(page);
  await button(page, 'Nap 09:32 to 10:41, 1 hour 9 minutes').click();

  // When
  await button(page, 'End 5 minutes later').click();
  await button(page, 'Done').click();

  // Then
  await expect(page.getByRole('status')).toHaveText('Changes saved');
  expect(await latest<Sleep & { nap: boolean }>('sleep')).toMatchObject({ nap: true });
});

test("a bottle's amount can be changed", async ({ page }) => {
  // Given
  await post('feedings/', { start: iso(10, 45), end: iso(11, 3), type: 'formula', method: 'bottle', amount: 120 });
  await openAt(page);
  await button(page, 'Feed 10:45, Bottle, 120 ml').click();

  // When
  for (let i = 0; i < 3; i++) await button(page, 'More: +10 ml').click();
  await button(page, 'Done').click();

  // Then
  await expect(button(page, 'Feed 10:45, Bottle, 150 ml')).toBeVisible();
  expect(await latest<Feeding>('feedings')).toMatchObject({ amount: 150 });
});

test("a diaper's kind can be changed", async ({ page }) => {
  // Given
  await seedMorning();
  await openAt(page);
  await button(page, 'Diaper 11:10, Wet').click();

  // When
  await page.getByRole('radio', { name: 'Both', exact: true }).click();
  await button(page, 'Done').click();

  // Then
  await expect(button(page, 'Diaper 11:10, Wet + dirty')).toBeVisible();
  await expect.poll(() => latest<Change>('changes')).toMatchObject({ wet: true, solid: true });
});

test("the running sleep shows Start only, and moving it moves the timer's start", async ({ page }) => {
  // Given
  await post('timers/', { name: 'molly:sleep', start: iso(11, 0) });
  await openAt(page);

  // When
  await button(page, /^Sleeping since 11:00, /).click();

  // Then
  await expect(page.getByLabel('Start 11:00', { exact: true })).toBeVisible();
  await expect(button(page, 'End 5 minutes later')).toBeHidden();
  await expect(page.getByRole('radio', { name: 'Night sleep', exact: true })).toBeHidden();

  // When
  await button(page, 'Start 5 minutes earlier').click();
  await button(page, 'Done').click();

  // Then
  await expect(page.getByRole('status')).toHaveText('Start moved to 10:55');
  const timers = (await adminFetch(`timers/?child=${testEnv.childId}`)) as { results: { start: string }[] };
  expect(clockOf(timers.results[0]!.start)).toBe('10:55');
});

test('editing an entry of last night works the same way', async ({ page }) => {
  // Given
  await seedMorning();
  await openAt(page);
  await button(page, 'Switch to last night').click();
  await button(page, 'Feed 22:30, Left, 20 minutes').click();

  // When
  await button(page, 'Start 5 minutes earlier').click();
  await button(page, 'Done').click();

  // Then
  await expect(page.getByRole('status')).toHaveText('Changes saved');
  await expect(button(page, 'Feed 22:25, Left, 25 minutes')).toBeVisible();
});

test('1c: Stop feed asks how it went, and Left saves a left feed', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { feedTimer: true });
  await button(page, 'Start feeding').click();

  // When
  await button(page, /^Stop feed, /).click();
  await button(page, 'Left').click();

  // Then
  await expect(page.getByRole('status')).toHaveText(/^Feed saved · Left · \d+m$/);
  expect(await latest<Feeding>('feedings')).toMatchObject({ method: 'left breast' });
});

test('tapping the running feed on the ring asks how to save it too, a bottle with its amount', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { feedTimer: true });
  await button(page, 'Start feeding').click();

  // When
  await button(page, /^Feeding since \d\d:\d\d\. Stop and save$/).click();
  await button(page, 'Bottle').click();
  await button(page, 'More: +5 ml').click();
  await button(page, 'Save 125 millilitres').click();

  // Then
  await expect.poll(() => latest<Feeding>('feedings')).toMatchObject({ method: 'bottle', amount: 125 });
});

test('Cancel feed drops the timer without saving', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { feedTimer: true });
  await button(page, 'Start feeding').click();
  await button(page, /^Stop feed, /).click();

  // When
  await button(page, 'Cancel feed').click();

  // Then
  await expect(button(page, 'Start feeding')).toBeVisible();
  await expect.poll(runningTimers).toEqual([]);
  expect(await latest('feedings')).toBeUndefined();
});

test('the Diaper tile logs a wet diaper from its picker', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB);

  // When
  await button(page, 'Diaper').click();
  await button(page, 'Wet').click();

  // Then
  await expect(page.getByRole('status')).toHaveText(/^Diaper saved · Wet/);
  expect(await latest<Change>('changes')).toMatchObject({ wet: true, solid: false });
});

test('the Medicine tile logs Vitamin D from its picker', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB);

  // When
  await button(page, 'Medicine').click();
  await button(page, 'Vitamin D').click();

  // Then
  await expect(page.getByRole('status')).toHaveText(/Vitamin D/);
  expect(await latest<{ name: string }>('medication')).toMatchObject({ name: 'Vitamin D' });
});

test('Skip hides the next nap, and Undo brings it back', async ({ page }) => {
  // Given
  await seedMorning();
  await openAt(page);
  const row = button(page, /^Nap likely between .* Show details$/);
  const before = await row.getAttribute('aria-label');

  // When
  await row.click();
  await button(page, 'Skip nap 2').click();

  // Then
  await expect(page.getByRole('status')).toHaveText(/^Nap skipped/);
  await expect(row).not.toHaveAttribute('aria-label', before!);

  // When
  await button(page, 'Undo').click();

  // Then
  await expect(row).toHaveAttribute('aria-label', before!);
});

test("a refused save shows Baby Buddy's reason and keeps the edits", async ({ page }) => {
  // Given
  await seedMorning();
  await openAt(page);
  await page.route(`${testEnv.baseUrl}/api/sleep/*/`, (route) =>
    route.request().method() === 'PATCH'
      ? route.fulfill({ status: 400, json: { end: ['Date/time can not be in the future.'] } })
      : route.continue(),
  );
  await button(page, 'Nap 09:32 to 10:41, 1 hour 9 minutes').click();

  // When
  await button(page, 'End 5 minutes later').click();
  await button(page, 'Done').click();

  // Then
  await expect(page.getByRole('status')).toContainText(/future/i);
  await expect(page.getByLabel('End 10:46', { exact: true })).toBeVisible();
  expect(clockOf((await latest<Sleep>('sleep'))!.end)).toBe('10:41');
});

test("a medicine's time moves and saves", async ({ page }) => {
  // Given
  await post('medication/', { time: iso(10, 10), name: 'Vitamin D' });
  await openAt(page);
  await button(page, 'Vitamin D 10:10').click();
  await expect(page.getByLabel('Edit Vitamin D', { exact: true })).toBeVisible();
  await expect(button(page, 'End 5 minutes later')).toBeHidden();

  // When
  await button(page, 'Time 5 minutes earlier').click();
  await button(page, 'Done').click();

  // Then
  await expect(page.getByRole('status')).toHaveText('Changes saved');
  await expect(button(page, 'Vitamin D 10:05')).toBeVisible();
  await expect.poll(async () => clockOf((await latest<{ time: string }>('medication'))!.time)).toBe('10:05');
});

test("an entry the other parent changed opens with their values after the poll", async ({ page }) => {
  // Given
  await seedMorning();
  await openAt(page);
  const nap = (await latest<Sleep & { id: number }>('sleep'))!;
  await adminFetch(`sleep/${nap.id}/`, { method: 'PATCH', body: JSON.stringify({ end: iso(10, 50) }) });

  // When
  await page.clock.fastForward(31_000);
  await button(page, /^Nap 09:32 to 10:50, /).click();

  // Then
  await expect(page.getByLabel('End 10:50', { exact: true })).toBeVisible();
});
