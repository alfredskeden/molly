import { Stack } from 'expo-router';

import { ErrorScreen } from '@/components/ErrorScreen';
import { useKeepChildOnScreen } from '@/features/children/use-children';
import { ReturnProvider } from '@/features/return/ReturnProvider';
import { ToastProvider } from '@/features/toast/toast';
import { useStackOptions } from '@/theme/theme';

// A reload or deep link to /settings or /child/3 still has the dashboard underneath, for Back.
export const unstable_settings = { anchor: 'index' };

export { ErrorScreen as ErrorBoundary };

export default function MainLayout() {
  return (
    <ToastProvider>
      <ReturnProvider>
        <KeepChildOnScreen />
        <Stack screenOptions={useStackOptions()} />
      </ReturnProvider>
    </ToastProvider>
  );
}

function KeepChildOnScreen() {
  useKeepChildOnScreen();
  return null;
}
