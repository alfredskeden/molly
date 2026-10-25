import { describe, expect, it } from 'vitest';

import { draftDue, newTodoDraft, reminderLine, stepDay, stepTime, todoDraftOf, type TodoDraftState } from './sheet-model';

const on = (day: number, hours = 0, minutes = 0) => new Date(2026, 9, day, hours, minutes);
const now = on(25, 10, 7);

describe('the to-do sheet', () => {
  it('starts a new item with no text, no label, no date and Any time', () => {
    // Given
    const label = null;

    // When
    const draft = newTodoDraft(label, now);

    // Then
    expect(draft).toMatchObject({ text: '', label: null, day: 'none', timed: false });
    expect(draftDue(draft, now)).toBeNull();
  });

  it('reads an item back: tomorrow at 14:30, or another day without a time', () => {
    // Given
    const items = [
      { text: 'Checkup', label: 'Appointments', due: { kind: 'time' as const, at: on(26, 14, 30) } },
      { text: 'Pharmacy run', label: null, due: { kind: 'day' as const, at: on(30) } },
    ];

    // When
    const drafts = items.map((item) => todoDraftOf(item, now));

    // Then
    expect(drafts.map((draft) => [draft.day, draft.timed, draftDue(draft, now)])).toEqual([
      ['tomorrow', true, { kind: 'time', at: on(26, 14, 30) }],
      ['other', false, { kind: 'day', at: on(30) }],
    ]);
  });

  it('saves Today, Tomorrow or the Other day, at a time when one is set', () => {
    // Given
    const base: TodoDraftState = { ...newTodoDraft(null, now), minutes: 9 * 60 + 15 };

    // When
    const dues = [
      draftDue({ ...base, day: 'today' }, now),
      draftDue({ ...base, day: 'tomorrow', timed: true }, now),
      draftDue({ ...base, day: 'other', other: on(31) }, now),
    ];

    // Then
    expect(dues).toEqual([
      { kind: 'day', at: on(25) },
      { kind: 'time', at: on(26, 9, 15) },
      { kind: 'day', at: on(31) },
    ]);
  });

  it('steps the other day by a day, never before today, and the time by 15 minutes within the day', () => {
    // Given
    const draft = { ...newTodoDraft(null, now), day: 'other' as const, other: on(26), minutes: 23 * 60 + 50 };

    // When
    const earlier = stepDay(stepDay(draft, -1, now), -1, now);
    const later = stepTime(draft, 15);
    const earliest = stepTime({ ...draft, minutes: 5 }, -15);

    // Then
    expect(earlier.other).toEqual(on(25));
    expect(later.minutes).toBe(23 * 60 + 45);
    expect(earliest.minutes).toBe(0);
  });

  it('says when the phone will remind, or that the time has passed', () => {
    // Given
    const dues = [
      { kind: 'time' as const, at: on(25, 14, 30) },
      { kind: 'day' as const, at: on(28) },
      { kind: 'time' as const, at: on(25, 10, 30) },
    ];

    // When
    const lines = [...dues.map((due) => reminderLine(due, now)), reminderLine(null, now)];

    // Then
    expect(lines).toEqual([
      'This phone reminds you today at 13:30',
      'This phone reminds you on 27 Oct at 19:00',
      'Too late for a reminder',
      null,
    ]);
  });
});
