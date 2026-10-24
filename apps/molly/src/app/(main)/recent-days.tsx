import {
  counted,
  dayWindow,
  drank,
  drankText,
  durationText,
  totalsBetween,
   type DayWindow,
  type EntriesByKind,
} from '@molly/core';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pressable } from '@/components/pressable';
import { BackLink, Panel, ScreenTitle, Spinner, Text } from '@/components/ui';
import { useChildPrefs, useChildrenOnScreen } from '@/features/children/use-children';
import { useRunningTimer } from '@/features/dashboard/queries';
import { PageSkeleton, useSkeleton } from '@/features/dashboard/Skeleton';
import { UnreachableBanner } from '@/features/dashboard/Unreachable';
import { useDays } from '@/features/days/queries';
import { cardSpan, recentDays, type RecentDay, type RecentSlot } from '@/features/days/recent';
import { daysRows } from '@/features/days/rows';
import { olderMayExist as olderWeeksMayExist } from '@/features/days/weeks';
import { ringSleeps } from '@/features/ring/model';
import { MiniRing } from '@/features/ring/MiniRing';
import { Glyph } from '@/theme/Glyph';
import { spokenDuration } from '@/lib/time';

/** Cards shown at first and added by each `Load 3 more days`. */
const STEP = 3;

/** What a window held, for its mini ring. */
function summary(window: DayWindow, entries: EntriesByKind, now: Date) {
  const to = new Date(Math.min(window.end.getTime(), now.getTime()));
  const totals = totalsBetween(entries, window.start, to);
  const naps = entries.sleep.filter((entry) => {
    const start = Date.parse(entry.start);
    return start >= window.start.getTime() && start < window.end.getTime();
  }).length;
  return { sleptMs: totals.sleepMs, naps, feeds: totals.feedings };
}

/** Every day and night as a clock (design `1k`), newest first, three days at a time. A tap opens one on the dashboard. */
export default function RecentDays() {
  const { napWindow, bottle } = useChildPrefs();
  const { current } = useChildrenOnScreen();
  const birthDate = current?.birth_date ?? null;
  const running = useRunningTimer('sleep').data ?? null;
  const days = useDays();
  const pages = days.data?.pages;
  const updatedAt = days.dataUpdatedAt;
  const [shown, setShown] = useState(STEP);
  // The clock as of the fetch, not the ticking one: the cards are worked out again only when the data changes.
  const now = useMemo(() => new Date(updatedAt), [updatedAt]);
  const { cards, entries } = useMemo(() => {
    const { rows, entries, rhythm } = daysRows(pages ?? [], birthDate, napWindow, running, now);
    const live = dayWindow(entries, running, rhythm, now);
    return { cards: pages ? recentDays(live, rows) : [], entries };
  }, [pages, birthDate, napWindow, running, now]);
  const olderMayExist = olderWeeksMayExist(pages);
  const canMore = cards.length > shown || olderMayExist;
  const skeleton = useSkeleton(days.isPending);
  const insets = useSafeAreaInsets();

  async function loadMore() {
    const want = shown + STEP;
    if (cards.length < want && olderMayExist) await days.fetchNextPage();
    setShown(want);
  }

  const open = (window: DayWindow) =>
    router.navigate({ pathname: '/', params: { window: `${window.kind}-${window.start.getTime()}` } });

  return (
    <FlatList
      testID="recent-days"
      data={cards.slice(0, shown)}
      keyExtractor={(card) => card.key}
      initialNumToRender={3}
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 32 }}
      ListHeaderComponent={
        <>
          <BackLink />
          <ScreenTitle>Recent days</ScreenTitle>
          {days.isError && !days.data && (
            <View className="px-4 pb-3">
              <UnreachableBanner asOf={null} onRetry={() => days.refetch()} />
            </View>
          )}
          {skeleton && (
            <View className="gap-3 px-4">
              <PageSkeleton />
            </View>
          )}
        </>
      }
      ItemSeparatorComponent={Gap}
      renderItem={({ item }) => (
        <DayCard card={item} entries={entries} running={running} now={now} defaultMl={bottle.amount} onOpen={open} />
      )}
      ListFooterComponent={
        days.isSuccess && canMore ? (
          <View className="px-4 pt-3">
            <Pressable
              accessibilityRole="button"
              aria-busy={days.isFetchingNextPage}
              disabled={days.isFetchingNextPage}
              onPress={loadMore}
              className="h-[52px] flex-row items-center justify-center gap-1.5 rounded-button border-card border-edge bg-surface active:scale-[0.98]"
            >
              {days.isFetchingNextPage ? <Spinner color="ink" /> : <Glyph name="expand_more" size={20} color="ink" />}
              <Text className="text-label font-extrabold">{days.isFetchingNextPage ? 'Loading…' : 'Load 3 more days'}</Text>
            </Pressable>
          </View>
        ) : null
      }
    />
  );
}

function Gap() {
  return <View className="h-3" />;
}

/** One half of a card: a window's mini ring, tapped to open it. */
function Slot({
  title,
  slot: { window, live, label },
  entries,
  running,
  now,
  onOpen,
}: {
  title: string;
  slot: RecentSlot;
  entries: EntriesByKind;
  running: Parameters<typeof ringSleeps>[2];
  now: Date;
  onOpen: (window: DayWindow) => void;
}) {
  const { sleptMs, naps, feeds } = summary(window, entries, now);
  const small = window.kind === 'night' ? counted(feeds, 'feed') : counted(naps, 'nap');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${label}: slept ${spokenDuration(sleptMs)}, ${small}. Open`}
      onPress={() => onOpen(window)}
      className="w-1/2 shrink items-center gap-0.5 rounded-box pb-2 pt-1 active:bg-bg"
    >
      <MiniRing
        window={window}
        sleeps={ringSleeps(window, entries.sleep, live ? running : null, now)}
        entries={entries}
        big={durationText(sleptMs)}
        small={small}
      />
      <Text className="text-caption font-extrabold text-muted">{label}</Text>
    </Pressable>
  );
}

function DayCard({
  card,
  entries,
  running,
  now,
  defaultMl,
  onOpen,
}: {
  card: RecentDay;
  entries: EntriesByKind;
  running: Parameters<typeof ringSleeps>[2];
  now: Date;
  /** The child's default bottle, standing in for feeds with no ml. */
  defaultMl: number | undefined;
  onOpen: (window: DayWindow) => void;
}) {
  const { from, to } = cardSpan(card, now);
  // What the night and day held to drink, together: `≈ 840 ml`. Null when nothing was drunk.
  const line = drankText(drank(entries.feeding, from, to, defaultMl));
  return (
    <View className="px-4">
      <Panel className="gap-1.5 px-3 pb-3 pt-3.5">
        <View className="flex-row items-baseline justify-between px-1.5">
          <Text role="heading" className="text-title font-display">
            {card.title}
          </Text>
          <Text className="text-caption font-bold text-muted">{card.date}</Text>
        </View>
        <View className="flex-row gap-1">
          {[card.night, card.day].map((slot, index) =>
            slot ? (
              <Slot key={slot.window.kind} title={card.title} slot={slot} entries={entries} running={running} now={now} onOpen={onOpen} />
            ) : (
              <View key={index} className="w-1/2 shrink" />
            ),
          )}
        </View>
        {line && (
          <Text accessibilityLabel={line.spoken} className="text-center text-label font-bold text-muted">
            {line.text}
          </Text>
        )}
      </Panel>
    </View>
  );
}
