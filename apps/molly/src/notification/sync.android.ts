import { childPrefs } from '@molly/core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireNativeModule } from 'expo';
import { PermissionsAndroid, Platform } from 'react-native';

import type { Settings } from '@/storage/types';
import { CHILD_ICON_COLOURS, PALETTES } from '@/theme/tokens';
import type { WidgetCache } from '@/widget/model';

import {
  napReminderNotifications,
  timerNotifications,
  vitaminDNotifications,
  type LiveUpdates,
  type NapReminderNotification,
  type NotificationAvatar,
  type NotificationState,
  type PermissionAnswer,
  type ReminderNotification,
  type TimerNotification,
} from './model';

type Tracker = 'sleep' | 'feeding';

/** `avatar` / `avatarColor` empty: the tracker's icon (one child). */
type NativeAvatar = { avatar: string; avatarColor: string };

type NativeTimerNotification = TimerNotification & { color: string } & NativeAvatar;

/** Notifications are told apart by child (the notification's tag) and tracker (its id). */
/** The posting calls are async (Android system calls, SharedPreferences, a bitmap): off the JS thread. */
const MollyNotify = requireNativeModule<{
  show(tracker: Tracker, child: number, notification: NativeTimerNotification): Promise<void>;
  /** Cancels this tracker's notifications of every child not listed (and ones from before several children). */
  keepOnly(tracker: Tracker, children: number[]): Promise<void>;
  showReminder(
    child: number,
    reminder: Omit<ReminderNotification, 'text'> & { text: string; color: string } & NativeAvatar,
  ): Promise<void>;
  keepOnlyReminders(children: number[]): Promise<void>;
  scheduleNapReminder(child: number, reminder: Omit<NapReminderNotification, 'child' | 'avatar'> & { color: string } & NativeAvatar): Promise<void>;
  keepOnlyNapReminders(children: number[]): Promise<void>;
  allowed(): boolean;
  openSettings(): void;
  liveUpdates(): Promise<LiveUpdates>;
  openLiveUpdateSettings(): void;
}>('MollyNotify');

export const hasNotifications = true;

const COLORS: Record<Tracker, string> = { sleep: PALETTES.day['sleep-mid'], feeding: PALETTES.day['feed-mid'] };

const REMINDER_COLOR = PALETTES.day['med-mid'];
const NAP_REMINDER_COLOR = PALETTES.day['sleep-mid'];

/** The child's initial for the native icon, drawn white in a circle of the child's icon colour. */
function nativeAvatar(avatar: NotificationAvatar | null): NativeAvatar {
  if (!avatar) return { avatar: '', avatarColor: '' };
  return { avatar: avatar.initial, avatarColor: CHILD_ICON_COLOURS[avatar.hue % CHILD_ICON_COLOURS.length]! };
}

/** A notification problem must never break the widget refresh that called this. */
async function safely(what: string, post: () => Promise<void>) {
  try {
    await post();
  } catch (error) {
    console.warn('Molly notification', what, error);
  }
}

/**
 * Makes the lock-screen notifications match what this phone knows (the widget's cache): one per shown child's
 * running timer, gone once it's stopped or the child is hidden, each child's Vitamin D reminder while one is
 * due, and each child's nap reminder alarm while it's set. `settings` null means signed out. One call after another: a `show` that landed after the next sync's
 * `keepOnly` would bring back a notification that had gone.
 */
export async function syncNotifications(cache: WidgetCache, settings: Settings | null): Promise<void> {
  const prefsOf = (child: number) => childPrefs([], settings?.children ?? {}, child);
  const wanted = timerNotifications(cache, {
    enabled: settings?.notifications ?? false,
    napWindowOf: (child) => prefsOf(child).napWindow,
    now: new Date(),
  });
  for (const tracker of ['sleep', 'feeding'] as const) {
    const mine = wanted.filter((notification) => notification.tracker === tracker);
    for (const { tracker: _, child, avatar, ...notification } of mine) {
      await safely(tracker, () =>
        MollyNotify.show(tracker, child, { ...notification, color: COLORS[tracker], ...nativeAvatar(avatar) }),
      );
    }
    await safely(tracker, () => MollyNotify.keepOnly(tracker, mine.map((notification) => notification.child)));
  }
  const reminders = settings
    ? vitaminDNotifications(cache, { enabledFor: (child) => prefsOf(child).vitaminDReminder, now: new Date() })
    : [];
  for (const { child, avatar, ...reminder } of reminders) {
    await safely('reminder', () =>
      MollyNotify.showReminder(child, { ...reminder, text: reminder.text ?? '', color: REMINDER_COLOR, ...nativeAvatar(avatar) }),
    );
  }
  await safely('reminder', () => MollyNotify.keepOnlyReminders(reminders.map((reminder) => reminder.child)));
  const napReminders = settings ? napReminderNotifications(cache) : [];
  for (const { child, avatar, ...reminder } of napReminders) {
    await safely('nap reminder', () =>
      MollyNotify.scheduleNapReminder(child, { ...reminder, color: NAP_REMINDER_COLOR, ...nativeAvatar(avatar) }),
    );
  }
  await safely('nap reminder', () => MollyNotify.keepOnlyNapReminders(napReminders.map((reminder) => reminder.child)));
}

/** False when the permission is denied or Molly's notifications are blocked in Android settings. */
export function notificationsAllowed(): boolean {
  return MollyNotify.allowed();
}

/** Faster than anyone can read the prompt and tap "Don't allow": Android answered without showing it. */
const NO_PROMPT_MS = 500;

/**
 * Android can't say "blocked" without prompting, so the answer "don't ask again" is remembered on this
 * device until notifications are allowed.
 */
const BLOCKED_KEY = 'molly.notifications-blocked';

/**
 * Asks for the notification permission (Android 13+) unless notifications work already. `blocked`: Android
 * won't show the prompt (declined twice, or turned off in its settings), so only its settings can help.
 * `prompted` says whether Android showed its prompt this time.
 */
async function ask(): Promise<{ answer: PermissionAnswer; prompted: boolean }> {
  if (notificationsAllowed()) return { answer: 'granted', prompted: false };
  const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
  // Before Android 13 there's no prompt; granted but still not allowed means switched off in settings.
  if (Number(Platform.Version) < 33 || (await PermissionsAndroid.check(permission))) {
    return { answer: 'blocked', prompted: false };
  }
  if (await AsyncStorage.getItem(BLOCKED_KEY)) return { answer: 'blocked', prompted: false };
  const asked = Date.now();
  const result = await PermissionsAndroid.request(permission);
  const prompted = Date.now() - asked > NO_PROMPT_MS;
  if (result === PermissionsAndroid.RESULTS.GRANTED) return { answer: notificationsAllowed() ? 'granted' : 'blocked', prompted };
  if (result !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) return { answer: 'denied', prompted };
  await AsyncStorage.setItem(BLOCKED_KEY, '1');
  return { answer: 'blocked', prompted };
}

export async function askNotificationPermission(): Promise<PermissionAnswer> {
  return (await ask()).answer;
}

/**
 * "Turn on": Android's prompt while it still shows one, else Molly's notification settings. A parent who
 * just tapped "Don't allow" isn't sent to settings: only a tap Android answers without a prompt is.
 */
export async function turnOnNotifications(): Promise<PermissionAnswer> {
  const { answer, prompted } = await ask();
  if (answer === 'blocked' && !prompted) MollyNotify.openSettings();
  return answer;
}

/** Without prompting: `off` may still be asked for, `blocked` only changed in Android's settings. */
export async function notificationState(): Promise<NotificationState> {
  if (notificationsAllowed()) {
    await AsyncStorage.removeItem(BLOCKED_KEY);
    return 'allowed';
  }
  const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  if (Number(Platform.Version) < 33 || granted) return 'blocked';
  return (await AsyncStorage.getItem(BLOCKED_KEY)) ? 'blocked' : 'off';
}

/** Whether Android promotes the timer notifications to Live Updates (card and status-bar chip, Android 16+). */
export async function liveUpdatesState(): Promise<LiveUpdates> {
  return MollyNotify.liveUpdates();
}

/** Android's Live Updates switch for Molly, or its notification settings where that screen is missing. */
export function openLiveUpdateSettings(): void {
  MollyNotify.openLiveUpdateSettings();
}
