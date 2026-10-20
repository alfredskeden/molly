import { describe, expect, it } from 'vitest';

import { appended, isStall, parseTapLog, tapLogText } from './model';

const at = (time: string) => new Date(`2026-10-02T${time}`).getTime();

describe('appended', () => {
  it('starts a log with its first line', () => {
    // Given
    const line = { at: at('10:00:00.000'), text: 'app active' };

    // When
    const lines = appended([], line, 3);

    // Then
    expect(lines).toEqual([line]);
  });

  it('keeps only the newest lines once full', () => {
    // Given
    const lines = ['a', 'b', 'c'].map((text, i) => ({ at: i, text }));

    // When
    const next = appended(lines, { at: 3, text: 'd' }, 3);

    // Then
    expect(next.map((line) => line.text)).toEqual(['b', 'c', 'd']);
  });
});

describe('parseTapLog', () => {
  it('reads nothing stored as an empty log', () => {
    // Given
    const stored = null;

    // When
    const lines = parseTapLog(stored);

    // Then
    expect(lines).toEqual([]);
  });

  it('reads stored lines back', () => {
    // Given
    const stored = JSON.stringify([{ at: 1, text: 'app active' }]);

    // When
    const lines = parseTapLog(stored);

    // Then
    expect(lines).toEqual([{ at: 1, text: 'app active' }]);
  });

  it('drops a damaged log and anything that is not a line', () => {
    // Given
    const damaged = '[{"at":1,"text":"ok"},{"at":"x"},null]';

    // When
    const lines = [parseTapLog('{not json'), parseTapLog(damaged)];

    // Then
    expect(lines).toEqual([[], [{ at: 1, text: 'ok' }]]);
  });
});

describe('isStall', () => {
  it('counts a late tick while the app is on screen', () => {
    // Given
    const tick = { lateMs: 450, active: true, wasActive: true, task: false };

    // When
    const stall = isStall(tick);

    // Then
    expect(stall).toBe(true);
  });

  it('ignores a tick that is only a little late', () => {
    // Given
    const tick = { lateMs: 150, active: true, wasActive: true, task: false };

    // When
    const stall = isStall(tick);

    // Then
    expect(stall).toBe(false);
  });

  it('ignores the gap while the app was away, when timers pause', () => {
    // Given
    const back = { lateMs: 60_000, active: true, wasActive: false, task: false };
    const away = { lateMs: 60_000, active: false, wasActive: false, task: false };

    // When
    const stalls = [isStall(back), isStall(away)];

    // Then
    expect(stalls).toEqual([false, false]);
  });

  it('counts a late tick while a widget or notification task runs in the background', () => {
    // Given
    const tick = { lateMs: 900, active: false, wasActive: false, task: true };

    // When
    const stall = isStall(tick);

    // Then
    expect(stall).toBe(true);
  });

  it('ignores a gap of ten minutes or more: the process was frozen, not busy', () => {
    // Given
    const tick = { lateMs: 10 * 60_000, active: true, wasActive: true, task: false };

    // When
    const stall = isStall(tick);

    // Then
    expect(stall).toBe(false);
  });
});

describe('tapLogText', () => {
  it('says the log is empty', () => {
    // Given
    const lines: { at: number; text: string }[] = [];

    // When
    const text = tapLogText(lines);

    // Then
    expect(text).toBe('Tap log is empty');
  });

  it('writes one line per entry with its local time to the millisecond, oldest first', () => {
    // Given
    const lines = [
      { at: at('10:00:00.005'), text: 'app active' },
      { at: at('10:00:01.250'), text: 'press Stop sleep' },
    ];

    // When
    const text = tapLogText(lines);

    // Then
    expect(text).toBe('10:00:00.005 app active\n10:00:01.250 press Stop sleep');
  });
});
