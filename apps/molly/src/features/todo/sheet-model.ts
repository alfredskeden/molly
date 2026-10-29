import { clockText, reminderMoment, shortDate, type TodoDue } from '@molly/core';

/** The sheet's date choice: none, Today, Tomorrow, or another day (picked, or stepped a day at a time). */
export type TodoDay = 'none' | 'today' | 'tomorrow' | 'other';

/**
 * What the sheet holds while open. `other` is the Other day's date, `minutes` the time past midnight when
 * `timed`, `quiet` whether "Remind me" is off (this phone only, Android).
 */
export type TodoDraftState = {
  text: string;
  label: string | null;
  day: TodoDay;
  other: Date;
  timed: boolean;
  minutes: number;
  quiet: boolean;
};

const DAY_MINUTES = 24 * 60;

const startOfDay = (time: Date) => new Date(time.getFullYear(), time.getMonth(), time.getDate());
const addDays = (time: Date, days: number) => new Date(time.getFullYear(), time.getMonth(), time.getDate() + days);
const sameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();

/** The time a new "At a time" starts at. */
const DEFAULT_MINUTES = 9 * 60;

/** A new item: `label` is the card it was added from, if any. Other starts the day after tomorrow. */
export function newTodoDraft(label: string | null, now: Date): TodoDraftState {
  return { text: '', label, day: 'none', other: addDays(now, 2), timed: false, minutes: DEFAULT_MINUTES, quiet: false };
}

/** An item opened for editing; `quiet` is this phone's `todoQuiet` ids. */
export function todoDraftOf(
  item: { id: number; text: string; label: string | null; due: TodoDue | null },
  now: Date,
  quiet: readonly number[],
): TodoDraftState {
  const draft = { ...newTodoDraft(item.label, now), text: item.text, quiet: quiet.includes(item.id) };
  if (!item.due) return draft;
  const { at } = item.due;
  const day: TodoDay = sameDay(at, now) ? 'today' : sameDay(at, addDays(now, 1)) ? 'tomorrow' : 'other';
  const timed = item.due.kind === 'time';
  return { ...draft, day, other: day === 'other' ? startOfDay(at) : draft.other, timed, minutes: timed ? at.getHours() * 60 + at.getMinutes() : draft.minutes };
}

/** The due date and time the sheet saves. */
export function draftDue(draft: TodoDraftState, now: Date): TodoDue | null {
  if (draft.day === 'none') return null;
  const day = draft.day === 'today' ? startOfDay(now) : draft.day === 'tomorrow' ? addDays(now, 1) : startOfDay(draft.other);
  if (!draft.timed) return { kind: 'day', at: day };
  return { kind: 'time', at: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, draft.minutes) };
}

/** −1 d / +1 d on the Other day, never before today. */
export function stepDay(draft: TodoDraftState, days: number, now: Date): TodoDraftState {
  const other = addDays(draft.other, days);
  return { ...draft, other: other < startOfDay(now) ? startOfDay(now) : other };
}

/** A minute of the day, kept within 00:00…23:59. */
const withinDay = (minutes: number) => Math.min(DAY_MINUTES - 1, Math.max(0, minutes));

/** ±15 min, kept within the day. */
export function stepTime(draft: TodoDraftState, minutes: number): TodoDraftState {
  return { ...draft, minutes: withinDay(draft.minutes + minutes) };
}

/**
 * A day from the date picker: today or tomorrow choose Today / Tomorrow (a day before today, which only a
 * typed web value gives, is Today too), any later day becomes the Other day. Snapping leaves `other` as it
 * was, so choosing Other again shows the last Other day.
 */
export function pickDay(draft: TodoDraftState, day: Date, now: Date): TodoDraftState {
  if (startOfDay(day) <= startOfDay(now)) return { ...draft, day: 'today' };
  if (sameDay(day, addDays(now, 1))) return { ...draft, day: 'tomorrow' };
  return { ...draft, day: 'other', other: startOfDay(day) };
}

/** A time from the time picker, to the minute; Any time / At a time is left as it is. */
export function pickTime(draft: TodoDraftState, minutes: number): TodoDraftState {
  return { ...draft, minutes: withinDay(minutes) };
}

/**
 * The Android reminder line for a date: when this phone will remind, that it's too late, or that "Remind me"
 * is off here. None without a date.
 */
export function reminderLine({ due, quiet }: { due: TodoDue | null; quiet: boolean }, now: Date): string | null {
  if (!due) return null;
  if (quiet) return 'No reminder on this phone';
  const at = reminderMoment(due, now);
  if (!at) return 'Too late for a reminder';
  const day = sameDay(at, now) ? 'today' : sameDay(at, addDays(now, 1)) ? 'tomorrow' : `on ${shortDate(at)}`;
  return `This phone reminds you ${day} at ${clockText(at)}`;
}

/** What the sheet holds beside the draft: the photo (as saved, a new one, or removed) and labels made here. */
export type TodoExtras = { photo: 'keep' | 'new' | 'remove'; added: readonly string[] };

/**
 * Whether the sheet holds anything Save would change: the text (trimmed, as saved), the label, the date and
 * time as chosen (an Other day only when Other is picked, a time only with a date and "At a time"), a photo
 * picked or removed, or a new label.
 */
export function todoChanged(opened: TodoDraftState, draft: TodoDraftState, { photo, added }: TodoExtras): boolean {
  const shown = (state: TodoDraftState) => {
    const dated = state.day !== 'none';
    const timed = dated && state.timed;
    return [
      state.text.trim(),
      state.label,
      state.day,
      state.day === 'other' ? startOfDay(state.other).getTime() : null,
      timed,
      timed ? state.minutes : null,
      dated && state.quiet,
    ];
  };
  return photo !== 'keep' || added.length > 0 || JSON.stringify(shown(opened)) !== JSON.stringify(shown(draft));
}
