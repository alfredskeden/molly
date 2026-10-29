import { dueText, localDay, OTHER, reminderAt, type ListedItem } from '@molly/core';
import { Image } from 'expo-image';
import { View } from 'react-native';

import { Pressable } from '@/components/pressable';
import { Sheet } from '@/components/sheet';
import { Button, CloseButton, QuietButton, Text } from '@/components/ui';
import { hasNotifications } from '@/notification/sync';
import { Glyph } from '@/theme/Glyph';

import { reminderLine } from './sheet-model';

/**
 * An item opened from the list, read-only: its whole text, label and date (overdue in red), this phone's
 * reminder ("No reminder" when it's quiet here, `quiet` being this phone's `todoQuiet` ids), the photo (tap
 * for the viewer) and whether it's done. Tick or untick it here, Edit it, or Mark unread (open items only) to
 * make it New again on this phone.
 */
export function TodoView({
  item,
  photo,
  quiet,
  now,
  onTick,
  onEdit,
  onPhoto,
  onUnread,
  onClose,
}: {
  item: ListedItem;
  /** The item's photo URL (`photoUrl`), if it has one. */
  photo: string | null;
  quiet: readonly number[];
  now: Date;
  onTick: () => void;
  onEdit: () => void;
  onPhoto: () => void;
  onUnread: () => void;
  onClose: () => void;
}) {
  const done = item.done !== null;
  const when = dueText(item, now);
  const silenced = hasNotifications && !done && item.due !== null && quiet.includes(item.id);
  const reminder = hasNotifications && reminderAt(item, now, quiet) ? reminderLine({ due: item.due, quiet: false }, now) : null;
  return (
    <Sheet label="To-do item" onScrimPress={onClose} scroll>
      <View className="gap-4">
        <View className="flex-row items-start gap-2">
          <Text role="heading" className={`flex-1 pl-1 pt-1.5 text-[22px] font-display ${done ? 'text-muted line-through' : ''}`}>
            {item.text}
          </Text>
          <CloseButton onPress={onClose} />
        </View>

        <View className="gap-1 px-1">
          <Text className="text-sm font-bold text-muted">
            {item.label ?? OTHER}
            {when !== '' && ' · '}
            {when !== '' && <Text className={`text-sm font-bold ${item.overdue ? 'text-danger' : 'text-muted'}`}>{when}</Text>}
          </Text>
          {(reminder || silenced) && (
            <View className="flex-row items-center gap-1.5">
              <Glyph name={silenced ? 'notifications_off' : 'notifications'} size={16} color="muted" />
              <Text className="flex-1 text-caption font-bold text-muted">{silenced ? 'No reminder' : reminder}</Text>
            </View>
          )}
          {done && (
            <View className="flex-row items-center gap-1.5">
              <Glyph name="check" size={16} color="accent" />
              <Text className="text-caption font-bold text-muted">{item.done === localDay(now) ? 'Done today' : 'Done'}</Text>
            </View>
          )}
        </View>

        {photo && (
          <Pressable accessibilityRole="button" accessibilityLabel={`Photo: ${item.text}`} onPress={onPhoto} className="active:opacity-70">
            <Image source={{ uri: photo }} contentFit="cover" style={{ width: '100%', height: 200, borderRadius: 16 }} className="bg-line" />
          </Pressable>
        )}

        <View className="flex-row gap-2">
          <Button label={done ? 'Not done' : 'Mark done'} onPress={onTick} grow />
          <Button label="Edit" variant="outline" onPress={onEdit} grow />
        </View>
        {!done && (
          <View className="-mt-2 items-center">
            <QuietButton label="Mark unread" onPress={onUnread} />
          </View>
        )}
      </View>
    </Sheet>
  );
}
