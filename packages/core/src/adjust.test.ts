import { describe, expect, it } from 'vitest';

import { adjustedTime, startSteps, steppedStart, typedDigit, typedTime, typedText } from './adjust';

const now = new Date(2026, 8, 20, 9, 14);
const at = (hours: number, minutes: number) => new Date(2026, 8, 20, hours, minutes);

describe('adjusted time', () => {
  it('is now for zero minutes ago', () => {
    // Given
    const minutesAgo = 0;

    // When
    const time = adjustedTime({ minutesAgo, now });

    // Then
    expect(time).toEqual(now);
  });

  it('is that many minutes before now', () => {
    // Given
    const minutesAgo = 15;

    // When
    const time = adjustedTime({ minutesAgo, now });

    // Then
    expect(time).toEqual(at(8, 59));
  });

  it('is never later than now', () => {
    // Given
    const minutesAgo = -3;

    // When
    const time = adjustedTime({ minutesAgo, now });

    // Then
    expect(time).toEqual(now);
  });

  it.each([14, 30])('keeps an end %i minutes ago one minute after its start', (minutesAgo) => {
    // Given
    const start = at(9, 0);

    // When
    const time = adjustedTime({ minutesAgo, now, after: start });

    // Then
    expect(time).toEqual(at(9, 1));
  });

  it('leaves an end that is already after its start', () => {
    // Given
    const start = at(8, 0);

    // When
    const time = adjustedTime({ minutesAgo: 15, now, after: start });

    // Then
    expect(time).toEqual(at(8, 59));
  });

  it('stays at now when the entry started less than a minute ago', () => {
    // Given
    const start = new Date(now.getTime() - 20_000);

    // When
    const time = adjustedTime({ minutesAgo: 5, now, after: start });

    // Then
    expect(time).toEqual(now);
  });
});

describe('stepped start', () => {
  it('moves the start earlier by the step', () => {
    // Given
    const start = at(9, 0);

    // When
    const moved = steppedStart({ start, minutes: -5, now });

    // Then
    expect(moved).toEqual(at(8, 55));
  });

  it('is never later than now', () => {
    // Given
    const start = at(9, 12);

    // When
    const moved = steppedStart({ start, minutes: 5, now });

    // Then
    expect(moved).toEqual(now);
  });

  it('is never earlier than the earliest start', () => {
    // Given
    const start = at(8, 32);
    const earliest = at(8, 30);

    // When
    const moved = steppedStart({ start, minutes: -5, now, earliest });

    // Then
    expect(moved).toEqual(earliest);
  });

  it('stays put when moving earlier from a start already before the earliest', () => {
    // Given
    const start = at(8, 20);
    const earliest = at(8, 30);

    // When
    const moved = steppedStart({ start, minutes: -5, now, earliest });

    // Then
    expect(moved).toEqual(start);
  });

  it('stays put when moving later from a start already after now', () => {
    // Given
    const start = new Date(now.getTime() + 20_000);

    // When
    const moved = steppedStart({ start, minutes: 5, now });

    // Then
    expect(moved).toEqual(start);
  });
});

describe('start steps', () => {
  it('can move both ways when the start is between the earliest and now', () => {
    // Given
    const start = at(9, 0);

    // When
    const steps = startSteps({ start, minutes: 5, now, earliest: at(8, 30) });

    // Then
    expect(steps).toEqual({ earlier: true, later: true });
  });

  it('cannot move later once the start is now', () => {
    // Given
    const start = now;

    // When
    const steps = startSteps({ start, minutes: 5, now });

    // Then
    expect(steps).toEqual({ earlier: true, later: false });
  });

  it('cannot move earlier once the start is the earliest', () => {
    // Given
    const earliest = at(8, 30);

    // When
    const steps = startSteps({ start: earliest, minutes: 5, now, earliest });

    // Then
    expect(steps).toEqual({ earlier: false, later: true });
  });
});

describe('typing a time digit by digit', () => {
  it('takes a first hour digit of 0 to 2 as it is', () => {
    // When
    const digits = typedDigit('', '2');

    // Then
    expect(digits).toBe('2');
  });

  it('turns a first hour digit of 3 to 9 into that hour with a leading zero', () => {
    // When
    const digits = typedDigit('', '7');

    // Then
    expect(digits).toBe('07');
  });

  it('fills hours and minutes from the left', () => {
    // When
    const digits = ['2', '3', '1', '5'].reduce(typedDigit, '');

    // Then
    expect(digits).toBe('2315');
  });

  it('takes any second hour digit after a 0 or 1', () => {
    // When
    const digits = typedDigit('1', '9');

    // Then
    expect(digits).toBe('19');
  });

  it('ignores a second hour digit that would go past 23', () => {
    // When
    const digits = typedDigit('2', '4');

    // Then
    expect(digits).toBe('2');
  });

  it('takes 23 as the last hour', () => {
    // When
    const digits = typedDigit('2', '3');

    // Then
    expect(digits).toBe('23');
  });

  it('ignores a first minute digit past 5', () => {
    // When
    const digits = typedDigit('23', '6');

    // Then
    expect(digits).toBe('23');
  });

  it('takes 5 as the last first minute digit', () => {
    // When
    const digits = typedDigit('23', '5');

    // Then
    expect(digits).toBe('235');
  });

  it('takes any last minute digit', () => {
    // When
    const digits = typedDigit('235', '9');

    // Then
    expect(digits).toBe('2359');
  });

  it('ignores a fifth digit', () => {
    // When
    const digits = typedDigit('2359', '1');

    // Then
    expect(digits).toBe('2359');
  });

  it('ignores anything that is not a digit', () => {
    // When
    const digits = typedDigit('2', ':');

    // Then
    expect(digits).toBe('2');
  });
});

describe('a typed time', () => {
  it('is not a time yet with fewer than 4 digits', () => {
    // When
    const time = typedTime({ digits: '085', now });

    // Then
    expect(time).toBeNull();
  });

  it('is today at that time when it is earlier than now', () => {
    // When
    const time = typedTime({ digits: '0850', now });

    // Then
    expect(time).toEqual(at(8, 50));
  });

  it('is now when it is the current minute', () => {
    // When
    const time = typedTime({ digits: '0914', now: new Date(now.getTime() + 40_000) });

    // Then
    expect(time).toEqual(now);
  });

  it('is yesterday at that time when it is later than now', () => {
    // When
    const time = typedTime({ digits: '2350', now: new Date(2026, 8, 20, 0, 10) });

    // Then
    expect(time).toEqual(new Date(2026, 8, 19, 23, 50));
  });

  it('is yesterday one minute after now', () => {
    // When
    const time = typedTime({ digits: '0915', now });

    // Then
    expect(time).toEqual(new Date(2026, 8, 19, 9, 15));
  });

  it('is before the start for an end typed at the start', () => {
    // When
    const time = typedTime({ digits: '0900', now, after: at(9, 0) });

    // Then
    expect(time).toBe('beforeStart');
  });

  it('is before the start for an end typed earlier than the start', () => {
    // When
    const time = typedTime({ digits: '0830', now, after: at(9, 0) });

    // Then
    expect(time).toBe('beforeStart');
  });

  it('is before the start for an end typed in the minute of a start with seconds', () => {
    // When
    const time = typedTime({ digits: '0900', now, after: new Date(at(9, 0).getTime() + 30_000) });

    // Then
    expect(time).toBe('beforeStart');
  });

  it('is the end for one typed a minute after the start', () => {
    // When
    const time = typedTime({ digits: '0901', now, after: at(9, 0) });

    // Then
    expect(time).toEqual(at(9, 1));
  });
});

describe('the typed time as shown', () => {
  const previous = at(8, 59);

  it('is all the previous time, faint, before any digit', () => {
    // When
    const text = typedText('', previous);

    // Then
    expect(text).toEqual({ typed: '', faint: '08:59' });
  });

  it('shows one typed digit and the rest of the previous time faint', () => {
    // When
    const text = typedText('2', previous);

    // Then
    expect(text).toEqual({ typed: '2', faint: '8:59' });
  });

  it('shows the colon as typed once both hour digits are', () => {
    // When
    const text = typedText('07', previous);

    // Then
    expect(text).toEqual({ typed: '07:', faint: '59' });
  });

  it('shows three typed digits and the previous last minute digit faint', () => {
    // When
    const text = typedText('231', at(23, 15));

    // Then
    expect(text).toEqual({ typed: '23:1', faint: '5' });
  });

  it('is all typed with four digits', () => {
    // When
    const text = typedText('2315', previous);

    // Then
    expect(text).toEqual({ typed: '23:15', faint: '' });
  });
});
