import { BabyBuddyError, type Note, type NoteImage } from '@molly/api';
import { noteTime, quietFor, savedBy, saveTags, tickTags, untickTags, type TodoDue, type TodoItem } from '@molly/core';
import { useQueryClient } from '@tanstack/react-query';

import { failureToast, type Toast } from '@/features/dashboard/outcome-messages';
import { useClient, useKeyRejected } from '@/features/dashboard/queries';
import { holdPolls } from '@/features/dashboard/writes';
import { useToast } from '@/features/toast/toast';
import { HAPTICS } from '@/haptics/model';
import { useHaptic } from '@/haptics/use-haptic';
import { isRefusalError } from '@/session/key-check';
import { useSignedInSession } from '@/session/session';

import { TODO_KEY, TODO_LABELS_KEY, useTodoQuiet, useTodoSeen } from './queries';

export const todoRefusedToast: Toast = {
  text: "Couldn't save. Your Baby Buddy user needs permission to add and change notes and tags (core.add_note, core.change_note, core.add_tag).",
  tone: 'danger',
  help: 'permissions',
};

/**
 * What the sheet saves. `image`: a new photo, null to remove it, undefined to keep what's there. `quiet`:
 * "Remind me" off, kept on this phone only (`settings.todoQuiet`), and only while the item has a date.
 */
export type TodoSave = { text: string; label: string | null; due: TodoDue | null; image?: NoteImage | null; quiet: boolean };

/**
 * Ticks and saves. Optimistic like the trackers' writes: the change shows at once and is undone, with a
 * toast, if Baby Buddy doesn't take it. A save with a new photo waits for the upload instead.
 */
export function useTodoWrites() {
  const client = useClient();
  const queryClient = useQueryClient();
  const toast = useToast();
  const keyRejected = useKeyRejected();
  const haptic = useHaptic();
  const { childId } = useSignedInSession();
  const { save: saveSeen } = useTodoSeen();
  const { save: saveQuiet } = useTodoQuiet();

  async function guess(update: (notes: Note[]) => Note[]) {
    await queryClient.cancelQueries({ queryKey: TODO_KEY });
    const before = queryClient.getQueryData<Note[]>(TODO_KEY);
    queryClient.setQueryData<Note[]>(TODO_KEY, (current) => current && update(current));
    return () => queryClient.setQueryData(TODO_KEY, before);
  }

  async function fail(error: unknown) {
    if (!(error instanceof BabyBuddyError)) throw error;
    haptic(HAPTICS.cancel);
    if (isRefusalError(error)) {
      if (!(await keyRejected())) toast(todoRefusedToast);
      return;
    }
    toast(failureToast(error.kind, error.fields ? Object.values(error.fields).flat().join(' ') : undefined));
  }

  /** The write with its guess (none: wait for Baby Buddy); null when it failed and was undone. */
  async function write<T>(update: ((notes: Note[]) => Note[]) | null, call: () => Promise<T>): Promise<T | null> {
    const release = holdPolls();
    const undo = update ? await guess(update) : () => undefined;
    try {
      return await call();
    } catch (error) {
      undo();
      await fail(error);
      return null;
    } finally {
      release();
      void queryClient.invalidateQueries({ queryKey: TODO_KEY });
    }
  }

  /** Ticked off (done today, by this phone's date) or open again. */
  async function setDone(item: TodoItem, done: boolean) {
    const tags = done ? tickTags(item.tags, new Date()) : untickTags(item.tags);
    haptic(done ? HAPTICS.log : HAPTICS.choose);
    await write(
      (notes) => notes.map((note) => (note.id === item.id ? { ...note, tags } : note)),
      () => client.updateNote(item.id, { tags }),
    );
  }

  /** A new item (on the child on screen) or an edit of `item`. True once Baby Buddy has it. */
  async function save({ text, label, due, image, quiet }: TodoSave, item?: TodoItem): Promise<boolean> {
    const tags = saveTags({ label, due }, item?.tags);
    const time = noteTime(due);
    const uploading = image !== undefined && image !== null;
    const saved = await write(
      uploading
        ? null
        : item
          ? (notes) =>
              notes.map((note) =>
                note.id === item.id
                  ? { ...note, note: text, tags, time: time ?? note.time, image: image === null ? null : note.image }
                  : note,
              )
          : (notes) => [
              { id: -Date.now(), child: childId, note: text, time: time ?? new Date().toISOString(), tags, image: null },
              ...notes,
            ],
      () =>
        item
          ? client.updateNote(item.id, { note: text, tags, time, ...(image !== undefined && { image }) })
          : client.createNote({ child: childId, note: text, tags, time, ...(image && { image }) }),
    );
    if (!saved) return false;
    haptic(HAPTICS.log);
    if (!item) await saveSeen((seen) => savedBy(seen, saved.id)).catch(() => undefined);
    // Removing the date forgets it, so a new date starts with the reminder on.
    await saveQuiet((current) => quietFor(current, saved.id, quiet && due !== null)).catch(() => undefined);
    const labels = queryClient.getQueryData<string[] | null>(TODO_LABELS_KEY);
    if (label && labels && !labels.includes(label)) void queryClient.invalidateQueries({ queryKey: TODO_LABELS_KEY });
    toast({ text: `Saved · ${text}`, tone: 'med' });
    return true;
  }

  return { setDone, save };
}
