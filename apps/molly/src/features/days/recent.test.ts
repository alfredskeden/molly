import type { Change, Feeding, Sleep } from '@molly/api';
import type { DayWindow } from '@molly/core';
import { describe, expect, it } from 'vitest';

import { cardSpan, cardStats, recentDays } from './recent';

const at = (day: number, hours: number, minutes = 0) => new Date(2026, 8, day, hours, minutes);
const day = (date: number): DayWindow => ({ kind: 'day', start: at(date, 7), end: at(date, 19), wake: at(date, 7), clock: false });
const night = (date: number): DayWindow => ({ kind: 'night', start: at(date, 19), end: at(date + 1, 7), wake: at(date, 7), clock: false });
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
