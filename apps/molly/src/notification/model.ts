// Lock-screen notification content, without the native module, so it can be unit-tested.
import type { FeedingMethod } from '@molly/api';
import type { NapWindow } from '@molly/core';

import { formatClock } from '@/lib/time';
import {
  freshPending,
  initialOf,
  nightRule,
  NOTE_MS,
  pendingLabel,
  rowOf,
  type WidgetCache,
  type WidgetIntent,
  type WidgetRow,
} from '@/widget/model';

/** `pending`: what the notification says once the action is tapped; drawn natively before any JS runs. */
export type NotificationAction = { intent: WidgetIntent; label: string; pending: string };

/** `start` is epoch ms: the system chronometer counts from it, so the notification ticks without JS. */
export type TimerNotification = { title: string; text: string; start: number; actions: NotificationAction[] };

/** The child's initial on its colour (the index), drawn as the notification's icon while several children are shown. */
export type NotificationAvatar = { initial: string; hue: number };

/** One timer's notification and whose it is: the native side tells them apart by child and tracker. */
export type ChildTimerNotification = TimerNotification & {
  tracker: 'sleep' | 'feeding';
  child: number;
  avatar: NotificationAvatar | null;
};

// Android shows at most three actions, so Both stays in the app and on the 4×2 widget.
const FEEDING_ACTIONS: NotificationAction[] = [
  { intent: 'FEED_STOP_LEFT', label: 'Left', pending: pendingLabel('FEED_STOP_LEFT') },
  { intent: 'FEED_STOP_RIGHT', label: 'Right', pending: pendingLabel('FEED_STOP_RIGHT') },
  { intent: 'FEED_STOP_BOTTLE', label: 'Bottle', pending: pendingLabel('FEED_STOP_BOTTLE') },
];

const SLEEP_ACTIONS: NotificationAction[] = [{ intent: 'SLEEP_STOP', label: 'Stop', pending: pendingLabel('SLEEP_STOP') }];

const SIDES: Partial<Record<FeedingMethod, string>> = { 'left breast': 'Left', 'right breast': 'Right', 'both breasts': 'Both' };

/** "Otto · Sleeping" while more than one child is shown; the plain title with one. */
const titled = (title: string, name: string, several: boolean) => (several ? `${name} · ${title}` : title);

/** The child's avatar while more than one child is shown; none with one. */
const avatarOf = ({ name, hue }: { name: string; hue: number }, several: boolean): NotificationAvatar | null =>
  several ? { initial: initialOf(name), hue } : null;

/**
 * What this phone knows is running (the widget's cache: every shown child's timers), as notifications, in Baby
 * Buddy's order of children, sleep before feeding. A recent error or a tap being sent shows on its own child's.
 */
export function timerNotifications(
  cache: WidgetCache,
  { enabled, napWindowOf, now }: { enabled: boolean; napWindowOf: (child: number) => NapWindow; now: Date },
): ChildTimerNotification[] {
  const { snapshot, timers } = cache;
  if (!enabled || !snapshot) return [];
  const several = timers.length > 1;
  const pending = freshPending(cache, now);
  return timers.flatMap(({ child, sleep: sleepTimer, feeding: feedingTimer }) => {
    const title = (words: string) => titled(words, child.name, several);
    const avatar = avatarOf(child, several);
    // The buttons would fail too: the tap opens the app, where a new key can be added.
    if (cache.keyRejected) {
      const signIn = (tracker: 'sleep' | 'feeding', timer: { start: string } | null): ChildTimerNotification[] =>
        timer
          ? [{ tracker, child: child.id, avatar, title: title("Can't sign in"), text: 'Open Molly to add a new key', start: Date.parse(timer.start), actions: [] }]
          : [];
      return [...signIn('sleep', sleepTimer), ...signIn('feeding', feedingTimer)];
    }
    // A tap or note from before several children says no child: it was the widget's.
    const mine = (tapChild: number | null) => (tapChild ?? snapshot.child?.id ?? child.id) === child.id;
    // A tap being sent: its words and no buttons, as the native side drew it, until Baby Buddy answers.
    const sent = (row: 'sleep' | 'feeding') =>
      pending && mine(pending.child) && rowOf(pending.intent) === row ? pendingLabel(pending.intent) : null;
    const error = (row: WidgetRow) => (cache.note && mine(cache.note.child) ? recentError(cache, row, now) : null);
    // The last side is only known for the widget's child.
    const side = snapshot.child?.id === child.id && snapshot.lastFeedingMethod ? SIDES[snapshot.lastFeedingMethod] : undefined;
    const list: ChildTimerNotification[] = [];
    if (sleepTimer) {
      const sleepSent = sent('sleep');
      // What stopping now would save: by the refresh's reading of the child's rhythm, else by the clock.
      const night = nightRule(sleepTimer, napWindowOf(child.id))({ start: new Date(sleepTimer.start), end: now });
      const kind = night ? 'night sleep' : 'nap';
      list.push({
        tracker: 'sleep',
        child: child.id,
        avatar,
        title: title('Sleeping'),
        text: sleepSent ?? error('sleep') ?? `since ${formatClock(sleepTimer.start)} · saves as ${kind}`,
        start: Date.parse(sleepTimer.start),
        actions: sleepSent ? [] : SLEEP_ACTIONS,
      });
    }
    if (feedingTimer) {
      const feedingSent = sent('feeding');
      list.push({
        tracker: 'feeding',
        child: child.id,
        avatar,
        title: title('Feeding'),
        text:
          feedingSent ??
          error('feeding') ??
          [`since ${formatClock(feedingTimer.start)}`, feedingTimer.byMe ? 'by you' : 'by someone else', side && `last side ${side}`]
            .filter(Boolean)
            .join(' · '),
        start: Date.parse(feedingTimer.start),
        actions: feedingSent ? [] : FEEDING_ACTIONS,
      });
    }
    return list;
  });
}

/** A row's error from its last tap, while it's recent: shown in place of the details. */
function recentError({ note }: WidgetCache, row: WidgetRow, now: Date): string | null {
  return note?.row === row && note.tone === 'error' && now.getTime() - Date.parse(note.at) < NOTE_MS ? note.text : null;
}

/** `key` identifies one check's reminder: a swiped-away reminder stays away until the next check posts a new one. */
export type ReminderNotification = { title: string; text: string | null; key: number; actions: NotificationAction[] };

/** One child's reminder. */
export type ChildReminderNotification = ReminderNotification & { child: number; avatar: NotificationAvatar | null };

const REMINDER_ACTIONS: NotificationAction[] = [
  { intent: 'VITAMIN_D_GIVEN', label: 'Given now', pending: pendingLabel('VITAMIN_D_GIVEN') },
];

/**
 * The Vitamin D reminders this phone posted (the widget's cache), one per child whose switch is on, in plain words
 * in every theme: `Vitamin D` / `Not given today`, the child's name first and its avatar when more than one child is
 * shown. Given now being sent shows its pending line with no buttons; its error shows with the buttons back. The
 * native side adds Later (the old Dismiss).
 */
export function vitaminDNotifications(
  cache: WidgetCache,
  { enabledFor, now }: { enabledFor: (child: number) => boolean; now: Date },
): ChildReminderNotification[] {
  if (cache.keyRejected) return [];
  const several = cache.timers.length > 1;
  const pending = freshPending(cache, now);
  return cache.reminders.flatMap((reminder) => {
    if (!enabledFor(reminder.child)) return [];
    const child = cache.timers.find((entry) => entry.child.id === reminder.child)?.child;
    const sent = pending?.intent === 'VITAMIN_D_GIVEN' && (pending.child ?? reminder.child) === reminder.child;
    const error = cache.note && (cache.note.child ?? reminder.child) === reminder.child ? recentError(cache, 'medication', now) : null;
    return [
      {
        child: reminder.child,
        avatar: child ? avatarOf(child, several) : null,
        title: child ? titled('Vitamin D', child.name, several) : 'Vitamin D',
        text: sent ? pendingLabel('VITAMIN_D_GIVEN') : (error ?? 'Not given today'),
        key: Date.parse(reminder.at),
        actions: sent ? [] : REMINDER_ACTIONS,
      },
    ];
  });
}

/**
 * A nap reminder, scheduled on this phone to ring at `at` (epoch ms, the window's start). `key` is when it was set:
 * a reminder that rang isn't rung again for the same key.
 */
export type NapReminderNotification = {
  child: number;
  avatar: NotificationAvatar | null;
  title: string;
  text: string;
  key: number;
  at: number;
  actions: NotificationAction[];
};

const NAP_REMINDER_ACTIONS: NotificationAction[] = [
  { intent: 'SLEEP_START', label: 'Start sleep', pending: pendingLabel('SLEEP_START') },
];

/**
 * The nap reminders set on this phone (the widget's cache) that are scheduled, in plain words in every theme:
 * `Nap 2 likely` / `12:56 – 13:26` with Start sleep, the child's name first and its avatar when more than one
 * child is shown. The native side adds Dismiss. None while the key is rejected.
 */
export function napReminderNotifications(cache: WidgetCache): NapReminderNotification[] {
  if (cache.keyRejected) return [];
  const several = cache.timers.length > 1;
  return cache.napReminders.flatMap(({ child: id, setAt, ring }) => {
    if (!ring) return [];
    const child = cache.timers.find((entry) => entry.child.id === id)?.child;
    const title = ring.slot === 'bedtime' ? 'Bedtime likely' : `Nap ${ring.slot} likely`;
    return [
      {
        child: id,
        avatar: child ? avatarOf(child, several) : null,
        title: child ? titled(title, child.name, several) : title,
        text: `${formatClock(ring.start)} – ${formatClock(ring.end)}`,
        key: Date.parse(setAt),
        at: Date.parse(ring.start),
        actions: NAP_REMINDER_ACTIONS,
      },
    ];
  });
}

/** `blocked`: Android won't show its prompt any more; only its settings can turn notifications on. */
export type PermissionAnswer = 'granted' | 'denied' | 'blocked';

/** Whether Molly may post notifications: `off` can still be asked for, `blocked` only in Android's settings. */
export type NotificationState = 'allowed' | 'off' | 'blocked';

export type LockScreenState = {
  /** False on web: there is no lock-screen notification. */
  hasNotifications: boolean;
  /** The parent's Lock-screen timer setting. */
  enabled: boolean;
  /** Android lets Molly post notifications. */
  allowed: boolean;
  /** The permission sheet was answered once (Continue or Not now). */
  prompted: boolean;
};

/**
 * How to offer the lock-screen timer while one runs: the sheet the first time, then only a quiet line in
 * the hero. Nothing once it's allowed, or when the parent turned the setting off.
 */
export function lockScreenPrompt({ hasNotifications, enabled, allowed, prompted }: LockScreenState): 'sheet' | 'heroLine' | null {
  if (!hasNotifications || !enabled || allowed) return null;
  return prompted ? 'heroLine' : 'sheet';
}

/** Whether Android promotes Molly's notifications to Live Updates; `unsupported` before Android 16 and on web. */
export type LiveUpdates = 'on' | 'off' | 'unsupported';

export type NotificationCardState = {
  /** The parent's Lock-screen timer setting. */
  enabled: boolean;
  /** The parent's Vitamin D reminder setting. */
  reminder: boolean;
  /** Null until read. */
  notifications: NotificationState | null;
  /** Null until read. */
  liveUpdates: LiveUpdates | null;
};

export type NotificationCardLine = 'notificationsOff' | 'notificationsBlocked' | 'liveUpdatesOff';

/**
 * The line Settings shows under the Notifications card's choices, if any. The permission line wins: without
 * notifications there's nothing for Android to promote. Live Updates only matter to the lock-screen timer.
 */
export function notificationCardLine({
  enabled,
  reminder,
  notifications,
  liveUpdates,
}: NotificationCardState): NotificationCardLine | null {
  if (!enabled && !reminder) return null;
  if (notifications === 'off') return 'notificationsOff';
  if (notifications === 'blocked') return 'notificationsBlocked';
  return enabled && notifications === 'allowed' && liveUpdates === 'off' ? 'liveUpdatesOff' : null;
}
