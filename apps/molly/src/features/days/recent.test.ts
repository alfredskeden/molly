import type { DayWindow } from '@molly/core';
import { describe, expect, it } from 'vitest';

import { recentDays } from './recent';

const at = (day: number, hours: number, minutes = 0) => new Date(2026, 8, day, hours, minutes);
const day = (date: number): DayWindow => ({ kind: 'day', start: at(date, 7), end: at(date, 19), wake: at(date, 7), clock: false });
const night = (date: number): DayWindow => ({ kind: 'night', start: at(date, 19), end: at(date + 1, 7), wake: at(date, 7), clock: false });

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
