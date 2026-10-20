import { agoText, counted, durationText, mergeTimeline, type EntriesByKind, type TimelineItem } from '@molly/core';
import { View } from 'react-native';

import { Pressable } from '@/components/pressable';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/ui';
import { diaperIcon, feedIcon } from '@/features/ring/model';
import { Glyph } from '@/theme/Glyph';
import { TrackerIcon } from '@/theme/TrackerIcon';
import type { FilledSymbol } from '@/theme/symbols';

import { describeEntry, spokenEntry } from './timeline-text';

const LATEST_ENTRIES_SHOWN = 6;

export type TodayStats = { sleptMs: number; sleeps: number; feeds: number; diapers: number };

const KIND_BOX = {
  sleep: { box: 'bg-sleep-bg', ink: 'sleep-ink', bg: 'sleep-bg' },
  feeding: { box: 'bg-feed-bg', ink: 'feed-ink', bg: 'feed-bg' },
  change: { box: 'bg-diaper-bg', ink: 'diaper-ink', bg: 'diaper-bg' },
  medication: { box: 'bg-med-bg', ink: 'med-ink', bg: 'med-bg' },
} as const;

function iconOf(item: TimelineItem): FilledSymbol {
  switch (item.kind) {
    case 'sleep':
      return 'bedtime';
    case 'feeding':
      return feedIcon(item.entry.method);
    case 'change':
      return diaperIcon(item.entry);
    case 'medication':
      return 'medication';
  }
}

/**
 * The history button's sheet (design `1e`): the live window's totals in four boxes, the latest
 * entries (a tap opens one in the editor), and the way to Recent days.
 */
export function TodaySheet({
  night,
  now,
  stats,
  entries,
  onEdit,
  onRecentDays,
  onClose,
}: {
  night: boolean;
  now: Date;
  stats: TodayStats;
  entries: EntriesByKind;
  onEdit: (item: TimelineItem) => void;
  onRecentDays: () => void;
  onClose: () => void;
}) {
  const title = night ? 'Tonight' : 'Today';
  const boxes: { icon: FilledSymbol; ink: 'sleep-ink' | 'feed-ink' | 'diaper-ink'; value: string; label: string }[] = [
    { icon: 'bedtime', ink: 'sleep-ink', value: durationText(stats.sleptMs), label: night ? 'slept tonight' : 'slept today' },
    {
      icon: night ? 'bedtime' : 'partly_cloudy_day',
      ink: 'sleep-ink',
      value: String(stats.sleeps),
      label: night ? (stats.sleeps === 1 ? 'sleep' : 'sleeps') : stats.sleeps === 1 ? 'nap' : 'naps',
    },
    { icon: 'breastfeeding', ink: 'feed-ink', value: String(stats.feeds), label: stats.feeds === 1 ? 'feed' : 'feeds' },
    { icon: 'baby_changing_station', ink: 'diaper-ink', value: String(stats.diapers), label: stats.diapers === 1 ? 'diaper' : 'diapers' },
  ];
  const recent = mergeTimeline(entries).slice(0, LATEST_ENTRIES_SHOWN);
  return (
    <Sheet label={title} title={title} onScrimPress={onClose} scroll>
      <View
        accessible
        accessibilityLabel={`${title}: ${durationText(stats.sleptMs)} slept, ${counted(stats.sleeps, night ? 'sleep' : 'nap')}, ${counted(stats.feeds, 'feed')}, ${counted(stats.diapers, 'diaper')}`}
        className="flex-row gap-2"
      >
        {boxes.map((box) => (
          <View key={box.label} className="flex-1 gap-0.5 rounded-box bg-bg px-2.5 pb-3 pt-2.5">
            <TrackerIcon name={box.icon} size={20} ribbonSize={26} color={box.ink} light="bg" />
            <Text numberOfLines={1} className="text-[19px] font-display tabular-nums">
              {box.value}
            </Text>
            <Text numberOfLines={1} className="text-xs font-bold text-muted">
              {box.label}
            </Text>
          </View>
        ))}
      </View>

      <View className="pt-[22px]">
        <Text className="px-1 pb-1 text-label font-display text-muted">Recent · tap to edit</Text>
        {recent.length === 0 && <Text className="px-1 py-4 text-label font-bold text-muted">Nothing logged yet.</Text>}
        {recent.map((item) => {
          const { title: name } = describeEntry(item);
          const ranged = 'end' in item.entry;
          const box = KIND_BOX[item.kind];
          return (
            <Pressable
              key={`${item.kind}-${item.entry.id}`}
              accessibilityRole="button"
              accessibilityLabel={spokenEntry(item)}
              onPress={() => onEdit(item)}
              className="min-h-[60px] flex-row items-center gap-3 border-b border-line px-1 active:opacity-70"
            >
              <View className={`h-10 w-10 items-center justify-center rounded-chip ${box.box}`}>
                <TrackerIcon
                  name={iconOf(item)}
                  kind={item.kind === 'change' ? 'diaper' : undefined}
                  size={22}
                  ribbonSize={26}
                  color={box.ink}
                  light={box.bg}
                />
              </View>
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className="text-label font-extrabold">
                  {name}
                </Text>
                <Text className="text-caption font-bold tabular-nums text-muted">
                  {'end' in item.entry ? `ended ${agoText(new Date(item.entry.end), now)}` : agoText(new Date(item.at), now)}
                </Text>
              </View>
              {ranged && 'end' in item.entry && (
                <Text className="text-sm font-extrabold tabular-nums text-muted">
                  {durationText(Date.parse(item.entry.end) - Date.parse(item.entry.start))}
                </Text>
              )}
              <Glyph name="chevron_right" size={20} color="muted" />
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Recent days"
        accessibilityHint="Every day and night as a clock"
        onPress={onRecentDays}
        className="mt-[22px] min-h-16 flex-row items-center gap-3 px-1 active:opacity-70"
      >
        <View className="h-10 w-10 items-center justify-center rounded-chip bg-bg">
          <Glyph name="calendar_month" size={22} color="ink" />
        </View>
        <View className="flex-1">
          <Text className="text-label font-extrabold">Recent days</Text>
          <Text className="text-caption font-bold text-muted">Every day and night as a clock</Text>
        </View>
        <Glyph name="chevron_right" size={20} color="muted" />
      </Pressable>
    </Sheet>
  );
}
