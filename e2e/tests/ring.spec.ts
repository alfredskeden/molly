import { expect, test, type Page } from '@playwright/test';

import { ALL_DAY, signInAs } from './session';
import { adminFetch, latest, resetChild, runningTimers, testEnv } from './test-env';

test.beforeEach(resetChild);

const button = (page: Page, name: string | RegExp) =>
  page.getByRole('button', typeof name === 'string' ? { name, exact: true } : { name });

/**
 * The day is seeded into yesterday and the browser clock set on it: Baby Buddy refuses entries in the
 * future, so a fixed day would break whenever the real clock is earlier.
 */
const yesterday = (hours: number, minutes = 0, dayOffset = 0) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1 + dayOffset, hours, minutes);
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dateOf = (day: Date) => `${WEEKDAYS[day.getDay()]} ${day.getDate()} ${MONTHS[day.getMonth()]}`;
const LONG_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** The weekday `dayOffset` days before the seeded day. */
const weekday = (dayOffset: number) => LONG_WEEKDAYS[yesterday(12, 0, dayOffset).getDay()]!;

/** A past ring's pager: the title as a heading, over the date the window starts on. */
async function expectPager(page: Page, title: string, start: Date) {
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await expect(page.getByText(dateOf(start), { exact: true })).toBeVisible();
}

const post = (path: string, body: object) =>
  adminFetch(path, { method: 'POST', body: JSON.stringify({ child: testEnv.childId, ...body }) });
const iso = (hours: number, minutes: number, dayOffset = 0) => yesterday(hours, minutes, dayOffset).toISOString();

/** The board's day: a night from 19:05 to 07:13, a nap 09:32–10:41, feeds, diapers and a Vitamin D around it. */
async function seedDay() {
  // The night before last, so last night has a morning wake before it and starts at its bedtime.
  await post('sleep/', { start: iso(19, 30, -2), end: iso(6, 50, -1), nap: false });
  await post('sleep/', { start: iso(19, 5, -1), end: iso(7, 13), nap: false });
  await post('feedings/', { start: iso(22, 30, -1), end: iso(22, 50, -1), type: 'breast milk', method: 'left breast' });
  await post('changes/', { time: iso(22, 52, -1), wet: true, solid: false });
  await post('changes/', { time: iso(7, 25), wet: true, solid: false });
  await post('feedings/', { start: iso(7, 30), end: iso(7, 50), type: 'breast milk', method: 'right breast' });
  await post('sleep/', { start: iso(9, 32), end: iso(10, 41), nap: true });
  await post('medication/', { time: iso(10, 10), name: 'Vitamin D' });
  await post('feedings/', { start: iso(10, 45), end: iso(11, 3), type: 'breast milk', method: 'left breast' });
  await post('changes/', { time: iso(11, 10), wet: false, solid: true });
}

/** The rest of that day, to a bedtime at 19:05 with the night's sleep still running. */
async function seedNight() {
  await seedDay();
  await post('sleep/', { start: iso(12, 50), end: iso(14, 10), nap: true });
  await post('feedings/', { start: iso(18, 40), end: iso(18, 58), type: 'breast milk', method: 'right breast' });
  await post('timers/', { name: 'molly:sleep', start: iso(19, 5) });
}

/** Starts the browser clock at `time`; it runs while the page loads (a paused clock stops the app loading). */
const clockAt = (page: Page, time: Date) => page.clock.install({ time });

test('1a: by day the ring shows the day so far, the next nap and the tiles', async ({ page }) => {
  // Given
  await seedDay();
  await clockAt(page, yesterday(11, 40));

  // When
  await signInAs(page, testEnv.parentB);

  // Then
  await expect(page.getByRole('heading', { name: 'Test', exact: true })).toBeVisible();
  await expect(page.getByText(`Today · ${dateOf(yesterday(0))}`, { exact: true })).toBeVisible();
  await expect(page.getByText('Day started 07:13', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Awake 59m, since the nap', { exact: true })).toBeVisible();
  await expect(button(page, 'Nap 09:32 to 10:41, 1 hour 9 minutes')).toBeVisible();
  await expect(button(page, 'Feed 10:45, Left, 18 minutes')).toBeVisible();
  await expect(button(page, 'Diaper 11:10, Dirty')).toBeVisible();
  await expect(button(page, 'Vitamin D 10:10')).toBeVisible();
  await expect(button(page, 'Switch to last night')).toBeVisible();
  for (const tile of ['Start sleep', 'Feed', 'Diaper', 'Medicine']) await expect(button(page, tile)).toBeVisible();
  for (const action of ['Today', 'Add entry', 'Settings']) await expect(button(page, action)).toBeVisible();
  await expect(button(page, /^(Previous|Next):/)).toHaveCount(0);
});

test('1d: at night with the sleep running, the ring shows bedtime and the sleep ticking', async ({ page }) => {
  // Given
  await seedNight();
  await clockAt(page, yesterday(22, 10));

  // When
  await signInAs(page, testEnv.parentB);

  // Then
  await expect(page.getByText(`Tonight · ${dateOf(yesterday(0))}`, { exact: true })).toBeVisible();
  await expect(page.getByText('Bedtime 19:05', { exact: true })).toBeVisible();
  await expect(page.getByLabel(/^Sleeping 3 hours( \d minutes?)?, night sleep so far$/)).toBeVisible();
  await expect(button(page, /^Stop sleep, 3 hours( \d minutes?)?$/)).toBeVisible();
  await expect(button(page, 'Switch to today')).toBeVisible();
});

test('1f: the sun shows last night, and tapping again comes back to today', async ({ page }) => {
  // Given
  await seedDay();
  await clockAt(page, yesterday(11, 40));
  await signInAs(page, testEnv.parentB);

  // When
  await button(page, 'Switch to last night').click();

  // Then
  await expectPager(page, 'Last night', yesterday(0, 0, -1));
  await expect(page.getByText('Bedtime 19:05', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Slept 11h 55m, 1 feed · 1 diaper', { exact: true })).toBeVisible();
  await expect(button(page, 'Back to now')).toBeVisible();

  // When
  await button(page, 'Back to today').click();

  // Then
  await expect(page.getByText(`Today · ${dateOf(yesterday(0))}`, { exact: true })).toBeVisible();
  await expect(button(page, 'Back to now')).toBeHidden();
});

test('from Tonight the moon shows the day that just ended', async ({ page }) => {
  // Given
  await seedNight();
  await clockAt(page, yesterday(22, 10));
  await signInAs(page, testEnv.parentB);

  // When
  await button(page, 'Switch to today').click();

  // Then
  await expectPager(page, 'Today', yesterday(0));
  await expect(page.getByLabel('Slept 2h 29m, 2 naps · 3 feeds', { exact: true })).toBeVisible();
});

test('Back to now returns from a past window', async ({ page }) => {
  // Given
  await seedDay();
  await clockAt(page, yesterday(11, 40));
  await signInAs(page, testEnv.parentB);
  await button(page, 'Switch to last night').click();

  // When
  await button(page, 'Back to now').click();

  // Then
  await expect(page.getByLabel('Awake 59m, since the nap', { exact: true })).toBeVisible();
});

test('a past window snaps back to now after a minute', async ({ page }) => {
  // Given
  await seedDay();
  await clockAt(page, yesterday(11, 40));
  await signInAs(page, testEnv.parentB);
  await button(page, 'Switch to last night').click();
  await expect(button(page, 'Back to now')).toBeVisible();

  // When
  await page.clock.fastForward('01:01');

  // Then
  await expect(button(page, 'Back to now')).toBeHidden();
  await expect(page.getByText(`Today · ${dateOf(yesterday(0))}`, { exact: true })).toBeVisible();
});

test('the Sleep tile starts a sleep, and Stop sleep saves it onto the ring', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { napWindow: ALL_DAY });
  await button(page, 'Start sleep').click();
  await expect(page.getByLabel(/^Sleeping less than a minute, nap so far$/)).toBeVisible();

  // When
  await button(page, /^Stop sleep, /).click();

  // Then
  await expect(page.getByRole('status')).toHaveText(/^Sleep saved · \d+m$/);
  await expect(button(page, 'Start sleep')).toBeVisible();
  await expect(button(page, /^Nap \d\d:\d\d to \d\d:\d\d, /)).toBeVisible();
  expect(await latest<{ nap: boolean }>('sleep')).toMatchObject({ nap: true });
});

test('a sleep and a feed can run at the same time', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { napWindow: ALL_DAY, feedTimer: true });
  await button(page, 'Start sleep').click();
  await expect(button(page, /^Stop sleep, /)).toBeVisible();

  // When
  await button(page, 'Start feeding').click();

  // Then
  await expect(button(page, /^Stop feed, /)).toBeVisible();
  await expect(button(page, /^Stop sleep, /)).toBeVisible();
  await expect(button(page, /^Feeding since \d\d:\d\d\. Stop and save$/)).toBeVisible();
  await expect.poll(async () => (await runningTimers()).map((timer) => timer.name).sort()).toEqual(['molly:feeding', 'molly:sleep']);
});

test('marks at the same time overlap, and a second tap on the stack opens the one underneath', async ({ page }) => {
  // Given
  await seedDay();
  await post('changes/', { time: iso(10, 46), wet: true, solid: false });
  await clockAt(page, yesterday(11, 40));
  await signInAs(page, testEnv.parentB);
  const top = await button(page, /^Diaper 10:46, /).boundingBox();
  const tap = () => page.mouse.click(top!.x + top!.width / 2, top!.y + top!.height / 2);

  // When
  await tap();

  // Then
  await expect(page.getByLabel(/^Edit .*diaper/i)).toBeVisible();

  // When
  await tap();

  // Then
  await expect(page.getByLabel('Edit Feed', { exact: true })).toBeVisible();

  // When
  await tap();

  // Then
  await expect(button(page, 'Done')).toBeHidden();
});

test("a sleep's time labels don't block a tap on its arc", async ({ page }) => {
  // Given
  await seedDay();
  await clockAt(page, yesterday(11, 40));
  await signInAs(page, testEnv.parentB);
  const label = await page.getByText('10:41', { exact: true }).boundingBox();

  // When
  await page.mouse.click(label!.x + label!.width / 2 + 30, label!.y + label!.height / 2);

  // Then
  await expect(page.getByLabel('Edit Nap', { exact: true })).toBeVisible();
});

test('a past ring has the pager instead of the header: the window before, and the live ring next', async ({ page }) => {
  // Given
  await seedDay();
  await clockAt(page, yesterday(11, 40));
  await signInAs(page, testEnv.parentB);

  // When
  await button(page, 'Switch to last night').click();

  // Then
  await expectPager(page, 'Last night', yesterday(0, 0, -1));
  await expect(button(page, 'Previous: Yesterday')).toBeEnabled();
  await expect(button(page, 'Next: Today')).toHaveText('Today');
  for (const action of ['Add entry', 'Settings']) await expect(button(page, action)).toBeHidden();

  // When
  await button(page, 'Next: Today').click();

  // Then
  await expect(page.getByText(`Today · ${dateOf(yesterday(0))}`, { exact: true })).toBeVisible();
  await expect(button(page, 'Settings')).toBeVisible();
  await expect(button(page, /^(Previous|Next):/)).toHaveCount(0);
});

test('‹ steps back through days and nights in turn, and › steps forward again', async ({ page }) => {
  // Given
  await seedDay();
  await clockAt(page, yesterday(11, 40));
  await signInAs(page, testEnv.parentB);
  await button(page, 'Switch to last night').click();

  // When
  await button(page, 'Previous: Yesterday').click();

  // Then
  await expectPager(page, 'Yesterday', yesterday(0, 0, -1));
  await expect(button(page, 'Next: Last night')).toBeVisible();

  // When
  await button(page, `Previous: ${weekday(-2)} night`).click();

  // Then
  await expectPager(page, `${weekday(-2)} night`, yesterday(0, 0, -2));

  // When
  await button(page, 'Next: Yesterday').click();

  // Then
  await expectPager(page, 'Yesterday', yesterday(0, 0, -1));
});

test('‹ goes on past the days the dashboard loads, and stops once nothing older is logged', async ({ page }) => {
  // Given
  await seedDay();
  await post('feedings/', { start: iso(12, 0, -4), end: iso(12, 20, -4), type: 'breast milk', method: 'left breast' });
  await clockAt(page, yesterday(11, 40));
  await signInAs(page, testEnv.parentB);
  await button(page, 'Switch to last night').click();

  // When
  for (let step = 0; step < 7; step++) await button(page, /^Previous: /).click();

  // Then
  await expectPager(page, weekday(-4), yesterday(0, 0, -4));
  await expect(page.getByLabel(`${weekday(-4)}: 0m slept, 0 naps, 1 feed, 0 diapers`, { exact: true })).toBeVisible();
  await expect(button(page, `Previous: ${weekday(-5)} night`)).toBeDisabled();
});

test('before the first entry ever logged, ‹ is unavailable and does nothing', async ({ page }) => {
  // Given
  await seedDay();
  await clockAt(page, yesterday(11, 40));
  await signInAs(page, testEnv.parentB);
  await button(page, 'Switch to last night').click();
  await button(page, 'Previous: Yesterday').click();
  await button(page, `Previous: ${weekday(-2)} night`).click();
  const previous = button(page, `Previous: ${weekday(-2)}`);
  await expect(previous).toBeDisabled();

  // When
  await previous.click({ force: true });

  // Then
  await expectPager(page, `${weekday(-2)} night`, yesterday(0, 0, -2));
});

test('a past night shows slept, feeds, diapers and medicine in place of the tiles', async ({ page }) => {
  // Given
  await seedDay();
  await clockAt(page, yesterday(11, 40));
  await signInAs(page, testEnv.parentB);

  // When
  await button(page, 'Switch to last night').click();

  // Then
  await expect(page.getByLabel('Last night: 11h 55m slept, 1 feed, 1 diaper, 0 medicine', { exact: true })).toBeVisible();
  for (const tile of ['Start sleep', 'Feed', 'Diaper', 'Medicine']) await expect(button(page, tile)).toBeHidden();
});

test("tapping an entry on a past ring opens the editor in place of the boxes", async ({ page }) => {
  // Given
  await seedDay();
  await clockAt(page, yesterday(11, 40));
  await signInAs(page, testEnv.parentB);
  await button(page, 'Switch to last night').click();

  // When
  await button(page, 'Feed 22:30, Left, 20 minutes').click();

  // Then
  await expect(page.getByLabel('Edit Feed', { exact: true })).toBeVisible();
  await expect(page.getByLabel(/^Last night: /)).toBeHidden();
});

test('the cap and Back to now still work from a ring paged to', async ({ page }) => {
  // Given
  await seedDay();
  await clockAt(page, yesterday(11, 40));
  await signInAs(page, testEnv.parentB);
  await button(page, 'Switch to last night').click();
  await button(page, 'Previous: Yesterday').click();

  // When: the cap pairs windows counting back from now, so yesterday pairs with the night before it
  await button(page, `Switch to ${weekday(-2).toLowerCase()} night`).click();

  // Then
  await expectPager(page, `${weekday(-2)} night`, yesterday(0, 0, -2));

  // When
  await button(page, 'Back to now').click();

  // Then
  await expect(page.getByLabel('Awake 59m, since the nap', { exact: true })).toBeVisible();
});
