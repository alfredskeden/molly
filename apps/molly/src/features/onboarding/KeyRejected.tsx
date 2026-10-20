import { Link, router } from 'expo-router';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text } from '@/components/ui';
import { Glyph } from '@/theme/Glyph';

// expo-camera can't scan barcodes on the web.
const CAN_SCAN = Platform.OS !== 'web';

/**
 * Baby Buddy refuses this phone's key. The address and child are kept; only the key is asked for,
 * through the onboarding scanner or the connect form with the address filled in.
 */
export function KeyRejected() {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-1 justify-end gap-7 bg-bg px-7"
      style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 28 }}
    >
      <View className="gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-button bg-surface">
          <Glyph name="error" filled size={28} color="danger" />
        </View>
        <Text role="heading" className="text-[28px] font-display leading-[34px] tracking-display-0_5">
          Molly can&apos;t sign in to Baby Buddy
        </Text>
        <Text className="text-base font-semibold leading-6 text-muted">
          Baby Buddy rejected this phone&apos;s API key. It was probably regenerated, or the user was removed. Your
          entries are safe in Baby Buddy.
        </Text>
      </View>
      <View className="gap-2.5">
        {CAN_SCAN && <Button label="Scan a new key" onPress={() => router.push('/onboarding/scan')} />}
        <Button
          label="Type the key instead"
          variant={CAN_SCAN ? 'outline' : 'primary'}
          onPress={() => router.push('/onboarding/connect')}
        />
        <Link href={{ pathname: '/help', params: { topic: 'key' } }} asChild>
          <Pressable accessibilityRole="link" className="min-h-12 items-center justify-center active:opacity-70">
            <Text className="text-label font-extrabold text-muted">Where do I find my key?</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
