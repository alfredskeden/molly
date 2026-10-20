import type { Child, MeasurementKind } from '@molly/api';
import {
  dayMonth,
  gainLine,
  heightView,
  localDate,
  measurementParts,
  measurementRows,
  measurementValue,
  newestMeasurements,
  sinceLine,
  temperatureView,
  weightFooter,
  type ChildPrefs,
} from '@molly/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pressable } from '@/components/pressable';
import { BehindSheet } from '@/components/sheet';
import { BackLink, Text } from '@/components/ui';
import { useNow } from '@/features/dashboard/use-now';
import { spoken } from '@/theme/copy';
import { useCopy } from '@/theme/theme';

import { BmiView, HeadRings, HeightDoorframe } from './GrowthViews';
import { MeasurementSheet } from './MeasurementSheet';
import { measureOf } from './model';
import { Footer, EntryList } from './parts';
import { useMeasurements } from './queries';
import { TemperatureBar } from './TemperatureView';
import { WeightView } from './WeightView';

/** One measurement's own screen: back to the child, `+ Weight`, the big latest value, its picture and latest entries. */
export function MeasurementScreen({ kind, child, prefs }: { kind: MeasurementKind; child: Child; prefs: ChildPrefs }) {
  const measure = measureOf(kind);
  const copy = useCopy();
  const label = String(copy[measure.themed]);
  const now = useNow();
  const insets = useSafeAreaInsets();
  const measurements = useMeasurements(child.id);
  const [adding, setAdding] = useState(false);
  const { lists, status } = measurements;
  const latest = newestMeasurements(kind, (lists[kind] ?? []) as never[])[0];
  const value = latest ? measurementParts(kind, measurementValue(kind, latest)) : null;
  const back = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/child/[id]', params: { id: String(child.id) } }));
  const birth = child.birth_date;

  const line =
    kind === 'weight'
      ? gainLine(lists.weight ?? [], birth, now)
      : kind === 'height'
        ? heightView(lists.height ?? [], birth, now).line
        : kind === 'temperature'
          ? temperatureView(lists.temperature ?? [], now).line
          : kind === 'head'
            ? sinceLine('head', lists.head ?? [], now)
            : latest && 'date' in latest
              ? dayMonth(localDate(latest.date), now)
              : null;
  const empty =
    status[kind] === 'forbidden'
      ? "Your Baby Buddy user can't see this. A Baby Buddy admin can grant it (Help → Permissions)."
      : status[kind] === 'failed'
        ? "Couldn't load from Baby Buddy."
        : status[kind] === 'loading'
          ? 'Loading…'
          : 'None yet';

  return (
    <View className="flex-1 bg-bg">
      <BehindSheet sheetOpen={adding}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 40 }}>
          <View className="flex-row items-center justify-between pr-4">
            <BackLink label={child.first_name} onPress={back} />
            {status[kind] !== 'forbidden' && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Add ${measure.add.toLowerCase()}`}
                logName={`+ ${measure.add}`}
                onPress={() => setAdding(true)}
                className="mt-1.5 h-10 justify-center rounded-chip bg-accent px-4 active:scale-[0.97]"
              >
                <Text className="text-[15px] font-display text-on-accent">+ {measure.add}</Text>
              </Pressable>
            )}
          </View>

          <View className="gap-3.5 px-4 pt-1">
            <View className="px-1">
              <Text role="heading" accessibilityLabel={spoken(label, measure.name)} className="text-[15px] font-extrabold text-muted">
                {label}
              </Text>
              {value ? (
                <View accessible accessibilityLabel={`${value.number.replace(/ /g, '')} ${value.unit}`} className="flex-row items-baseline gap-1.5">
                  <Text className="text-[56px] font-display leading-[60px] tracking-display-2 tabular-nums">{value.number}</Text>
                  {value.unit !== '' && <Text className="text-[22px] font-display">{value.unit}</Text>}
                </View>
              ) : (
                <Text className="text-[34px] font-display leading-[44px]">{status[kind] === 'ready' ? 'None yet' : ''}</Text>
              )}
              <Text className="text-[15px] font-bold text-muted">{line ?? (value ? '' : empty === 'None yet' ? `Add the first with + ${measure.add}` : empty)}</Text>
            </View>

            {kind === 'weight' && (
              <>
                <WeightView weights={lists.weight ?? []} sex={prefs.sex} birthDate={birth} now={now} />
                <EntryList rows={measurementRows('weight', lists.weight ?? [], now, { count: 4, gap: true })} />
                <Footer>{weightFooter(prefs.sex, birth, now)}</Footer>
              </>
            )}
            {kind === 'height' && (lists.height ?? []).length > 0 && <HeightDoorframe heights={lists.height ?? []} birthDate={birth} now={now} />}
            {kind === 'head' && (lists.head ?? []).length > 0 && (
              <>
                <HeadRings heads={lists.head ?? []} birthDate={birth} now={now} />
                <EntryList rows={measurementRows('head', lists.head ?? [], now, { count: 3, gap: false })} />
              </>
            )}
            {kind === 'temperature' && <TemperatureBar readings={lists.temperature ?? []} now={now} />}
            {kind === 'bmi' && (
              <>
                <BmiView lists={lists} birthDate={birth} />
                <Footer>Adding BMI pre-fills from the weight and height logged today.</Footer>
              </>
            )}
          </View>
        </ScrollView>
      </BehindSheet>
      {adding && <MeasurementSheet kind={kind} childId={child.id} lists={lists} now={now} onClose={() => setAdding(false)} />}
    </View>
  );
}
