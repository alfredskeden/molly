import { BabyBuddyError } from '@molly/api';
import { firstSeen, pruneSeen, TODO_QUERY_TAGS, todoItems, todoLabels, type TodoSeen } from '@molly/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';

import { POLL_MS, useClient, useSettings } from '@/features/dashboard/queries';
import { usePolling } from '@/features/dashboard/writes';
import { syncTodoReminders } from '@/notification/sync';
import { updateSettings } from '@/storage/settings';

export const TODO_KEY = ['todo'];
export const TODO_LABELS_KEY = ['todoLabels'];

/**
 * Every to-do note, open and done, of every child: the list is the family's. Polled like the dashboard,
 * so the other parent's items appear, and persisted with the query cache.
 */
export function useTodoNotes() {
  const client = useClient();
  return useQuery({
    queryKey: TODO_KEY,
    queryFn: ({ signal }) => client.listNotes({ tags: TODO_QUERY_TAGS }, { signal }),
    ...usePolling(POLL_MS),
  });
}

export function useTodoItems() {
  const notes = useTodoNotes();
  const items = useMemo(() => (notes.data ? todoItems(notes.data) : undefined), [notes.data]);
  return { ...notes, items };
}

/**
 * The labels offered in the sheet, from Baby Buddy's tags. Null without `core.view_tag`: then only Buy and
 * Appointments are offered, with a hint, and no error toast.
 */
export function useTodoLabels() {
  const client = useClient();
  return useQuery({
    queryKey: TODO_LABELS_KEY,
    queryFn: async ({ signal }) => {
      try {
        return todoLabels((await client.listTags({ signal })).map((tag) => tag.name));
      } catch (error) {
        if (error instanceof BabyBuddyError && error.kind === 'forbidden') return null;
        throw error;
      }
    },
    staleTime: 5 * 60_000,
  });
}

/** What this device has seen of the list, for "New", and how to record more (null stays null). */
export function useTodoSeen() {
  const queryClient = useQueryClient();
  const settings = useSettings();
  const seen = settings.data?.todoSeen ?? null;
  const save = useCallback(
    async (change: (seen: TodoSeen | null) => TodoSeen | null) => {
      const next = await updateSettings((settings) => ({ todoSeen: change(settings.todoSeen) }));
      queryClient.setQueryData(['settings'], next);
    },
    [queryClient],
  );
  return { seen, loaded: settings.isSuccess, save };
}

/**
 * The header badge's count, and the dashboard's side of the to-do list: the first load on a device marks
 * everything seen (a fresh install has nothing New), and every fetched list prunes what it no longer needs.
 * The dashboard stays mounted under the list, so this runs while the list is open too.
 */
export function useTodoBadge() {
  const { items } = useTodoItems();
  const { seen, loaded, save } = useTodoSeen();
  useEffect(() => {
    if (!items || !loaded || (seen !== null && pruneSeen(items, seen) === seen)) return;
    save((current) => (current ? pruneSeen(items, current) : firstSeen(items))).catch(() => undefined);
  }, [items, loaded, seen, save]);
  return { items, seen };
}

/** This phone's to-do reminders follow the list it last fetched. */
export function useSyncTodoReminders() {
  const { items } = useTodoItems();
  useEffect(() => {
    if (items) syncTodoReminders(items).catch(() => undefined);
  }, [items]);
}
