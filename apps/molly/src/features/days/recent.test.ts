import type { Change, Feeding, Sleep } from '@molly/api';
import type { DayWindow } from '@molly/core';
import { describe, expect, it } from 'vitest';

import { cardSpan, cardStats, recentDays } from './recent';

const at = (day: number, hours: number, minutes = 0) => new Date(2026, 8, day, hours, minutes);
const day = (date: number): DayWindow => ({ kind: 'day', start: at(date, 7), end: at(date, 19), wake: at(date, 7), clock: false });
const night = (date: number): DayWindow => ({ kind: 'night', start: at(date, 19), end: at(date + 1, 7), wake: at(date, 7), clock: false });
/** A night from any start to any end, its wake the start's (unused by the cards). */
const nightAt = (start: Date, end: Date, clock = false): DayWindow => ({ kind: 'night', start, end, wake: start, clock });
const dayAt = (start: Date, end: Date): DayWindow => ({ kind: 'day', start, end, wake: start, clock: false });
const HOUR = 60 * 60 * 1000;
const none = { sleep: [], feeding: [], change: [], medication: [] };
const sleep = (start: Date, end: Date) => ({ id: 1, child: 1, start: start.toISOString(), end: end.toISOString(), nap: false }) as Sleep;
const feed = (start: Date) => ({ id: 1, child: 1, start: start.toISOString(), end: start.toISOString(), method: 'bottle', amount: 120 }) as Feeding;
const diaper = (time: Date) => ({ id: 1, child: 1, time: time.toISOString(), wet: true, solid: false }) as Change;

describe('the Recent days cards', () => {
  it('are one card for today with only the live day, on the right', () => {
    // When
    const days = recentDays(day(24), []);

    // Then
    expect(days).toEqual([
      { key: '2026-09-24', title: 'Today', date: 'Thu 24 Sep', day: { window: day(24), live: true, label: 'Today so far' } },
    ]);
  });

  it('put last night on the left of the live day', () => {
    // When
    const days = recentDays(day(24), [night(23)]);

    // Then
    expect(days).toEqual([
      {
        key: '2026-09-24',
        title: 'Today',
        date: 'Thu 24 Sep',
        night: { window: night(23), live: false, label: 'Night' },
        day: { window: day(24), live: true, label: 'Today so far' },
      },
    ]);
  });

  it('put on each morning the night that ended on it and the day that followed, newest card first', () => {
    // When
    const days = recentDays(day(24), [night(23), day(23), night(22), day(22), night(21)]);

    // Then
    expect(days.map((card) => [card.title, card.night?.window, card.day?.window])).toEqual([
      ['Today', night(23), day(24)],
      ['Yesterday', night(22), day(23)],
      ['Tuesday', night(21), day(22)],
    ]);
  });

  it('give the live night its own Tonight card on top, without a day', () => {
    // When
    const days = recentDays(night(24), [day(24), night(23)]);

    // Then
    expect(days.map((card) => [card.title, card.night?.label, card.day?.label])).toEqual([
      ['Tonight', 'Tonight', undefined],
      ['Today', 'Night', 'Day'],
    ]);
  });

  it('leave the left half empty for the oldest day, whose night is not loaded', () => {
    // When
    const days = recentDays(day(24), [night(23), day(23)]);

    // Then
    expect(days[1]).toEqual({ key: '2026-09-23', title: 'Yesterday', date: 'Wed 23 Sep', day: { window: day(23), live: false, label: 'Day' } });
  });

  it("date each card by its morning, so Tonight's card shows tomorrow", () => {
    // When
    const days = recentDays(night(24), [day(24), night(23)]);

    // Then
    expect(days.map((card) => card.date)).toEqual(['Fri 25 Sep', 'Thu 24 Sep']);
  });
});

describe('the Recent days cards with a bedtime after midnight', () => {
  // Saturday 12 and Sunday 13 September: usually asleep at 20:00, but up until 00:30 on Saturday.
  const lastNight = nightAt(at(13, 0, 30), at(13, 7, 55));
  const sunday = dayAt(at(13, 7, 55), at(13, 21, 10));

  it("put a bedtime after midnight on that morning's card", () => {
    // Given
    const liveDay = dayAt(at(13, 7, 55), at(13, 23, 30));

    // When
    const days = recentDays(liveDay, [lastNight]);

    // Then
    expect(days).toEqual([
      {
        key: '2026-09-13',
        title: 'Today',
        date: 'Sun 13 Sep',
        night: { window: lastNight, live: false, label: 'Night' },
        day: { window: liveDay, live: true, label: 'Today so far' },
      },
    ]);
  });

  it('keep the live night on its own Tonight card', () => {
    // Given
    const tonight = nightAt(at(13, 21, 10), at(14, 7, 0));

    // When
    const days = recentDays(tonight, [sunday, lastNight]);

    // Then
    expect(days).toEqual([
      { key: '2026-09-14', title: 'Tonight', date: 'Mon 14 Sep', night: { window: tonight, live: true, label: 'Tonight' } },
      {
        key: '2026-09-13',
        title: 'Today',
        date: 'Sun 13 Sep',
        night: { window: lastNight, live: false, label: 'Night' },
        day: { window: sunday, live: false, label: 'Day' },
      },
    ]);
  });

  it('keep a live night that started after midnight on its own Tonight card', () => {
    // Given
    const tonight = nightAt(at(14, 0, 30), at(14, 7, 0));

    // When
    const days = recentDays(tonight, [sunday, lastNight]);

    // Then
    expect(days.map((card) => [card.title, card.date, card.night?.window, card.day?.window])).toEqual([
      ['Tonight', 'Mon 14 Sep', tonight, undefined],
      ['Today', 'Sun 13 Sep', lastNight, sunday],
    ]);
  });

  it('leave a night that starts before midnight on the morning it ended', () => {
    // Given
    const saturdayNight = nightAt(at(12, 20, 15), at(13, 6, 50));
    const liveDay = dayAt(at(13, 6, 50), at(13, 20, 0));

    // When
    const days = recentDays(liveDay, [saturdayNight]);

    // Then
    expect(days.map((card) => [card.key, card.night?.window, card.day?.window])).toEqual([['2026-09-13', saturdayNight, liveDay]]);
  });

  describe('over two weeks of mixed nights', () => {
    // Mornings 31 August to 13 September, the night before each one by turns: from 20:00, from 00:30, by the
    // clock from 19:00 (no bedtime), and missing.
    const mornings = Array.from({ length: 14 }, (_, index) => 13 - index);
    const nightBefore = (morning: number, index: number): DayWindow[] =>
      [
        [nightAt(at(morning - 1, 20, 0), at(morning, 7, 0))],
        [nightAt(at(morning, 0, 30), at(morning, 7, 0))],
        [nightAt(at(morning - 1, 19, 0), at(morning, 7, 0), true)],
        [],
      ][index % 4]!;
    const daysAndNights = mornings.flatMap((morning, index) => [dayAt(at(morning, 7, 0), at(morning, 20, 0)), ...nightBefore(morning, index)]);
    const byStart = (windows: DayWindow[]) => [...windows].sort((a, b) => a.start.getTime() - b.start.getTime());
    const slotsOf = (days: ReturnType<typeof recentDays>) =>
      days.flatMap((card) => [card.night, card.day]).flatMap((slot) => (slot ? [slot.window] : []));

    it.each([
      ['a live day', daysAndNights[0]!, daysAndNights.slice(1)],
      ['a live night from the evening', nightAt(at(13, 20, 0), at(14, 7, 0)), daysAndNights],
      ['a live night from after midnight', nightAt(at(14, 0, 30), at(14, 7, 0)), daysAndNights],
    ])('hold every window exactly once under %s', (_, live, past) => {
      // When
      const days = recentDays(live, past);

      // Then
      expect(byStart(slotsOf(days))).toEqual(byStart([live, ...past]));
    });
  });
});

describe("a card's span", () => {
  it("runs from the night's start to the day's end, capped at now", () => {
    // Given
    const [card] = recentDays(day(24), [night(23)]);

    // When
    const span = cardSpan(card, at(24, 15));

    // Then
    expect(span).toEqual({ from: at(23, 19), to: at(24, 15) });
  });

  it("runs from tonight's start to now on the Tonight card", () => {
    // Given
    const [card] = recentDays(night(24), [day(24)]);

    // When
    const span = cardSpan(card, at(24, 22));

    // Then
    expect(span).toEqual({ from: at(24, 19), to: at(24, 22) });
  });

  it("starts at the day's start on a card with no night", () => {
    // Given
    const [card] = recentDays(day(24), []);

    // When
    const span = cardSpan(card, at(24, 15));

    // Then
    expect(span).toEqual({ from: at(24, 7), to: at(24, 15) });
  });

  it("ends at the day's end on a past card", () => {
    // Given
    const [, card] = recentDays(day(24), [night(23), day(23), night(22)]);

    // When
    const span = cardSpan(card, at(24, 15));

    // Then
    expect(span).toEqual({ from: at(22, 19), to: at(23, 19) });
  });
});

describe("the Today sheet's boxes", () => {
  it('are all zero with nothing logged', () => {
    // Given
    const [card] = recentDays(day(24), [night(23)]);

    // When
    const stats = cardStats(card, none, null, at(24, 15));

    // Then
    expect(stats).toEqual({ sleptMs: 0, sleeps: 0, feeds: 0, diapers: 0, night: true });
  });

  it("count last night's sleep, feeds and diapers with today's by day", () => {
    // Given
    const [card] = recentDays(day(24), [night(23)]);
    const entries = {
      ...none,
      sleep: [sleep(at(23, 19, 30), at(24, 6, 30)), sleep(at(24, 10), at(24, 11))],
      feeding: [feed(at(23, 23)), feed(at(24, 9))],
      change: [diaper(at(24, 2)), diaper(at(24, 8)), diaper(at(24, 12))],
    };

    // When
    const stats = cardStats(card, entries, null, at(24, 15));

    // Then
    expect(stats).toEqual({ sleptMs: 12 * HOUR, sleeps: 2, feeds: 2, diapers: 3, night: true });
  });

  it("clip a sleep that started before the night's start, without counting it as one of its sleeps", () => {
    // Given
    const [card] = recentDays(day(24), [night(23)]);
    const entries = { ...none, sleep: [sleep(at(23, 18), at(23, 20))] };

    // When
    const stats = cardStats(card, entries, null, at(24, 15));

    // Then
    expect(stats).toMatchObject({ sleptMs: HOUR, sleeps: 0 });
  });

  it('add a running sleep: its time so far and one sleep', () => {
    // Given
    const [card] = recentDays(day(24), [night(23)]);
    const entries = { ...none, sleep: [sleep(at(23, 19), at(24, 7))] };

    // When
    const stats = cardStats(card, entries, { start: at(24, 14).toISOString() }, at(24, 15));

    // Then
    expect(stats).toMatchObject({ sleptMs: 13 * HOUR, sleeps: 2 });
  });

  it("count only tonight at night, not today's day", () => {
    // Given
    const [card] = recentDays(night(24), [day(24), night(23)]);
    const entries = {
      ...none,
      sleep: [sleep(at(24, 10), at(24, 11)), sleep(at(24, 19, 30), at(24, 21))],
      feeding: [feed(at(24, 9)), feed(at(24, 21, 30))],
      change: [diaper(at(24, 12))],
    };

    // When
    const stats = cardStats(card, entries, null, at(24, 22));

    // Then
    expect(stats).toEqual({ sleptMs: 1.5 * HOUR, sleeps: 1, feeds: 1, diapers: 0, night: true });
  });

  it('call the sleeps naps on a card with no night', () => {
    // Given
    const [card] = recentDays(day(24), []);

    // When
    const stats = cardStats(card, none, null, at(24, 15));

    // Then
    expect(stats.night).toBe(false);
  });
});
