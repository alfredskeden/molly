import '../global.css';

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import type { WidgetConfigurationScreenProps } from 'react-native-android-widget';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Pressable } from '@/components/pressable';
import { Button, Screen, Text, Title } from '@/components/ui';
import { Avatar } from '@/features/children/Avatar';
import { ThemeProvider } from '@/theme/theme';

import { loadWidgetCache } from './cache';
import { widgetPinChoices, type WidgetPin, type WidgetPinChoice } from './model';
import { loadWidgetPins, saveWidgetPin } from './pins';
import { refreshWidget } from './refresh';
import { drawWidgets } from './sync.android';

/** The widget shows the new child's data before the screen closes, unless Baby Buddy takes longer than this. */
const REFRESH_WAIT_MS = 6_000;

type Loaded = { choices: WidgetPinChoice[]; pin: WidgetPin; adding: boolean };

/**
 * "Whose widget?": asked when a widget is added and on long-press → reconfigure. Follow the app (whoever is on
 * the dashboard) or one shown child. With one shown child, or signed out, there's nothing to ask: the widget
 * follows the app and the screen closes at once.
 */
export function WidgetConfiguration(props: WidgetConfigurationScreenProps) {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <WhoseWidget {...props} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function WhoseWidget({ widgetInfo, setResult }: WidgetConfigurationScreenProps) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([loadWidgetCache(), loadWidgetPins()]).then(([cache, pins]) => {
      const choices = widgetPinChoices(cache);
      if (!choices) {
        setResult('ok');
        return;
      }
      const stored = pins[widgetInfo.widgetId];
      // A pin to a child no longer shown reads as Follow, which is what the widget draws.
      const pin = choices.some((choice) => choice.pin === stored) ? stored! : 'follow';
      setLoaded({ choices, pin, adding: stored === undefined });
    });
  }, [setResult, widgetInfo.widgetId]);

  if (!loaded) return null;
  const { choices, pin, adding } = loaded;

  const save = async () => {
    setSaving(true);
    await saveWidgetPin(widgetInfo.widgetId, pin);
    // A child no widget showed before has no snapshot yet: fetch it, then draw, so the widget opens on its data.
    const fresh = await Promise.race([
      refreshWidget().catch(() => null),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), REFRESH_WAIT_MS)),
    ]);
    await drawWidgets(fresh ?? { cache: await loadWidgetCache(), signedIn: true }).catch(() => undefined);
    setResult('ok');
  };

  return (
    <Screen>
      <Title>Whose widget?</Title>
      <View className="mb-6 gap-2">
        {choices.map((choice) => {
          const on = choice.pin === pin;
          const name = choice.pin === 'follow' ? 'Follow the app' : choice.child.name;
          return (
            <Pressable
              key={String(choice.pin)}
              role="radio"
              aria-checked={on}
              accessibilityLabel={choice.pin === 'follow' ? 'Follow the app, whoever is on the dashboard' : name}
              onPress={() => setLoaded({ ...loaded, pin: choice.pin })}
              className={`min-h-16 flex-row items-center gap-3 rounded-card border-card px-3 py-2 active:scale-[0.98] ${on ? 'border-edge bg-surface' : 'border-line bg-bg'}`}
            >
              {choice.pin === 'follow' ? (
                <View aria-hidden className="h-11 w-11 rounded-full border-2 border-dashed border-muted" />
              ) : (
                <Avatar name={choice.child.name} hue={choice.child.hue} size={44} />
              )}
              <View className="flex-1">
                <Text className="text-lg font-extrabold">{name}</Text>
                {choice.pin === 'follow' && (
                  <Text className="text-sm font-semibold text-muted">Whoever is on the dashboard</Text>
                )}
              </View>
              <View
                aria-hidden
                className={`h-7 w-7 rounded-full ${on ? 'border-[8px] border-ink' : 'border-2 border-line'}`}
              />
            </Pressable>
          );
        })}
      </View>
      <Button label={adding ? 'Add widget' : 'Save'} pending={saving} pendingLabel="Saving…" onPress={save} />
    </Screen>
  );
}
