import type { Child } from '@molly/api';
import {
  GUIDE_DISCLAIMER,
  GUIDE_PAGES,
  prematureNote,
  SOURCES_NOTE,
  type GuidePage,
  type GuideRegion,
  type GuideSource,
  type TopicId,
} from '@molly/core';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Pressable } from '@/components/pressable';
import { BackLink, Banner, Text } from '@/components/ui';
import { useChildrenOnScreen } from '@/features/children/use-children';
import { Glyph } from '@/theme/Glyph';

import { openLink } from './open-link';

/** Each topic's bar and dots (theme tokens `topic-*`). */
export const TOPIC_BAR: Record<TopicId, string> = {
  movement: 'bg-topic-movement',
  talking: 'bg-topic-talking',
  sleep: 'bg-topic-sleep',
  feeding: 'bg-topic-feeding',
  play: 'bg-topic-play',
  feelings: 'bg-topic-feelings',
  health: 'bg-topic-health',
  parents: 'bg-topic-parents',
};

export const REGION_NAMES: Record<GuideRegion, string> = { sweden: 'Sweden', international: 'International' };

/** The route's child and page (`?page=`, else the child's own), or why there's nothing to show. */
export function useGuideRoute(id: string | undefined, page: string | undefined) {
  const { all, loaded } = useChildrenOnScreen();
  const child = all.find((candidate) => String(candidate.id) === id) ?? null;
  const asked = Number(page);
  const shown = page !== undefined && GUIDE_PAGES.includes(asked as GuidePage) ? (asked as GuidePage) : null;
  return { child, loaded, page: shown };
}

/** When the route's child is gone: back to Settings with the reason. */
export function MissingChild() {
  return (
    <View className="flex-1 bg-bg pt-8">
      <BackLink label="Settings" onPress={() => router.dismissTo('/settings')} />
      <View className="px-4">
        <Banner text="This child isn't in Baby Buddy any more." tone="error" />
      </View>
    </View>
  );
}

/** Back to the child's screen: popped when it's underneath, put there after a reload. */
export function backToChild(child: Child) {
  router.dismissTo({ pathname: '/child/[id]', params: { id: String(child.id) } });
}

/** The guide's footer: not medical advice, babies born early, and whose guidance it follows, with a way to change it. */
export function GuideFooter({ region }: { region: GuideRegion }) {
  return (
    <View className="gap-2 px-1 pt-2">
      <Text className="text-caption font-bold text-muted">{GUIDE_DISCLAIMER}</Text>
      <Text className="text-caption font-bold text-muted">{prematureNote(region)}</Text>
      <View className="flex-row flex-wrap items-center gap-x-2">
        <Text className="text-caption font-bold text-muted">Guidance: {REGION_NAMES[region]}</Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Change the guidance in Settings"
          onPress={() => router.push('/settings')}
          className="min-h-[44px] justify-center px-1 active:opacity-70"
        >
          <Text className="text-caption font-extrabold text-grow-ink underline">Change</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** A topic's Read more: each source with its publisher, opening in the browser; Swedish pages say so. */
export function ReadMore({ sources }: { sources: GuideSource[] }) {
  return (
    <View className="gap-1 px-1">
      <Text role="heading" className="text-label font-display">
        Read more
      </Text>
      {sources.map((source) => {
        const swedish = source.language === 'sv';
        return (
          <Pressable
            key={source.id}
            accessibilityRole="link"
            accessibilityLabel={`${source.title}, ${source.publisher}${swedish ? ', in Swedish' : ''}`}
            accessibilityHint="Opens in the browser"
            onPress={() => openLink(source.url)}
            className="min-h-[52px] flex-row items-center gap-3 border-b border-line py-2 active:opacity-70"
          >
            <View className="flex-1">
              <Text className="text-caption font-bold text-muted">
                {source.publisher}
                {swedish ? ' · In Swedish' : ''}
              </Text>
              <Text className="text-label font-extrabold">{source.title}</Text>
            </View>
            <Glyph name="chevron_right" size={20} color="muted" />
          </Pressable>
        );
      })}
      <Text className="pt-1 text-caption font-bold text-muted">{SOURCES_NOTE}</Text>
    </View>
  );
}

/** A card of the topic screen: a title over its lines (Try together, When to get help, the personal blocks). */
export function Card({ title, tone = 'surface', children }: { title: string; tone?: 'surface' | 'hot' | 'grow'; children: ReactNode }) {
  const look =
    tone === 'hot' ? 'bg-hot-bg' : tone === 'grow' ? 'bg-grow-bg' : 'border-card border-edge bg-surface shadow-card';
  const ink = tone === 'hot' ? 'text-hot-ink' : tone === 'grow' ? 'text-grow-ink' : '';
  return (
    <View className={`gap-1.5 rounded-card px-4 py-3.5 ${look}`}>
      <Text role="heading" className={`text-label font-display ${ink}`}>
        {title}
      </Text>
      {children}
    </View>
  );
}
