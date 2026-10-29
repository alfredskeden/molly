import { agoText, durationText } from '@molly/core';

export type AddKind = 'sleep' | 'feed' | 'diaper' | 'med';
export type FeedKind = 'Left' | 'Right' | 'Both' | 'Bottle' | 'Solids';
export type DiaperKind = 'Wet' | 'Dirty' | 'Both';
export type MedKind = 'Vitamin D' | 'Other';

/** The Add entry sheet's form (design `1j`). `end` only for a sleep or feed; null starts a timer instead. */
export type AddDraft = {
  kind: AddKind;
  start: Date;
  end: Date | null;
  feed: FeedKind;
  diaper: DiaperKind;
  med: MedKind;
  /** A Vitamin D's optional note, or the name of another medicine. */
  note: string;
  /** A finished bottle's ml, from the last bottle; null while the typed amount is empty. */
  amount: number | null;
  /** A meal's food (feed kind Solids). */
  food: string;
};

const MINUTE_MS = 60_000;
/** `Add end time` puts the end this long after the start, or at now if that's sooner. */
const DEFAULT_LENGTH_MS = 30 * MINUTE_MS;

const toMinute = (time: Date) => new Date(Math.floor(time.getTime() / MINUTE_MS) * MINUTE_MS);

export function newDraft(kind: AddKind, now: Date, amount: number | null = null): AddDraft {
  return { kind, start: toMinute(now), end: null, feed: 'Left', diaper: 'Wet', med: 'Vitamin D', note: '', amount, food: '' };
}

/** Whether the form differs from how it opened; the kind tab alone isn't a change (its fields are untouched). */
export function addChanged(opened: AddDraft, draft: AddDraft): boolean {
  const { kind: _openedKind, ...was } = opened;
  const { kind: _kind, ...now } = draft;
  return JSON.stringify(was) !== JSON.stringify(now);
}

export const hasRange = (kind: AddKind) => kind === 'sleep' || kind === 'feed';

export function withEnd(draft: AddDraft, now: Date): AddDraft {
  return { ...draft, end: new Date(Math.min(toMinute(now).getTime(), draft.start.getTime() + DEFAULT_LENGTH_MS)) };
}

const CLOCK = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/** `10:50` as the latest such time that isn't in the future: today's, or yesterday's when that's still to come. */
export function parseClock(text: string, now: Date): Date | null {
  const match = CLOCK.exec(text.trim());
  if (!match) return null;
  const time = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(match[1]), Number(match[2]));
  if (time > now) time.setDate(time.getDate() - 1);
  return time;
}

/** Why Save can't go yet, in the design's words, or null. */
export function addProblem(draft: AddDraft, now: Date): string | null {
  if (draft.kind === 'med' && draft.med === 'Other' && !draft.note.trim()) return 'Write what was given';
  if (draft.start > now) return 'Start is in the future';
  if (hasRange(draft.kind) && draft.end) {
    if (draft.end <= draft.start) return 'End must be after start';
    if (draft.end > now) return 'End is in the future';
    if (draft.kind === 'feed' && draft.feed === 'Bottle' && draft.amount === null) return 'Type an amount';
    if (draft.kind === 'feed' && draft.feed === 'Solids' && !draft.food.trim()) return 'Write what was eaten';
  }
  return null;
}

const NOUN: Record<AddKind, string> = { sleep: 'sleep', feed: 'feed', diaper: 'diaper', med: 'medicine' };

/** The line over the button saying what Save will do, the button's words, and whether it starts a timer. */
export function addSummary(draft: AddDraft, now: Date): { note: string; button: string; timer: boolean } {
  const noun = NOUN[draft.kind];
  // How long ago, not the clock time typed: no sums to do.
  const when = agoText(draft.start, now);
  if (hasRange(draft.kind) && !draft.end) {
    return {
      note: `No end time, so a ${noun} timer starts ${when === 'just now' ? 'now' : when}. Add an end to save it as finished.`,
      button: `Start ${noun} timer`,
      timer: true,
    };
  }
  const button = `Save ${noun}`;
  if (hasRange(draft.kind) && draft.end) {
    return { note: `Saved as a finished ${noun}, ${durationText(draft.end.getTime() - draft.start.getTime())}. No timer.`, button, timer: false };
  }
  const withNote = draft.kind === 'med' && draft.med === 'Vitamin D' && draft.note.trim() ? ', with your note' : '';
  return { note: `Saved as a ${noun} from ${when}${withNote}.`, button, timer: false };
}
