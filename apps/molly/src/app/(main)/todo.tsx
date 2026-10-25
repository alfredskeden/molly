import {
  dueText,
  newCount,
  OTHER,
  photoUrl,
  reminderAt,
  seenAfter,
  todoList,
  type ListedItem,
  type TodoCard,
  type TodoItem,
} from '@molly/core';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pressable } from '@/components/pressable';
import { BehindSheet } from '@/components/sheet';
import { BackLink, InkButton, Panel, ScreenTitle, Text } from '@/components/ui';
import { PageSkeleton, useSkeleton } from '@/features/dashboard/Skeleton';
import { UnreachableBanner } from '@/features/dashboard/Unreachable';
import { useNow } from '@/features/dashboard/use-now';
import { PhotoViewer } from '@/features/todo/PhotoViewer';
import { useTodoItems, useTodoLabels, useTodoSeen } from '@/features/todo/queries';
import { TodoSheet } from '@/features/todo/TodoSheet';
import { useTodoWrites } from '@/features/todo/use-todo-writes';
import { hasNotifications } from '@/notification/sync';
import { useNotificationState } from '@/notification/use-state';
import { useSignedInSession } from '@/session/session';
import { Glyph } from '@/theme/Glyph';

/**
 * The family's shared to-do list: one card per label (Buy and Appointments always, the family's own while
 * they have items, Other last). Items from the other parent since this device last left the list are
 * "New"; leaving moves that mark.
 */
export default function Todo() {
  const insets = useSafeAreaInsets();
  const now = useNow(60_000);
  const { credentials } = useSignedInSession();
  const todo = useTodoItems();
  const labels = useTodoLabels();
  const { seen, save: saveSeen } = useTodoSeen();
  const writes = useTodoWrites();
  const notifications = useNotificationState();
  const [editing, setEditing] = useState<TodoItem | 'new' | null>(null);
  const [viewing, setViewing] = useState<TodoItem | null>(null);
  const skeleton = useSkeleton(todo.isPending);

  const items = todo.items;
  const cards = useMemo(() => (items ? todoList(items, now, seen) : []), [items, now, seen]);
  const fresh = items ? newCount(items, seen) : 0;

  // Leaving marks everything listed as seen. A ref, so the mark uses the list as it was on leaving.
  const listed = useRef(items);
  useEffect(() => {
    listed.current = items;
  }, [items]);
  useFocusEffect(
    useCallback(
      () => () => {
        const last = listed.current;
        if (last) saveSeen((current) => seenAfter(last, current)).catch(() => undefined);
      },
      [saveSeen],
    ),
  );

  const photoOf = (item: TodoItem) => (item.image ? photoUrl(credentials.baseUrl, item.image) : null);
  const detailOf = (item: TodoItem) => [item.label ?? OTHER, dueText(item, now)].filter(Boolean).join(' · ');
  const editingItem = editing === 'new' ? null : editing;

  return (
    <View className="flex-1 bg-bg">
      <BehindSheet sheetOpen={editing !== null || viewing !== null}>
        <ScrollView
          testID="todo"
          className="flex-1"
          contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 32 }}
        >
          <BackLink />
          <ScreenTitle>To-do</ScreenTitle>
          <Text className="-mt-2.5 px-[22px] pb-3.5 text-sm font-bold text-muted">
            {fresh > 0 ? `${fresh} new since you last looked` : 'Shared with everyone who uses this Baby Buddy'}
          </Text>
          <View className="gap-3 px-4">
            {todo.isError && (
              <UnreachableBanner asOf={null} onRetry={() => todo.refetch()} />
            )}
            {skeleton && <PageSkeleton />}
            {items &&
              cards.map((card) => (
                <Card
                  key={card.label}
                  card={card}
                  now={now}
                  photoOf={photoOf}
                  onTick={(item) => writes.setDone(item, item.done === null)}
                  onEdit={setEditing}
                  onPhoto={setViewing}
                />
              ))}
            {items && (
              <View className="pt-1">
                <InkButton label="Add item" icon={{ name: 'add' }} tall stretch onPress={() => setEditing('new')} />
              </View>
            )}
          </View>
        </ScrollView>
      </BehindSheet>
      {viewing && photoOf(viewing) && (
        <PhotoViewer
          uri={photoOf(viewing)!}
          text={viewing.text}
          detail={detailOf(viewing)}
          onEdit={() => {
            setEditing(viewing);
            setViewing(null);
          }}
          onClose={() => setViewing(null)}
        />
      )}
      {editing !== null && (
        <TodoSheet
          key={editingItem?.id ?? 'new'}
          item={editingItem}
          photo={editingItem ? photoOf(editingItem) : null}
          labels={labels.data === undefined ? ['Buy', 'Appointments'] : labels.data}
          now={now}
          onSave={async (save) => {
            const saved = await writes.save(save, editingItem ?? undefined);
            // A dated item rings a reminder on Android: ask for notifications once there's one to ring.
            if (saved && save.due && hasNotifications && notifications.state === 'off') await notifications.turnOn();
            return saved;
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </View>
  );
}

function Card({
  card,
  now,
  photoOf,
  onTick,
  onEdit,
  onPhoto,
}: {
  card: TodoCard;
  now: Date;
  photoOf: (item: TodoItem) => string | null;
  onTick: (item: ListedItem) => void;
  onEdit: (item: TodoItem) => void;
  onPhoto: (item: TodoItem) => void;
}) {
  return (
    <Panel label={card.label} className="px-4 pb-1 pt-3">
      <View className="flex-row items-baseline justify-between pb-1">
        <Text role="heading" className="text-title font-display">
          {card.label}
        </Text>
        {card.open > 0 && <Text className="text-sm font-extrabold text-muted">{card.open}</Text>}
      </View>
      {card.items.length === 0 ? (
        <Text className="pb-3 pt-1 text-label font-bold text-muted">Nothing yet</Text>
      ) : (
        card.items.map((item, index) => (
          <Row
            key={item.id}
            item={item}
            now={now}
            photo={photoOf(item)}
            last={index === card.items.length - 1}
            onTick={() => onTick(item)}
            onEdit={() => onEdit(item)}
            onPhoto={() => onPhoto(item)}
          />
        ))
      )}
    </Panel>
  );
}

function Row({
  item,
  now,
  photo,
  last,
  onTick,
  onEdit,
  onPhoto,
}: {
  item: ListedItem;
  now: Date;
  photo: string | null;
  last: boolean;
  onTick: () => void;
  onEdit: () => void;
  onPhoto: () => void;
}) {
  const done = item.done !== null;
  const when = dueText(item, now);
  const bell = hasNotifications && reminderAt(item, now) !== null;
  return (
    <View testID={`todo-${item.id}`} className={`flex-row items-center gap-1 ${last ? '' : 'border-b border-line'}`}>
      <Pressable
        role="checkbox"
        aria-checked={done}
        accessibilityLabel={item.text}
        onPress={onTick}
        className="-ml-2.5 h-12 w-12 items-center justify-center active:opacity-70"
      >
        <View
          className={`h-7 w-7 items-center justify-center rounded-full border-2 ${done ? 'border-accent bg-accent' : 'border-muted'}`}
        >
          {done && <Glyph name="check" size={18} color="on-accent" />}
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={['Edit', item.text, item.isNew ? 'new' : null, when].filter(Boolean).join(', ')}
        onPress={onEdit}
        className="min-h-[60px] flex-1 justify-center py-2 active:opacity-70"
      >
        <View className="flex-row flex-wrap items-center gap-x-2">
          <Text className={`shrink text-base font-extrabold ${done ? 'text-muted line-through' : ''}`}>{item.text}</Text>
          {item.isNew && (
            <View className="rounded-full bg-accent px-2 py-0.5">
              <Text className="text-[11px] font-extrabold text-on-accent">New</Text>
            </View>
          )}
        </View>
        {when !== '' && (
          <View className="flex-row items-center gap-1">
            <Text className={`text-caption font-bold ${item.overdue ? 'text-danger' : 'text-muted'}`}>{when}</Text>
            {bell && !done && <Glyph name="notifications" size={14} color="muted" />}
          </View>
        )}
      </Pressable>
      {photo && (
        <Pressable accessibilityRole="button" accessibilityLabel={`Photo: ${item.text}`} onPress={onPhoto} className="py-1.5 active:opacity-70">
          <Image source={{ uri: photo }} contentFit="cover" style={{ width: 52, height: 52, borderRadius: 10 }} className="bg-line" />
        </Pressable>
      )}
    </View>
  );
}
