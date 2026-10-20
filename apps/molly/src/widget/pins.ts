import AsyncStorage from '@react-native-async-storage/async-storage';

import { parseWidgetPins, WIDGET_PINS_KEY, type WidgetPin, type WidgetPins } from './model';

export async function loadWidgetPins(): Promise<WidgetPins> {
  return parseWidgetPins(await AsyncStorage.getItem(WIDGET_PINS_KEY));
}

/** `null` drops the widget's pin (it was deleted). */
export async function saveWidgetPin(widgetId: number, pin: WidgetPin | null): Promise<void> {
  const { [widgetId]: _, ...others } = await loadWidgetPins();
  await AsyncStorage.setItem(WIDGET_PINS_KEY, JSON.stringify(pin === null ? others : { ...others, [widgetId]: pin }));
}

/** The children widgets are pinned to, for the refresh to fetch. */
export function pinnedChildren(pins: WidgetPins): number[] {
  return Object.values(pins).filter((pin): pin is number => typeof pin === 'number');
}
