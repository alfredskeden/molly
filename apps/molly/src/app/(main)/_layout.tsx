import { Stack } from 'expo-router';

import { ErrorScreen } from '@/components/ErrorScreen';
import { useKeepChildOnScreen } from '@/features/children/use-children';
import { ToastProvider } from '@/features/toast/toast';
import { useStackOptions } from '@/theme/theme';

// A reload or deep link to /settings or /child/3 still has the dashboard underneath, for Back.
export const unstable_settings = { anchor: 'index' };

export { ErrorScreen as ErrorBoundary };

export default function MainLayout() {
  return (
    <ToastProvider>
      <KeepChildOnScreen />
      <Stack screenOptions={useStackOptions()} />
    </ToastProvider>
  );
}

function KeepChildOnScreen() {
  useKeepChildOnScreen();
  return null;
}
