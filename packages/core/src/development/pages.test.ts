import { describe, expect, it } from 'vitest';

import { GUIDE_PAGES, type GuidePage, guidePage, pageNeighbours, pageStanding, pageTags, pageTitles } from './pages';

const on = (year: number, month: number, day: number, hours = 12) => new Date(year, month - 1, day, hours);

describe('the guide pages', () => {
  it('are Newborn, every month of the first year, then 15, 18, 21, 24, 30 and 36 months', () => {
    // When
    const pages = GUIDE_PAGES;

    // Then
    expect(pages).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 21, 24, 30, 36]);
  });
});

describe("the child's page", () => {
  it('is Newborn on the day of birth', () => {
    // Given
    const now = on(2026, 5, 10);

    // When
    const page = guidePage('2026-05-10', now);

    // Then
    expect(page).toBe(0);
  });

  it('is still Newborn at 3 weeks', () => {
    // Given
    const now = on(2026, 5, 31);

    // When
    const page = guidePage('2026-05-10', now);

    // Then
    expect(page).toBe(0);
  });

  it('is 1 month on the first monthly birthday', () => {
    // Given
    const now = on(2026, 6, 10);

    // When
    const page = guidePage('2026-05-10', now);

    // Then
    expect(page).toBe(1);
  });

  it('is 1 month on the last day of a shorter month for a month-end birthday', () => {
    // Given
    const now = on(2026, 2, 28);

    // When
    const page = guidePage('2026-01-31', now);

    // Then
    expect(page).toBe(1);
  });

  it.each([
    ['13 months', '2025-09-10', 12],
    ['23 months', '2024-11-10', 21],
    ['35 months', '2023-11-10', 30],
    ['36 months', '2023-10-10', 36],
  ])('is the last page reached at %s', (_, birthDate, expected) => {
    // Given
    const now = on(2026, 10, 12);

    // When
    const page = guidePage(birthDate, now);

    // Then
    expect(page).toBe(expected);
  });

  it('is none from 37 months, when the guide has ended', () => {
    // Given
    const now = on(2026, 10, 12);

    // When
    const page = guidePage('2023-09-10', now);

    // Then
    expect(page).toBeNull();
  });
});

describe('the pages beside a page', () => {
  it('has no page before Newborn', () => {
    // When
    const beside = pageNeighbours(0);

    // Then
    expect(beside).toEqual({ previous: null, next: 1 });
  });

  it('steps from the first year into every 3 months', () => {
    // When
    const beside = pageNeighbours(12);

    // Then
    expect(beside).toEqual({ previous: 11, next: 15 });
  });

  it('has no page after 36 months', () => {
    // When
    const beside = pageNeighbours(36);

    // Then
    expect(beside).toEqual({ previous: 30, next: null });
  });
});

describe('the All ages tags', () => {
  it('marks the first page now and the one after it next for a newborn', () => {
    // When
    const tags = pageTags(0);

    // Then
    expect(tags.slice(0, 3)).toEqual([
      { page: 0, tag: 'now' },
      { page: 1, tag: 'next' },
      { page: 2, tag: 'later' },
    ]);
  });

  it('marks the pages before a middle page past', () => {
    // When
    const tags = pageTags(5);

    // Then
    expect(tags.slice(3, 8).map(({ tag }) => tag)).toEqual(['past', 'past', 'now', 'next', 'later']);
  });

  it('has no next page on the last page', () => {
    // When
    const tags = pageTags(36);

    // Then
    expect(tags.slice(-2).map(({ tag }) => tag)).toEqual(['past', 'now']);
  });

  it('marks every page past once the guide has ended', () => {
    // When
    const tags = pageTags(null);

    // Then
    expect(new Set(tags.map(({ tag }) => tag))).toEqual(new Set(['past']));
  });

  it('lists all 19 pages', () => {
    // When
    const tags = pageTags(5);

    // Then
    expect(tags.map(({ page }) => page)).toEqual(GUIDE_PAGES);
  });
});

describe('where the child stands on a page', () => {
  it('gives months and weeks on their own page', () => {
    // Given
    const now = on(2026, 10, 12);

    // When
    const words = pageStanding(5, '2026-04-20', now);

    // Then
    expect(words).toBe('is 5 months, 3 weeks');
  });

  it('gives whole months on a monthly birthday', () => {
    // Given
    const now = on(2026, 9, 20);

    // When
    const words = pageStanding(5, '2026-04-20', now);

    // Then
    expect(words).toBe('is 5 months');
  });

  it.each([
    ['2026-10-12', 'was born today'],
    ['2026-10-11', 'is 1 day old'],
    ['2026-10-07', 'is 5 days old'],
    ['2026-09-21', 'is 3 weeks old'],
  ])('gives days or weeks on Newborn (born %s)', (birthDate, expected) => {
    // Given
    const now = on(2026, 10, 12);

    // When
    const words = pageStanding(0, birthDate, now);

    // Then
    expect(words).toBe(expected);
  });

  it('gives one month and its weeks in the singular', () => {
    // Given
    const now = on(2026, 10, 19);

    // When
    const words = pageStanding(1, '2026-09-12', now);

    // Then
    expect(words).toBe('is 1 month, 1 week');
  });

  it('keeps counting in months past the first year', () => {
    // Given
    const now = on(2026, 10, 12);

    // When
    const words = pageStanding(12, '2025-09-10', now);

    // Then
    expect(words).toBe('is 13 months');
  });

  it('says how many months until a page ahead', () => {
    // Given
    const now = on(2026, 10, 12);

    // When
    const words = pageStanding(8, '2026-04-20', now);

    // Then
    expect(words).toBe('reaches this in 2 months');
  });

  it('rounds the months to the nearest', () => {
    // Given
    const now = on(2026, 10, 12);

    // When
    const words = pageStanding(7, '2026-04-20', now);

    // Then
    expect(words).toBe('reaches this in 1 month');
  });

  it.each([
    ['2026-04-20', 6, 'reaches this in 1 week'],
    ['2026-04-14', 6, 'reaches this in 2 days'],
    ['2026-04-13', 6, 'reaches this tomorrow'],
  ])('says weeks or days when a page is less than a month away (born %s)', (birthDate, page, expected) => {
    // Given
    const now = on(2026, 10, 12);

    // When
    const words = pageStanding(page as GuidePage, birthDate, now);

    // Then
    expect(words).toBe(expected);
  });

  it('names the month the child reached a past page', () => {
    // Given
    const now = on(2026, 10, 12);

    // When
    const words = pageStanding(2, '2026-04-20', now);

    // Then
    expect(words).toBe('was here in June');
  });

  it('adds the year when it was another year', () => {
    // Given
    const now = on(2026, 10, 12);

    // When
    const words = pageStanding(0, '2025-09-10', now);

    // Then
    expect(words).toBe('was here in September 2025');
  });

  it('names a past page once the guide has ended', () => {
    // Given
    const now = on(2026, 10, 12);

    // When
    const words = pageStanding(36, '2023-07-01', now);

    // Then
    expect(words).toBe('was here in July');
  });
});

describe('the page titles', () => {
  it.each([
    [0, 'Newborn', 'Newborn', 'New'],
    [1, '1 month', 'Month 1', '1m'],
    [5, '5 months', 'Month 5', '5m'],
    [30, '30 months', 'Month 30', '30m'],
  ] as const)('call page %s %s, %s on the card and %s in the month strip', (page, title, card, short) => {
    // When
    const titles = pageTitles(page);

    // Then
    expect(titles).toEqual({ title, card, short });
  });
});
