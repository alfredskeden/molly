import type { Change, Feeding, Sleep } from '@molly/api';
import { describe, expect, it } from 'vitest';

import { PLAIN, type Copy } from '@/theme/copy';

import { outcomeToast, staleStopToast } from './outcome-messages';

const ME = 2;
const nap: Sleep = {
  id: 41,
  child: 1,
  start: '2026-09-24T05:56:00Z',
  end: '2026-09-24T07:08:00Z',
  duration: '01:12:00',
  nap: true,
  notes: null,
  tags: [],
};

const NOW = new Date('2026-09-24T07:20:00Z');

describe('toasts for a timer another phone changed', () => {
  it('a start while another timer already runs says for how long and who started it', () => {
    // Given
    const outcome = { type: 'alreadyRunning', since: '2026-09-24T07:02:00Z', user: 3 } as const;

    // When
    const toast = outcomeToast(outcome, 'sleep', ME, PLAIN, NOW);

    // Then
    expect(toast).toEqual({ text: 'Already running for 18m · started by someone else', tone: 'sleep' });
  });

  it('a stop of a timer another phone saved names the entry saved there and offers to edit it', () => {
    // Given
    const saved = nap;

    // When
    const toast = staleStopToast('sleep', saved, NOW);

    // Then
    expect(toast).toEqual({
      text: 'Already stopped on another phone',
      detail: 'Nap saved there · 1h 12m, ended 12m ago',
      tone: 'sleep',
      edit: { kind: 'sleep', id: 41 },
    });
  });

  it('a stop of a timer with no entry found says only that it was already stopped', () => {
    // Given
    const saved = null;

    // When
    const toast = staleStopToast('feeding', saved);

    // Then
    expect(toast).toEqual({ text: 'Already stopped on another phone', tone: 'feed' });
  });
});

const ARCADE: Copy = { ...PLAIN, sleep: 'Save point', feed: 'Power-up', feedNoun: 'Power-up', diaper: 'Respawn', med: 'Potion' };
const feed: Feeding = {
  id: 7,
  child: 1,
  start: '2026-09-24T07:00:00Z',
  end: '2026-09-24T07:15:00Z',
  duration: '00:15:00',
  type: 'breast milk',
  method: 'left breast',
  amount: null,
  notes: null,
  tags: [],
};
const change: Change = { id: 9, child: 1, time: '2026-09-24T07:20:00Z', wet: true, solid: false, color: '', amount: null, notes: null, tags: [] };

describe('toasts in a theme with its own words', () => {
  it("a started timer is named with the theme's tracker word", () => {
    // Given
    const outcome = { type: 'started', timer: { id: 3, start: '2026-09-24T07:02:00Z' } } as const;

    // When
    const toast = outcomeToast(outcome, 'sleep', ME, ARCADE, NOW);

    // Then
    expect(toast.text).toBe('Save point started 18m ago');
  });

  it("a saved sleep and a saved feed are named with the theme's words", () => {
    // Given
    const outcomes = [
      [{ type: 'stopped', created: { kind: 'sleep', entry: nap } }, 'sleep'],
      [{ type: 'stopped', created: { kind: 'feeding', entry: feed } }, 'feeding'],
    ] as const;

    // When
    const texts = outcomes.map(([outcome, source]) => outcomeToast(outcome, source, ME, ARCADE).text);

    // Then
    expect(texts).toEqual(['Save point saved · 1h 12m', 'Power-up saved · Left · 15m']);
  });

  it('an instant feed says its side, not how long it took, Adjust moves the whole feed and Edit opens it', () => {
    // Given
    const instant = { ...feed, start: '2026-09-24T07:14:00Z' };
    const outcome = { type: 'stopped', created: { kind: 'feeding', entry: instant }, instant: true } as const;

    // When
    const toast = outcomeToast(outcome, 'feeding', ME, ARCADE);

    // Then
    expect(toast).toEqual({
      text: 'Power-up saved · Left',
      tone: 'feed',
      saved: true,
      adjust: {
        target: { kind: 'feedingAt', id: 7, lengthMs: 60_000 },
        title: 'When was it?',
        current: instant.end,
        tone: 'feed',
      },
      edit: { kind: 'feeding', id: 7 },
    });
  });

  it('an instant bottle says its amount', () => {
    // Given
    const bottle = { ...feed, start: '2026-09-24T07:14:00Z', type: 'formula', method: 'bottle', amount: 135 } as const;
    const outcome = { type: 'stopped', created: { kind: 'feeding', entry: bottle }, instant: true } as const;

    // When
    const toast = outcomeToast(outcome, 'feeding', ME);

    // Then
    expect(toast.text).toBe('Feed saved · Bottle 135 ml');
  });

  it("a logged diaper and a cancelled feed are named with the theme's words", () => {
    // Given
    const logged = { type: 'logged', created: { kind: 'change', entry: change } } as const;
    const cancelled = { type: 'cancelled' } as const;

    // When
    const texts = [outcomeToast(logged, 'diaper', ME, ARCADE).text, outcomeToast(cancelled, 'feeding', ME, ARCADE).text];

    // Then
    expect(texts).toEqual(['Respawn saved · Wet', 'Power-up cancelled']);
  });

  it("keeps today's words without a theme's copy", () => {
    // Given
    const started = { type: 'started', timer: { id: 3, start: '2026-09-24T07:02:00Z' } } as const;
    const cancelled = { type: 'cancelled' } as const;

    // When
    const texts = [outcomeToast(started, 'feeding', ME, PLAIN, NOW).text, outcomeToast(cancelled, 'medication', ME).text];

    // Then
    expect(texts).toEqual(['Feeding started 18m ago', 'Medicine cancelled']);
  });
});
