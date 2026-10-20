import type { MeasurementKind } from '@molly/api';
import { measurementText, measurementValue, measurementWhen, newestMeasurements, type MeasurementLists } from '@molly/core';
import { router } from 'expo-router';
import { View } from 'react-native';

import { Pressable } from '@/components/pressable';
import { Panel, Text } from '@/components/ui';
import { spoken } from '@/theme/copy';
import { useCopy } from '@/theme/theme';

import { MEASURES } from './model';
import type { ChildMeasurements } from './queries';

/** Latest value and when it was taken, or why there's none. */
function rowWords(kind: MeasurementKind, lists: MeasurementLists, status: ChildMeasurements['status'][MeasurementKind], now: Date) {
  if (status === 'forbidden') return { when: 'Needs permission in Baby Buddy', value: null };
  if (status === 'failed') return { when: "Couldn't load", value: null };
  if (status === 'loading') return { when: 'Loading…', value: null };
  const latest = newestMeasurements(kind, (lists[kind] ?? []) as never[])[0] ?? null;
  return {
    when: measurementWhen(kind, latest, now),
    value: latest ? measurementText(kind, measurementValue(kind, latest)) : null,
  };
}

/**
 * The child screen's Measurements card (design `1a`): a row per measurement with its latest value, which opens
 * its screen, and a separate `+` that opens the add sheet.
 */
export function MeasurementsCard({
  childId,
  measurements: { lists, status },
  now,
  onAdd,
}: {
  childId: number;
  measurements: ChildMeasurements;
  now: Date;
  onAdd: (kind: MeasurementKind) => void;
}) {
  const copy = useCopy();
  return (
    <Panel className="px-4 pb-1.5 pt-3.5" label="Measurements">
      <Text role="heading" accessibilityLabel={spoken(copy.measurements, 'Measurements')} className="pb-1 text-label font-extrabold">
        {copy.measurements}
      </Text>
      {MEASURES.map(({ kind, name, themed, add }, i) => {
        const { when, value } = rowWords(kind, lists, status[kind], now);
        return (
          <View key={kind} className={`flex-row items-center gap-3 py-2 ${i < MEASURES.length - 1 ? 'border-b border-line' : ''}`}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${name}, ${value ?? 'no value'}, ${when}`}
              accessibilityHint="Opens its history"
              onPress={() => router.push({ pathname: '/child/[id]/[measure]', params: { id: String(childId), measure: kind } })}
              className="min-h-[44px] flex-1 flex-row items-center gap-3 active:opacity-70"
            >
              <View className="flex-1">
                <Text className="text-base font-display">{copy[themed]}</Text>
                <Text className="text-caption font-bold text-muted">{when}</Text>
              </View>
              {value && <Text className="text-[17px] font-display tabular-nums">{value}</Text>}
            </Pressable>
            {status[kind] !== 'forbidden' && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Add ${add.toLowerCase()}`}
                onPress={() => onAdd(kind)}
                className="h-11 w-11 items-center justify-center rounded-chip bg-grow-bg active:scale-[0.97]"
              >
                <Text className="text-2xl font-extrabold text-grow-ink">+</Text>
              </Pressable>
            )}
          </View>
        );
      })}
    </Panel>
  );
}
