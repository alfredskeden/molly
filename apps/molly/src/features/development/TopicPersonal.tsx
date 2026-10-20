import type { Child } from '@molly/api';
import {
  checkUps,
  dayWindow,
  measurementText,
  measurementValue,
  newestMeasurements,
  sleepComparison,
  typicalSleep,
  vitaminDCycle,
  vitaminDLine,
  type GuidePage,
  type GuideRegion,
  type TopicId,
} from '@molly/core';
import { router } from 'expo-router';
import { View } from 'react-native';

import { Pressable } from '@/components/pressable';
import { Text } from '@/components/ui';
import { useChildrenOnScreen } from '@/features/children/use-children';
import { useMeasurements } from '@/features/measurements/queries';
import { Glyph } from '@/theme/Glyph';

import { Card } from './parts';
import { useGuideEntries } from './queries';

type Props = { child: Child; topic: TopicId; page: GuidePage; ownPage: boolean; region: GuideRegion; now: Date };

/**
 * A topic's block about this child, above its lists: Sleep's typical range with the child's own last days
 * (on their own page), Health's check-ups and vaccines, weight and Vitamin D, Feeding's Vitamin D.
 */
export function TopicPersonal(props: Props) {
  if (props.topic === 'sleep') return <SleepBlock {...props} />;
  if (props.topic === 'health') return <HealthBlock {...props} />;
  if (props.topic === 'feeding' && props.ownPage) return <VitaminD {...props} />;
  return null;
}

function SleepBlock({ child, page, ownPage, region, now }: Props) {
  const range = typicalSleep(page, region);
  return (
    <Card title="How much sleep">
      <Text className="text-sm font-bold">{range.text}</Text>
      {ownPage && <OwnSleep child={child} now={now} />}
    </Card>
  );
}

/** The child's own last full days beside the range, numbers only. */
function OwnSleep({ child, now }: { child: Child; now: Date }) {
  const entries = useGuideEntries(child.id);
  const { prefsOf } = useChildrenOnScreen();
  if (!entries.data) return entries.isError ? <Text className="text-sm font-bold text-muted">{"Couldn't load the sleeps from Baby Buddy."}</Text> : null;
  const comparison = sleepComparison(entries.data.sleep, prefsOf(child.id).napWindow, now);
  return (
    <Text className="text-sm font-extrabold text-sleep-ink">
      {comparison
        ? `${child.first_name}, ${comparison.text}`
        : `Once 3 full days of sleep are logged in Molly, ${child.first_name}'s own numbers show here.`}
    </Text>
  );
}

function HealthBlock(props: Props) {
  const { child, page, ownPage, region } = props;
  const plan = checkUps(page, region);
  return (
    <>
      <Card title="Check-ups and vaccines">
        <Text className="text-sm font-bold">{plan.visit}</Text>
        <Text className="text-sm font-bold">{plan.vaccines}</Text>
      </Card>
      <WeightRow child={child} />
      {ownPage && <VitaminD {...props} />}
    </>
  );
}

/** A row to the child's weight screen with the latest weight. */
function WeightRow({ child }: { child: Child }) {
  const { lists, status } = useMeasurements(child.id);
  const latest = newestMeasurements('weight', lists.weight ?? [])[0];
  const value =
    status.weight === 'loading'
      ? 'Loading…'
      : status.weight !== 'ready'
        ? "Couldn't load"
        : latest
          ? measurementText('weight', measurementValue('weight', latest))
          : 'None yet';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Weight, ${value}`}
      accessibilityHint={`Opens ${child.first_name}'s weight`}
      onPress={() => router.push({ pathname: '/child/[id]/[measure]', params: { id: String(child.id), measure: 'weight' } })}
      className="min-h-[56px] flex-row items-center gap-3 rounded-card border-card border-edge bg-surface px-4 shadow-card active:opacity-70"
    >
      <Text className="flex-1 text-label font-display">Weight</Text>
      <Text className="text-label font-extrabold tabular-nums text-muted">{value}</Text>
      <Glyph name="chevron_right" size={20} color="muted" />
    </Pressable>
  );
}

/** Sweden under 2: the daily drops and whether one is logged in the baby's day; elsewhere the general line. */
function VitaminD({ child, region, now }: Props) {
  const entries = useGuideEntries(child.id);
  const { prefsOf } = useChildrenOnScreen();
  const napWindow = prefsOf(child.id).napWindow;
  const sleep = entries.data?.sleep ?? [];
  const cycle = vitaminDCycle(dayWindow({ sleep, feeding: [], change: [], medication: [] }, null, napWindow, now), napWindow, now);
  const line = vitaminDLine(region, child.birth_date, cycle, entries.data?.medication ?? [], now);
  if (!line) return null;
  return (
    <Card title="Vitamin D">
      <Text className="text-sm font-bold">{line.text}</Text>
      {line.status && entries.data && (
        <View className="flex-row">
          <Text className={`rounded-chip px-2.5 py-1 text-caption font-extrabold ${line.status === 'Given today' ? 'bg-diaper-bg text-diaper-ink' : 'bg-med-bg text-med-ink'}`}>
            {line.status}
          </Text>
        </View>
      )}
    </Card>
  );
}
