const MINUTE = 60_000;

/**
 * A feed saved with one tap: it ends now and started a minute earlier, so every rule that reads feeds keeps
 * a real start and end. It never starts before the previous feed's end (Baby Buddy refuses overlapping
 * feeds; touching or zero-length is fine) nor after now.
 */
export function instantFeedTimes(now: Date, lastFeedEnd?: Date): { start: Date; end: Date } {
  const minuteAgo = now.getTime() - MINUTE;
  const start = Math.min(Math.max(minuteAgo, lastFeedEnd?.getTime() ?? minuteAgo), now.getTime());
  return { start: new Date(start), end: now };
}
