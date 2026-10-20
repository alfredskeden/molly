import { View } from 'react-native';

import { Pressable } from '@/components/pressable';
import { Text } from '@/components/ui';
import type { NotificationCardLine } from '@/notification/model';
import { openLiveUpdateSettings } from '@/notification/sync';

const LINES: Record<NotificationCardLine, { text: string; button: string }> = {
  notificationsOff: { text: 'Notifications are off', button: 'Turn on' },
  notificationsBlocked: { text: 'Blocked in Android settings', button: 'Open settings' },
  liveUpdatesOff: { text: 'Live updates are off', button: 'Open settings' },
};

/**
 * "Notifications are off" and the button that helps, under Settings' Notifications switch and the child
 * screen's reminder. `what`: a title over it, when it stands on its own.
 */
export function NotificationLine({ line, what, onTurnOn }: { line: NotificationCardLine; what?: string; onTurnOn: () => void }) {
  return (
    <View className="flex-row items-center gap-3 pb-3">
      <View className="flex-1">
        {what && <Text className="text-base font-extrabold">{what}</Text>}
        <Text className="text-caption font-bold text-danger">{LINES[line].text}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={line === 'liveUpdatesOff' ? openLiveUpdateSettings : onTurnOn}
        className="min-h-11 justify-center rounded-chip bg-accent px-3.5 active:scale-[0.97]"
      >
        <Text className="text-sm font-display text-on-accent">{LINES[line].button}</Text>
      </Pressable>
    </View>
  );
}
