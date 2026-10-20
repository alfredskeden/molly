import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { Button, Screen, Text, Title } from '@/components/ui';
import { useOnboarding } from '@/features/onboarding/onboarding-context';
import { useSession } from '@/session/session';

const CHECKLIST = [
  'Each parent signs in with their own Baby Buddy user and API key.',
  "To stop or cancel each other's timers, both users need the delete timer permission (core.delete_timer), or must be superusers.",
  'To delete entries and tag them, non-superusers also need: delete sleep, delete feeding, delete diaper change, delete medication, change tag and add tag.',
];

export default function Checklist() {
  const { pending } = useOnboarding();
  const { signIn } = useSession();
  const first = pending?.picked?.[0];
  if (!pending?.picked || !first) return <Redirect href="/onboarding" />;
  const { credentials, children, picked } = pending;
  const hidden = children.filter((child) => !picked.includes(child)).map((child) => child.id);

  return (
    <Screen>
      <Title>Before you start</Title>
      <View className="mb-8 gap-3" accessibilityLabel="Setup checklist">
        {CHECKLIST.map((item) => (
          <Text key={item} className="text-base font-semibold">
            • {item}
          </Text>
        ))}
      </View>
      <Button label="Continue" onPress={() => signIn({ credentials, childId: first.id }, hidden)} />
    </Screen>
  );
}
