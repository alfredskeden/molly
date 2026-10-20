import { Stack } from 'expo-router';

import { OnboardingProvider } from '@/features/onboarding/onboarding-context';
import { useStackOptions } from '@/theme/theme';

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack screenOptions={useStackOptions()} />
    </OnboardingProvider>
  );
}
