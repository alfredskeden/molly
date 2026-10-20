import { expect, test, type Page } from '@playwright/test';

import { openSettings, signOutFromSettings } from './session';
import { adminFetch, testEnv } from './test-env';

async function connect(page: Page, url: string, key: string) {
  await page.goto('/');
  await page.getByLabel('Baby Buddy address').fill(url);
  await page.getByLabel('API key').fill(key);
  await page.getByRole('button', { name: 'Connect' }).click();
}

test('a valid address and key for one child go straight to the permissions checklist', async ({ page }) => {
  // Given
  const onlyOneChild = testEnv.baseUrl;

  // When
  await connect(page, onlyOneChild, testEnv.parentA.token);

  // Then
  await expect(page.getByText('Before you start')).toBeVisible();
  await expect(page.getByText(/delete timer permission/)).toBeVisible();
  await expect(page.getByText('Which children?')).toHaveCount(0);
});

test("pasting Baby Buddy's login QR code text fills in the address and key", async ({ page }) => {
  // Given
  const loginCode = `BABYBUDDY-LOGIN:${JSON.stringify({ url: `${testEnv.baseUrl}/`, api_key: testEnv.parentA.token, session_cookies: {} })}`;
  await page.goto('/');

  // When
  await page.getByLabel('Baby Buddy address').fill(loginCode);
  await page.getByRole('button', { name: 'Connect' }).click();

  // Then
  await expect(page.getByText('Before you start')).toBeVisible();
});

test('after the checklist the dashboard is shown, and the note is not shown again', async ({ page }) => {
  // Given
  await connect(page, testEnv.baseUrl, testEnv.parentA.token);
  await page.getByRole('button', { name: 'Continue' }).click();

  // When
  await page.reload();

  // Then
  await expect(page.getByRole('button', { name: 'Start sleep' })).toBeVisible();
  await expect(page.getByText('Before you start')).toHaveCount(0);
});

test('a wrong key is rejected', async ({ page }) => {
  // Given
  const wrongKey = 'not-a-real-key';

  // When
  await connect(page, testEnv.baseUrl, wrongKey);

  // Then
  await expect(page.getByRole('alert')).toContainText('Key rejected');
});

test('an address other than the configured Baby Buddy shows cannot reach, with every hint', async ({ page }) => {
  // Given
  const otherAddress = 'http://localhost:1';

  // When
  await connect(page, otherAddress, testEnv.parentA.token);

  // Then
  const alert = page.getByRole('alert');
  await expect(alert).toContainText("Can't reach Baby Buddy.");
  await expect(alert).toContainText('CORS_ALLOWED_ORIGINS');
  await expect(alert).toContainText('Cloudflare Access');
  await expect(alert).toContainText('BABY_BUDDY_ORIGIN');
});

test("the can't-reach message links to how to fix it", async ({ page }) => {
  // Given
  await connect(page, 'http://localhost:1', testEnv.parentA.token);

  // When
  await page.getByRole('link', { name: 'How to fix' }).click();

  // Then
  await expect(page.getByRole('heading', { name: "Can't reach Baby Buddy" })).toBeVisible();
  await expect(page.getByText(/CORS_ALLOWED_ORIGINS/).filter({ visible: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByText('Connect to Baby Buddy')).toBeVisible();
});

test('Molly opened from an origin Baby Buddy does not allow is blocked by CORS and shows cannot reach', async ({
  page,
}) => {
  // Given
  const originBabyBuddyDoesNotAllow = 'http://127.0.0.1:8080';
  await page.goto(`${originBabyBuddyDoesNotAllow}/`);

  // When
  await page.getByLabel('Baby Buddy address').fill(testEnv.baseUrl);
  await page.getByLabel('API key').fill(testEnv.parentA.token);
  await page.getByRole('button', { name: 'Connect' }).click();

  // Then
  await expect(page.getByRole('alert')).toContainText("Can't reach Baby Buddy.");
});

test.describe('with several children', () => {
  let secondChild: { slug: string; id: number };

  test.beforeEach(async () => {
    secondChild = (await adminFetch('children/', {
      method: 'POST',
      body: JSON.stringify({ first_name: 'Second', last_name: 'Child', birth_date: '2026-01-01' }),
    })) as { slug: string; id: number };
  });

  test.afterEach(async () => {
    await adminFetch(`children/${secondChild.slug}/`, { method: 'DELETE' });
  });

  test('onboarding asks which children with both ticked, and an unticked one is saved hidden', async ({ page }) => {
    // Given
    await connect(page, testEnv.baseUrl, testEnv.parentA.token);
    await expect(page.getByText('Which children?')).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Test Baby' })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Second Child' })).toBeChecked();
    await expect(page.getByRole('button', { name: 'Continue with 2 children' })).toBeEnabled();

    // When
    await page.getByRole('checkbox', { name: 'Test Baby' }).click();
    await page.getByRole('button', { name: 'Continue with 1 child' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    // Then
    await expect(page.getByRole('button', { name: 'Start sleep' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Second', exact: true })).toBeVisible();
    const settings = await page.evaluate(() => localStorage.getItem('molly.settings'));
    expect(JSON.parse(settings ?? '{}')).toMatchObject({ childId: secondChild.id, children: { [testEnv.childId]: { shown: false } } });
    await openSettings(page);
    await expect(page.getByRole('button', { name: /^Test, .* · hidden$/ }).filter({ visible: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Second, \d+ \w+$/ }).filter({ visible: true })).toBeVisible();
  });

  test('with every child unticked the button asks to pick at least one', async ({ page }) => {
    // Given
    await connect(page, testEnv.baseUrl, testEnv.parentA.token);

    // When
    await page.getByRole('checkbox', { name: 'Test Baby' }).click();
    await page.getByRole('checkbox', { name: 'Second Child' }).click();

    // Then
    await expect(page.getByRole('button', { name: 'Pick at least one' })).toBeDisabled();
  });
});

test('signing out clears the stored credentials and returns to onboarding', async ({ page }) => {
  // Given
  await connect(page, testEnv.baseUrl, testEnv.parentA.token);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('button', { name: 'Start sleep' })).toBeVisible();

  // When
  await signOutFromSettings(page);

  // Then
  await expect(page.getByText('Connect to Baby Buddy')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('molly.credentials'))).toBeNull();
  await page.reload();
  await expect(page.getByText('Connect to Baby Buddy')).toBeVisible();
});
