import { beforeEach, describe, expect, it } from 'vitest';

import { clientAs, resetEntries, testEnv } from '../test/test-env';

beforeEach(resetEntries);

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
    const retagged = await client.updateNoteTags(note.id, ['molly-skip-undone']);

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
