import { useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackLink, Button, goBack, ScreenTitle, Text } from '@/components/ui';
import { HELP, type HelpTopic } from '@/features/help/topics';

export default function Help() {
  const { topic } = useLocalSearchParams<{ topic?: string }>();
  const help = HELP[(topic as HelpTopic) in HELP ? (topic as HelpTopic) : 'reach'];

  const insets = useSafeAreaInsets();
  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 32 }}>
      <BackLink />
      <ScreenTitle>{help.title}</ScreenTitle>
      <View className="gap-3 px-4">
        <View className="gap-3 rounded-card border-card border-edge bg-surface shadow-card px-4 py-4">
          {help.steps.map((step) => (
            <Text key={step} className="text-base font-bold leading-6">
              • {step}
            </Text>
          ))}
        </View>
        <Button label="Back" onPress={goBack} />
      </View>
    </ScrollView>
  );
}
