import type { Change, Feeding, Sleep } from '@molly/api';
import { describe, expect, it } from 'vitest';

import { draftOf, isChanged, nudge, patchOf, withMethod, withNap, withNotes } from './editor-model';

const at = (clock: string) => {
  const [hours = 0, minutes = 0] = clock.split(':').map(Number);
  return new Date(2026, 8, 24, hours, minutes);
};
const iso = (clock: string) => at(clock).toISOString();

const nap: Sleep = { id: 7, child: 1, start: iso('09:32'), end: iso('10:41'), duration: '', nap: true, notes: null, tags: [] };
const feed: Feeding = {
  id: 8,
  child: 1,
  start: iso('10:45'),
  end: iso('11:03'),
  duration: '',
  type: 'breast milk',
  method: 'left breast',
  amount: null,
  notes: null,
  tags: [],
};
const change: Change = { id: 9, child: 1, time: iso('11:10'), wet: false, solid: true, color: '', amount: null, notes: null, tags: [] };
const now = at('11:40');
const bottle = { type: 'formula' as const, amount: 120 };

describe("the editor's draft", () => {
  it('starts from the entry as Baby Buddy has it', () => {
    // When
    const draft = draftOf({ kind: 'sleep', entry: nap });

    // Then
    expect(draft).toEqual({ kind: 'sleep', id: 7, start: at('09:32'), end: at('10:41'), nap: true });
  });

  it('is unchanged until a time moves', () => {
    // Given
    const draft = draftOf({ kind: 'sleep', entry: nap });

    // Then
    expect(isChanged(draft, { kind: 'sleep', entry: nap })).toBe(false);
  });

  it('is changed once a time moves', () => {
    // Given
    const draft = nudge(draftOf({ kind: 'sleep', entry: nap }), 'end', 5, now);

    // Then
    expect(isChanged(draft, { kind: 'sleep', entry: nap })).toBe(true);
  });
});

describe('moving a time by five minutes', () => {
  it('moves the end of a sleep', () => {
    // When
    const draft = nudge(draftOf({ kind: 'sleep', entry: nap }), 'end', 5, now);

    // Then
    expect(draft).toMatchObject({ start: at('09:32'), end: at('10:46') });
  });

  it('never moves the end past now', () => {
    // Given
    const recent = { ...nap, end: iso('11:37') };

    // When
    const draft = nudge(draftOf({ kind: 'sleep', entry: recent }), 'end', 5, now);

    // Then
    expect(draft).toMatchObject({ end: now });
  });

  it('keeps a sleep at least a minute long', () => {
    // Given
    const short = { ...nap, start: iso('10:38'), end: iso('10:41') };

    // When
    const draft = nudge(draftOf({ kind: 'sleep', entry: short }), 'end', -5, now);

    // Then
    expect(draft).toMatchObject({ start: at('10:38'), end: at('10:39') });
  });

  it('keeps the start at least a minute before the end', () => {
    // Given
    const short = { ...nap, start: iso('10:38'), end: iso('10:41') };

    // When
    const draft = nudge(draftOf({ kind: 'sleep', entry: short }), 'start', 5, now);

    // Then
    expect(draft).toMatchObject({ start: at('10:40'), end: at('10:41') });
  });

  it('moves the time of a diaper, never past now', () => {
    // When
    const earlier = nudge(draftOf({ kind: 'change', entry: change }), 'time', -5, now);
    const later = nudge(draftOf({ kind: 'change', entry: { ...change, time: iso('11:38') } }), 'time', 5, now);

    // Then
    expect(earlier).toMatchObject({ time: at('11:05') });
    expect(later).toMatchObject({ time: now });
  });

  it("moves the running sleep's start, at least a minute before now", () => {
    // Given
    const running = draftOf({ kind: 'running', tracker: 'sleep', start: iso('11:37'), earliest: null });

    // When
    const draft = nudge(running, 'start', 5, now);

    // Then
    expect(draft).toMatchObject({ start: at('11:39') });
  });

  it("never moves the running sleep's start before the sleep before it ended", () => {
    // Given
    const running = draftOf({ kind: 'running', tracker: 'sleep', start: iso('10:44'), earliest: iso('10:41') });

    // When
    const draft = nudge(running, 'start', -5, now);

    // Then
    expect(draft).toMatchObject({ start: at('10:41') });
  });
});

describe("a feed's kind", () => {
  it('changes between breast sides', () => {
    // When
    const draft = withMethod(draftOf({ kind: 'feeding', entry: feed }), 'right breast', bottle);

    // Then
    expect(patchOf(draft, { kind: 'feeding', entry: feed })).toEqual({
      start: iso('10:45'),
      end: iso('11:03'),
      type: 'breast milk',
      method: 'right breast',
      amount: null,
      notes: null,
    });
  });

  it("takes the child's bottle and amount when it becomes a bottle", () => {
    // When
    const draft = withMethod(draftOf({ kind: 'feeding', entry: feed }), 'bottle', bottle);

    // Then
    expect(patchOf(draft, { kind: 'feeding', entry: feed })).toMatchObject({ type: 'formula', method: 'bottle', amount: 120 });
  });

  it('drops the amount and is breast milk again when a bottle becomes a side', () => {
    // Given
    const bottleFeed: Feeding = { ...feed, type: 'formula', method: 'bottle', amount: 150 };

    // When
    const draft = withMethod(draftOf({ kind: 'feeding', entry: bottleFeed }), 'left breast', bottle);

    // Then
    expect(patchOf(draft, { kind: 'feeding', entry: bottleFeed })).toMatchObject({ type: 'breast milk', method: 'left breast', amount: null });
  });
});

describe('a meal', () => {
  const meal: Feeding = { ...feed, type: 'solid food', method: 'parent fed', amount: 0, notes: 'Carrot' };

  it('opens as Solids with its food', () => {
    // When
    const draft = draftOf({ kind: 'feeding', entry: meal });

    // Then
    expect(draft).toMatchObject({ method: 'parent fed', notes: 'Carrot' });
  });

  it('is changed once its food changes, and sends the new food', () => {
    // When
    const draft = withNotes(draftOf({ kind: 'feeding', entry: meal }), 'Carrot, Pea');

    // Then
    expect(isChanged(draft, { kind: 'feeding', entry: meal })).toBe(true);
    expect(patchOf(draft, { kind: 'feeding', entry: meal })).toMatchObject({ notes: 'Carrot, Pea' });
  });

  it('is breast milk with no amount when it becomes a side, keeping the notes', () => {
    // When
    const draft = withMethod(draftOf({ kind: 'feeding', entry: meal }), 'left breast', bottle);

    // Then
    expect(patchOf(draft, { kind: 'feeding', entry: meal })).toMatchObject({
      type: 'breast milk',
      method: 'left breast',
      amount: null,
      notes: 'Carrot',
    });
  });

  it("takes the child's bottle and amount when it becomes a bottle", () => {
    // When
    const draft = withMethod(draftOf({ kind: 'feeding', entry: meal }), 'bottle', bottle);

    // Then
    expect(patchOf(draft, { kind: 'feeding', entry: meal })).toMatchObject({ type: 'formula', method: 'bottle', amount: 120 });
  });

  it('a bottle becomes solid food of no amount', () => {
    // Given
    const bottleFeed: Feeding = { ...feed, type: 'formula', method: 'bottle', amount: 150 };

    // When
    const draft = withMethod(draftOf({ kind: 'feeding', entry: bottleFeed }), 'parent fed', bottle);

    // Then
    expect(patchOf(draft, { kind: 'feeding', entry: bottleFeed })).toMatchObject({ type: 'solid food', method: 'parent fed', amount: 0 });
  });
});

describe("a diaper's kind and the patch sent", () => {
  it('sends a diaper with its new kind and time', () => {
    // Given
    const draft = { ...nudge(draftOf({ kind: 'change', entry: change }), 'time', -5, now), wet: true, solid: true };

    // When
    const patch = patchOf(draft, { kind: 'change', entry: change });

    // Then
    expect(patch).toEqual({ time: iso('11:05'), wet: true, solid: true });
  });

  it('sends a sleep with its times', () => {
    // Given
    const draft = nudge(draftOf({ kind: 'sleep', entry: nap }), 'start', -5, now);

    // When
    const patch = patchOf(draft, { kind: 'sleep', entry: nap });

    // Then
    expect(patch).toEqual({ start: iso('09:27'), end: iso('10:41'), nap: true });
  });
});

describe('nap or night sleep', () => {
  it('changes to night sleep and sends it', () => {
    // When
    const draft = withNap(draftOf({ kind: 'sleep', entry: nap }), false);

    // Then
    expect(isChanged(draft, { kind: 'sleep', entry: nap })).toBe(true);
    expect(patchOf(draft, { kind: 'sleep', entry: nap })).toEqual({ start: iso('09:32'), end: iso('10:41'), nap: false });
  });

  it('keeps the saved choice when only the times move, even past the nap-window end', () => {
    // Given
    const evening: Sleep = { ...nap, start: iso('18:30'), end: iso('18:55') };

    // When
    const draft = nudge(draftOf({ kind: 'sleep', entry: evening }), 'end', 10, at('19:30'));

    // Then
    expect(patchOf(draft, { kind: 'sleep', entry: evening })).toMatchObject({ end: iso('19:05'), nap: true });
  });
});
