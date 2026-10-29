import { expect, test, type Page } from '@playwright/test';

import { signInAs } from './session';
import { adminFetch, testEnv } from './test-env';

type Note = { id: number; child: number; note: string; time: string; tags: string[]; image: string | null };
type Page_<T> = { results: T[] };

/** A 1×1 PNG, the smallest photo Baby Buddy accepts. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const day = (offset: number, hours = 12, minutes = 0) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hours, minutes);
};
const localDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Every to-do note of every child, and the family's labels from earlier runs. */
async function resetTodo() {
  const notes = (await adminFetch('notes/?tags=molly-todo,molly-todo-done&limit=1000')) as Page_<Note>;
  for (const note of notes.results) await adminFetch(`notes/${note.id}/`, { method: 'DELETE' });
  const tags = (await adminFetch('tags/?limit=1000')) as Page_<{ slug: string; name: string }>;
  for (const tag of tags.results.filter((tag) => tag.name.startsWith('To-do: '))) {
    await adminFetch(`tags/${tag.slug}/`, { method: 'DELETE' });
  }
}

/** A note saved by parent B, as their phone would. */
async function seed(note: string, tags: string[], time?: Date, child = testEnv.childId): Promise<Note> {
  const response = await fetch(`${testEnv.baseUrl}/api/notes/`, {
    method: 'POST',
    headers: { Authorization: `Token ${testEnv.parentB.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ child, note, tags, ...(time && { time: time.toISOString() }) }),
  });
  if (!response.ok) throw new Error(`seed ${note}: ${response.status}`);
  return response.json();
}

async function todoNotes(): Promise<Note[]> {
  return ((await adminFetch('notes/?tags=molly-todo,molly-todo-done&limit=1000')) as Page_<Note>).results;
}

const todoButton = (page: Page) => page.getByRole('button', { name: /^To-do/ });
const card = (page: Page, label: string) => page.getByLabel(label, { exact: true });
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const itemSheet = (page: Page) => page.getByLabel('To-do item', { exact: true });
const openItem = (page: Page, text: string) => page.getByRole('button', { name: new RegExp(`^Open, ${text}`) }).click();
const back = (page: Page) => page.getByRole('link', { name: 'Back', exact: true }).click();

/** Signed in as parent A, with everything up to `mark` seen on this device. */
async function openList(page: Page, mark = 0) {
  await signInAs(page, testEnv.parentA, { todoSeen: { mark, saved: [], opened: [], unread: [] } });
  await todoButton(page).click();
  await expect(page.getByRole('heading', { name: 'To-do' })).toBeVisible();
}

async function add(page: Page, text: string, label?: string) {
  await button(page, 'Add item').click();
  await page.getByLabel('What needs doing').fill(text);
  if (label) await page.getByRole('radio', { name: label, exact: true }).click();
}

test.beforeEach(resetTodo);
test.afterAll(resetTodo);

test("the header's first button is To-do, with no badge while nothing is new", async ({ page }) => {
  // Given
  await signInAs(page, testEnv.parentA);

  // When
  const first = page.getByRole('button', { name: /^(To-do|Today|Tonight|Add entry|Settings)/ }).first();

  // Then
  await expect(first).toHaveAccessibleName('To-do');
  await expect(page.getByTestId('badge')).toHaveCount(0);
});

test('an empty list has Buy and Appointments with nothing yet, no Other, and Add item', async ({ page }) => {
  // Given
  await openList(page);

  // When
  const cards = [card(page, 'Buy'), card(page, 'Appointments')];

  // Then
  for (const shown of cards) await expect(shown.getByText('Nothing yet')).toBeVisible();
  await expect(card(page, 'Other')).toHaveCount(0);
  await expect(page.getByText('Shared with everyone who uses this Baby Buddy')).toBeVisible();
  await expect(button(page, 'Add item')).toBeVisible();
});

test('an item added under Buy shows there and is saved as a tagged note', async ({ page }) => {
  // Given
  await openList(page);

  // When
  await add(page, 'Diapers size 3', 'Buy');
  await button(page, 'Save').click();

  // Then
  await expect(card(page, 'Buy').getByText('Diapers size 3')).toBeVisible();
  await expect(page.getByText('Saved · Diapers size 3')).toBeVisible();
  await expect.poll(async () => (await todoNotes()).map((note) => [note.note, note.tags.sort()])).toEqual([
    ['Diapers size 3', ['To-do: Buy', 'molly-todo']],
  ]);
});

test("the other parent's new item stays New after leaving the list, until it's opened here", async ({ page }) => {
  // Given
  const seen = await seed('Seen before', ['molly-todo']);
  await seed('Wipes', ['molly-todo', 'To-do: Buy']);
  await signInAs(page, testEnv.parentA, { todoSeen: { mark: seen.id, saved: [], opened: [], unread: [] } });
  await expect(todoButton(page)).toHaveAccessibleName('To-do, 1 new');
  await todoButton(page).click();
  await expect(page.getByText('1 new', { exact: true })).toBeVisible();
  await back(page);
  await expect(todoButton(page)).toHaveAccessibleName('To-do, 1 new');
  await todoButton(page).click();

  // When
  await openItem(page, 'Wipes, new');

  // Then
  await expect(itemSheet(page).getByText('Wipes', { exact: true })).toBeVisible();
  await itemSheet(page).getByRole('button', { name: 'Close', exact: true }).click();
  await expect(card(page, 'Buy').getByText('New', { exact: true })).toHaveCount(0);
  await back(page);
  await expect(todoButton(page)).toHaveAccessibleName('To-do');
  await expect(page.getByTestId('badge')).toHaveCount(0);
});

test('Mark unread closes the sheet and makes the item New again, on the badge too', async ({ page }) => {
  // Given
  await seed('Wipes', ['molly-todo', 'To-do: Buy']);
  await openList(page);
  await openItem(page, 'Wipes');

  // When
  await button(page, 'Mark unread').click();

  // Then
  await expect(itemSheet(page)).toHaveCount(0);
  await expect(card(page, 'Buy').getByText('New', { exact: true })).toBeVisible();
  await back(page);
  await expect(todoButton(page)).toHaveAccessibleName('To-do, 1 new');
});

test('an item added on this phone is never New, until it is marked unread', async ({ page }) => {
  // Given
  await openList(page);
  await add(page, 'Bibs', 'Buy');
  await button(page, 'Save').click();
  await expect(card(page, 'Buy').getByText('Bibs')).toBeVisible();
  await expect.poll(async () => (await todoNotes()).length).toBe(1);
  await expect(card(page, 'Buy').getByText('New', { exact: true })).toHaveCount(0);

  // When
  await openItem(page, 'Bibs');
  await button(page, 'Mark unread').click();

  // Then
  await expect(card(page, 'Buy').getByText('New', { exact: true })).toBeVisible();
  await expect(page.getByText('1 new', { exact: true })).toBeVisible();
});

test('tapping an item opens it read-only, closing sends nothing, and Edit opens the edit sheet', async ({ page }) => {
  // Given
  await seed('Checkup', ['molly-todo', 'To-do: Appointments', 'molly-todo-due'], day(1, 14, 30));
  await openList(page);
  const writes: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/notes') && request.method() !== 'GET') writes.push(request.method());
  });

  // When
  await openItem(page, 'Checkup');

  // Then
  await expect(itemSheet(page).getByText('Checkup', { exact: true })).toBeVisible();
  await expect(itemSheet(page).getByText('Tomorrow 14:30')).toBeVisible();
  await expect(itemSheet(page).getByText(/Appointments/)).toBeVisible();
  await expect(page.getByLabel('What needs doing')).toHaveCount(0);
  await itemSheet(page).getByRole('button', { name: 'Close', exact: true }).click();
  await expect(itemSheet(page)).toHaveCount(0);
  expect(writes).toEqual([]);
  await openItem(page, 'Checkup');
  await button(page, 'Edit').click();
  await expect(page.getByLabel('What needs doing')).toHaveValue('Checkup');
  await expect(page.getByRole('radio', { name: 'Appointments', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('radio', { name: 'Tomorrow' })).toHaveAttribute('aria-checked', 'true');
});

test("an item saved on another child shows in the same list", async ({ page }) => {
  // Given
  const sibling = (await adminFetch('children/', {
    method: 'POST',
    body: JSON.stringify({ first_name: 'Sibling', last_name: 'Test', birth_date: '2025-01-15' }),
  })) as { id: number; slug: string };
  try {
    await seed('School photos', ['molly-todo', 'To-do: Appointments'], undefined, sibling.id);

    // When
    await openList(page);

    // Then
    await expect(card(page, 'Appointments').getByText('School photos')).toBeVisible();
  } finally {
    await adminFetch(`children/${sibling.slug}/`, { method: 'DELETE' });
  }
});

test('Save is disabled without text, and the sheet has no Delete', async ({ page }) => {
  // Given
  await openList(page);

  // When
  await button(page, 'Add item').click();

  // Then
  await expect(button(page, 'Save')).toBeDisabled();
  await expect(page.getByRole('button', { name: /Delete/ })).toHaveCount(0);
});

test('a new label made while adding gets its card after Save and is listed by Baby Buddy', async ({ page }) => {
  // Given
  await openList(page);
  await add(page, 'Vitamin drops');

  // When
  await button(page, 'New label').click();
  await page.getByLabel('New label').fill('Pharmacy');
  await button(page, 'Add').click();
  await expect(page.getByRole('radio', { name: 'Pharmacy' })).toHaveAttribute('aria-checked', 'true');
  await button(page, 'Save').click();

  // Then
  await expect(card(page, 'Pharmacy').getByText('Vitamin drops')).toBeVisible();
  const tags = (await adminFetch('tags/?limit=1000')) as Page_<{ name: string }>;
  expect(tags.results.map((tag) => tag.name)).toContain('To-do: Pharmacy');
});

test('an item without a label goes under Other, after the family labels', async ({ page }) => {
  // Given
  await seed('Sand toys', ['molly-todo', 'To-do: Beach']);
  await openList(page);

  // When
  await add(page, 'Call grandma');
  await button(page, 'Save').click();

  // Then
  await expect(card(page, 'Other').getByText('Call grandma')).toBeVisible();
  const headings = await page.getByRole('heading').allTextContents();
  expect(headings.filter((heading) => ['Buy', 'Appointments', 'Beach', 'Other'].includes(heading))).toEqual([
    'Buy',
    'Appointments',
    'Beach',
    'Other',
  ]);
});

test('a dated item with a time is saved and shown as Tomorrow, and an edit moves it', async ({ page }) => {
  // Given
  await openList(page);
  await add(page, '6-month checkup', 'Appointments');
  await page.getByRole('radio', { name: 'Tomorrow' }).click();
  await page.getByRole('radio', { name: 'At a time' }).click();

  // When
  await button(page, '15 minutes later').click();
  await button(page, '15 minutes later').click();
  await button(page, 'Save').click();
  await expect(card(page, 'Appointments').getByText('Tomorrow 09:30')).toBeVisible();
  await openItem(page, '6-month checkup');
  await button(page, 'Edit').click();
  await button(page, '15 minutes later').click();
  await button(page, 'Save').click();

  // Then
  await expect(card(page, 'Appointments').getByText('Tomorrow 09:45')).toBeVisible();
  const [saved] = await todoNotes();
  expect(saved!.tags).toContain('molly-todo-due');
  expect(new Date(saved!.time).getTime()).toBe(day(1, 9, 45).getTime());
});

test('a date picked months ahead under Other is shown in the sheet and saved as that day', async ({ page }) => {
  // Given
  const target = day(90);
  await openList(page);
  await add(page, 'Passport renewal');
  await page.getByRole('radio', { name: 'Other' }).click();

  // When
  await page.getByLabel('Due date', { exact: true }).fill(localDay(target));

  // Then
  await expect(page.getByLabel('Due date', { exact: true })).toHaveValue(localDay(target));
  await expect(page.getByRole('radio', { name: 'Other' })).toBeChecked();
  await button(page, 'Save').click();
  await expect(card(page, 'Other').getByText('Passport renewal')).toBeVisible();
  const [saved] = await todoNotes();
  expect(saved!.tags).toContain('molly-todo-day');
  expect(localDay(new Date(saved!.time))).toBe(localDay(target));
});

test("picking today's date under Other chooses Today", async ({ page }) => {
  // Given
  await openList(page);
  await add(page, 'Call the clinic');
  await page.getByRole('radio', { name: 'Other' }).click();

  // When
  await page.getByLabel('Due date', { exact: true }).fill(localDay(day(0)));

  // Then
  await expect(page.getByRole('radio', { name: 'Today' })).toBeChecked();
  await expect(page.getByLabel('Due date', { exact: true })).toHaveCount(0);
});

test('a typed time is saved to the minute, and +15 steps on from it', async ({ page }) => {
  // Given
  await openList(page);
  await add(page, 'Pick up the pram', 'Buy');
  await page.getByRole('radio', { name: 'Tomorrow' }).click();
  await page.getByRole('radio', { name: 'At a time' }).click();

  // When
  await page.getByLabel('Due time', { exact: true }).fill('14:40');
  await button(page, 'Save').click();
  await expect(card(page, 'Buy').getByText('Tomorrow 14:40')).toBeVisible();
  await openItem(page, 'Pick up the pram');
  await button(page, 'Edit').click();
  await button(page, '15 minutes later').click();
  await button(page, 'Save').click();

  // Then
  await expect(card(page, 'Buy').getByText('Tomorrow 14:55')).toBeVisible();
  const [saved] = await todoNotes();
  expect(new Date(saved!.time).getTime()).toBe(day(1, 14, 55).getTime());
});

test('dated items come first, soonest on top, then undated ones', async ({ page }) => {
  // Given
  await seed('Undated', ['molly-todo', 'To-do: Buy']);
  await seed('In five days', ['molly-todo', 'To-do: Buy', 'molly-todo-day'], day(5));
  await seed('Tomorrow', ['molly-todo', 'To-do: Buy', 'molly-todo-day'], day(1));

  // When
  await openList(page);

  // Then
  await expect(card(page, 'Buy').getByRole('button', { name: /^Open, / })).toHaveText([/Tomorrow/, /In five days/, /Undated/]);
  await expect(card(page, 'Buy').getByText('in 5 days')).toBeVisible();
});

test('an item whose date has passed shows as overdue', async ({ page }) => {
  // Given
  await seed('Return library books', ['molly-todo', 'molly-todo-day'], day(-1));

  // When
  await openList(page);

  // Then
  await expect(card(page, 'Other').getByText('Yesterday · overdue')).toBeVisible();
});

test('ticking off strikes an item through and retags it with today; unticking opens it again', async ({ page }) => {
  // Given
  await seed('Wipes', ['molly-todo', 'To-do: Buy']);
  await openList(page);
  const tick = page.getByRole('checkbox', { name: 'Wipes' });

  // When
  await tick.click();

  // Then
  await expect(tick).toHaveAttribute('aria-checked', 'true');
  await expect.poll(async () => (await todoNotes())[0]!.tags.sort()).toEqual(
    ['To-do: Buy', `molly-done-${localDay(new Date())}`, 'molly-todo-done'].sort(),
  );
  await tick.click();
  await expect(tick).toHaveAttribute('aria-checked', 'false');
  await expect.poll(async () => (await todoNotes())[0]!.tags.sort()).toEqual(['To-do: Buy', 'molly-todo']);
});

test('an item done yesterday is hidden and not counted', async ({ page }) => {
  // Given
  await seed('Bibs', ['molly-todo-done', `molly-done-${localDay(day(-1))}`, 'To-do: Buy']);

  // When
  await openList(page);

  // Then
  await expect(card(page, 'Buy').getByText('Nothing yet')).toBeVisible();
  await expect(page.getByText('Bibs')).toHaveCount(0);
});

test('a photo chosen on the web shows as a thumbnail and full size, loads under the CSP, and can be removed', async ({ page }) => {
  // Given
  const cspErrors: string[] = [];
  page.on('console', (message) => {
    if (/Content Security Policy/i.test(message.text())) cspErrors.push(message.text());
  });
  await openList(page);
  await add(page, 'This cream', 'Buy');
  await expect(button(page, 'Camera')).toHaveCount(0);

  // When
  const chooser = page.waitForEvent('filechooser');
  await button(page, 'Choose a photo').click();
  await (await chooser).setFiles({ name: 'cream.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByRole('img', { name: "The item's photo" })).toBeVisible();
  await button(page, 'Save').click();

  // Then
  const thumbnail = page.getByRole('button', { name: 'Photo: This cream' });
  await expect(thumbnail).toBeVisible();
  const [saved] = await todoNotes();
  expect(saved!.image).toMatch(/\/media\/notes\/images\/[0-9a-f]{32}\.jpg$/);
  await thumbnail.click();
  await expect(page.getByText('Buy', { exact: true }).last()).toBeVisible();
  await button(page, 'Edit').click();
  await button(page, 'Remove').click();
  await button(page, 'Save').click();
  await expect(thumbnail).toHaveCount(0);
  await expect.poll(async () => (await todoNotes())[0]!.image).toBeNull();
  expect(cspErrors).toEqual([]);
});

test('a row without a photo has no photo slot, and the web shows no reminder bells', async ({ page }) => {
  // Given
  await seed('Checkup', ['molly-todo', 'To-do: Appointments', 'molly-todo-due'], day(1, 14, 30));

  // When
  await openList(page);

  // Then
  await expect(card(page, 'Appointments').getByText('Tomorrow 14:30')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Photo: / })).toHaveCount(0);
  await add(page, 'Anything');
  await page.getByRole('radio', { name: 'Tomorrow' }).click();
  await expect(page.getByText(/reminds you/)).toHaveCount(0);
});

test('without view_tag only Buy and Appointments are offered, with a hint and no error toast', async ({ page }) => {
  // Given
  await page.route('**/api/tags/**', (route) =>
    route.fulfill({ status: 403, contentType: 'application/json', body: '{"detail":"You do not have permission to perform this action."}' }),
  );
  await seed('Sand toys', ['molly-todo', 'To-do: Beach']);
  await openList(page);

  // When
  await button(page, 'Add item').click();

  // Then
  await expect(page.getByRole('radiogroup', { name: 'Label' }).getByRole('radio')).toHaveText(['Buy', 'Appointments']);
  await expect(page.getByText(/needs core\.view_tag/)).toBeVisible();
  await expect(button(page, 'New label')).toHaveCount(0);
  await expect(page.getByText(/refused|permission to add/)).toHaveCount(0);
});
