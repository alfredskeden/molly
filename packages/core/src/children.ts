import type { BottleDefaults } from './feeding';
import { DEFAULT_NAP_WINDOW, type NapWindow } from './nap';

/** The child colours' oklch hues. A child's stored `hue` is an index into them: keep the order, add at the end. */
export const CHILD_HUE_ANGLES = [350, 210, 165, 60, 285] as const;

/** How many child colours there are. */
export const CHILD_HUES = CHILD_HUE_ANGLES.length;

export const DEFAULT_BOTTLE: BottleDefaults = { type: 'formula', amount: 120 };

/** Picks the WHO weight table. Not in Baby Buddy: each phone sets it. */
export type Sex = 'girl' | 'boy';

/** Per device and per Baby Buddy child: whether Molly shows it, its colour and its defaults. */
export type ChildPrefs = {
  shown: boolean;
  hue: number;
  napWindow: NapWindow;
  bottle: BottleDefaults;
  vitaminDReminder: boolean;
  sex: Sex | null;
  /** Feed offers Solids (a meal with its food in the notes). */
  solids: boolean;
};

/** Stored per child id; a field missing (or unreadable when stored) falls back to the child's default. */
export type ChildrenPrefs = Record<number, Partial<ChildPrefs>>;

type HasId = { id: number };

/** A child Molly has no entry for yet: shown, with the colour of its place in Baby Buddy's list. */
export function defaultChildPrefs(index: number): ChildPrefs {
  return {
    shown: true,
    hue: ((index % CHILD_HUES) + CHILD_HUES) % CHILD_HUES,
    napWindow: DEFAULT_NAP_WINDOW,
    bottle: DEFAULT_BOTTLE,
    vitaminDReminder: false,
    sex: null,
    solids: false,
  };
}

/** The stored preferences of a child over the defaults for its place in the list. */
export function childPrefs(children: HasId[], prefs: ChildrenPrefs, childId: number): ChildPrefs {
  const index = Math.max(0, children.findIndex((child) => child.id === childId));
  return { ...defaultChildPrefs(index), ...prefs[childId] };
}

/**
 * Colours for the children that have none stored yet, so a colour never moves when Baby Buddy's list does (it
 * lists the youngest first, so a newborn would take the first place). Each gets the colour fewest children
 * have, the first such in order. Null when every child has one.
 */
export function assignHues(children: HasId[], prefs: ChildrenPrefs): ChildrenPrefs | null {
  const missing = children.filter((child) => prefs[child.id]?.hue === undefined);
  if (missing.length === 0) return null;
  const used = Array.from({ length: CHILD_HUES }, () => 0);
  for (const child of children) {
    const hue = prefs[child.id]?.hue;
    if (hue !== undefined) used[hue] = (used[hue] ?? 0) + 1;
  }
  const next: ChildrenPrefs = { ...prefs };
  for (const child of missing) {
    const hue = used.indexOf(Math.min(...used));
    used[hue] = (used[hue] ?? 0) + 1;
    next[child.id] = { ...prefs[child.id], hue };
  }
  return next;
}

/** Baby Buddy's children minus the hidden ones, in its order. At least one stays shown. */
export function shownChildren<C extends HasId>(children: C[], prefs: ChildrenPrefs): C[] {
  const shown = children.filter((child) => prefs[child.id]?.shown !== false);
  return shown.length > 0 ? shown : children.slice(0, 1);
}

/** The chosen child while it's shown, otherwise the first shown one. */
export function childOnScreen<C extends HasId>(shown: C[], childId: number | null): C | null {
  return shown.find((child) => child.id === childId) ?? shown[0] ?? null;
}

/** The ticked children in Baby Buddy's order: the first opens first. */
export function pickChildren<C extends HasId>(children: C[], ticked: number[]): C[] {
  return children.filter((child) => ticked.includes(child.id));
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** `Born today`, `6 days`, `3 weeks`, `5 months`, `1 year 1 month`, `2 years 4 months`. */
export function ageLabel(birthDate: string, now: Date): string {
  const [year = 0, month = 1, day = 1] = birthDate.split('-').map(Number);
  const days = Math.round(
    (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(year, month - 1, day)) / DAY_MS,
  );
  const months =
    (now.getFullYear() - year) * 12 + (now.getMonth() - (month - 1)) - (now.getDate() < day ? 1 : 0);
  const unit = (n: number, name: string) => `${n} ${name}${n === 1 ? '' : 's'}`;
  if (days <= 0) return 'Born today';
  if (days < 7) return unit(days, 'day');
  if (months < 1) return unit(Math.floor(days / 7), 'week');
  if (months < 12) return unit(months, 'month');
  const rest = months % 12;
  return [unit(Math.floor(months / 12), 'year'), rest > 0 && unit(rest, 'month')].filter(Boolean).join(' ');
}

export type ChildStatus = { sleeping: boolean; label: string };

/** `Sleeping 42m` from a running sleep, `Awake 1h 25m` from the last sleep's end, nothing without either. */
export function childStatus(
  { sleepStart, lastSleepEnd }: { sleepStart: string | null; lastSleepEnd: string | null },
  now: Date,
): ChildStatus | null {
  if (sleepStart !== null) return { sleeping: true, label: `Sleeping ${elapsed(now.getTime() - Date.parse(sleepStart))}` };
  if (lastSleepEnd !== null) return { sleeping: false, label: `Awake ${elapsed(now.getTime() - Date.parse(lastSleepEnd))}` };
  return null;
}

function elapsed(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}
