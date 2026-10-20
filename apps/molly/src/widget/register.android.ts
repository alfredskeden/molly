import { AppRegistry } from 'react-native';
import { registerWidgetConfigurationScreen, registerWidgetTaskHandler } from 'react-native-android-widget';

import { NOTIFICATION_TASK, notificationActionTask } from '@/notification/task.android';
import { startTapLog } from '@/tap-log/log';

import { WidgetConfiguration } from './configure.android';
import { widgetTaskHandler } from './task-handler.android';

// Here, not in the app's layout: a widget or notification task may start this JS runtime on its own.
startTapLog();
registerWidgetTaskHandler(widgetTaskHandler);
registerWidgetConfigurationScreen(WidgetConfiguration);
AppRegistry.registerHeadlessTask(NOTIFICATION_TASK, () => notificationActionTask);
