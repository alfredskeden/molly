import { guidePage, pageTags, pageText, pageTitles, type GuidePage } from '@molly/core';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pressable } from '@/components/pressable';
import { BackLink, ScreenTitle, SectionLabel, Text } from '@/components/ui';
import { useNow } from '@/features/dashboard/use-now';
import { MissingChild, useGuideRoute } from '@/features/development/parts';
import { useGuideSettings } from '@/features/development/queries';
import { spoken } from '@/theme/copy';
import { useCopy } from '@/theme/theme';

const YEARS: { name: string; until: number }[] = [
  { name: 'First year', until: 12 },
  { name: 'Second year', until: 24 },
  { name: 'Third year', until: 37 },
];

/**
 * Every page by year (design `1d`), with its line: the child's own tagged, the next one too, the past ones
 * muted (not faded: their lines keep their contrast). Tapping one opens it in the overview underneath.
 */
export default function GuideAges() {
  const { id, page: asked } = useLocalSearchParams<{ id: string; page?: string }>();
  const { child, loaded, page } = useGuideRoute(id, asked);
  const settings = useGuideSettings();
  const now = useNow();
  const copy = useCopy();
  const insets = useSafeAreaInsets();
  if (!loaded || !settings.loaded) return null;
  if (!child) return <MissingChild />;
  const childPage = guidePage(child.birth_date, now);
  const from: GuidePage = page ?? childPage ?? 36;
  const tags = pageTags(childPage);
  const open = (target: GuidePage) =>
    router.dismissTo({ pathname: '/child/[id]/development', params: { id: String(child.id), page: String(target) } });

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 40 }}>
        <BackLink label={pageTitles(from).title} onPress={() => (router.canGoBack() ? router.back() : open(from))} />
        <ScreenTitle spoken={spoken(copy.allAges, 'All ages')}>{copy.allAges}</ScreenTitle>
        <View className="gap-3.5 px-4">
          {YEARS.map((year, index) => {
            const start = index === 0 ? 0 : YEARS[index - 1]!.until;
            const pages = tags.filter(({ page: p }) => p >= start && p < year.until);
            return (
              <View key={year.name} className="gap-1">
                <SectionLabel>{year.name}</SectionLabel>
                <View className="pt-1">
                  {pages.map(({ page: p, tag }) => {
                    const { title } = pageTitles(p);
                    const line = pageText(p, settings.region).oneLiner;
                    const label = tag === 'now' ? `${child.first_name} now` : tag === 'next' ? 'Next' : null;
                    return (
                      <Pressable
                        key={p}
                        accessibilityRole="button"
                        accessibilityLabel={[title, line, label].filter(Boolean).join(', ')}
                        onPress={() => open(p)}
                        className={`min-h-[56px] flex-row items-center gap-3.5 border-b border-line py-2.5 active:opacity-70`}
                      >
                        <View
                          className={`h-3.5 w-3.5 rounded-full border-[2.5px] border-grow-ink ${tag === 'now' ? 'bg-grow-ink' : tag === 'past' ? 'bg-grow-bg' : 'bg-surface'}`}
                        />
                        <View className="flex-1">
                          <Text className={`text-base font-display ${tag === 'past' ? 'text-muted' : ''}`}>{title}</Text>
                          <Text className="text-caption font-bold text-muted">{line}</Text>
                        </View>
                        {label && <Text className="text-caption font-display text-grow-ink">{label}</Text>}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
