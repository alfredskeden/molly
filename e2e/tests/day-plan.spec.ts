import { expect, test, type Page } from '@playwright/test';

import { signInAs } from './session';
import { adminFetch, resetChild, testEnv } from './test-env';

/**
 * The day is seeded into yesterday and the browser clock set on it (Baby Buddy refuses entries in the
 * future). The child is made 4 months and a few days old on that day: the 3–5 month band, 1h 15m –
 * 2h 30m awake, no history, so every window comes from the age guide and each planned nap lasts 45m.
 */
const yesterday = (hours: number, minutes = 0, dayOffset = 0) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1 + dayOffset, hours, minutes);
};
const isoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

let childSlug: string;
let seededBirthDate: string;

test.beforeEach(async () => {
  await resetChild();
  const children = (await adminFetch('children/')) as { results: { id: number; slug: string; birth_date: string }[] };
  const child = children.results.find((candidate) => candidate.id === testEnv.childId)!;
  childSlug = child.slug;
  seededBirthDate = child.birth_date;
  const day = yesterday(12);
  const born = new Date(day.getFullYear(), day.getMonth() - 4, day.getDate() - 5);
  await adminFetch(`children/${childSlug}/`, { method: 'PATCH', body: JSON.stringify({ birth_date: isoDate(born) }) });
});

test.afterEach(async () => {
  await adminFetch(`children/${childSlug}/`, { method: 'PATCH', body: JSON.stringify({ birth_date: seededBirthDate }) });
  // Specs that don't reset first (onboarding) expect no running timer.
  await resetChild();
});

const post = (path: string, body: object) =>
  adminFetch(path, { method: 'POST', body: JSON.stringify({ child: testEnv.childId, ...body }) });
const sleep = (from: [number, number], to: [number, number], nap: boolean, toDayOffset = 0) =>
  post('sleep/', { start: yesterday(...from).toISOString(), end: yesterday(...to, toDayOffset).toISOString(), nap });

/** Woke at 06:40 after a night from 19:30, then napped 08:40–09:25. */
async function morning() {
  await post('sleep/', { start: yesterday(19, 30, -1).toISOString(), end: yesterday(6, 40).toISOString(), nap: false });
  await sleep([8, 40], [9, 25], true);
}

/** Starts the browser clock just after `time`, as the clock runs on while the page loads. */
async function clockAt(page: Page, time: Date) {
  await page.clock.install({ time: new Date(time.getTime() + 1_000) });
}

const row = (page: Page) => page.getByTestId('window-row');
const label = (page: Page, text: string) => page.getByText(text, { exact: true });
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
/** Skip lives in the likely-sleep panel, which the row opens. */
async function skip(page: Page, name: string) {
  await row(page).click();
  await button(page, name).click();
}

test('the ring shows every likely sleep until bedtime, the row the next with the rest under it', async ({ page }) => {
  // Given
  await morning();
  await clockAt(page, yesterday(10, 50));

  // When
  await signInAs(page, testEnv.parentB);

  // Then
  await expect(row(page)).toContainText('Nap 2 likely10:401h 5m left');
  await expect(row(page)).toContainText('Then nap 3 in 2h 28m · nap 4 in 5h 6m · bedtime 18:59');
  // On the ring: how soon each nap is (the open one says now), and bedtime's time; the nap's clock is only on the row.
  for (const text of ['now', 'in 2h 28m', 'in 5h 6m', '18:59']) await expect(label(page, text).first()).toBeVisible();
  await expect(label(page, '10:40')).toHaveCount(1);
  await expect(row(page).getByText('10:40', { exact: true })).toBeVisible();
});

test('Tonight has no likely sleeps on the ring', async ({ page }) => {
  // Given
  await morning();
  await sleep([19, 25], [22, 30], false);
  await clockAt(page, yesterday(23, 10));

  // When
  await signInAs(page, testEnv.parentB);

  // Then
  await expect(page.getByText(/^Tonight · /)).toBeVisible();
  await expect(page.getByText('Bedtime 19:25', { exact: true })).toBeVisible();
  await expect(row(page)).toHaveCount(0);
});

/** Asleep since 10:30: with no history the nap is taken to last 45m, to 11:15. */
const napFrom1030 = () => post('timers/', { name: 'molly:sleep', start: yesterday(10, 30).toISOString() });

test('while a nap runs the ring and row show the sleeps after it, without Skip', async ({ page }) => {
  // Given
  await morning();
  await napFrom1030();
  await clockAt(page, yesterday(10, 50));

  // When
  await signInAs(page, testEnv.parentB);

  // Then
  await expect(page.getByRole('button', { name: /^Stop sleep, / })).toBeVisible();
  await expect(row(page)).toContainText('Nap 3 likely12:30in 1h 40m');
  await expect(row(page)).toContainText('Then nap 4 in 4h 18m · nap 5 in 6h 56m · bedtime 20:49');
  for (const text of ['in 1h 40m', 'in 4h 18m', '20:49']) await expect(label(page, text).first()).toBeVisible();
  await row(page).click();
  await expect(page.getByRole('button', { name: /^Skip / })).toHaveCount(0);
  await button(page, 'Close').click();
  await expect(page.getByRole('button', { name: /^Nap 08:40 to 09:25, / })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Sleeping since 10:30, / })).toBeVisible();
});

test('the likely sleeps hold through a nap of usual length and move by its overrun after', async ({ page }) => {
  // Given
  await morning();
  await napFrom1030();
  await clockAt(page, yesterday(10, 50));
  await signInAs(page, testEnv.parentB);
  await expect(row(page)).toContainText('Nap 3 likely12:30in 1h 40m');

  // When
  await page.clock.fastForward('15:00');

  // Then
  // Still 12:30, as at 10:50.
  await expect(row(page)).toContainText('Nap 3 likely12:30in 1h 25m');

  // When
  await page.clock.fastForward('40:00');

  // Then
  // Asleep 30m past 11:15: the nap opens 30m later, 13:00.
  await expect(row(page)).toContainText('Nap 3 likely13:00in 1h 15m');
});

test('stopping the nap plans from the real wake and brings Skip back', async ({ page }) => {
  // Given
  await morning();
  const timer = (await napFrom1030()) as { id: number };
  await clockAt(page, yesterday(10, 50));
  await signInAs(page, testEnv.parentB);
  await expect(row(page)).toContainText('Nap 3 likely12:30in 1h 40m');

  // When
  // Stopped on the server: Baby Buddy would end a timer stop at its own clock, not the page's.
  await adminFetch(`timers/${timer.id}/`, { method: 'DELETE' });
  await sleep([10, 30], [10, 50], true);
  await page.reload();

  // Then
  await expect(row(page)).toContainText('Nap 3 likely12:05in 1h 15m');
  await row(page).click();
  await expect(button(page, 'Skip nap 3')).toBeVisible();
});

test('while a feed runs the likely sleeps and Skip stay', async ({ page }) => {
  // Given
  await morning();
  await post('timers/', { name: 'molly:feeding', start: yesterday(10, 30).toISOString() });
  await clockAt(page, yesterday(10, 50));

  // When
  await signInAs(page, testEnv.parentB);

  // Then
  await expect(page.getByRole('button', { name: /^Stop feed, / })).toBeVisible();
  await expect(row(page)).toContainText('Nap 2 likely10:401h 5m left');
  await expect(label(page, 'in 2h 28m').first()).toBeVisible();
  await row(page).click();
  await expect(button(page, 'Skip nap 2')).toBeVisible();
});

/** Napped 13:30–14:30 as well: the next nap, 15:45 – 17:00, is the last before bedtime (18:48). */
async function afternoon() {
  await morning();
  await sleep([13, 30], [14, 30], true);
}

const skipNotes = async (tag: string) =>
  ((await adminFetch(`notes/?child=${testEnv.childId}&tags=${tag}`)) as { results: { note: string; tags: string[] }[] }).results;

test('while the bedtime sleep runs nothing is likely after it', async ({ page }) => {
  // Given
  await afternoon();
  await post('timers/', { name: 'molly:sleep', start: yesterday(19, 10).toISOString() });
  await clockAt(page, yesterday(19, 20));

  // When
  await signInAs(page, testEnv.parentB);

  // Then
  await expect(page.getByRole('button', { name: /^Stop sleep, / })).toBeVisible();
  await expect(row(page)).toHaveCount(0);
  await expect(page.getByText(/^in \d/)).toHaveCount(0);
});

test('skipping the last nap moves bedtime earlier at once', async ({ page }) => {
  // Given
  await afternoon();
  await clockAt(page, yesterday(15, 0));
  await signInAs(page, testEnv.parentB);
  await expect(row(page)).toContainText('Nap 3 likely15:45in 45m');

  // When
  await skip(page, 'Skip nap 3');

  // Then
  await expect(row(page)).toContainText('Bedtime likely18:03–18:53');
  await expect(page.getByRole('status')).toHaveText('Nap skipped · bedtime likely 18:03');
  await expect(label(page, 'in 45m')).toHaveCount(0);
  await row(page).click();
  await expect(page.getByRole('button', { name: /^Skip / })).toHaveCount(0);
  await expect.poll(() => skipNotes('molly-skip')).toMatchObject([{ note: 'Skipped nap 15:45–17:00' }]);
});

test("the toast's Undo brings the nap back and retags the note instead of deleting it", async ({ page }) => {
  // Given
  await afternoon();
  await clockAt(page, yesterday(15, 0));
  await signInAs(page, testEnv.parentB);
  await skip(page, 'Skip nap 3');
  await expect.poll(async () => (await skipNotes('molly-skip')).length).toBe(1);

  // When
  await button(page, 'Undo').click();

  // Then
  await expect(row(page)).toContainText('Nap 3 likely15:45in 45m');
  await row(page).click();
  await expect(button(page, 'Skip nap 3')).toBeVisible();
  await expect.poll(() => skipNotes('molly-skip-undone')).toMatchObject([{ note: 'Skipped nap 15:45–17:00' }]);
  expect(await skipNotes('molly-skip')).toEqual([]);
});

test('a sleep of 15 minutes or more after the skip ends it', async ({ page }) => {
  // Given
  await afternoon();
  await clockAt(page, yesterday(15, 0));
  await signInAs(page, testEnv.parentB);
  await skip(page, 'Skip nap 3');
  await expect(row(page)).toContainText('Bedtime likely18:03–18:53');

  // When
  await sleep([15, 10], [15, 30], true);
  await page.clock.fastForward('40:00');

  // Then
  await expect(row(page)).not.toContainText('18:03–18:53');
});

test("the other parent's phone shows the same skip", async ({ page, browser }) => {
  // Given
  await afternoon();
  await clockAt(page, yesterday(15, 0));
  await signInAs(page, testEnv.parentB);
  await skip(page, 'Skip nap 3');
  await expect.poll(async () => (await skipNotes('molly-skip')).length).toBe(1);

  // When
  const other = await (await browser.newContext()).newPage();
  await clockAt(other, yesterday(15, 1));
  await signInAs(other, testEnv.parentA);

  // Then
  await expect(other.getByTestId('window-row')).toContainText('Bedtime likely18:03–18:53');
  await other.context().close();
});

test('a refused skip undoes itself and says which permission is missing', async ({ page }) => {
  // Given
  await afternoon();
  await clockAt(page, yesterday(15, 0));
  await page.route(`${testEnv.baseUrl}/api/notes/`, (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'You do not have permission to perform this action.' }),
        })
      : route.continue(),
  );
  await signInAs(page, testEnv.parentB);

  // When
  await skip(page, 'Skip nap 3');

  // Then
  await expect(page.getByRole('status')).toContainText("Couldn't skip the nap.");
  await expect(row(page)).toContainText('Nap 3 likely15:45in 45m');
});
