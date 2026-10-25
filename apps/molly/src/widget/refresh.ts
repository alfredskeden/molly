import { createClient, type Client } from '@molly/api';
import { childPrefs, TODO_QUERY_TAGS, todoItems, type NapReminder } from '@molly/core';

import type { Outcome } from '@/actions/trackers';
import { notificationsAllowed, syncNotifications, syncTodoReminders } from '@/notification/sync';
import { loadCredentials } from '@/storage/credentials';
import { loadSettings } from '@/storage/settings';
import { prefsOnScreen } from '@/storage/types';
import { tapLog } from '@/tap-log/log';

import { loadWidgetCache, saveWidgetCache } from './cache';
import {
  answeredCache,
  EMPTY_CACHE,
  refreshedCache,
  remindedCache,
  runIntent,
  tapAllowed,
  tapContext,
  type WidgetCache,
  napRemindersAfter,
  type NapRingAt,
  type WidgetIntent,
  withNapReminder,
  withoutGivenReminder,
} from './model';
import { loadWidgetPins, pinnedChildren } from './pins';

export type WidgetState = { cache: WidgetCache; signedIn: boolean };

async function session() {
  const [credentials, settings] = await Promise.all([loadCredentials(), loadSettings()]);
  return credentials && settings.childId !== null
    ? { credentials, settings, childId: settings.childId, prefs: prefsOnScreen(settings) }
    : null;
}

/**
 * This phone's to-do reminders follow the list as the refresh finds it, so a tick on the other parent's phone
 * drops the alarm here too. A failed fetch leaves the alarms as they were.
 */
async function refreshTodoReminders(client: Client) {
  try {
    await syncTodoReminders(todoItems(await client.listNotes({ tags: TODO_QUERY_TAGS })));
  } catch (error) {
    tapLog(`to-do reminders not refreshed: ${String(error)}`);
  }
}

/**
 * Fetches fresh snapshots (the app's child and every pinned one); on failure keeps the cached one and marks it stale (or the key rejected). The lock-screen
 * notifications follow the result, so every widget refresh, app write and foreground updates them too.
 */
export async function refreshWidget(cache?: WidgetCache): Promise<WidgetState> {
  const current = await session();
  if (!current) {
    await saveWidgetCache(EMPTY_CACHE);
    await syncNotifications(EMPTY_CACHE, null);
    await syncTodoReminders(null);
    return { cache: EMPTY_CACHE, signedIn: false };
  }
  const base = cache ?? (await loadWidgetCache());
  // Turned off: a child's reminder is dropped, not only hidden, so turning it on again doesn't bring an old one back.
  const { children } = current.settings;
  const kept = {
    ...base,
    reminders: base.reminders.filter((reminder) => childPrefs([], children, reminder.child).vitaminDReminder),
  };
  const client = createClient(current.credentials);
  // Alongside the snapshots, not after: the widgets shouldn't wait for it.
  const todo = refreshTodoReminders(client);
  const next = await refreshedCache(kept, client, {
    child: current.childId,
    userId: current.credentials.userId,
    napWindow: current.prefs.napWindow,
    prefs: children,
    pinned: pinnedChildren(await loadWidgetPins()),
    notificationsAllowed: notificationsAllowed(),
    now: new Date(),
  });
  // The bell may have changed a nap reminder while the fetch was out: that change wins.
  const merged = napRemindersAfter(next, base, await loadWidgetCache());
  await saveWidgetCache(merged);
  await syncNotifications(merged, current.settings);
  await todo;
  return { cache: merged, signedIn: true };
}

/**
 * Runs a widget or notification button (server-checked, like the app): shows the tap as pending at once, draws
 * Baby Buddy's answer as soon as the write returns, then refreshes. `child`: the notification's own child (from
 * its extras), or the tapped widget's (`widgetChild`, from the cache it was drawn from), never whatever the app
 * shows now. `draw` draws a state on the caller's surfaces; the notifications follow every step here.
 * Null when the tap was dropped because another one is still on its way: the caller draws nothing.
 */
export async function runWidgetIntent(
  intent: WidgetIntent,
  child: number | null,
  draw: (state: WidgetState) => Promise<void> | void,
): Promise<WidgetState | null> {
  const current = await session();
  if (!current) return refreshWidget();
  const { credentials, settings } = current;
  const cached = await loadWidgetCache();
  const tapped = new Date();
  const context = tapContext(cached, settings, child);
  if (!context || !tapAllowed(cached, tapped)) {
    tapLog(`${intent} dropped: ${context ? 'another tap pending' : 'no child'}`);
    // The notification drew this tap as pending natively; put back what the pending one shows.
    await syncNotifications(cached, settings);
    return null;
  }

  const pending: WidgetCache = { ...cached, pending: { intent, at: tapped.toISOString(), child: context.child } };
  await saveWidgetCache(pending);
  // Started before the pending draw, so the request is on its way while the widgets render.
  const write = runIntent(intent, createClient(credentials), context);
  await syncNotifications(pending, settings);
  await drawSafely(draw, { cache: pending, signedIn: true });
  tapLog(`${intent} pending drawn`);

  let outcome: Outcome;
  try {
    outcome = await write;
  } catch (error) {
    // Not a Baby Buddy answer (a bug): unlock the buttons rather than wait for the pending tap to expire.
    const unlocked = { ...(await loadWidgetCache()), pending: null };
    await saveWidgetCache(unlocked);
    await syncNotifications(unlocked, settings);
    throw error;
  }
  // Reloaded: a refresh may have run meanwhile.
  const latest = await loadWidgetCache();
  const answered = withoutGivenReminder(
    answeredCache(latest, { intent, child: context.child, outcome, tapped }),
    outcome,
    context.child,
  );
  await saveWidgetCache(answered);
  await syncNotifications(answered, settings);
  await drawSafely(draw, { cache: answered, signedIn: true });
  tapLog(`${intent} answered: ${outcome.type}`);
  return refreshWidget(await withReminder(answered, outcome, current, context.child));
}

/**
 * `child`'s Vitamin D reminder after one of this phone's writes for it: gone once it logged Vitamin D; after a sleep
 * it stopped, checked with Baby Buddy (that child's switch on and notifications allowed only). Saved and shown at once.
 */
async function withReminder(
  cache: WidgetCache,
  outcome: Outcome,
  { credentials, settings }: NonNullable<Awaited<ReturnType<typeof session>>>,
  child: number,
): Promise<WidgetCache> {
  const prefs = childPrefs([], settings.children, child);
  const next = await remindedCache(withoutGivenReminder(cache, outcome, child), createClient(credentials), {
    outcome,
    enabled: prefs.vitaminDReminder && notificationsAllowed(),
    child,
    napWindow: prefs.napWindow,
    now: new Date(),
  });
  if (next === cache) return cache;
  await saveWidgetCache(next);
  await syncNotifications(next, settings);
  return next;
}

/**
 * The app's own writes (Stop, Vitamin D), for the child on screen: its reminder follows them before the refresh the
 * app runs next.
 */
export async function remindAfterAppWrite(outcome: Outcome): Promise<void> {
  const current = await session();
  if (!current) return;
  await withReminder(await loadWidgetCache(), outcome, current, current.childId);
}

/**
 * The likely-sleep panel's bell: sets `child`'s nap reminder on this phone (replacing the child's earlier one), or
 * removes it with null, and schedules or cancels its alarm at once. Each refresh moves or cancels it after.
 */
export async function setNapReminder(child: number, reminder: (NapReminder & { ring: NapRingAt | null }) | null): Promise<void> {
  const current = await session();
  if (!current) return;
  const next = withNapReminder(await loadWidgetCache(), child, reminder);
  await saveWidgetCache(next);
  await syncNotifications(next, current.settings);
}

/** The nap reminder set on this phone for `child`, if any. */
export async function loadNapReminder(child: number) {
  return (await loadWidgetCache()).napReminders.find((reminder) => reminder.child === child) ?? null;
}

/** A drawing problem must not keep the answer or the refresh from happening. */
async function drawSafely(draw: (state: WidgetState) => Promise<void> | void, state: WidgetState) {
  try {
    await draw(state);
  } catch (error) {
    console.warn('Molly widget draw', error);
  }
}
