import type { Change, Feeding, FeedingMethod, Medication, Sleep } from '@molly/api';
import { isSolidFeed, type BottleDefaults } from '@molly/core';

import type { Tracker } from '@/actions/trackers';

/** What the inline editor opens on: a logged entry, or a running timer (its start and the last entry's end). */
export type EditTarget =
  | { kind: 'sleep'; entry: Sleep }
  | { kind: 'feeding'; entry: Feeding }
  | { kind: 'change'; entry: Change }
  | { kind: 'medication'; entry: Medication }
  | { kind: 'running'; tracker: Tracker; start: string; earliest: string | null };

/** The editor's working copy: Done sends it, the close X drops it. */
export type Draft =
  | { kind: 'sleep'; id: number; start: Date; end: Date; nap: boolean }
  | {
      kind: 'feeding';
      id: number;
      start: Date;
      end: Date;
      method: FeedingMethod;
      type: Feeding['type'];
      amount: number | null;
      /** A meal's food. */
      notes: string | null;
    }
  | { kind: 'change'; id: number; time: Date; wet: boolean; solid: boolean }
  | { kind: 'medication'; id: number; time: Date }
  | { kind: 'running'; tracker: Tracker; start: Date; earliest: Date | null };

export type DraftField = 'start' | 'end' | 'time';

const MINUTE_MS = 60_000;

export function draftOf(target: EditTarget): Draft {
  switch (target.kind) {
    case 'sleep':
      return {
        kind: 'sleep',
        id: target.entry.id,
        start: new Date(target.entry.start),
        end: new Date(target.entry.end),
        nap: target.entry.nap,
      };
    case 'feeding': {
      const { entry } = target;
      return {
        kind: 'feeding',
        id: entry.id,
        start: new Date(entry.start),
        end: new Date(entry.end),
        method: entry.method,
        type: entry.type,
        amount: entry.amount,
        notes: entry.notes,
      };
    }
    case 'change':
      return { kind: 'change', id: target.entry.id, time: new Date(target.entry.time), wet: target.entry.wet, solid: target.entry.solid };
    case 'medication':
      return { kind: 'medication', id: target.entry.id, time: new Date(target.entry.time) };
    case 'running':
      return { kind: 'running', tracker: target.tracker, start: new Date(target.start), earliest: target.earliest ? new Date(target.earliest) : null };
  }
}

const clamp = (time: number, min: number, max: number) => new Date(Math.min(max, Math.max(min, time)));

/**
 * One −5 / +5 tap. An end never passes now and stays a minute after the start; a start stays a minute
 * before the end; a diaper or medicine never moves into the future; a running timer's start stays a
 * minute before now and after the entry before it ended.
 */
export function nudge(draft: Draft, field: DraftField, minutes: number, now: Date): Draft {
  const by = minutes * MINUTE_MS;
  switch (draft.kind) {
    case 'sleep':
    case 'feeding':
      if (field === 'start') return { ...draft, start: clamp(draft.start.getTime() + by, -Infinity, draft.end.getTime() - MINUTE_MS) };
      if (field === 'end') return { ...draft, end: clamp(draft.end.getTime() + by, draft.start.getTime() + MINUTE_MS, now.getTime()) };
      return draft;
    case 'change':
    case 'medication':
      return field === 'time' ? { ...draft, time: clamp(draft.time.getTime() + by, -Infinity, now.getTime()) } : draft;
    case 'running':
      return field === 'start'
        ? { ...draft, start: clamp(draft.start.getTime() + by, draft.earliest?.getTime() ?? -Infinity, now.getTime() - MINUTE_MS) }
        : draft;
  }
}

/**
 * A feed's new side, bottle or Solids: a bottle takes the child's bottle type and amount, a side is breast
 * milk, a meal solid food of no amount. The notes (a meal's food) stay whatever it becomes.
 */
export function withMethod(draft: Draft, method: FeedingMethod, bottle: BottleDefaults): Draft {
  if (draft.kind !== 'feeding' || draft.method === method) return draft;
  const solid = isSolidFeed(draft);
  if (isSolidFeed({ method })) return { ...draft, method, type: 'solid food', amount: 0 };
  if (method === 'bottle') return { ...draft, method, type: bottle.type, amount: (solid ? null : draft.amount) ?? bottle.amount ?? null };
  return { ...draft, method, type: 'breast milk', amount: draft.method === 'bottle' || solid ? null : draft.amount };
}

/** A meal's food, as typed. */
export function withNotes(draft: Draft, notes: string): Draft {
  return draft.kind === 'feeding' ? { ...draft, notes } : draft;
}

/** A sleep saved as a nap or night sleep, by hand: moving its times never changes it. */
export function withNap(draft: Draft, nap: boolean): Draft {
  return draft.kind === 'sleep' ? { ...draft, nap } : draft;
}

/** The fields Done sends to Baby Buddy (a running timer moves its start instead). */
export function patchOf(draft: Draft, target: EditTarget): Record<string, unknown> {
  switch (draft.kind) {
    case 'sleep':
      return { start: draft.start.toISOString(), end: draft.end.toISOString(), nap: draft.nap };
    case 'feeding':
      return {
        start: draft.start.toISOString(),
        end: draft.end.toISOString(),
        type: draft.type,
        method: draft.method,
        amount: draft.amount,
        notes: draft.notes,
      };
    case 'change':
      return { time: draft.time.toISOString(), wet: draft.wet, solid: draft.solid };
    case 'medication':
      return { time: draft.time.toISOString() };
    case 'running':
      return target.kind === 'running' ? { start: draft.start.toISOString() } : {};
  }
}

/** Whether Done has anything to send. */
export function isChanged(draft: Draft, target: EditTarget): boolean {
  return JSON.stringify(draft) !== JSON.stringify(draftOf(target));
}
