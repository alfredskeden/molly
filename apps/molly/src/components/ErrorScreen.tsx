import type { ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View } from 'react-native';

import { Button, Screen, Text, Title } from './ui';

/**
 * What a render error shows instead of a blank screen: the routes' `ErrorBoundary`. Try again renders the
 * route once more; the entries are safe in Baby Buddy either way.
 */
export function ErrorScreen({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error('Molly render error', error);
    // The error may have come before the first frame, with the splash still up.
    SplashScreen.hideAsync().catch(() => undefined);
  }, [error]);
  return (
    <Screen>
      <Title>Something went wrong</Title>
      <View className="gap-4">
        <Text className="text-base font-bold leading-6 text-muted">
          Molly hit a problem drawing this screen. Nothing you logged is lost: it’s all in Baby Buddy.
        </Text>
        <Button label="Try again" onPress={() => void retry()} />
      </View>
    </Screen>
  );
}
