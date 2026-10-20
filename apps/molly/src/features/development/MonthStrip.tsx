import { GUIDE_PAGES, pageTitles, type GuidePage } from '@molly/core';
import { useEffect, useRef } from 'react';
import { ScrollView, View } from 'react-native';

import { Pressable } from '@/components/pressable';
import { Text } from '@/components/ui';
import { useHaptic } from '@/haptics/use-haptic';
import { HAPTICS } from '@/haptics/model';

/**
 * The overview's row of all 19 pages (design `1b`): swipe along it, tap one to open it. The page shown is
 * filled, the child's own carries a dot, the ones before it are muted. Keeps the page shown in the middle.
 */
export function MonthStrip({
  shown,
  childPage,
  name,
  onPick,
}: {
  shown: GuidePage;
  childPage: GuidePage | null;
  name: string;
  onPick: (page: GuidePage) => void;
}) {
  const haptic = useHaptic();
  const scroll = useRef<ScrollView>(null);
  const width = useRef(0);
  const spots = useRef(new Map<GuidePage, { x: number; width: number }>());
  const centre = (animated: boolean) => {
    const spot = spots.current.get(shown);
    if (spot && width.current > 0) scroll.current?.scrollTo({ x: Math.max(0, spot.x + spot.width / 2 - width.current / 2), animated });
  };
  useEffect(() => centre(true), [shown]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ScrollView
      ref={scroll}
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={(event) => {
        width.current = event.nativeEvent.layout.width;
        centre(false);
      }}
      contentContainerClassName="gap-1.5 px-4"
      accessibilityRole="tablist"
      accessibilityLabel="Ages"
    >
      {GUIDE_PAGES.map((page) => {
        const current = page === shown;
        const own = page === childPage;
        const before = childPage !== null && page < childPage;
        const { title, short } = pageTitles(page);
        return (
          <Pressable
            key={page}
            role="tab"
            aria-selected={current}
            accessibilityLabel={own ? `${title}, ${name}'s age` : title}
            onLayout={(event) => {
              spots.current.set(page, { x: event.nativeEvent.layout.x, width: event.nativeEvent.layout.width });
              if (current) centre(false);
            }}
            onPress={() => {
              haptic(HAPTICS.choose);
              onPick(page);
            }}
            className={`min-h-[48px] min-w-[52px] items-center justify-center gap-0.5 rounded-button border px-2.5 pb-1.5 pt-2 active:scale-[0.97] ${current ? 'border-accent bg-accent' : 'border-line bg-surface'}`}
          >
            <Text className={`text-label font-display ${current ? 'text-on-accent' : before ? 'text-muted' : 'text-ink'}`}>{short}</Text>
            {/* In the flow under the label, so a large font pushes it down instead of over the text. */}
            <View className={`h-1.5 w-1.5 rounded-full ${own ? (current ? 'bg-on-accent' : 'bg-grow-ink') : ''}`} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
