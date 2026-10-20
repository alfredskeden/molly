import type { Page } from '@playwright/test';

import { testEnv } from './test-env';

type Parent = { id: number; token: string };

/**
 * A nap window covering the whole day. The Today card then runs from local midnight at any real time
 * (no morning wake, no bedtime), for specs that log at the real time or seed around midnight.
 */
export const ALL_DAY = { start: '00:00', end: '23:59' };

/** Skips onboarding: writes what the app stores after it, before the page loads. */
export async function signInAs(page: Page, parent: Parent, settings: Record<string, unknown> = {}) {
  await page.addInitScript(
    ({ credentials, settings }) => {
      if (sessionStorage.getItem('molly.e2e.seeded')) return;
      sessionStorage.setItem('molly.e2e.seeded', '1');
      localStorage.setItem('molly.credentials', JSON.stringify(credentials));
      localStorage.setItem('molly.settings', JSON.stringify(settings));
    },
    {
      credentials: { baseUrl: testEnv.baseUrl, token: parent.token, userId: parent.id },
      settings: { childId: testEnv.childId, ...settings },
    },
  );
  await page.goto('/');
}

/** The Children sheet, from the child's name in the dashboard's header (with more than one child shown). */
export async function openChildren(page: Page) {
  await page.getByRole('button', { name: /^Children, showing / }).click();
}

export async function openSettings(page: Page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
}

export async function openChildSettings(page: Page, name: string) {
  await openSettings(page);
  await page.getByRole('button', { name: new RegExp(`^${name}, `) }).filter({ visible: true }).click();
}

export async function signOutFromSettings(page: Page) {
  await openSettings(page);
  await page.getByRole('button', { name: 'Baby Buddy, Connected' }).filter({ visible: true }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
}

export async function saveChanges(page: Page) {
  await page.getByRole('button', { name: 'Save changes', exact: true }).filter({ visible: true }).click();
}

/** From a child's screen back to the dashboard, through Settings. */
export async function backToDashboard(page: Page) {
  await page.getByRole('link', { name: 'Back to Settings' }).filter({ visible: true }).click();
  await page.getByRole('link', { name: 'Back', exact: true }).filter({ visible: true }).click();
}
