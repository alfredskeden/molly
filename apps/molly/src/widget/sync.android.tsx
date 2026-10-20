'use no memo';

import { requestPinWidget, requestWidgetUpdate } from 'react-native-android-widget';

import { loadSettings } from '@/storage/settings';

import { loadWidgetCache } from './cache';
import { WIDGET_NAMES, widgetChild, widgetView } from './model';
import { widgetRepresentation } from './MollyWidget.android';
import { loadWidgetPins } from './pins';
import { refreshWidget, type WidgetState } from './refresh';

/**
 * Redraws every home-screen widget from fresh data, e.g. after a write in the app or a theme change.
 * Drops the last widget button's note: after the app has changed things, it would describe stale state.
 */
export async function syncWidget(): Promise<void> {
  await drawWidgets(await loadWidgetCache().then((cached) => refreshWidget({ ...cached, note: null })));
}

/** Redraws every home-screen widget from a state that's already fetched, each as the child it's pinned to. */
export async function drawWidgets({ cache, signedIn }: WidgetState): Promise<void> {
  const [settings, pins] = await Promise.all([loadSettings(), loadWidgetPins()]);
  const now = new Date();
  await Promise.all(
    WIDGET_NAMES.map((widgetName) =>
      requestWidgetUpdate({
        widgetName,
        renderWidget: (info) =>
          widgetRepresentation(info, widgetView(cache, { now, signedIn, child: widgetChild(cache, pins[info.widgetId]), feedTimer: settings.feedTimer }), settings),
      }),
    ),
  );
}

export const canPinWidget = true;

/** Asks the launcher to add the widget; Android shows its own confirmation. */
export async function pinWidget(): Promise<void> {
  await requestPinWidget({ widgetName: 'Molly' });
}
