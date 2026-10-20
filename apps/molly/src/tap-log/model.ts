/** One Tap log entry: when (ms since the epoch) and what. */
export type TapLogLine = { at: number; text: string };

/** A tick later than this is a stall worth a line. */
const STALL_MS = 200;
/** A gap this long is a process the system froze, not a busy JS thread. */
const FROZEN_MS = 10 * 60_000;

export function appended(lines: TapLogLine[], line: TapLogLine, max: number): TapLogLine[] {
  return [...lines, line].slice(-max);
}

export function parseTapLog(stored: string | null): TapLogLine[] {
  if (!stored) return [];
  try {
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter(isLine) : [];
  } catch {
    return [];
  }
}

function isLine(value: unknown): value is TapLogLine {
  if (typeof value !== 'object' || value === null) return false;
  const line = value as Partial<TapLogLine>;
  return typeof line.at === 'number' && typeof line.text === 'string';
}

/**
 * Whether a late tick of the watcher means the JS thread was busy. React Native pauses timers while the app
 * is away (unless a headless task runs), so the first tick after coming back is late without anything wrong.
 */
export function isStall({ lateMs, active, wasActive, task }: { lateMs: number; active: boolean; wasActive: boolean; task: boolean }) {
  if (lateMs <= STALL_MS || lateMs >= FROZEN_MS) return false;
  return task || (active && wasActive);
}

/** The log as plain text to share, oldest first. */
export function tapLogText(lines: TapLogLine[]): string {
  if (lines.length === 0) return 'Tap log is empty';
  return lines.map((line) => `${clock(new Date(line.at))} ${line.text}`).join('\n');
}

function clock(time: Date): string {
  const two = (value: number) => String(value).padStart(2, '0');
  return `${two(time.getHours())}:${two(time.getMinutes())}:${two(time.getSeconds())}.${String(time.getMilliseconds()).padStart(3, '0')}`;
}
