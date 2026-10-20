/** Local clock times, `HH:MM`. */
export type NapWindow = { start: string; end: string };

export const DEFAULT_NAP_WINDOW: NapWindow = { start: '07:00', end: '19:00' };

export function isNap(start: Date, window: NapWindow = DEFAULT_NAP_WINDOW): boolean {
  const minute = start.getHours() * 60 + start.getMinutes();
  return minute >= minutesOf(window.start) && minute <= minutesOf(window.end);
}

/**
 * Whether a sleep is the night, by when it happened: it started outside the nap window (on its start
 * day), or started inside and was still going at the window's end. Otherwise it's a nap. A running
 * sleep passes now as `end`: what stopping it now would save.
 */
export function isNightSleep(start: Date, end: Date, window: NapWindow = DEFAULT_NAP_WINDOW): boolean {
  return !isNap(start, window) || end > atClock(start, 0, window.end);
}

function minutesOf(clock: string): number {
  const [hours = 0, minutes = 0] = clock.split(':').map(Number);
  return hours * 60 + minutes;
}

/** A local clock time (`HH:MM`) some days from `day`, by the calendar so a clock change doesn't shift it. */
export function atClock(day: Date, days: number, clock: string): Date {
  const [hours = 0, minutes = 0] = clock.split(':').map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() + days, hours, minutes);
}
