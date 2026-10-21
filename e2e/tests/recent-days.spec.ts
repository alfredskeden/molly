import { expect, test, type Page } from '@playwright/test';

import { signInAs } from './session';
import { adminFetch, resetChild, testEnv } from './test-env';

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
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const weekday = (dayOffset: number) => WEEKDAYS[yesterday(12, 0, dayOffset).getDay()]!;
const dateOf = (dayOffset: number) => {
  const day = yesterday(12, 0, dayOffset);
  return `${WEEKDAYS[day.getDay()]!.slice(0, 3)} ${day.getDate()} ${MONTHS[day.getMonth()]}`;
};

/** The board's morning: a night to 07:13, feeds, diapers, a nap and a Vitamin D. */
async function seedToday() {
  await post('sleep/', { start: iso(19, 5, -1), end: iso(7, 13), nap: false });
  await post('changes/', { time: iso(7, 25), wet: true, solid: false });
  await post('feedings/', { start: iso(7, 30), end: iso(7, 50), type: 'breast milk', method: 'right breast' });
  await post('sleep/', { start: iso(9, 32), end: iso(10, 41), nap: true });
  await post('medication/', { time: iso(10, 10), name: 'Vitamin D' });
  await post('feedings/', { start: iso(10, 45), end: iso(11, 3), type: 'breast milk', method: 'left breast' });
  await post('changes/', { time: iso(11, 10), wet: false, solid: true });
}

async function seedDaysBefore(...offsets: number[]) {
  for (const day of offsets) {
    await post('sleep/', { start: iso(19, 30, day - 1), end: iso(6, 50, day), nap: false });
    await post('sleep/', { start: iso(9, 30, day), end: iso(10, 30, day), nap: true });
    await post('feedings/', { start: iso(12, 0, day), end: iso(12, 15, day), type: 'breast milk', method: 'left breast' });
  }
}

async function openAt(page: Page, hours = 11, minutes = 40) {
  await page.clock.install({ time: yesterday(hours, minutes) });
  await signInAs(page, testEnv.parentB);
}

test('1e: the history button opens Today with last night and today\'s totals and the latest six entries, newest first', async ({ page }) => {
  // Given
  await seedToday();
  await openAt(page);

  // When
  await button(page, 'Today').click();

  // Then
  const sheet = page.getByLabel('Today', { exact: true });
  await expect(sheet.getByRole('heading', { name: 'Today' })).toBeVisible();
  await expect(
    sheet.getByLabel('Today: 13h 17m slept, 2 sleeps, 2 feeds, 2 diapers, about 240 millilitres', { exact: true }),
  ).toBeVisible();
  await expect(sheet.getByRole('button', { name: /\. Edit\.$/ })).toHaveText([
    /Diaper · Dirty/,
    /Feed · Left/,
    /Vitamin D/,
    /Nap/,
    /Feed · Right/,
    /Diaper · Wet/,
  ]);
});

test('an entry in the Today sheet opens in the editor', async ({ page }) => {
  // Given
  await seedToday();
  await openAt(page);
  await button(page, 'Today').click();

  // When
  await button(page, /^Nap at 09:32, 1 hour 9 minutes\. Edit\.$/).click();

  // Then
  await expect(page.getByLabel('Edit Nap', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Start 09:32', { exact: true })).toBeVisible();
});

test("an entry of last night in the Today sheet opens on last night's ring", async ({ page }) => {
  // Given
  await seedDaysBefore(-1);
  await post('sleep/', { start: iso(19, 5, -1), end: iso(7, 13), nap: false });
  await post('feedings/', { start: iso(22, 30, -1), end: iso(22, 50, -1), type: 'breast milk', method: 'left breast' });
  await openAt(page, 7, 40);
  await button(page, 'Today').click();

  // When
  await button(page, /^Feed at 22:30, Left, 20 minutes\. Edit\.$/).click();

  // Then
  await expect(page.getByText(`Last night · ${dateOf(-1)}`, { exact: true })).toBeVisible();
  await expect(page.getByLabel('Edit Feed', { exact: true })).toBeVisible();
  await expect(button(page, 'Back to now')).toBeVisible();
});

test('1k: Recent days shows today, yesterday and the day before, each with the night it woke from, then its day', async ({ page }) => {
  // Given
  await seedDaysBefore(-3, -2, -1);
  await seedToday();
  await openAt(page);
  await button(page, 'Today').click();

  // When
  await button(page, 'Recent days').click();

  // Then
  await expect(page.getByRole('heading', { name: 'Recent days' })).toBeVisible();
  await expect(page.getByRole('heading', { level: undefined }).filter({ hasText: /^(Today|Yesterday|\w+day)$/ })).toHaveText([
    'Today',
    'Yesterday',
    weekday(-2),
  ]);
  await expect(button(page, /^Today, Today so far: slept 1 hour 9 minutes, 1 nap\. Open$/)).toBeVisible();
  await expect(button(page, /^Yesterday, Day: slept 1 hour, 1 nap\. Open$/)).toBeVisible();
  await expect(button(page, /^Today, Night: slept /)).toBeVisible();
  await expect(button(page, /^Yesterday, Night: slept 11 hours 20 minutes, /)).toBeVisible();
  const yesterdays = button(page, /^Yesterday, /);
  await expect(yesterdays.nth(0)).toHaveAccessibleName(/^Yesterday, Night: /);
  await expect(yesterdays.nth(1)).toHaveAccessibleName(/^Yesterday, Day: /);
});

test('each card says about how much the baby drank over its night and day, a breastfeed counted as the default bottle', async ({
  page,
}) => {
  // Given: the default bottle is 120 ml
  await post('sleep/', { start: iso(19, 30, -3), end: iso(6, 50, -2), nap: false });
  await post('sleep/', { start: iso(9, 30, -2), end: iso(10, 30, -2), nap: true });
  await seedDaysBefore(-1);
  await post('feedings/', { start: iso(15, 0, -1), end: iso(15, 10, -1), type: 'formula', method: 'bottle', amount: 90 });
  await seedToday();
  await openAt(page);

  // When
  await page.goto('/recent-days');

  // Then
  await expect(page.getByLabel('about 210 millilitres', { exact: true })).toHaveText('≈ 210 ml');
  await expect(page.getByLabel('about 240 millilitres', { exact: true })).toHaveText('≈ 240 ml');
  await expect(page.getByText(/ ml$/)).toHaveCount(2);
  await expect(button(page, new RegExp(`^${weekday(-2)}, Day: `))).toBeVisible();
});

test('a ring on a card with an ml line still opens its window', async ({ page }) => {
  // Given
  await seedDaysBefore(-1);
  await seedToday();
  await openAt(page);
  await page.goto('/recent-days');
  await expect(page.getByText('≈ 120 ml', { exact: true })).toBeVisible();

  // When
  await button(page, /^Yesterday, Night: /).click();

  // Then
  await expect(button(page, 'Back to now')).toBeVisible();
});

test('Load 3 more days adds the days before, and goes once nothing older is logged', async ({ page }) => {
  // Given
  await seedDaysBefore(-3, -2, -1);
  await seedToday();
  await openAt(page);
  await page.goto('/recent-days');
  await expect(button(page, /^Yesterday, Day: /)).toBeVisible();
  await expect(button(page, new RegExp(`^${weekday(-3)}, Day: `))).toHaveCount(0);

  // When
  await button(page, 'Load 3 more days').click();

  // Then
  await expect(button(page, new RegExp(`^${weekday(-3)}, Day: slept 1 hour, 1 nap\\. Open$`))).toBeVisible();
  await expect(button(page, 'Load 3 more days')).toHaveCount(0);
});

test('1g: a mini ring opens that window on the dashboard, with Back to now', async ({ page }) => {
  // Given
  await seedDaysBefore(-2, -1);
  await seedToday();
  await openAt(page);
  await page.goto('/recent-days');

  // When
  await button(page, /^Yesterday, Day: /).click();

  // Then
  await expect(page.getByText(`Yesterday · ${dateOf(-1)}`, { exact: true })).toBeVisible();
  await expect(page.getByLabel('Slept 1h 0m, 1 nap · 1 feed', { exact: true })).toBeVisible();
  await expect(button(page, 'Back to now')).toBeVisible();

  // When: the cap pairs windows counting back from now, so yesterday's day pairs with the night before it
  await button(page, `Switch to ${weekday(-2).toLowerCase()} night`).click();

  // Then
  await expect(page.getByText(`${weekday(-2)} night · ${dateOf(-2)}`, { exact: true })).toBeVisible();
});

test('a nap in progress counts in the Today sheet, added to last night and the finished nap', async ({ page }) => {
  // Given
  await seedToday();
  await post('timers/', { name: 'molly:sleep', start: iso(11, 20) });
  await openAt(page);

  // When
  await button(page, 'Today').click();

  // Then
  await expect(
    page.getByLabel('Today: 13h 37m slept, 3 sleeps, 2 feeds, 2 diapers, about 240 millilitres', { exact: true }),
  ).toBeVisible();
});

test('the Today sheet says about how much the baby drank since last night, a breastfeed counted as the default bottle', async ({
  page,
}) => {
  // Given: the default bottle is 120 ml
  await post('sleep/', { start: iso(19, 5, -1), end: iso(7, 13), nap: false });
  await post('feedings/', { start: iso(2, 0), end: iso(2, 15), type: 'formula', method: 'bottle', amount: 90 });
  await post('feedings/', { start: iso(7, 30), end: iso(7, 50), type: 'breast milk', method: 'right breast' });
  await openAt(page);

  // When
  await button(page, 'Today').click();

  // Then
  const sheet = page.getByLabel('Today', { exact: true });
  await expect(sheet.getByText('≈ 210 ml', { exact: true })).toBeVisible();
  await expect(sheet.getByLabel('Today: 12h 8m slept, 1 sleep, 2 feeds, 0 diapers, about 210 millilitres', { exact: true })).toBeVisible();
});

test('the Today sheet has no ml line when nothing was drunk', async ({ page }) => {
  // Given
  await post('sleep/', { start: iso(19, 5, -1), end: iso(7, 13), nap: false });
  await post('changes/', { time: iso(7, 25), wet: true, solid: false });
  await openAt(page);

  // When
  await button(page, 'Today').click();

  // Then
  const sheet = page.getByLabel('Today', { exact: true });
  await expect(sheet.getByLabel('Today: 12h 8m slept, 1 sleep, 0 feeds, 1 diaper', { exact: true })).toBeVisible();
  await expect(sheet.getByText(/ ml$/)).toHaveCount(0);
});

test('at night the sheet is Tonight and counts only tonight', async ({ page }) => {
  // Given
  await seedToday();
  await post('sleep/', { start: iso(19, 25), end: iso(22, 30), nap: false });
  await post('feedings/', { start: iso(22, 40), end: iso(22, 55), type: 'breast milk', method: 'right breast' });
  await openAt(page, 23, 10);

  // When
  await button(page, 'Tonight').click();

  // Then
  const sheet = page.getByLabel('Tonight', { exact: true });
  await expect(sheet.getByRole('heading', { name: 'Tonight' })).toBeVisible();
  await expect(
    sheet.getByLabel('Tonight: 3h 5m slept, 1 sleep, 1 feed, 0 diapers, about 120 millilitres', { exact: true }),
  ).toBeVisible();
});
