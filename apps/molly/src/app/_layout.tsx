import '../global.css';

import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { ErrorScreen } from '@/components/ErrorScreen';
import { QueryProvider } from '@/lib/query';
import { SessionProvider, useSession } from '@/session/session';
import { ThemeProvider, useStackOptions } from '@/theme/theme';
import { tapLog } from '@/tap-log/log';
import { syncWidget } from '@/widget/sync';

// The system splash stays up until the theme, the fonts and the session are loaded, so the first frame
// is already the right theme and screen (ThemeProvider renders nothing before that).
SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** In place of the whole layout, so it brings its own theme. */
export function ErrorBoundary(props: ErrorBoundaryProps) {
  return (
    <ThemeProvider>
      <ErrorScreen {...props} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    // For the avatar stack's pull (react-native-gesture-handler).
    // Every touch reaches here as it bubbles up: the Tap log shows whether one got to JS at all.
    <GestureHandlerRootView
      style={{ flex: 1 }}
      onTouchStart={(event) => tapLog(`touch start (${event.nativeEvent.touches.length} down)`)}
      onTouchEnd={(event) => tapLog(`touch end (${event.nativeEvent.touches.length} down)`)}
      onTouchCancel={(event) => tapLog(`touch cancel (${event.nativeEvent.touches.length} down)`)}
    >
      {/* Sheets follow the keyboard's real position (react-native-keyboard-controller). */}
      <KeyboardProvider>
        <ThemeProvider>
          <SessionProvider>
            <RootNavigator />
          </SessionProvider>
        </ThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { state } = useSession();
  const stackOptions = useStackOptions();
  useEffect(() => {
    if (state.status !== 'loading') SplashScreen.hideAsync().catch(() => undefined);
  }, [state.status]);
  useWidgetSync(
    state.status === 'signedIn' ? `${state.session.credentials.userId}|${state.session.childId}` : state.status,
  );
  if (state.status === 'loading') return null;
  const signedIn = state.status === 'signedIn';
  // A fresh cache per session, so nothing cached for one user shows for another. Every query is keyed by
  // child, so the cache holds each child's data and switching back is instant. A rejected key keeps it:
  // a new key for the same user picks up where it left off.
  const cacheKey =
    state.status === 'signedIn' || state.status === 'keyRejected'
      ? `${state.session.credentials.baseUrl}|${state.session.credentials.userId}`
      : null;

  return (
    <QueryProvider key={cacheKey ?? 'signed-out'} persistKey={cacheKey}>
      <Stack screenOptions={stackOptions}>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(main)" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Screen name="help" />
      </Stack>
    </QueryProvider>
  );
}

/** The widget can't see the app's state: redraw it when the session changes and on every foreground. */
function useWidgetSync(sessionKey: string) {
  useEffect(() => {
    if (sessionKey !== 'loading') syncWidget().catch(() => undefined);
  }, [sessionKey]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') syncWidget().catch(() => undefined);
    });
    return () => subscription.remove();
  }, []);
}
