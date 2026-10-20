import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Share, View } from 'react-native';

import { BackLink, Button, Screen, ScreenTitle, Text } from '@/components/ui';
import { clearTapLog, readTapLog } from '@/tap-log/log';
import { tapLogText } from '@/tap-log/model';

/**
 * The Tap log (Settings, long-press the version line): touches, presses, stalls of the JS thread, the app
 * coming and going and widget / notification taps, newest at the bottom. Share sends it as text.
 */
export default function TapLog() {
  const queryClient = useQueryClient();
  // Not persisted (only timer / entries / children are), read fresh every time the screen opens.
  const log = useQuery({ queryKey: ['tap-log'], queryFn: readTapLog, gcTime: 0 });
  const text = tapLogText(log.data ?? []);

  async function clear() {
    await clearTapLog();
    await queryClient.invalidateQueries({ queryKey: ['tap-log'] });
  }

  return (
    <Screen
      footer={
        <View className="flex-row gap-3">
          <Button grow label="Share" onPress={() => Share.share({ message: text }).catch(() => undefined)} />
          <Button grow label="Clear" variant="outline" onPress={clear} />
        </View>
      }
    >
      <View className="-mx-4 -mt-4">
        <BackLink />
        <ScreenTitle>Tap log</ScreenTitle>
      </View>
      <Text selectable className="text-[11px] leading-[15px]" style={{ fontFamily: 'monospace' }}>
        {text}
      </Text>
    </Screen>
  );
}
