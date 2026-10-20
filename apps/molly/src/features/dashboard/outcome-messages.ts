import type { Feeding, Sleep } from '@molly/api';
import { agoText, durationText } from '@molly/core';

import type { AdjustTarget, Outcome, Tracker } from '@/actions/trackers';
import type { HelpTopic } from '@/features/help/topics';
import { formatElapsed } from '@/lib/time';
import { PLAIN, type Copy } from '@/theme/copy';

import { describeEntry, diaperLabel, METHOD_LABELS } from './timeline-text';

export type ToastTone = 'sleep' | 'feed' | 'diaper' | 'med' | 'danger';

/** What "Adjust time" changes, and what it's set to now. */
export type Adjustable = {
  target: AdjustTarget;
  title: string;
  current: string;
  /** For an end: the entry's start, which the new end must stay after. */
  after?: string;
  tone: Exclude<ToastTone, 'danger'>;
};

export type Toast = {
  text: string;
  /** A second, smaller line. */
  detail?: string;
  tone: ToastTone;
  help?: HelpTopic;
  adjust?: Adjustable;
  /** An entry to open in the edit screen. */
  edit?: { kind: 'sleep' | 'feeding'; id: number };
  /** An entry was just saved here: Life Sim leads with its tracker's top word ("Fresh bum!"). */
  saved?: true;
  /** Takes the change back: a skipped nap's Undo. */
  undo?: () => void;
  /** A child's avatar instead of the tone's dot ("Showing Otto"). */
  avatar?: { name: string; hue: number };
  /** How long it stays, when not the usual 6 s. */
  shownMs?: number;
};

/** What a dashboard button was for. */
export type Source = Tracker | 'diaper' | 'medication';

const TONES: Record<Source, Exclude<ToastTone, 'danger'>> = {
  sleep: 'sleep',
  feeding: 'feed',
  diaper: 'diaper',
  medication: 'med',
};
/** How a toast names the tracker ("Feeding started 09:14"): the theme's words. */
const names = (copy: Copy): Record<Source, string> => ({
  sleep: copy.sleep,
  feeding: copy.feedNoun,
  diaper: copy.diaper,
  medication: copy.med,
});

const took = ({ start, end }: { start: string; end: string }) => formatElapsed(Date.parse(end) - Date.parse(start));

/**
 * The toast after a dashboard, widget-style action. `me` is this phone's Baby Buddy user; `copy` the
 * theme's labels, whose tracker words name what started, saved or was cancelled.
 */
export function outcomeToast(outcome: Outcome, source: Source, me?: number, copy: Copy = PLAIN, now = new Date()): Toast {
  const tone = TONES[source];
  const name = names(copy)[source];
  switch (outcome.type) {
    case 'started':
      return {
        text: `${name} started ${agoText(new Date(outcome.timer.start), now)}`,
        tone,
        adjust: { target: { kind: 'timer', id: outcome.timer.id }, title: 'When did it start?', current: outcome.timer.start, tone },
      };
    case 'stopped': {
      const { created } = outcome;
      if (outcome.instant && created.kind === 'feeding') {
        const { entry } = created;
        return {
          text: `${copy.feed} saved · ${METHOD_LABELS[entry.method]}${entry.amount !== null ? ` ${entry.amount} ml` : ''}`,
          tone,
          saved: true,
          adjust: {
            target: { kind: 'feedingAt', id: entry.id, lengthMs: Date.parse(entry.end) - Date.parse(entry.start) },
            title: 'When was it?',
            current: entry.end,
            tone,
          },
          // A wrong side or amount is fixed in the editor.
          edit: { kind: 'feeding', id: entry.id },
        };
      }
      const text =
        created.kind === 'sleep'
          ? `${copy.sleep} saved · ${took(created.entry)}`
          : `${copy.feed} saved · ${METHOD_LABELS[created.entry.method]} · ${took(created.entry)}`;
      return {
        text,
        tone,
        saved: true,
        adjust: {
          target: { kind: created.kind, id: created.entry.id },
          title: 'When did it end?',
          current: created.entry.end,
          after: created.entry.start,
          tone,
        },
      };
    }
    case 'logged': {
      const { created } = outcome;
      return {
        text: created.kind === 'change' ? `${copy.diaper} saved · ${diaperLabel(created.entry)}` : `${created.entry.name} saved`,
        tone,
        saved: true,
        adjust: {
          target: { kind: created.kind, id: created.entry.id },
          title: 'When was it?',
          current: created.entry.time,
          tone,
        },
      };
    }
    case 'cancelled':
      return { text: `${name} cancelled`, tone };
    case 'alreadyRunning':
      return {
        text: `Already running for ${durationText(now.getTime() - Date.parse(outcome.since))} · started by ${outcome.user === me ? 'you' : 'someone else'}`,
        tone,
      };
    case 'alreadyStopped':
      return { text: 'Already stopped on another phone', tone };
    case 'permissionNeeded':
      return {
        text: "Started by someone else. Your Baby Buddy user needs permission to stop other people's timers (core.delete_timer).",
        tone: 'danger',
        help: 'permissions',
      };
    case 'failed':
      return failureToast(outcome.error);
  }
}

/**
 * A stop or cancel found the timer gone: the other phone saved it. `saved` is the entry it saved, found
 * after the refetch (see `entrySavedFromTimer`), or null if there is none (it was cancelled there).
 */
export function staleStopToast(tracker: Tracker, saved: Sleep | Feeding | null, now = new Date()): Toast {
  const tone = TONES[tracker];
  const text = 'Already stopped on another phone';
  if (!saved) return { text, tone };
  const item =
    tracker === 'sleep'
      ? ({ kind: 'sleep', at: saved.start, entry: saved as Sleep } as const)
      : ({ kind: 'feeding', at: saved.start, entry: saved as Feeding } as const);
  return {
    text,
    detail: `${describeEntry(item).title} saved there · ${took(saved)}, ended ${agoText(new Date(saved.end), now)}`,
    tone,
    edit: { kind: tracker, id: saved.id },
  };
}

/** Baby Buddy refused the skip note, and the key itself is fine: a missing permission. */
export const skipRefusedToast: Toast = {
  text: "Couldn't skip the nap. Your Baby Buddy user needs permission to add notes and tags (core.add_note, core.change_note, core.add_tag).",
  tone: 'danger',
  help: 'permissions',
};

export function failureToast(error: string, message?: string): Toast {
  if (error === 'unreachable') return { text: "Can't reach Baby Buddy. Nothing was saved.", tone: 'danger', help: 'reach' };
  return { text: message ?? `Baby Buddy refused the change (${error}). Nothing was saved.`, tone: 'danger' };
}
