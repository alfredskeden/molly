import { expect, test, type Page } from '@playwright/test';

import { ALL_DAY, backToDashboard, openChildSettings, openSettings, saveChanges, signInAs } from './session';
import { adminFetch, latest, resetChild, testEnv } from './test-env';

test.beforeEach(resetChild);

const button = (page: Page, name: string | RegExp) =>
  page.getByRole('button', typeof name === 'string' ? { name, exact: true } : { name }).filter({ visible: true });
const radio = (page: Page, group: string, name: string) =>
  page.getByRole('radiogroup', { name: group }).filter({ visible: true }).getByRole('radio', { name, exact: true });
const saveBar = (page: Page) => page.getByRole('button', { name: /^(Save changes|Saved)$/ }).filter({ visible: true });

// src/theme/tokens.ts `bg`
const DAY_BG = 'rgb(249, 244, 238)';
const NIGHT_BG = 'rgb(24, 18, 15)';

/** The colour actually painted behind the top-left corner of the page. */
const pageBackground = (page: Page) =>
  page.evaluate(() => {
    for (let el = document.elementFromPoint(4, 4); el; el = el.parentElement) {
      const color = getComputedStyle(el).backgroundColor;
      if (color !== 'rgba(0, 0, 0, 0)') return color;
    }
    return null;
  });

/** The font a piece of text is drawn in (the last match: the dashboard stays mounted under Settings). */
const fontOf = (page: Page, text: string) =>
  page.getByText(text, { exact: true }).last().evaluate((element) => getComputedStyle(element).fontFamily);

for (const [scheme, expected] of [
  ['light', DAY_BG],
  ['dark', NIGHT_BG],
] as const) {
  test(`following the phone, the app follows a ${scheme} browser`, async ({ page }) => {
    // Given
    await page.emulateMedia({ colorScheme: scheme });

    // When
    await signInAs(page, testEnv.parentB);
    await openSettings(page);

    // Then
    await expect(radio(page, 'Colours', 'Follow the phone')).toBeChecked();
    expect(await pageBackground(page)).toBe(expected);
  });
}

test('1h: Colours is a draft until Save, which applies it, says so and survives a reload', async ({ page }) => {
  // Given
  await page.emulateMedia({ colorScheme: 'light' });
  await signInAs(page, testEnv.parentB);
  await openSettings(page);
  await expect(saveBar(page)).toHaveText('Saved');

  // When
  await radio(page, 'Colours', 'Night').click();

  // Then
  await expect(saveBar(page)).toHaveText('Save changes');
  expect(await pageBackground(page)).toBe(DAY_BG);

  // When
  await saveChanges(page);

  // Then
  await expect(page.getByRole('status')).toHaveText('Settings saved');
  await expect(saveBar(page)).toHaveText('Saved');
  expect(await pageBackground(page)).toBe(NIGHT_BG);
  await page.reload();
  await expect(radio(page, 'Colours', 'Night')).toBeChecked();
});

test('leaving Settings with changes drops them and says so', async ({ page }) => {
  // Given
  await page.emulateMedia({ colorScheme: 'light' });
  await signInAs(page, testEnv.parentB);
  await openSettings(page);
  await radio(page, 'Colours', 'Night').click();

  // When
  await page.getByRole('link', { name: 'Back', exact: true }).filter({ visible: true }).click();

  // Then
  await expect(page.getByRole('status')).toHaveText('Changes not saved');
  expect(await pageBackground(page)).toBe(DAY_BG);
  await openSettings(page);
  await expect(radio(page, 'Colours', 'Follow the phone')).toBeChecked();
});

test('1l: the Theme row opens eight themes, and one applies at once without Save', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB);
  await openSettings(page);

  // When
  await button(page, 'Theme, Molly Classic').click();

  // Then
  const themes = page.getByRole('radiogroup', { name: 'Theme' }).getByRole('radio');
  await expect(themes).toHaveCount(8);
  await expect(page.getByRole('radio', { name: /^Molly Classic\./ })).toBeChecked();

  // When
  await page.getByRole('radio', { name: /^Arcade\./ }).click();

  // Then
  await expect(page.getByRole('status')).toHaveText('Theme changed to Arcade');
  await expect(page.getByRole('radio', { name: /^Arcade\./ })).toBeChecked();
  await expect(saveBar(page)).toHaveText('Saved');
  expect(await fontOf(page, 'Options')).toContain('PixelifySans');
  await page.reload();
  await expect(button(page, 'Theme, Arcade')).toBeVisible();
});

test('Ribbon comes second, applies at once in its fonts and rose Add button, and survives a reload', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { theme: 'day' });
  await openSettings(page);
  await button(page, 'Theme, Molly Classic').click();
  const ribbon = page.getByRole('radiogroup', { name: 'Theme' }).getByRole('radio').nth(1);

  // Then
  await expect(ribbon).toHaveAccessibleName(/^Ribbon\. /);
  await expect(ribbon.getByText('New', { exact: true })).toHaveCount(0);

  // When
  await ribbon.click();

  // Then
  await expect(page.getByRole('status')).toHaveText('Theme changed to Ribbon');
  await expect(ribbon).toBeChecked();
  await page.reload();
  await expect(button(page, 'Theme, Ribbon')).toBeVisible();
  expect(await fontOf(page, 'Changes at once')).toContain('Mulish');

  // When
  await page.getByRole('link', { name: 'Back', exact: true }).filter({ visible: true }).click();

  // Then
  expect(await fontOf(page, 'Sleep')).toContain('DMSerifDisplay');
  // src/theme/themes.ts RIBBON.day.accent
  await expect(button(page, 'Add entry')).toHaveCSS('background-color', 'rgb(168, 63, 94)');
});

test('Life Sim comes third with a New badge, applies at once in Fredoka and its blue Add button, and survives a reload', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { theme: 'day' });
  await openSettings(page);
  await button(page, 'Theme, Molly Classic').click();
  const sim = page.getByRole('radiogroup', { name: 'Theme' }).getByRole('radio').nth(2);

  // Then
  await expect(sim).toHaveAccessibleName(/^Life Sim, new\. /);
  await expect(sim.getByText('New', { exact: true })).toBeVisible();

  // When
  await sim.click();

  // Then
  await expect(page.getByRole('status')).toHaveText('Theme changed to Life Sim');
  await expect(sim).toBeChecked();
  await page.reload();
  await expect(button(page, 'Theme, Life Sim')).toBeVisible();

  // When
  await page.getByRole('link', { name: 'Back', exact: true }).filter({ visible: true }).click();

  // Then
  expect(await fontOf(page, 'Sleep')).toContain('Fredoka');
  // src/theme/themes.ts SIM.day.accent
  await expect(button(page, 'Add entry')).toHaveCSS('background-color', 'rgb(9, 97, 187)');
});

test("in Arcade the tiles use its words, screen readers the plain ones, and a toast the theme's", async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { look: 'arcade' });

  // When
  await button(page, 'Start sleep').click();

  // Then
  await expect(page.getByRole('status')).toHaveText(/^Save point started just now$/);
  await expect(button(page, /^Stop sleep, /)).toContainText('Continue? Wake up');
  await expect(button(page, 'Feed')).toContainText('Power-up');
});

test('Playful labels off keeps the look with plain words, and survives a reload', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { look: 'arcade' });
  await openSettings(page);

  // When
  await page.getByRole('switch', { name: 'Playful labels' }).click();
  await saveChanges(page);

  // Then
  await expect(page.getByRole('status')).toHaveText('Settings saved');
  expect(await fontOf(page, 'Settings')).toContain('PixelifySans');
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Playful labels' })).not.toBeChecked();
  await page.getByRole('link', { name: 'Back', exact: true }).click();
  await expect(button(page, 'Feed')).toContainText('Feed');
});

test('1i: the child screen saves its day and night, bottle and colour, and says so', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB);
  await openChildSettings(page, 'Test');

  // When
  await button(page, 'Day starts 15 minutes later').click();
  await button(page, 'Day ends 15 minutes earlier').click();
  await radio(page, 'Bottle', 'Breast milk').click();
  await button(page, 'Amount 10 ml less').click();
  await radio(page, 'Colour', 'Lavender').click();
  await saveChanges(page);

  // Then
  await expect(page.getByRole('status')).toHaveText("Test's settings saved");
  const settings = JSON.parse((await page.evaluate(() => localStorage.getItem('molly.settings'))) ?? '{}');
  expect(settings.children[testEnv.childId]).toMatchObject({
    napWindow: { start: '07:15', end: '18:45' },
    bottle: { type: 'breast milk', amount: 110 },
    hue: 4,
  });
});

test("a child's bottle is where the first bottle's amount starts", async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB);
  await openChildSettings(page, 'Test');
  await radio(page, 'Bottle', 'Breast milk').click();
  for (let i = 0; i < 3; i++) await button(page, 'Amount 10 ml less').click();
  await saveChanges(page);
  await backToDashboard(page);

  // When
  await button(page, 'Feed').click();
  await button(page, 'Bottle').click();
  await button(page, 'Save 90 millilitres').click();

  // Then
  await expect(page.getByRole('status')).toHaveText(/^Feed saved · Bottle 90 ml$/);
  await expect.poll(() => latest('feedings')).toMatchObject({ type: 'breast milk', method: 'bottle', amount: 90 });
});

test("a child's day and night is used for the next sleep and moves the ring's day", async ({ page }) => {
  // Given
  const now = new Date();
  const at = (hours: number, minutes: number, days = 0) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1 + days, hours, minutes);
  await adminFetch('sleep/', {
    method: 'POST',
    body: JSON.stringify({ child: testEnv.childId, start: at(19, 30, -1).toISOString(), end: at(6, 40).toISOString(), nap: false }),
  });
  await adminFetch('sleep/', {
    method: 'POST',
    body: JSON.stringify({ child: testEnv.childId, start: at(16, 30).toISOString(), end: at(17, 0).toISOString(), nap: true }),
  });
  await page.clock.install({ time: at(18, 20) });
  await signInAs(page, testEnv.parentB);
  await expect(page.getByText(/^Today · /).filter({ visible: true })).toBeVisible();

  // When: the day ends at 17:00 now (the usual bedtime until one is learned), so the 16:30 sleep, within 90 min of it, was bedtime
  await openChildSettings(page, 'Test');
  for (let i = 0; i < 8; i++) await button(page, 'Day ends 15 minutes earlier').click();
  await saveChanges(page);
  await backToDashboard(page);

  // Then
  await expect(page.getByText(/^Tonight · /).filter({ visible: true })).toBeVisible();
  await expect(page.getByText('Bedtime 16:30', { exact: true }).filter({ visible: true })).toBeVisible();
});

test('leaving the child screen with changes drops them and says so', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { children: { [testEnv.childId]: { napWindow: ALL_DAY } } });
  await openChildSettings(page, 'Test');
  await button(page, 'Day starts 15 minutes later').click();

  // When
  await page.getByRole('link', { name: 'Back to Settings' }).filter({ visible: true }).click();

  // Then
  await expect(page.getByRole('status')).toHaveText('Changes not saved');
  await page.getByRole('button', { name: /^Test, / }).filter({ visible: true }).click();
  await expect(page.getByLabel('Day starts 00:00', { exact: true })).toBeVisible();
});

test('the segments and switches say which one is chosen', async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentB, { theme: 'day' });
  await openSettings(page);

  // Then
  await expect(radio(page, 'Colours', 'Day')).toBeChecked();
  await expect(radio(page, 'Colours', 'Night')).not.toBeChecked();
  await page.getByRole('button', { name: /^Test, / }).filter({ visible: true }).click();
  await expect(page.getByRole('switch', { name: 'Show in Molly' })).toBeChecked();
});
