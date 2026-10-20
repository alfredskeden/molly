import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

/** React Native has no online events: tell TanStack Query about reconnects, so reads refetch at once. */
export function listenForReconnect() {
  onlineManager.setEventListener((setOnline) => NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)));
}
