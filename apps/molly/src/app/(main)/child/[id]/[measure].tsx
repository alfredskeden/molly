import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { BackLink, Banner } from '@/components/ui';
import { useChildrenOnScreen } from '@/features/children/use-children';
import { MeasurementScreen } from '@/features/measurements/MeasurementScreen';
import { isMeasurementKind } from '@/features/measurements/model';

/** A measurement's own screen (design 2a, 2b, 1c / 2c, 1d, 1e, 1f), from a row of the child's Measurements card. */
export default function MeasurementRoute() {
  const { id, measure } = useLocalSearchParams<{ id: string; measure: string }>();
  const { all, prefsOf, loaded } = useChildrenOnScreen();
  const child = all.find((candidate) => String(candidate.id) === id);
  if (!loaded) return null;
  if (!child || !isMeasurementKind(measure)) {
    return (
      <View className="flex-1 bg-bg pt-8">
        <BackLink label="Settings" onPress={() => router.dismissTo('/settings')} />
        <View className="px-4">
          <Banner text={child ? 'There is no such measurement.' : "This child isn't in Baby Buddy any more."} tone="error" />
        </View>
      </View>
    );
  }
  return <MeasurementScreen key={`${child.id}-${measure}`} kind={measure} child={child} prefs={prefsOf(child.id)} />;
}
