import { expect, test, type Page } from '@playwright/test';

import { openChildSettings, saveChanges, signInAs } from './session';
import { adminFetch, resetChild, testEnv } from './test-env';

type Child = { id: number; slug: string; first_name: string };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Baby Buddy's date for this many days ago. */
const daysAgo = (days: number) => {
  const date = new Date(Date.now() - days * DAY_MS);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const created: Child[] = [];

async function createChild(firstName: string, bornDaysAgo: number): Promise<Child> {
  const child = (await adminFetch('children/', {
    method: 'POST',
    body: JSON.stringify({ first_name: firstName, last_name: 'Test', birth_date: daysAgo(bornDaysAgo) }),
  })) as Child;
  created.push(child);
  return child;
}

test.beforeEach(resetChild);

test.afterEach(async () => {
  for (const child of created.splice(0)) await adminFetch(`children/${child.slug}/`, { method: 'DELETE' });
});

/** About 5 months and 2 weeks: the 5-month page. */
const FIVE_MONTHS = 168;

const card = (page: Page) => page.getByRole('button', { name: /^Development, / }).filter({ visible: true });
const note = (page: Page) => page.getByLabel('About the guide', { exact: true });
const heading = (page: Page, name: string) => page.getByRole('heading', { name, exact: true }).filter({ visible: true });

async function openGuide(page: Page, name: string) {
  await openChildSettings(page, name);
  await card(page).click();
}

test("the child screen's Development card opens on the child's page", async ({ page }) => {
  // Given
  await createChild('Ella', FIVE_MONTHS);
  await signInAs(page, testEnv.parentB, { guideNoteSeen: true });

  // When
  await openChildSettings(page, 'Ella');

  // Then
  await expect(card(page)).toHaveAccessibleName(/^Development, Month 5\. What to expect at 5 months\. /);
  await card(page).click();
  await expect(heading(page, '5 months')).toBeVisible();
  await expect(page.getByText(/^Ella is 5 months/)).toBeVisible();
});

test('past 3 years the card says the guide has ended, and opens on its last page', async ({ page }) => {
  // Given
  await createChild('Sam', 40 * 31);
  await signInAs(page, testEnv.parentB, { guideNoteSeen: true });

  // When
  await openChildSettings(page, 'Sam');

  // Then
  await expect(card(page)).toHaveAccessibleName(/The guide ends at 3 years/);
  await card(page).click();
  await expect(heading(page, '36 months')).toBeVisible();
  await expect(page.getByText(/^Sam was here in /)).toBeVisible();
});

test('the note about the guide shows the first time only, and keeps the region picked', async ({ page }) => {
  // Given
  await createChild('Ella', FIVE_MONTHS);
  await signInAs(page, testEnv.parentB);

  // When
  await openGuide(page, 'Ella');
  await expect(note(page)).toBeVisible();
  await note(page).getByRole('radio', { name: 'International' }).click();
  await page.getByRole('button', { name: 'Start reading', exact: true }).click();

  // Then
  await expect(note(page)).toHaveCount(0);
  await expect(page.getByText('Guidance: International')).toBeVisible();
  await page.reload();
  await expect(heading(page, '5 months')).toBeVisible();
  await expect(note(page)).toHaveCount(0);
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('molly.settings'))) ?? '{}')).toMatchObject({
    guideNoteSeen: true,
    guideRegion: 'international',
  });
});

test('the month strip and All ages move between pages, topics open, and Back returns step by step', async ({ page }) => {
  // Given
  await createChild('Ella', FIVE_MONTHS);
  await signInAs(page, testEnv.parentB, { guideNoteSeen: true });
  await openGuide(page, 'Ella');

  // When
  await page.getByRole('tab', { name: '6 months', exact: true }).click();

  // Then
  await expect(heading(page, '6 months')).toBeVisible();
  await expect(page.getByText('Ella reaches this in 2 weeks')).toBeVisible();

  // When
  await page.getByRole('button', { name: 'All ages', exact: true }).click();
  await expect(heading(page, 'All ages')).toBeVisible();
  await page.getByRole('button', { name: /^8 months, / }).click();

  // Then
  await expect(heading(page, '8 months')).toBeVisible();

  // When
  await page.getByRole('button', { name: /^Movement\. / }).filter({ visible: true }).click();

  // Then
  await expect(heading(page, 'Crawling and pulling up')).toBeVisible();
  await expect(page.getByText(/^\d+ min read$/).filter({ visible: true })).toBeVisible();

  // When
  await page.getByRole('link', { name: 'Back to 8 months' }).filter({ visible: true }).click();
  await page.getByRole('link', { name: 'Back to Ella' }).filter({ visible: true }).click();

  // Then
  await expect(card(page)).toBeVisible();
});

test('Guidance in Settings changes the Health contacts and puts its own sources first', async ({ page }) => {
  // Given
  await createChild('Ella', FIVE_MONTHS);
  await signInAs(page, testEnv.parentB, { guideNoteSeen: true });
  await openGuide(page, 'Ella');
  await page.getByRole('button', { name: /^Health\. / }).filter({ visible: true }).click();
  const readMore = page.getByRole('link', { name: /, (1177|Rikshandboken|Folkhälsomyndigheten|CDC|NHS|WHO)/ }).filter({ visible: true });

  // Then
  await expect(page.getByText(/^If you're worried, contact BVC or call 1177/).filter({ visible: true })).toBeVisible();
  await expect(readMore.first()).toHaveAccessibleName(/, (1177|Rikshandboken|Folkhälsomyndigheten)/);

  // When
  await page.goto('/settings');
  await page.getByRole('radio', { name: 'International', exact: true }).click();
  await saveChanges(page);
  await page.goBack();

  // Then
  await expect(page.getByText(/^If you're worried, contact your child's doctor or nurse/).filter({ visible: true })).toBeVisible();
  await expect(readMore.first()).toHaveAccessibleName(/, (CDC|NHS|WHO)/);
});

test('a Read more link opens its source in a new tab', async ({ page, context }) => {
  // Given
  await createChild('Ella', FIVE_MONTHS);
  await signInAs(page, testEnv.parentB, { guideNoteSeen: true, guideRegion: 'international' });
  await openGuide(page, 'Ella');
  await page.getByRole('button', { name: /^Sounds and talking\. / }).filter({ visible: true }).click();

  // When
  const opened = context.waitForEvent('page');
  await page.getByRole('link', { name: /^Milestones by 4 months, CDC$/ }).filter({ visible: true }).click();

  // Then
  expect((await opened).url()).toBe('https://www.cdc.gov/act-early/milestones/4-months.html');
  await expect(heading(page, 'Babbling, laughing, turning to voices')).toBeVisible();
});

test("the Sleep topic shows the child's own numbers once 3 full days are logged", async ({ page }) => {
  // Given
  const ella = await createChild('Ella', FIVE_MONTHS);
  const today = new Date();
  const at = (back: number, hours: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - back, hours).toISOString();
  for (const back of [5, 4, 3, 2, 1]) {
    await adminFetch('sleep/', { method: 'POST', body: JSON.stringify({ child: ella.id, start: at(back, 9), end: at(back, 10) }) });
    await adminFetch('sleep/', { method: 'POST', body: JSON.stringify({ child: ella.id, start: at(back, 13), end: at(back, 14) }) });
  }
  await signInAs(page, testEnv.parentB, { guideNoteSeen: true });
  await openGuide(page, 'Ella');

  // When
  await page.getByRole('button', { name: /^Sleep\. / }).filter({ visible: true }).click();

  // Then
  await expect(page.getByText('Many children this age sleep 12–16 hours in 24 hours, naps included.')).toBeVisible();
  await expect(page.getByText(/^Ella, last 4 days: 2h 0m a day, 2 naps$/)).toBeVisible();
});

test('opening Settings from the guide footer shows the Guidance row', async ({ page }) => {
  // Given
  await createChild('Ella', FIVE_MONTHS);
  await signInAs(page, testEnv.parentB, { guideNoteSeen: true });
  await openGuide(page, 'Ella');

  // When
  await page.getByRole('link', { name: 'Change the guidance in Settings' }).filter({ visible: true }).click();

  // Then
  await expect(page.getByRole('radiogroup', { name: 'Guidance' })).toBeVisible();
});

test("the Health topic's weight row shows the latest weight, or None yet, and opens the weight screen", async ({ page }) => {
  // Given
  const ella = await createChild('Ella', FIVE_MONTHS);
  await signInAs(page, testEnv.parentB, { guideNoteSeen: true });
  await openGuide(page, 'Ella');
  await page.getByRole('button', { name: /^Health\. / }).filter({ visible: true }).click();

  // Then
  await expect(page.getByRole('button', { name: 'Weight, None yet' })).toBeVisible();

  // When
  await adminFetch('weight/', { method: 'POST', body: JSON.stringify({ child: ella.id, weight: 7050, date: daysAgo(2) }) });
  await page.reload();

  // Then
  await page.getByRole('button', { name: 'Weight, 7 050 g' }).click();
  await expect(page.getByRole('heading', { name: 'Weight', exact: true })).toBeVisible();
});
