import { freshConnections } from '@/lib/connections';
import { tapLogTask } from '@/tap-log/log';
import { parseIntent } from '@/widget/model';
import { runWidgetIntent } from '@/widget/refresh';
import { drawWidgets } from '@/widget/sync.android';

/** The name `ActionWorker.kt` starts; registered in `src/widget/register.android.ts`. */
export const NOTIFICATION_TASK = 'MollyNotifyAction';

/**
 * A notification button, run headless (possibly with the app process killed). `ActionReceiver.kt` has already
 * drawn it as pending; from here it's the widget tap's path, for the notification's child, so the widgets show it pending too, and each step
 * inside `runWidgetIntent` updates or clears the notification.
 */
export async function notificationActionTask({ intent, child }: { intent?: string; child?: number }): Promise<void> {
  const parsed = parseIntent(intent);
  if (!parsed) return;
  const done = tapLogTask(`notification ${intent}`);
  try {
    // The app's process may have been lying idle since its last request.
    freshConnections();
    // The notification's own child, from its extras (none from a notification posted before several children).
    const final = await runWidgetIntent(parsed, typeof child === 'number' && child >= 0 ? child : null, drawWidgets);
    if (final) await drawWidgets(final);
  } finally {
    done();
  }
}
