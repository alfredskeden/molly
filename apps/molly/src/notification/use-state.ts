import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import type { LiveUpdates, NotificationState } from './model';
import { liveUpdatesState, notificationState, turnOnNotifications } from './sync';

/**
 * Molly's notification permission and Live Updates, checked again whenever the app comes back (the parent
 * may have changed them in Android's settings). `turnOn` prompts, or opens those settings once Android won't.
 */
export function useNotificationState() {
  const [state, setState] = useState<NotificationState | null>(null);
  const [liveUpdates, setLiveUpdates] = useState<LiveUpdates | null>(null);
  const refresh = useCallback(() => {
    notificationState().then(setState, () => undefined);
    liveUpdatesState().then(setLiveUpdates, () => setLiveUpdates('unsupported'));
  }, []);

  useEffect(() => {
    refresh();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const turnOn = useCallback(async () => {
    const answer = await turnOnNotifications();
    setState(answer === 'granted' ? 'allowed' : answer === 'blocked' ? 'blocked' : 'off');
    return answer;
  }, []);

  return { state, liveUpdates, turnOn, refresh };
}
