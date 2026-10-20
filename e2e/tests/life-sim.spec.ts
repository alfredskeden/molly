import { expect, test, type Page } from '@playwright/test';

import { ALL_DAY, signInAs } from './session';
import { adminFetch, resetChild, testEnv } from './test-env';

test.beforeEach(resetChild);

const button = (page: Page, name: string | RegExp) => page.getByRole('button', { name, exact: typeof name === 'string' }).filter({ visible: true });

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

/** A change logged a few minutes ago: the diaper need is full and earns its moodlet. */
async function changedRecently() {
  await adminFetch('changes/', { method: 'POST', body: JSON.stringify({ child: testEnv.childId, time: minutesAgo(5), wet: true, solid: false }) });
}

/** The rhythm's fetch: two weeks of feeds (the polled entries fetch only since yesterday's midnight). */
function countRhythmRequests(page: Page) {
  const seen = { count: 0 };
  page.on('request', (request) => {
    const url = new URL(request.url());
    const since = url.searchParams.get('start_min');
    if (url.pathname.endsWith('/api/feedings/') && since && Date.now() - Date.parse(since) > 3 * 24 * 60 * 60_000) seen.count++;
  });
  return seen;
}

test('Life Sim draws each logged need as words and a bar, with the mood pill and the moodlets', async ({ page }) => {
  // Given
  await changedRecently();

  // When
  await signInAs(page, testEnv.parentB, { look: 'sim', theme: 'day', children: { [testEnv.childId]: { napWindow: ALL_DAY } } });

  // Then
  await expect(button(page, 'Diaper')).toContainText('Fresh bum');
  await expect(page.getByTestId('need-bar-diaper')).toBeVisible();
  await expect(page.getByTestId('mood-pill')).toBeVisible();
  await expect(page.getByTestId('moodlets')).toContainText('Fresh bum+1');
  // Nothing logged: no words or bar.
  await expect(page.getByTestId('need-bar-feed')).toHaveCount(0);
});

test('with Playful labels off Life Sim keeps its bars and mood pill and drops the words and moodlets', async ({ page }) => {
  // Given
  await changedRecently();

  // When
  await signInAs(page, testEnv.parentB, { look: 'sim', theme: 'day', playful: false, children: { [testEnv.childId]: { napWindow: ALL_DAY } } });

  // Then
  await expect(page.getByTestId('need-bar-diaper')).toBeVisible();
  await expect(page.getByTestId('mood-pill')).toBeVisible();
  await expect(button(page, 'Diaper')).not.toContainText('Fresh bum');
  await expect(page.getByTestId('moodlets')).toHaveCount(0);
});

test("Life Sim's rhythm is fetched once: not on a write, not after a reload", async ({ page }) => {
  // Given
  const rhythm = countRhythmRequests(page);
  await signInAs(page, testEnv.parentB, { look: 'sim', theme: 'day', children: { [testEnv.childId]: { napWindow: ALL_DAY } } });
  await expect(button(page, 'Diaper')).toBeVisible();
  await expect.poll(() => rhythm.count).toBe(1);

  // When
  await button(page, 'Diaper').click();
  await button(page, 'Wet').click();
  await expect(page.getByRole('status')).toHaveText(/Diaper saved/);
  await expect(button(page, 'Diaper')).toContainText('Fresh bum');
  const afterWrite = rhythm.count;
  // The persisted cache is written at most once a second: a restart comes later than that.
  await page.waitForTimeout(1500);
  await page.reload();
  await expect(button(page, 'Diaper')).toContainText('Fresh bum');

  // Then
  expect([afterWrite, rhythm.count]).toEqual([1, 1]);
});

test('Life Sim leads a saved diaper toast with its words, screen readers hearing the plain ones', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { look: 'sim', theme: 'day', children: { [testEnv.childId]: { napWindow: ALL_DAY } } });

  // When
  await button(page, 'Diaper').click();
  await button(page, 'Wet').click();

  // Then
  await expect(page.getByRole('status')).toHaveText(/^Fresh bum! Diaper saved/);
  await expect(page.getByRole('status')).toHaveAccessibleName(/^Diaper saved/);
});

test('another theme never fetches the rhythm', async ({ page }) => {
  // Given
  const rhythm = countRhythmRequests(page);

  // When
  await signInAs(page, testEnv.parentB, { look: 'classic' });
  await expect(button(page, 'Diaper')).toBeVisible();
  await page.waitForTimeout(1500);

  // Then
  expect(rhythm.count).toBe(0);
});
