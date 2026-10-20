import { describe, expect, it } from 'vitest';

import { instantFeedTimes } from './instant-feed';

const at = (time: string) => new Date(`2026-10-14T${time}:00`);

describe('instant feed times', () => {
  it('ends now and starts a minute earlier when there is no earlier feed', () => {
    // Given
    const now = at('09:30');

    // When
    const times = instantFeedTimes(now);

    // Then
    expect(times).toEqual({ start: at('09:29'), end: now });
  });

  it('starts a minute earlier when the previous feed ended long ago', () => {
    // Given
    const now = at('09:30');

    // When
    const times = instantFeedTimes(now, at('07:10'));

    // Then
    expect(times).toEqual({ start: at('09:29'), end: now });
  });

  it('starts at the previous feed’s end when that was under a minute ago', () => {
    // Given
    const now = at('09:30');
    const lastFeedEnd = new Date(now.getTime() - 20_000);

    // When
    const times = instantFeedTimes(now, lastFeedEnd);

    // Then
    expect(times).toEqual({ start: lastFeedEnd, end: now });
  });

  it('starts a minute earlier when the previous feed ended exactly a minute ago', () => {
    // Given
    const now = at('09:30');

    // When
    const times = instantFeedTimes(now, at('09:29'));

    // Then
    expect(times).toEqual({ start: at('09:29'), end: now });
  });

  it('never starts after now, even when the previous feed ends later (another phone’s fast clock)', () => {
    // Given
    const now = at('09:30');

    // When
    const times = instantFeedTimes(now, at('09:32'));

    // Then
    expect(times).toEqual({ start: now, end: now });
  });
});
