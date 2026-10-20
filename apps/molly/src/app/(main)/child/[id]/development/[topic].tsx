import { guidePage, pageContent, pageTitles, TOPICS, type GuidePage, type TopicId } from '@molly/core';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackLink, Banner, Text } from '@/components/ui';
import { useNow } from '@/features/dashboard/use-now';
import { Card, GuideFooter, MissingChild, ReadMore, TOPIC_BAR, useGuideRoute } from '@/features/development/parts';
import { useGuideSettings } from '@/features/development/queries';
import { TopicPersonal } from '@/features/development/TopicPersonal';

const isTopic = (value: string | undefined): value is TopicId => TOPICS.some(({ id }) => id === value);

/**
 * One topic on one page (design `1c`): headline and reading time, intro, the child's own block, what many
 * children do now, Try together, When to get help with the region's contacts, Read more, and the disclaimer.
 */
export default function GuideTopic() {
  const { id, topic, page: asked } = useLocalSearchParams<{ id: string; topic: string; page?: string }>();
  const { child, loaded, page } = useGuideRoute(id, asked);
  const settings = useGuideSettings();
  const now = useNow();
  const insets = useSafeAreaInsets();
  if (!loaded || !settings.loaded) return null;
  if (!child) return <MissingChild />;
  const childPage = guidePage(child.birth_date, now);
  const shown: GuidePage = page ?? childPage ?? 36;
  const back = () =>
    router.canGoBack()
      ? router.back()
      : router.replace({ pathname: '/child/[id]/development', params: { id: String(child.id), page: String(shown) } });
  if (!isTopic(topic)) {
    return (
      <View className="flex-1 bg-bg pt-8">
        <BackLink label={pageTitles(shown).title} onPress={back} />
        <View className="px-4">
          <Banner text="There is no such topic." tone="error" />
        </View>
      </View>
    );
  }
  const content = pageContent(shown, topic, settings.region);

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 40 }}>
        <BackLink label={pageTitles(shown).title} onPress={back} />
        <View className="gap-4 px-4 pt-1">
          <View className="gap-1.5 px-1">
            <View className="flex-row items-center gap-2">
              <View className={`h-3 w-3 rounded-full ${TOPIC_BAR[topic]}`} />
              <Text className="text-caption font-extrabold text-muted">{content.name}</Text>
            </View>
            <Text role="heading" className="text-[30px] font-display tracking-display-0_8">
              {content.headline}
            </Text>
            <Text className="text-caption font-bold text-muted">{content.readMinutes} min read</Text>
          </View>

          <Text className="px-1 text-base font-semibold">{content.intro}</Text>

          <TopicPersonal child={child} topic={topic} page={shown} ownPage={shown === childPage} region={settings.region} now={now} />

          <View className="gap-2 px-1">
            <Text role="heading" className="text-label font-display">
              {content.nowTitle}
            </Text>
            {content.now.map((item) => (
              <View key={item.text} className="flex-row gap-2.5">
                <View className={`mt-[7px] h-2 w-2 rounded-full ${TOPIC_BAR[topic]}`} />
                <Text className="flex-1 text-label font-bold">{item.text}</Text>
              </View>
            ))}
            {content.nowNotes.map((note) => (
              <Text key={note} className="text-caption font-bold text-muted">
                {note}
              </Text>
            ))}
          </View>

          <Card title="Try together">
            {content.tryTogether.map((tip) => (
              <Text key={tip} className="text-sm font-bold text-muted">
                {tip}
              </Text>
            ))}
          </Card>

          <Card title="When to get help" tone="hot">
            {content.getHelp.map((item) => (
              <View key={item.text} className="flex-row gap-2">
                <Text className="text-sm font-bold text-hot-ink">•</Text>
                <Text className="flex-1 text-sm font-bold text-hot-ink">{item.text}</Text>
              </View>
            ))}
            <Text className="pt-1 text-sm font-extrabold text-hot-ink">{content.contact}</Text>
          </Card>

          <ReadMore sources={content.sources} />

          <GuideFooter region={settings.region} />
        </View>
      </ScrollView>
    </View>
  );
}
