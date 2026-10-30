import type { Note } from '@molly/api';

import { clockText, localDay } from './format';

// The shared to-do list: every item is a Baby Buddy note on whichever child was on screen when it
// was added; the list ignores the child. Plan: plans/implan-todo/.

export const TODO_TAG = 'molly-todo';
export const TODO_DONE_TAG = 'molly-todo-done';
/** `molly-done-YYYY-MM-DD`: the local day it was ticked, so both phones hide it after the same midnight. */
export const DONE_DAY_PREFIX = 'molly-done-';
/** A due date and time: the note's `time` is the moment. */
export const DUE_TAG = 'molly-todo-due';
/** A due date only: the note's `time` is 12:00 local on that day. */
export const DAY_TAG = 'molly-todo-day';
export const LABEL_PREFIX = 'To-do: ';
/** Every item, open and done, in one list call (`tags` matches any). */
export const TODO_QUERY_TAGS = `${TODO_TAG},${TODO_DONE_TAG}`;

export const BUY = 'Buy';
export const APPOINTMENTS = 'Appointments';
export const OTHER = 'Other';
const BUILT_IN = [BUY, APPOINTMENTS];
/** Tag names are at most 100 characters, the prefix included. */
const MAX_LABEL = 100 - LABEL_PREFIX.length;

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `time`: at a time; `day`: a date only, `at` its local midnight. */
export type TodoDue = { kind: 'time' | 'day'; at: Date };

export type TodoItem = {
  id: number;
  child: number;
  text: string;
  label: string | null;
  due: TodoDue | null;
  /** The local day it was ticked (`YYYY-MM-DD`), `''` for a done tag without a day; null while open. */
  done: string | null;
  /** As Baby Buddy returns it (absolute, maybe the wrong host): show it through `photoUrl`. */
  image: string | null;
  tags: string[];
};

export type ListedItem = TodoItem & { overdue: boolean; isNew: boolean };

/** One label's card: `open` counts its open items. */
export type TodoCard = { label: string; open: number; items: ListedItem[] };

/**
 * What this device has seen, for "New": `mark` the highest note id when the list first loaded here
 * (it never moves after), `saved` the ids this device created, `opened` the ids opened here, and
 * `unread` the ids marked unread here (New again, whatever the rest says). Null on a device that never
 * loaded the list.
 */
export type TodoSeen = { mark: number; saved: number[]; opened: number[]; unread: number[] };

const startOfDay = (time: Date) => new Date(time.getFullYear(), time.getMonth(), time.getDate());
const addDays = (time: Date, days: number) => new Date(time.getFullYear(), time.getMonth(), time.getDate() + days);
const daysBetween = (from: Date, to: Date) => Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);

/** `27 Oct`. */
export const shortDate = (time: Date) => `${time.getDate()} ${MONTHS[time.getMonth()]}`;

const isLabelTag = (tag: string) => tag.startsWith(LABEL_PREFIX);
const isDoneTag = (tag: string) => tag === TODO_DONE_TAG || tag.startsWith(DONE_DAY_PREFIX);
const isStateTag = (tag: string) => tag === TODO_TAG || isDoneTag(tag);
const isDueTag = (tag: string) => tag === DUE_TAG || tag === DAY_TAG;

export function todoItems(notes: Note[]): TodoItem[] {
  return notes.map((note) => {
    const time = new Date(note.time);
    const label = note.tags.find(isLabelTag)?.slice(LABEL_PREFIX.length).trim() || null;
    const due: TodoDue | null = note.tags.includes(DUE_TAG)
      ? { kind: 'time', at: time }
      : note.tags.includes(DAY_TAG)
        ? { kind: 'day', at: startOfDay(time) }
        : null;
    const doneDay = note.tags.find((tag) => tag.startsWith(DONE_DAY_PREFIX))?.slice(DONE_DAY_PREFIX.length);
    const done = note.tags.includes(TODO_DONE_TAG) ? (doneDay ?? '') : null;
    return { id: note.id, child: note.child, text: note.note, label, due, done, image: note.image, tags: note.tags };
  });
}

/** When it's due: the moment, or for a date only the end of that day. */
const dueEnd = (due: TodoDue) => (due.kind === 'time' ? due.at : addDays(due.at, 1));

const isOverdue = (item: TodoItem, now: Date) => item.done === null && item.due !== null && dueEnd(item.due) <= now;

const isNew = (item: TodoItem, seen: TodoSeen | null) =>
  item.done === null &&
  seen !== null &&
  (seen.unread.includes(item.id) || (item.id > seen.mark && !seen.saved.includes(item.id) && !seen.opened.includes(item.id)));

/** Done items show struck through until the midnight after they were ticked. */
const isShown = (item: TodoItem, now: Date) => item.done === null || item.done === localDay(now);

/** Dated items first, soonest first (a date only at the start of its day), then undated ones newest first. */
function byDue(a: TodoItem, b: TodoItem): number {
  if (a.due && b.due) return a.due.at.getTime() - b.due.at.getTime() || b.id - a.id;
  if (a.due || b.due) return a.due ? -1 : 1;
  return b.id - a.id;
}

const keyOf = (label: string | null) => (label ?? OTHER).toLowerCase();

/**
 * The cards in order: Buy and Appointments always, family labels A–Z while they have an item to
 * show, and Other (no label) last, only with items. Labels that differ only in case share a card,
 * named as the oldest item has it.
 */
export function todoList(items: TodoItem[], now: Date, seen: TodoSeen | null): TodoCard[] {
  const cards = new Map<string, TodoCard>(BUILT_IN.map((label) => [label.toLowerCase(), { label, open: 0, items: [] }]));
  const shown = items.filter((item) => isShown(item, now)).sort((a, b) => a.id - b.id);
  for (const item of shown) {
    const key = keyOf(item.label);
    const card = cards.get(key) ?? { label: item.label ?? OTHER, open: 0, items: [] };
    cards.set(key, card);
    card.items.push({ ...item, overdue: isOverdue(item, now), isNew: isNew(item, seen) });
    if (item.done === null) card.open += 1;
  }
  for (const card of cards.values()) card.items.sort(byDue);
  const other = cards.get(OTHER.toLowerCase());
  const family = [...cards.entries()]
    .filter(([key]) => key !== OTHER.toLowerCase() && !BUILT_IN.some((label) => label.toLowerCase() === key))
    .map(([, card]) => card)
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  return [cards.get(BUY.toLowerCase())!, cards.get(APPOINTMENTS.toLowerCase())!, ...family, ...(other ? [other] : [])];
}

/** The header badge: open items New on this device (not opened here, or marked unread). */
export function newCount(items: TodoItem[], seen: TodoSeen | null): number {
  return items.filter((item) => isNew(item, seen)).length;
}

/** Highest real id: guesses (negative ids) never count. */
const topId = (items: TodoItem[]) => Math.max(0, ...items.map((item) => item.id));

/** The first load on a device: everything listed is seen, so a fresh install has nothing New. */
export function firstSeen(items: TodoItem[]): TodoSeen {
  return { mark: topId(items), saved: [], opened: [], unread: [] };
}

/** After this device saved a new item: never New here (unless marked unread). */
export function savedBy(seen: TodoSeen | null, id: number): TodoSeen {
  return { mark: 0, opened: [], unread: [], ...seen, saved: [...(seen?.saved ?? []), id] };
}

/** Opened here (read-only or edit sheet): no longer New, and off unread. Guesses record nothing. */
export function openedBy(seen: TodoSeen | null, id: number): TodoSeen | null {
  if (!seen || id < 0) return seen;
  return {
    ...seen,
    opened: seen.opened.includes(id) ? seen.opened : [...seen.opened, id],
    unread: seen.unread.filter((unread) => unread !== id),
  };
}

/** Marked unread here: New again, own items too. Guesses record nothing. */
export function unreadBy(seen: TodoSeen | null, id: number): TodoSeen | null {
  if (!seen || id < 0 || seen.unread.includes(id)) return seen;
  return { ...seen, unread: [...seen.unread, id] };
}

/**
 * Keeps the lists small: drops ids missing from the fetched list at or below its highest id (one above
 * it may be a save not fetched yet), done ids from `unread`, and `saved` / `opened` ids at or below the
 * mark. Done ids stay in `opened`, so unticking doesn't make them New. The same object when nothing goes.
 */
export function pruneSeen(items: TodoItem[], seen: TodoSeen): TodoSeen {
  const top = topId(items);
  const listed = new Set(items.map((item) => item.id));
  const finished = new Set(items.filter((item) => item.done !== null).map((item) => item.id));
  const kept = (id: number) => id > top || listed.has(id);
  const saved = seen.saved.filter((id) => id > seen.mark && kept(id));
  const opened = seen.opened.filter((id) => id > seen.mark && kept(id));
  const unread = seen.unread.filter((id) => kept(id) && !finished.has(id));
  const same = saved.length === seen.saved.length && opened.length === seen.opened.length && unread.length === seen.unread.length;
  return same ? seen : { ...seen, saved, opened, unread };
}

/**
 * The labels offered in the sheet, from Baby Buddy's tag names: Buy and Appointments, then the
 * family's `To-do: ` labels A–Z. Of labels that differ only in case, the first listed is kept.
 */
export function todoLabels(tagNames: string[]): string[] {
  const labels = new Map(BUILT_IN.map((label) => [label.toLowerCase(), label]));
  const family: string[] = [];
  for (const name of tagNames) {
    if (!isLabelTag(name)) continue;
    const label = name.slice(LABEL_PREFIX.length).trim();
    if (!label || labels.has(label.toLowerCase()) || label.toLowerCase() === OTHER.toLowerCase()) continue;
    labels.set(label.toLowerCase(), label);
    family.push(label);
  }
  return [...BUILT_IN, ...family.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))];
}

/** A typed label: an existing one whatever its case, or the new one; null for blank, Other or too long. */
export function labelFor(typed: string, labels: string[]): string | null {
  const label = typed.trim();
  if (!label || label.toLowerCase() === OTHER.toLowerCase() || label.length > MAX_LABEL) return null;
  return labels.find((existing) => existing.toLowerCase() === label.toLowerCase()) ?? label;
}

/** What the sheet saves: the label (null for Other) and the date. */
export type TodoDraft = { label: string | null; due: TodoDue | null };

/**
 * The tags for a saved item. Editing keeps it open or done as it was, and any tags not Molly's
 * to-do ones (added in Baby Buddy itself).
 */
export function saveTags({ label, due }: TodoDraft, before: string[] = []): string[] {
  const state = before.filter(isStateTag);
  const rest = before.filter((tag) => !isStateTag(tag) && !isLabelTag(tag) && !isDueTag(tag));
  return [
    ...(state.length > 0 ? state : [TODO_TAG]),
    ...(label ? [`${LABEL_PREFIX}${label}`] : []),
    ...(due ? [due.kind === 'time' ? DUE_TAG : DAY_TAG] : []),
    ...rest,
  ];
}

/** The note's `time`: the moment, 12:00 local for a date only, none (Baby Buddy's now) without a date. */
export function noteTime(due: TodoDue | null): string | undefined {
  if (!due) return undefined;
  const at = due.kind === 'time' ? due.at : new Date(due.at.getFullYear(), due.at.getMonth(), due.at.getDate(), 12);
  return at.toISOString();
}

/** Ticked off at `now`, by this phone's local date. */
export function tickTags(tags: string[], now: Date): string[] {
  return [...tags.filter((tag) => !isStateTag(tag)), TODO_DONE_TAG, `${DONE_DAY_PREFIX}${localDay(now)}`];
}

/** Open again; the label, date and photo stay. */
export function untickTags(tags: string[]): string[] {
  return [TODO_TAG, ...tags.filter((tag) => !isStateTag(tag))];
}

/** "Today 14:30", "Tomorrow", "in 5 days · 09:05", "14 Nov", "Yesterday · overdue"; '' without a date. */
export function dueText(item: TodoItem, now: Date): string {
  if (!item.due) return '';
  const days = daysBetween(now, item.due.at);
  const time = item.due.kind === 'time' ? clockText(item.due.at) : null;
  const named = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : days === -1 ? 'Yesterday' : null;
  const date =
    named ?? (days > 1 && days < 14 ? `in ${days} days` : shortDate(item.due.at));
  const text = time ? `${date}${named ? ' ' : ' · '}${time}` : date;
  return isOverdue(item, now) ? `${text} · overdue` : text;
}

/** The reminder for a date: an hour before a time, 19:00 the evening before a date only; none once past. */
export function reminderMoment(due: TodoDue, now: Date): Date | null {
  const at = due.kind === 'time' ? new Date(due.at.getTime() - HOUR_MS) : new Date(addDays(due.at, -1).setHours(19));
  return at > now ? at : null;
}

/**
 * When this phone reminds: an hour before an item with a time, 19:00 the evening before a date
 * only. None for done or undated items, for items turned quiet on this phone (`quiet`, the device's
 * `todoQuiet` ids), or once that moment has passed.
 */
export function reminderAt(item: TodoItem, now: Date, quiet: readonly number[]): Date | null {
  if (item.done !== null || !item.due || quiet.includes(item.id)) return null;
  return reminderMoment(item.due, now);
}

/** Turns one item's reminder off (`on` true: quiet) or back on, on this phone. Guesses record nothing. */
export function quietFor(quiet: number[], id: number, on: boolean): number[] {
  if (id < 0 || quiet.includes(id) === on) return quiet;
  return on ? [...quiet, id] : quiet.filter((other) => other !== id);
}

/**
 * Keeps the quiet ids small: drops ids missing from the fetched list at or below its highest id (one
 * above it may be a save not fetched yet) and ids listed without a date. Done items stay, so unticking
 * keeps the reminder off. The same array when nothing goes.
 */
export function pruneQuiet(items: TodoItem[], quiet: number[]): number[] {
  const top = topId(items);
  const byId = new Map(items.map((item) => [item.id, item]));
  const kept = quiet.filter((id) => {
    const item = byId.get(id);
    return item ? item.due !== null : id > top;
  });
  return kept.length === quiet.length ? quiet : kept;
}

/**
 * Baby Buddy builds the photo's URL from its own request host, which behind a proxy can be the
 * wrong scheme or host. The `/media/…` path joined to the session's base URL is the one that works.
 */
export function photoUrl(baseUrl: string, image: string): string {
  const path = image.indexOf('/media/');
  if (path < 0) return image;
  return `${baseUrl.replace(/\/+$/, '')}${image.slice(path)}`;
}
