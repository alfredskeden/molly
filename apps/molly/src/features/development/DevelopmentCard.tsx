import type { Child } from '@molly/api';
import { guideCard } from '@molly/core';
import { router } from 'expo-router';
import { View } from 'react-native';

import { Pressable } from '@/components/pressable';
import { Text } from '@/components/ui';
import { spoken } from '@/theme/copy';
import { useCopy } from '@/theme/theme';

import { useGuideSettings } from './queries';

/**
 * The child screen's Development card (design `1a`): the page for the child's age and its line, opening the
 * guide there. Past 3 years it says the guide has ended, and still opens on the last page.
 */
export function DevelopmentCard({ child, now }: { child: Child; now: Date }) {
  const copy = useCopy();
  const { region } = useGuideSettings();
  const card = guideCard(child.birth_date, now, region);
  const label = spoken(copy.development, 'Development') ?? copy.development;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${card.label}. ${card.title}. ${card.line}`}
      accessibilityHint={card.button}
      logName="Development"
      onPress={() => router.push({ pathname: '/child/[id]/development', params: { id: String(child.id) } })}
      className="gap-2.5 rounded-card bg-warm-bg p-4 active:scale-[0.97]"
    >
      <View className="flex-row items-baseline justify-between gap-3">
        <Text className="shrink text-caption font-display text-feed-ink">{copy.development}</Text>
        <Text className="text-caption font-extrabold text-feed-ink">{card.label}</Text>
      </View>
      <Text className="text-[22px] font-display tracking-display-0_5">{card.title}</Text>
      <Text className="text-sm font-bold">{card.line}</Text>
      <View className="h-10 items-center justify-center self-start rounded-button bg-accent px-4">
        <Text className="text-label font-display text-on-accent">{card.button}</Text>
      </View>
    </Pressable>
  );
}
