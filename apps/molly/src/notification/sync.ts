// The lock-screen notification exists only on Android; see sync.android.ts.
import type { Settings } from '@/storage/types';
import type { WidgetCache } from '@/widget/model';

import type { LiveUpdates, NotificationState, PermissionAnswer } from './model';

export const hasNotifications = false;

export async function syncNotifications(_cache: WidgetCache, _settings: Settings | null): Promise<void> {}

export function notificationsAllowed(): boolean {
  return false;
}

export async function askNotificationPermission(): Promise<PermissionAnswer> {
  return 'blocked';
}

export async function turnOnNotifications(): Promise<PermissionAnswer> {
  return 'blocked';
}

export async function notificationState(): Promise<NotificationState> {
  return 'blocked';
}

export async function liveUpdatesState(): Promise<LiveUpdates> {
  return 'unsupported';
}

export function openLiveUpdateSettings(): void {}
