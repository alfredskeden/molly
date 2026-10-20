const pad = (value: number) => String(value).padStart(2, '0');

export function formatClock(iso: string): string {
  const date = new Date(iso);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatElapsed(ms: number): string {
  // Timer starts come from the server, so a phone clock running behind gives a small negative value.
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${pad(minutes % 60)}m`;
}

/** A running timer: `12:34`, or `1:02:03` from an hour. */
export function formatTimer(ms: number): string {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  const [hours, minutes] = [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60)];
  return hours ? `${hours}:${pad(minutes)}:${pad(seconds % 60)}` : `${minutes}:${pad(seconds % 60)}`;
}

/** For screen readers: "12 minutes", "2 hours 5 minutes", not "12:34" read out every second. */
export function spokenDuration(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  if (minutes === 0) return 'less than a minute';
  const unit = (n: number, name: string) => `${n} ${name}${n === 1 ? '' : 's'}`;
  const [hours, rest] = [Math.floor(minutes / 60), minutes % 60];
  return [hours > 0 && unit(hours, 'hour'), rest > 0 && unit(rest, 'minute')].filter(Boolean).join(' ');
}
