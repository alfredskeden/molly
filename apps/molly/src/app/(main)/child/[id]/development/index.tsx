import { guidePage, pageStanding, pageText, pageTopics, type GuidePage } from '@molly/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pressable } from '@/components/pressable';
import { BehindSheet } from '@/components/sheet';
import { BackLink, Panel, Text } from '@/components/ui';
import { useNow } from '@/features/dashboard/use-now';
import { GuideNote } from '@/features/development/GuideNote';
import { MonthStrip } from '@/features/development/MonthStrip';
import { backToChild, Card, GuideFooter, MissingChild, TOPIC_BAR, useGuideRoute } from '@/features/development/parts';
import { useGuideSettings } from '@/features/development/queries';
import { spoken } from '@/theme/copy';
import { Glyph } from '@/theme/Glyph';
import { useCopy } from '@/theme/theme';

/**
 * The guide's overview of one page (design `1b`): the month strip, where the child stands, the page's
 * title and intro, the 8 topics, what's coming up, and the footer. Opens on the child's page (`?page=`
 * browses); the first time on this device, the note about the guide comes first.
 */
export default function GuideOverview() {
  const { id, page: asked } = useLocalSearchParams<{ id: string; page?: string }>();
  const { child, loaded, page } = useGuideRoute(id, asked);
  const settings = useGuideSettings();
  const now = useNow();
  const copy = useCopy();
  const insets = useSafeAreaInsets();
  const [noteClosed, setNoteClosed] = useState(false);
  if (!loaded || !settings.loaded) return null;
  if (!child) return <MissingChild />;

  const childPage = guidePage(child.birth_date, now);
  const shown: GuidePage = page ?? childPage ?? 36;
  const text = pageText(shown, settings.region);
  const topics = pageTopics(shown, settings.region);
  const standing = pageStanding(shown, child.birth_date, now);
  const noteOpen = !settings.noteSeen && !noteClosed;
  const browse = (next: GuidePage) => router.setParams({ page: String(next) });

  return (
    <View className="flex-1 bg-bg">
      <BehindSheet sheetOpen={noteOpen}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 40 }}>
          <View className="flex-row items-center justify-between pr-4">
            <BackLink label={child.first_name} onPress={() => backToChild(child)} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={spoken(copy.allAges, 'All ages') ?? copy.allAges}
              onPress={() => router.push({ pathname: '/child/[id]/development/ages', params: { id: String(child.id), page: String(shown) } })}
              className="h-11 justify-center rounded-button border border-line bg-surface px-3.5 active:scale-[0.97]"
            >
              <Text className="text-label font-extrabold">{copy.allAges}</Text>
            </Pressable>
          </View>

          <View className="pt-2">
            <MonthStrip shown={shown} childPage={childPage} name={child.first_name} onPick={browse} />
          </View>

          <View className="gap-3.5 px-4 pt-4">
            <View className="gap-1 px-1">
              <Text className="text-label font-extrabold text-muted">
                {child.first_name} {standing}
              </Text>
              <Text role="heading" className="text-[32px] font-display tracking-display-0_8">
                {text.title}
              </Text>
              <Text className="text-label font-bold text-muted">{text.overview}</Text>
            </View>

            <Panel className="px-4 py-1.5" label="Topics">
              {topics.map((topic, index) => (
                <Pressable
                  key={topic.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${topic.name}. ${topic.summary}`}
                  onPress={() =>
                    router.push({
                      pathname: '/child/[id]/development/[topic]',
                      params: { id: String(child.id), topic: topic.id, page: String(shown) },
                    })
                  }
                  className={`min-h-[60px] flex-row items-center gap-3 py-2.5 active:opacity-70 ${index < topics.length - 1 ? 'border-b border-line' : ''}`}
                >
                  <View className={`w-2.5 self-stretch rounded-full ${TOPIC_BAR[topic.id]}`} />
                  <View className="flex-1">
                    <Text className="text-base font-display">{topic.name}</Text>
                    <Text className="text-caption font-bold text-muted">{topic.summary}</Text>
                  </View>
                  <Glyph name="chevron_right" size={20} color="muted" />
                </Pressable>
              ))}
            </Panel>

            {text.comingUp && (
              <Card title={text.comingUp.title} tone="grow">
                <Text className="text-sm font-bold text-grow-ink">{text.comingUp.text}</Text>
              </Card>
            )}

            <GuideFooter region={settings.region} />
          </View>
        </ScrollView>
      </BehindSheet>
      {noteOpen && <GuideNote onClose={() => setNoteClosed(true)} />}
    </View>
  );
}
