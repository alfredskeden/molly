import { FEEDING_TYPES, type FeedingType } from '@molly/api';
import {
  CHILD_HUES,
  childPrefs,
  defaultChildPrefs,
  GUIDE_REGIONS,
  type BottleDefaults,
  type ChildPrefs,
  type ChildrenPrefs,
  type GuideRegion,
  type NapWindow,
  type TodoSeen,
} from '@molly/core';

import { isThemeKey, type ThemeKey } from '@/theme/themes';

export type Credentials = { baseUrl: string; token: string; userId: number };

export const CREDENTIALS_KEY = 'molly.credentials';

/** Anything unreadable counts as signed out. */
export function parseCredentials(stored: string | null): Credentials | null {
  const value = parseJson(stored);
  if (
    isRecord(value) &&
    typeof value.baseUrl === 'string' &&
    typeof value.token === 'string' &&
    typeof value.userId === 'number'
  ) {
    return { baseUrl: value.baseUrl, token: value.token, userId: value.userId };
  }
  return null;
}

export const THEME_PREFERENCES = ['system', 'day', 'night'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

/**
 * Per device, never shared between parents. `notifications` is the lock-screen timer notification
 * (Android), and `notificationPrompted` whether its permission sheet was answered (Continue or Not now);
 * `haptics` the tap feedback (Android).
 * `theme` is the Colours choice (day / night / follow the phone), `look` which theme, and `playful` whether
 * the theme's own labels ("Game paused") show instead of the plain ones. `childId` is the child on
 * screen, `children` each Baby Buddy child's preferences by id (shown, colour, nap window, bottle, Vitamin D
 * reminder): read them through `childPrefs` from `@molly/core`, which fills what's missing with defaults.
 * `guideRegion` is whose advice the Development guide follows, `guideNoteSeen` whether its first-open note
 * was read. `feedTimer` is Time feeds: on, Feed starts a timer; off (the default), a tap saves a finished feed.
 * `todoSeen` is what this device has seen of the to-do list, for "New" (null until the list first loads):
 * the first-load mark and the items saved, opened and marked unread here.
 */
export type Settings = {
  childId: number | null;
  children: ChildrenPrefs;
  theme: ThemePreference;
  notifications: boolean;
  notificationPrompted: boolean;
  haptics: boolean;
  look: ThemeKey;
  playful: boolean;
  guideRegion: GuideRegion;
  guideNoteSeen: boolean;
  feedTimer: boolean;
  todoSeen: TodoSeen | null;
};

export const SETTINGS_KEY = 'molly.settings';

export const DEFAULT_SETTINGS: Settings = {
  childId: null,
  children: {},
  theme: 'system',
  notifications: true,
  notificationPrompted: false,
  haptics: true,
  look: 'classic',
  playful: true,
  guideRegion: 'sweden',
  guideNoteSeen: false,
  feedTimer: false,
  todoSeen: null,
};

export function parseSettings(stored: string | null): Settings {
  const value = parseJson(stored);
  if (!isRecord(value)) return DEFAULT_SETTINGS;
  const childId = typeof value.childId === 'number' ? value.childId : DEFAULT_SETTINGS.childId;
  return {
    childId,
    children: 'children' in value ? parseChildren(value.children) : migratedChildren(value, childId),
    theme: isThemePreference(value.theme) ? value.theme : DEFAULT_SETTINGS.theme,
    notifications: typeof value.notifications === 'boolean' ? value.notifications : DEFAULT_SETTINGS.notifications,
    notificationPrompted:
      typeof value.notificationPrompted === 'boolean' ? value.notificationPrompted : DEFAULT_SETTINGS.notificationPrompted,
    haptics: typeof value.haptics === 'boolean' ? value.haptics : DEFAULT_SETTINGS.haptics,
    look: isThemeKey(value.look) ? value.look : DEFAULT_SETTINGS.look,
    playful: typeof value.playful === 'boolean' ? value.playful : DEFAULT_SETTINGS.playful,
    guideRegion: isGuideRegion(value.guideRegion) ? value.guideRegion : DEFAULT_SETTINGS.guideRegion,
    guideNoteSeen: typeof value.guideNoteSeen === 'boolean' ? value.guideNoteSeen : DEFAULT_SETTINGS.guideNoteSeen,
    feedTimer: typeof value.feedTimer === 'boolean' ? value.feedTimer : DEFAULT_SETTINGS.feedTimer,
    todoSeen: parseTodoSeen(value.todoSeen),
  };
}

/**
 * The theme, the notification choices, the guide's region and note and Time feeds belong to the device, not the account: kept.
 * The children's preferences and the to-do "seen" mark go with the account: their ids belong to one Baby Buddy.
 */
export function settingsAfterSignOut(settings: Settings): Settings {
  const { theme, notifications, notificationPrompted, haptics, guideRegion, guideNoteSeen, feedTimer } = settings;
  return { ...DEFAULT_SETTINGS, theme, notifications, notificationPrompted, haptics, guideRegion, guideNoteSeen, feedTimer };
}

/**
 * After onboarding: the first picked child on screen, the unticked ones hidden (nothing else is stored for a
 * new sign-in, since sign-out dropped the children's preferences). Without `hidden` (a new key for the rejected
 * one) every child's preferences stay.
 */
export function settingsAfterSignIn(settings: Settings, { childId, hidden }: { childId: number; hidden?: number[] }): Settings {
  if (hidden === undefined) return { ...settings, childId };
  return { ...settings, childId, children: Object.fromEntries(hidden.map((id) => [id, { shown: false }])) };
}

/** One child's preferences changed; the rest of its entry and the other children's stay. */
export function withChildPrefs(settings: Settings, childId: number, changes: Partial<ChildPrefs>): Settings {
  return { ...settings, children: { ...settings.children, [childId]: { ...settings.children[childId], ...changes } } };
}

/**
 * The child on screen's preferences, for code without Baby Buddy's list of children (widget refresh,
 * notifications): only the colour default depends on the list, and none of them draws it.
 */
export function prefsOnScreen(settings: Settings): ChildPrefs {
  return settings.childId === null ? defaultChildPrefs(0) : childPrefs([], settings.children, settings.childId);
}

function parseChildren(value: unknown): ChildrenPrefs {
  if (!isRecord(value) || Array.isArray(value)) return {};
  const children: ChildrenPrefs = {};
  for (const [key, entry] of Object.entries(value)) {
    const id = Number(key);
    if (Number.isInteger(id) && isRecord(entry)) children[id] = parseChildPrefs(entry);
  }
  return children;
}

/** Only the readable fields: `childPrefs` fills the rest with the child's defaults. */
function parseChildPrefs(entry: Record<string, unknown>): Partial<ChildPrefs> {
  const prefs: Partial<ChildPrefs> = {};
  if (typeof entry.shown === 'boolean') prefs.shown = entry.shown;
  if (typeof entry.hue === 'number' && Number.isInteger(entry.hue) && entry.hue >= 0 && entry.hue < CHILD_HUES) {
    prefs.hue = entry.hue;
  }
  if (isNapWindow(entry.napWindow)) prefs.napWindow = entry.napWindow;
  if (isBottleDefaults(entry.bottle)) prefs.bottle = entry.bottle;
  if (typeof entry.vitaminDReminder === 'boolean') prefs.vitaminDReminder = entry.vitaminDReminder;
  if (entry.sex === 'girl' || entry.sex === 'boy' || entry.sex === null) prefs.sex = entry.sex;
  if (typeof entry.solids === 'boolean') prefs.solids = entry.solids;
  return prefs;
}

/** Settings from before several children: the nap window, bottle and reminder were the selected child's. */
function migratedChildren(value: Record<string, unknown>, childId: number | null): ChildrenPrefs {
  if (childId === null) return {};
  const { napWindow, bottle, vitaminDReminder } = parseChildPrefs(value);
  const prefs: Partial<ChildPrefs> = {
    ...(napWindow && { napWindow }),
    ...(bottle && { bottle }),
    ...(vitaminDReminder !== undefined && { vitaminDReminder }),
  };
  return Object.keys(prefs).length > 0 ? { [childId]: prefs } : {};
}

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isClock = (text: string) => CLOCK.test(text);

function isNapWindow(value: unknown): value is NapWindow {
  return (
    isRecord(value) &&
    typeof value.start === 'string' &&
    CLOCK.test(value.start) &&
    typeof value.end === 'string' &&
    CLOCK.test(value.end)
  );
}

function isBottleDefaults(value: unknown): value is BottleDefaults {
  return (
    isRecord(value) &&
    FEEDING_TYPES.includes(value.type as FeedingType) &&
    (value.amount === undefined || (typeof value.amount === 'number' && value.amount > 0))
  );
}

const isIds = (value: unknown): value is number[] => Array.isArray(value) && value.every((id) => typeof id === 'number');

/** A stored `{ mark, saved }` from before items could be opened reads with nothing opened or unread. */
function parseTodoSeen(value: unknown): TodoSeen | null {
  if (!isRecord(value) || typeof value.mark !== 'number' || !isIds(value.saved)) return null;
  const opened = value.opened ?? [];
  const unread = value.unread ?? [];
  if (!isIds(opened) || !isIds(unread)) return null;
  return { mark: value.mark, saved: value.saved, opened, unread };
}

function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_PREFERENCES.includes(value as ThemePreference);
}

function isGuideRegion(value: unknown): value is GuideRegion {
  return GUIDE_REGIONS.includes(value as GuideRegion);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseJson(stored: string | null): unknown {
  if (stored === null) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}
