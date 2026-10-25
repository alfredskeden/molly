import type { Change, Entry, EntryKind, Feeding, Medication, Note, Timer } from '@molly/api';
import type { EntriesByKind } from '@molly/core';
import { useQueryClient } from '@tanstack/react-query';

import { TIMER_NAMES, type Tracker } from '@/actions/trackers';
import { useSignedInSession } from '@/session/session';

/**
 * Show a tap's effect before Baby Buddy answers, from the device clock. The action still checks the
 * server first, and the refetch after it shows the truth: the real start, "already running", or the
 * state before the tap when the write failed.
 */
export function useOptimistic() {
  const queryClient = useQueryClient();
  const { childId, credentials } = useSignedInSession();
  const timerKey = (tracker: Tracker) => ['timer', childId, tracker];

  /**
   * Stops polls that would put the old state back mid-write, applies the guess, and returns how to
   * undo it. A failed write needs the undo: when Baby Buddy is down, the refetch fails too.
   */
  async function guess<T>(key: unknown[], update: (current: T | undefined) => T | undefined) {
    await Promise.all([
      queryClient.cancelQueries({ queryKey: ['timer'] }),
      queryClient.cancelQueries({ queryKey: ['entries'] }),
      queryClient.cancelQueries({ queryKey: ['past'] }),
      queryClient.cancelQueries({ queryKey: ['skips'] }),
    ]);
    const before = queryClient.getQueryData<T>(key);
    queryClient.setQueryData<T>(key, update);
    return () => queryClient.setQueryData<T>(key, before);
  }

  const skipsKey = ['skips', childId];

  /** The same change to the dashboard's entries and the past windows' ones, undone together. */
  async function guessEntries(update: (current: EntriesByKind) => EntriesByKind) {
    const undos = await Promise.all(
      [['entries', childId], ['past', childId]].map((key) =>
        guess<EntriesByKind>(key, (current) => (current ? update(current) : current)),
      ),
    );
    return () => undos.forEach((undo) => undo());
  }
  const listOf = (kind: EntryKind) => (kind === 'sleep' ? 'sleep' : kind === 'feeding' ? 'feeding' : kind === 'change' ? 'change' : 'medication');

  return {
    /** The inline editor's Done: the entry with its new fields, before Baby Buddy has them. */
    edited: (kind: EntryKind, id: number, patch: Partial<Entry<EntryKind>>) =>
      guessEntries((current) => ({
        ...current,
        [listOf(kind)]: (current[listOf(kind)] as Entry<EntryKind>[]).map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
      })),
    /** The inline editor's Delete. */
    deleted: (kind: EntryKind, id: number) =>
      guessEntries((current) => ({
        ...current,
        [listOf(kind)]: (current[listOf(kind)] as Entry<EntryKind>[]).filter((entry) => entry.id !== id),
      })),
    /** A skip note, shown before Baby Buddy has it. */
    skipped: (note: Omit<Note, 'id' | 'child' | 'image'>) =>
      guess<Note[]>(skipsKey, (current) => [{ ...note, id: -Date.now(), child: childId, image: null }, ...(current ?? [])]),
    /** Undo of a skip: the note leaves the `molly-skip` list, as it will once retagged. */
    unskipped: (id: number) => guess<Note[]>(skipsKey, (current) => current?.filter((note) => note.id !== id)),
    started: (tracker: Tracker) =>
      guess<Timer | null>(timerKey(tracker), (current) =>
        current ?? {
          id: -1,
          child: childId,
          name: TIMER_NAMES[tracker],
          start: new Date().toISOString(),
          duration: '',
          user: credentials.userId,
        },
      ),
    ended: (tracker: Tracker) => guess<Timer | null>(timerKey(tracker), () => null),
    moved: (tracker: Tracker, start: Date) =>
      guess<Timer | null>(timerKey(tracker), (current) => current && { ...current, start: start.toISOString() }),
    changed: ({ wet, solid }: { wet: boolean; solid: boolean }) => {
      const change: Change = {
        id: -Date.now(),
        child: childId,
        time: new Date().toISOString(),
        wet,
        solid,
        color: '',
        amount: null,
        notes: null,
        tags: [],
      };
      return guess<EntriesByKind>(['entries', childId], (current) =>
        current ? { ...current, change: [change, ...current.change] } : current,
      );
    },
    fed: (fields: GuessedFeed) => {
      const feeding = instantFeeding(fields, childId, new Date());
      return guess<EntriesByKind>(['entries', childId], (current) =>
        current ? { ...current, feeding: [feeding, ...current.feeding] } : current,
      );
    },
    medicated: (name: string) => {
      const medication: Medication = {
        id: -Date.now(),
        child: childId,
        name,
        time: new Date().toISOString(),
        notes: null,
        tags: [],
      };
      return guess<EntriesByKind>(['entries', childId], (current) =>
        current ? { ...current, medication: [medication, ...current.medication] } : current,
      );
    },
  };
}

export type GuessedFeed = Pick<Feeding, 'type' | 'method' | 'amount'> & { notes?: string };

/** An instant feed's guess (`logFeed`): a minute long, ending `now`, with a meal's food as its notes. */
export function instantFeeding({ type, method, amount, notes }: GuessedFeed, child: number, now: Date): Feeding {
  return {
    id: -now.getTime(),
    child,
    start: new Date(now.getTime() - 60_000).toISOString(),
    end: now.toISOString(),
    duration: '00:01:00',
    type,
    method,
    amount,
    notes: notes ?? null,
    tags: [],
  };
}
