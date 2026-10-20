import { View } from 'react-native';

import { Pressable } from '@/components/pressable';
import { IconButton, Spinner, Text } from '@/components/ui';

/**
 * The dashboard's header: the child's name over `<window> · <date>`, and the history, add and settings
 * buttons. With more than one child shown, the name opens the Children sheet (`onChildren`). `updating`:
 * the app came back and is still reloading; says so in place of the date line.
 */
export function Header({
  name,
  dateLine,
  updating,
  onChildren,
  onHistory,
  onAdd,
  onSettings,
  historyLabel,
}: {
  name: string;
  dateLine: string;
  updating: boolean;
  onChildren: (() => void) | null;
  onHistory: () => void;
  onAdd: () => void;
  onSettings: () => void;
  /** Spoken: `Today` or `Tonight`, what the history button opens. */
  historyLabel: string;
}) {
  const title = (
    <View className="shrink">
      <Text accessibilityRole="header" numberOfLines={1} className="text-[28px] font-display tracking-display-0_5">
        {name}
      </Text>
      {updating ? (
        <View accessibilityLiveRegion="polite" className="flex-row items-center gap-1.5">
          <Spinner color="muted" />
          <Text className="text-sm font-bold text-muted">Updating…</Text>
        </View>
      ) : (
        <Text numberOfLines={1} className="text-sm font-bold text-muted">
          {dateLine}
        </Text>
      )}
    </View>
  );
  return (
    <View className="flex-row items-center justify-between gap-2 px-[22px] pt-1.5">
      {onChildren ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Children, showing ${name}`}
          onPress={onChildren}
          className="min-h-12 shrink justify-center active:opacity-70"
        >
          {title}
        </Pressable>
      ) : (
        title
      )}
      <View className="flex-row gap-2">
        <IconButton icon="history" label={historyLabel} onPress={onHistory} />
        <IconButton icon="add" label="Add entry" onPress={onAdd} ink />
        <IconButton icon="settings" label="Settings" onPress={onSettings} />
      </View>
    </View>
  );
}
