'use no memo';

import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { freshConnections } from '@/lib/connections';
import { loadSettings } from '@/storage/settings';
import { tapLogTask } from '@/tap-log/log';

import { loadWidgetCache } from './cache';
import { parseIntent, widgetChild, widgetView } from './model';
import { widgetRepresentation } from './MollyWidget.android';
import { loadWidgetPins, saveWidgetPin } from './pins';
import { refreshWidget, runWidgetIntent, type WidgetState } from './refresh';
import { drawWidgets } from './sync.android';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  // `receivedAt`: when the widget's click receiver got the tap (added by our patch of the widget library).
  const receivedAt = props.clickActionData?.receivedAt;
  const hop = typeof receivedAt === 'number' ? `, ${Date.now() - receivedAt} ms after the tap` : '';
  const done = tapLogTask(`widget ${props.widgetAction} ${props.clickAction ?? ''}${hop}`.replace('  ', ' '));
  try {
    await handleWidgetTask(props);
  } finally {
    done();
  }
}

async function handleWidgetTask({ widgetInfo, widgetAction, clickAction, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === 'WIDGET_DELETED') return saveWidgetPin(widgetInfo.widgetId, null);
  // The app's process may have been lying idle since its last request.
  freshConnections();
  const [settings, pins] = await Promise.all([loadSettings(), loadWidgetPins()]);
  const pin = pins[widgetInfo.widgetId];
  const draw = ({ cache, signedIn }: WidgetState) =>
    renderWidget(
      widgetRepresentation(widgetInfo, widgetView(cache, { now: new Date(), signedIn, child: widgetChild(cache, pin), feedTimer: settings.feedTimer }), settings),
    );

  const intent = widgetAction === 'WIDGET_CLICK' ? parseIntent(clickAction) : null;
  if (intent) {
    // Pending, then the answer, on every widget: the tapped one first, since it's where the parent looks.
    // The child this widget drew: its pin, read against the cache it was drawn from.
    const final = await runWidgetIntent(intent, widgetChild(await loadWidgetCache(), pin), async (state) => {
      draw(state);
      await drawWidgets(state);
    });
    if (final) await drawWidgets(final);
    return;
  }

  // Draw what's cached at once ("Loading…" if nothing is); the network can take a while.
  const cached = await loadWidgetCache();
  draw({ cache: cached, signedIn: true });
  draw(await refreshWidget(cached));
}
