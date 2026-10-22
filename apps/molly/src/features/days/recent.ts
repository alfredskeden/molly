import { todaysTotals, windowDate, windowTitle, type DayWindow, type EntriesByKind } from '@molly/core';

export type RecentSlot = { window: DayWindow; live: boolean; label: string };

export type RecentDay = {
  key: string;
  /** `Tonight`, `Today`, `Yesterday` or the weekday. */
  title: string;
  /** The morning's date, `Thu 24 Sep`. */
  date: string;
  /** The night that ended this morning: the card's left half, empty when missing. */
  night?: RecentSlot;
  /** The day that followed it: the right half, empty when missing (Tonight's card). */
  day?: RecentSlot;
};

const dateKey = (time: Date) =>
  `${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, '0')}-${String(time.getDate()).padStart(2, '0')}`;

/** The calendar date a window's card is for: a day's own, a night's next (its `end` is a guess while live). */
const morningOf = (window: DayWindow) =>
  new Date(window.start.getFullYear(), window.start.getMonth(), window.start.getDate() + (window.kind === 'night' ? 1 : 0));

/**
 * Recent days' cards (design `1k`), newest first: one per morning, holding the night the baby woke from and
 * the day that followed. The live night has no day yet, so it gets its own `Tonight` card on top.
 * `past` are the finished windows, newest first, as `daysRows` gives them.
 */
export function recentDays(live: DayWindow, past: DayWindow[]): RecentDay[] {
  const cards = new Map<string, RecentDay>();
  for (const window of [live, ...past]) {
    const morning = morningOf(window);
    const key = dateKey(morning);
    const isLive = window === live;
    const label = window.kind === 'day' ? (isLive ? 'Today so far' : 'Day') : isLive ? 'Tonight' : 'Night';
    const card = cards.get(key) ?? {
      key,
      title: isLive && window.kind === 'night' ? 'Tonight' : windowTitle({ kind: 'day', start: morning }, live),
      date: windowDate({ start: morning }),
    };
    card[window.kind] = { window, live: isLive, label };
    cards.set(key, card);
  }
  return [...cards.values()].sort((a, b) => b.key.localeCompare(a.key));
}

/**
 * What a card covers, for its totals: from its night's start (its day's, without a night) to its day's end
 * (its night's, without a day), capped at `now`, so the live card ends now.
 */
export function cardSpan(card: RecentDay, now: Date): { from: Date; to: Date } {
  const from = (card.night ?? card.day)?.window.start ?? now;
  const end = (card.day ?? card.night)?.window.end ?? now;
  return { from, to: new Date(Math.min(end.getTime(), now.getTime())) };
}

/** The Today sheet's boxes. `night` when the span holds a night, so its sleeps aren't all naps. */
export type TodayStats = { sleptMs: number; sleeps: number; feeds: number; diapers: number; night: boolean };

/** The live card so far (`running` is the sleep timer): what the Today sheet's boxes count. */
export function cardStats(card: RecentDay, entries: EntriesByKind, running: { start: string } | null, now: Date): TodayStats {
  const { from, to } = cardSpan(card, now);
  const totals = todaysTotals(entries, from, running, now);
  const started = entries.sleep.filter((entry) => {
    const start = Date.parse(entry.start);
    return start >= from.getTime() && start < to.getTime();
  }).length;
  return {
    sleptMs: totals.sleepMs,
    sleeps: started + (running ? 1 : 0),
    feeds: totals.feedings,
    diapers: totals.changes,
    night: !!card.night,
  };
}
