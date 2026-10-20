import type { Timer } from '@molly/api';
import { parseSkip, windowsBefore, type DayWindow, type EntriesByKind, type NapWindow, type Skip } from '@molly/core';

import { mergeDays, type DaysPage } from './queries';
import { WINDOW_DAYS } from './weeks';

export type DaysRows = { rows: DayWindow[]; entries: EntriesByKind; skips: Skip[] };

/** Whether anything was logged in the window: a sleep in it, or a feed, diaper or medication. */
function logged(entries: EntriesByKind, window: DayWindow): boolean {
  const [start, end] = [window.start.getTime(), window.end.getTime()];
  const inside = (time: string) => Date.parse(time) >= start && Date.parse(time) < end;
  return (
    entries.sleep.some((entry) => Date.parse(entry.start) < end && Date.parse(entry.end) > start) ||
    entries.feeding.some((entry) => inside(entry.start)) ||
    entries.change.some((entry) => inside(entry.time)) ||
    entries.medication.some((entry) => inside(entry.time))
  );
}

/**
 * The Days screen's rows, newest first: every finished day and night that starts in a loaded week
 * (the live one is the dashboard's), up to the oldest with anything logged.
 */
export function daysRows(pages: DaysPage[], napWindow: NapWindow, running: Timer | null, now: Date): DaysRows {
  const { entries, skips: notes } = mergeDays(pages);
  const skips = notes.flatMap((note) => {
    const skip = parseSkip(note);
    return skip ? [skip] : [];
  });
  const oldest = pages.at(-1);
  if (!oldest) return { rows: [], entries, skips };
  const windows = windowsBefore(entries, napWindow, now, pages.length * WINDOW_DAYS, running).filter(
    (window) => window.start >= oldest.from,
  );
  const last = windows.findLastIndex((window) => logged(entries, window));
  return { rows: windows.slice(0, last + 1), entries, skips };
}
