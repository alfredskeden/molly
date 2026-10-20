import { loginFromQr } from '@molly/core';
import { router } from 'expo-router';
import { Platform, View } from 'react-native';

import { Button, Field, MessageBox, Screen, Text, Title } from '@/components/ui';
import { useOnboarding } from '@/features/onboarding/onboarding-context';
import { useConnect } from '@/features/onboarding/use-connect';

// expo-camera can't scan barcodes on the web; there, paste the code's text instead.
const CAN_SCAN = Platform.OS !== 'web';

/** The connect form: first onboarding, and a new key after Baby Buddy rejected the old one. */
export function ConnectForm() {
  const { form, setForm } = useOnboarding();
  const { connect, checking } = useConnect();

  function changeUrl(text: string) {
    const login = loginFromQr(text.trim());
    setForm(login ? { url: login.baseUrl, token: login.token, error: null } : { ...form, url: text });
  }

  return (
    <Screen>
      <Title>Connect to Baby Buddy</Title>
      {form.error && <MessageBox message={form.error} />}
      {CAN_SCAN && (
        <View className="mb-6">
          <Button label="Scan the login QR code" onPress={() => router.push('/onboarding/scan')} />
          <Text className="mt-2 font-semibold text-muted">
            In Baby Buddy, open your user menu → Add a device. Or enter the address and key below.
          </Text>
        </View>
      )}
      <Field
        label="Baby Buddy address"
        placeholder="https://baby.example.com"
        keyboardType="url"
        value={form.url}
        onChangeText={changeUrl}
      />
      <Field
        label="API key"
        secureTextEntry
        value={form.token}
        onChangeText={(token) => setForm({ ...form, token })}
      />
      <Button
        label="Connect"
        pending={checking}
        pendingLabel="Checking…"
        onPress={() => connect(form.url, form.token)}
      />
    </Screen>
  );
}
