import { useEffect } from 'react';
import { View } from 'react-native';

import { Pressable } from '@/components/pressable';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/ui';
import { useDismissToast } from '@/features/toast/toast';
import { formatClock, formatTimer } from '@/lib/time';
import { PALETTES } from '@/theme/tokens';

import { useNow } from './use-now';

// Full class names, spelled out so Tailwind finds them.
const TONES = {
  sleep: { solid: 'bg-sleep-ink', onSolid: 'text-sleep-bg', title: 'Sleeping' },
  feeding: { solid: 'bg-feed-ink', onSolid: 'text-feed-bg', title: 'Feeding' },
};

/**
 * Asked once, the first time a timer is started from the app, while it already runs behind the sheet:
 * a preview of the lock-screen notification, then Android's own prompt on Continue.
 */
export function LockScreenSheet({
  tracker,
  start,
  onContinue,
  onNotNow,
}: {
  tracker: 'sleep' | 'feeding';
  start: string;
  onContinue: () => void;
  onNotNow: () => void;
}) {
  const now = useNow(1000);
  const tone = TONES[tracker];
  // The "started" toast would cover the sheet's buttons.
  const dismissToast = useDismissToast();
  useEffect(dismissToast, [dismissToast]);
  return (
    <Sheet label="Lock-screen timer" scrimLabel="Not now" onScrimPress={onNotNow}>
      <View aria-hidden className="flex-row items-center gap-3 rounded-mock bg-bg p-3.5">
        <AppMark />
        <View className="flex-1">
          <Text className="text-sm font-display">
            {tone.title} · {formatTimer(now.getTime() - Date.parse(start))}
          </Text>
          <Text className="text-caption font-bold text-muted">since {formatClock(start)}</Text>
        </View>
        <View className={`rounded-mock-sm px-3 py-2 ${tone.solid}`}>
          <Text className={`text-caption font-display ${tone.onSolid}`}>Stop</Text>
        </View>
      </View>
      <View className="gap-1.5">
        <Text role="heading" className="text-2xl font-display leading-7 tracking-display-0_5">
          Keep the timer on your lock screen?
        </Text>
        <Text className="text-label font-semibold leading-[22px] text-muted">
          Molly can show a running sleep or feed on the lock screen, with Stop right there. Android will ask for
          notification access next.
        </Text>
      </View>
      <View className="gap-1.5">
        <Pressable
          accessibilityRole="button"
          onPress={onContinue}
          className={`min-h-14 items-center justify-center rounded-2xl active:scale-[0.98] ${tone.solid}`}
        >
          <Text className={`text-lg font-display ${tone.onSolid}`}>Continue</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onNotNow} className="min-h-12 items-center justify-center active:opacity-70">
          <Text className="text-base font-extrabold text-muted">Not now</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

/** The app icon in small: tracker rows on dark ink, as in the notification's header. */
function AppMark() {
  const day = PALETTES.day;
  const bar = (color: string, width: `${number}%`, left: `${number}%`) => (
    <View style={{ height: 4, width, marginLeft: left, borderRadius: 2, backgroundColor: color }} />
  );
  return (
    <View
      className="h-9 w-9 justify-center gap-[3px] rounded-mock-sm px-[7px]"
      // The mark is always dark ink, in both themes.
      style={{ backgroundColor: day.ink }}
    >
      {bar(day['sleep-mid'], '70%', '0%')}
      {bar(day['feed-mid'], '85%', '15%')}
      {bar(day['diaper-mid'], '40%', '10%')}
    </View>
  );
}
