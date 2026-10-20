import * as SecureStore from 'expo-secure-store';

import { CREDENTIALS_KEY, parseCredentials, type Credentials } from './types';

// The widget's headless task reads the same key.

export async function loadCredentials(): Promise<Credentials | null> {
  return parseCredentials(await SecureStore.getItemAsync(CREDENTIALS_KEY));
}

export async function saveCredentials(credentials: Credentials): Promise<void> {
  await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify(credentials));
}

export async function clearCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
}
