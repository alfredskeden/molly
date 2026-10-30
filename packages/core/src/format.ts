/** Local clock time, `07:13`. */
export function clockText(time: Date): string {
  return `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
}

/** The local date, `2026-10-25` (Baby Buddy's date fields and `<input type="date">` values). */
export function localDay(time: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${time.getFullYear()}-${pad(time.getMonth() + 1)}-${pad(time.getDate())}`;
}

const MINUTE_MS = 60_000;

/** The design's lengths: `2h 9m`, `39m`, whole minutes rounded down. */
export function durationText(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / MINUTE_MS);
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

/** Counting down, a part minute counts as a whole one: `in 25m` until it's 24 minutes away. */
export const countdown = (ms: number) => durationText(Math.ceil(ms / 60_000) * 60_000);

/** How a window stands at `now`: `in 1h 16m` before it, `20m left` while open, `14m ago` after. */
export function whenText({ start, end }: { start: Date; end: Date }, now: Date): string {
  if (now < start) return `in ${countdown(start.getTime() - now.getTime())}`;
  if (now <= end) return `${countdown(end.getTime() - now.getTime())} left`;
  return `${durationText(now.getTime() - end.getTime())} ago`;
}

/** A running timer: `4:12`, or `1:20:00` from an hour. */
export function timerText(ms: number): string {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  const [hours, minutes] = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60];
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds % 60)}` : `${minutes}:${pad(seconds % 60)}`;
}

/** `1 nap`, `3 naps`. */
export function counted(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/** Past this, how long ago something was is no quicker to read than its clock time. */
const RECENT_MS = 12 * 60 * MINUTE_MS;

/** `2h 8m ago`, `just now`, or the clock time (`22:30`) for something over 12 hours ago. */
export function agoText(time: Date, now: Date): string {
  const ago = now.getTime() - time.getTime();
  if (ago >= RECENT_MS) return clockText(time);
  return ago < MINUTE_MS ? 'just now' : `${durationText(ago)} ago`;
}
