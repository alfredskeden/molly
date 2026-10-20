import AsyncStorage from '@react-native-async-storage/async-storage';

import { parseSettings, SETTINGS_KEY, type Settings } from './types';

export async function loadSettings(): Promise<Settings> {
  return parseSettings(await AsyncStorage.getItem(SETTINGS_KEY));
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

let writes: Promise<unknown> = Promise.resolve();

/**
 * Merges `change` into the stored settings, one write after another: two changes made together (Settings'
 * Save and the theme it applies) would otherwise each read the old settings and the second undo the first.
 */
export function updateSettings(change: Partial<Settings>): Promise<Settings> {
  const next = writes.then(async () => {
    const settings = { ...(await loadSettings()), ...change };
    await saveSettings(settings);
    return settings;
  });
  writes = next.catch(() => undefined);
  return next;
}
