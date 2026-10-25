import { beforeEach, describe, expect, it } from 'vitest';

import { clientAs, createChild, deleteChild, resetEntries, testEnv } from '../test/test-env';

beforeEach(resetEntries);

/** A 1×1 PNG: the smallest file Baby Buddy's image field accepts. */
const PNG = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
  (char) => char.charCodeAt(0),
);

function png(name: string) {
  return { blob: new Blob([PNG], { type: 'image/png' }), name };
}

describe('skip notes', () => {
  it('a parent can add a tagged note, which lists by child, tag and time since', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    const child = testEnv.childId;
    await client.createNote({ child, note: 'Skipped nap 15:05–15:45', time: '2026-09-20T12:55:00Z', tags: ['molly-skip'] });
    await client.createNote({ child, note: 'Skipped nap 11:00–11:40', time: '2026-09-12T09:00:00Z', tags: ['molly-skip'] });
    await client.createNote({ child, note: 'Teething', time: '2026-09-20T13:00:00Z', tags: [] });

    // When
    const notes = await client.listNotes({ child, tags: 'molly-skip', date_min: '2026-09-19T00:00:00Z' });

    // Then
    expect(notes).toMatchObject([
      { child, note: 'Skipped nap 15:05–15:45', tags: ['molly-skip'] },
    ]);
    expect(new Date(notes[0]!.time).toISOString()).toBe('2026-09-20T12:55:00.000Z');
  });

  it('lists only the notes up to date_max, so an older week gets just its own skips', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    const child = testEnv.childId;
    await client.createNote({ child, note: 'Skipped nap 11:00–11:40', time: '2026-09-15T09:00:00Z', tags: ['molly-skip'] });
    await client.createNote({ child, note: 'Skipped nap 15:05–15:45', time: '2026-09-22T12:55:00Z', tags: ['molly-skip'] });

    // When
    const notes = await client.listNotes({
      child,
      tags: 'molly-skip',
      date_min: '2026-09-14T00:00:00Z',
      date_max: '2026-09-21T00:00:00Z',
    });

    // Then
    expect(notes).toMatchObject([{ child, note: 'Skipped nap 11:00–11:40' }]);
  });

  it('a retagged note no longer lists under its old tag', async () => {
    // Given
    const client = clientAs(testEnv.parentB);
    const child = testEnv.childId;
    const note = await client.createNote({ child, note: 'Skipped nap 15:05–15:45', tags: ['molly-skip'] });

    // When
    const retagged = await client.updateNote(note.id, { tags: ['molly-skip-undone'] });

    // Then
    expect(retagged.tags).toEqual(['molly-skip-undone']);
    expect(await client.listNotes({ child, tags: 'molly-skip' })).toEqual([]);
  });

  // Both seeded parents may add and change notes, so a refused key is the refusal to see here; a
  // missing permission (403 with Django's permission detail) goes through the same errorKindFor.
  it('a note request with a refused key surfaces as unauthorized, like the other entry kinds', async () => {
    // Given
    const client = clientAs({ token: 'not-a-key' });

    // When
    const request = client.createNote({ child: testEnv.childId, note: 'Skipped nap 15:05–15:45', tags: ['molly-skip'] });

    // Then
    await expect(request).rejects.toMatchObject({ kind: 'unauthorized' });
  });
});

describe('to-do notes', () => {
  it('a note with a future time saves and reads back the same moment', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    const due = '2099-03-14T13:30:00.000Z';

    // When
    const note = await client.createNote({ child: testEnv.childId, note: '6-month checkup', time: due, tags: ['molly-todo'] });

    // Then
    expect(new Date(note.time).toISOString()).toBe(due);
  });

  it("lists open and done to-do notes of every child in one call when no child is given", async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    const sibling = await createChild('Sibling');
    try {
      await client.createNote({ child: testEnv.childId, note: 'Diapers size 3', tags: ['molly-todo', 'To-do: Buy'] });
      await client.createNote({ child: sibling, note: 'Wipes', tags: ['molly-todo-done', 'molly-done-2026-10-25'] });
      await client.createNote({ child: sibling, note: 'Teething', tags: [] });

      // When
      const notes = await client.listNotes({ tags: 'molly-todo,molly-todo-done' });

      // Then
      expect(notes.map((note) => note.note).sort()).toEqual(['Diapers size 3', 'Wipes']);
    } finally {
      await deleteChild(sibling);
    }
  });

  it('lists a tag that a saved note created, for a parent with view_tag', async () => {
    // Given
    const client = clientAs(testEnv.parentB);
    await client.createNote({ child: testEnv.childId, note: 'Vitamin drops', tags: ['molly-todo', 'To-do: Pharmacy'] });

    // When
    const tags = await client.listTags();

    // Then
    expect(tags).toContainEqual(expect.objectContaining({ name: 'To-do: Pharmacy', slug: 'to-do-pharmacy' }));
  });

  it('saves a photo, served under /media/notes/images/ without a token', async () => {
    // Given
    const client = clientAs(testEnv.parentA);

    // When
    const note = await client.createNote({
      child: testEnv.childId,
      note: 'This cream',
      tags: ['molly-todo', 'To-do: Buy'],
      image: png('cream.png'),
    });

    // Then
    expect(note.image).toMatch(/\/media\/notes\/images\/cream[^/]*\.png$/);
    expect(note.tags.sort()).toEqual(['To-do: Buy', 'molly-todo']);
    expect((await fetch(note.image!)).status).toBe(200);
  });

  it('keeps the photo on a tags-only update, replaces it with a new one and drops it on null', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    const note = await client.createNote({ child: testEnv.childId, note: 'This cream', tags: ['molly-todo'], image: png('first.png') });

    // When
    const retagged = await client.updateNote(note.id, { tags: ['molly-todo-done', 'molly-done-2026-10-25'] });
    const replaced = await client.updateNote(note.id, { note: 'That cream', image: png('second.png') });
    const removed = await client.updateNote(note.id, { image: null });

    // Then
    expect(retagged.image).toBe(note.image);
    expect(replaced).toMatchObject({ note: 'That cream', tags: ['molly-todo-done', 'molly-done-2026-10-25'] });
    expect(replaced.image).toMatch(/second[^/]*\.png$/);
    expect(removed.image).toBeNull();
  });

  it('a file that is not an image fails as validation', async () => {
    // Given
    const client = clientAs(testEnv.parentA);
    const text = { blob: new Blob(['not a picture'], { type: 'image/jpeg' }), name: 'fake.jpg' };

    // When
    const request = client.createNote({ child: testEnv.childId, note: 'Broken', tags: ['molly-todo'], image: text });

    // Then
    await expect(request).rejects.toMatchObject({ kind: 'validation' });
  });
});
