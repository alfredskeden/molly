import { describe, expect, it } from 'vitest';

import { change, feeding, medication, sleep } from '../test/fixtures';
import { mergeTimeline } from './timeline';

describe('the timeline', () => {
  it('is empty with no entries', () => {
    // Given
    const entries = { sleep: [], feeding: [], change: [], medication: [] };

    // When
    const timeline = mergeTimeline(entries);

    // Then
    expect(timeline).toEqual([]);
  });

  it('merges sleeps, feedings and changes newest first', () => {
    // Given
    const nap = sleep({ start: '2026-09-20T11:00:00Z', end: '2026-09-20T12:00:00Z' });
    const breakfast = feeding({ start: '2026-09-20T07:00:00Z', end: '2026-09-20T07:20:00Z' });
    const lunch = feeding({ start: '2026-09-20T12:30:00Z', end: '2026-09-20T12:45:00Z' });
    const diaper = change({ time: '2026-09-20T09:00:00Z' });

    // When
    const timeline = mergeTimeline({ sleep: [nap], feeding: [breakfast, lunch], change: [diaper], medication: [] });

    // Then
    expect(timeline).toEqual([
      { kind: 'feeding', at: '2026-09-20T12:30:00Z', entry: lunch },
      { kind: 'sleep', at: '2026-09-20T11:00:00Z', entry: nap },
      { kind: 'change', at: '2026-09-20T09:00:00Z', entry: diaper },
      { kind: 'feeding', at: '2026-09-20T07:00:00Z', entry: breakfast },
    ]);
  });

  it('merges medication with sleeps, feedings and changes newest first', () => {
    // Given
    const nap = sleep({ start: '2026-09-20T11:00:00Z', end: '2026-09-20T12:00:00Z' });
    const bottle = feeding({ start: '2026-09-20T07:00:00Z', end: '2026-09-20T07:20:00Z' });
    const diaper = change({ time: '2026-09-20T09:00:00Z' });
    const vitaminD = medication({ time: '2026-09-20T08:00:00Z' });
    const paracetamol = medication({ name: 'Paracetamol 2.5 ml', time: '2026-09-20T13:00:00Z' });

    // When
    const timeline = mergeTimeline({
      sleep: [nap],
      feeding: [bottle],
      change: [diaper],
      medication: [vitaminD, paracetamol],
    });

    // Then
    expect(timeline).toEqual([
      { kind: 'medication', at: '2026-09-20T13:00:00Z', entry: paracetamol },
      { kind: 'sleep', at: '2026-09-20T11:00:00Z', entry: nap },
      { kind: 'change', at: '2026-09-20T09:00:00Z', entry: diaper },
      { kind: 'medication', at: '2026-09-20T08:00:00Z', entry: vitaminD },
      { kind: 'feeding', at: '2026-09-20T07:00:00Z', entry: bottle },
    ]);
  });

  it('orders entries with equal timestamps the same way every time', () => {
    // Given
    const time = '2026-09-20T09:00:00Z';
    const nap = sleep({ id: 1, start: time, end: '2026-09-20T10:00:00Z' });
    const bottle = feeding({ id: 2, start: time, end: '2026-09-20T09:10:00Z' });
    const firstDiaper = change({ id: 3, time });
    const secondDiaper = change({ id: 4, time });

    // When
    const timeline = mergeTimeline({ sleep: [nap], feeding: [bottle], change: [firstDiaper, secondDiaper], medication: [] });
    const reordered = mergeTimeline({ sleep: [nap], feeding: [bottle], change: [secondDiaper, firstDiaper], medication: [] });

    // Then
    expect(timeline.map((item) => item.entry.id)).toEqual([1, 2, 4, 3]);
    expect(reordered).toEqual(timeline);
  });
});
