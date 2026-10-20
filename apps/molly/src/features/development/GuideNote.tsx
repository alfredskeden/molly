import { prematureNote, type GuideRegion } from '@molly/core';
import { useState } from 'react';
import { View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { InkButton, Segment, Text } from '@/components/ui';

import { useGuideSettings } from './queries';
import { REGION_NAMES } from './parts';

const REGIONS = (['sweden', 'international'] as const).map((value) => ({ value, label: REGION_NAMES[value] }));

/**
 * Shown once per device before the first overview: what the guide is, that it isn't medical advice, babies born
 * early, and whose guidance to follow. Closing it any way counts as read.
 */
export function GuideNote({ onClose }: { onClose: () => void }) {
  const settings = useGuideSettings();
  const [region, setRegion] = useState<GuideRegion>(settings.region);
  const close = async () => {
    await settings.change({ guideNoteSeen: true, guideRegion: region });
    onClose();
  };
  return (
    <Sheet label="About the guide" title="About the guide" onScrimPress={() => void close()} scroll>
      <View className="gap-4">
        <View className="gap-2.5 px-1">
          <Text className="text-label font-bold">
            An age guide from birth to 3 years: what many children do around each age, what to try together, and when to get help.
          </Text>
          <Text className="text-label font-bold">
            It is a rough guide, not medical advice. Every child develops at their own pace, and if something worries you, ask.
          </Text>
          <Text className="text-label font-bold">{prematureNote(region)}</Text>
          <Text className="text-label font-bold">Molly wrote it in its own words from official health sources, linked on every topic.</Text>
        </View>
        <View className="gap-2 px-1">
          <View>
            <Text className="text-base font-display">Guidance</Text>
            <Text className="text-caption font-bold text-muted">Check-ups, vaccines, food advice and who to call. You can change it in Settings.</Text>
          </View>
          <Segment small label="Guidance" options={REGIONS} value={region} onChange={setRegion} />
        </View>
        <InkButton label="Start reading" stretch onPress={() => void close()} />
      </View>
    </Sheet>
  );
}
