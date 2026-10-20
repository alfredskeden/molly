import AsyncStorage from '@react-native-async-storage/async-storage';

import { parseWidgetCache, WIDGET_CACHE_KEY, type WidgetCache } from './model';

export async function loadWidgetCache(): Promise<WidgetCache> {
  return parseWidgetCache(await AsyncStorage.getItem(WIDGET_CACHE_KEY));
}

export async function saveWidgetCache(cache: WidgetCache): Promise<void> {
  await AsyncStorage.setItem(WIDGET_CACHE_KEY, JSON.stringify(cache));
}
