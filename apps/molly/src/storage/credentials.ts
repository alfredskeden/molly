import { CREDENTIALS_KEY, parseCredentials, type Credentials } from './types';

// Web only; the native build resolves credentials.native.ts (SecureStore) instead.

export async function loadCredentials(): Promise<Credentials | null> {
  return parseCredentials(localStorage.getItem(CREDENTIALS_KEY));
}

export async function saveCredentials(credentials: Credentials): Promise<void> {
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
}

export async function clearCredentials(): Promise<void> {
  localStorage.removeItem(CREDENTIALS_KEY);
}
