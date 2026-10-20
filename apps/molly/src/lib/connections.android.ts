import { requireNativeModule } from 'expo';

const MollyNotify = requireNativeModule<{ freshConnections(): void }>('MollyNotify');

/**
 * Throws away the connections kept from before the app was put away: the network may have dropped them
 * silently, and a request on one would hang. Call before the first request after coming back.
 */
export function freshConnections() {
  MollyNotify.freshConnections();
}
