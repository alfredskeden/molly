import { describe, expect, it } from 'vitest';

import {
  draftDue,
  newTodoDraft,
  pickDay,
  pickTime,
  reminderLine,
  stepDay,
  stepTime,
  todoChanged,
  todoDraftOf,
  type TodoDraftState,
} from './sheet-model';

const on = (day: number, hours = 0, minutes = 0) => new Date(2026, 9, day, hours, minutes);
const now = on(25, 10, 7);

describe('the to-do sheet', () => {
  it('starts a new item with no text, no label, no date, Any time and the reminder on', () => {
    // Given
    const label = null;

    // When
    const draft = newTodoDraft(label, now);

    // Then
    expect(draft).toMatchObject({ text: '', label: null, day: 'none', timed: false, quiet: false });
    expect(draftDue(draft, now)).toBeNull();
  });

  it('reads an item back: tomorrow at 14:30, or another day without a time', () => {
    // Given
    const items = [
      { id: 1, text: 'Checkup', label: 'Appointments', due: { kind: 'time' as const, at: on(26, 14, 30) } },
      { id: 2, text: 'Pharmacy run', label: null, due: { kind: 'day' as const, at: on(30) } },
    ];

    // When
    const drafts = items.map((item) => todoDraftOf(item, now, []));

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

  it('steps the other day by a day, never before today, and stays on Other', () => {
    // Given
    const draft = { ...newTodoDraft(null, now), day: 'other' as const, other: on(26) };

    // When
    const earlier = stepDay(stepDay(draft, -1, now), -1, now);

    // Then
    expect([earlier.day, earlier.other]).toEqual(['other', on(25)]);
  });

  it('steps the time by 15 minutes, kept within 00:00 and 23:59', () => {
    // Given
    const draft = { ...newTodoDraft(null, now), timed: true, minutes: 23 * 60 + 50 };

    // When
    const later = stepTime(draft, 15);
    const earliest = stepTime({ ...draft, minutes: 5 }, -15);

    // Then
    expect([later.minutes, earliest.minutes]).toEqual([23 * 60 + 59, 0]);
  });

  it('picks a day after tomorrow as the Other day', () => {
    // Given
    const draft = newTodoDraft(null, now);

    // When
    const picked = pickDay(draft, new Date(2027, 0, 14), now);

    // Then
    expect([picked.day, draftDue(picked, now)]).toEqual(['other', { kind: 'day', at: new Date(2027, 0, 14) }]);
  });

  it('picks today as Today and tomorrow as Tomorrow', () => {
    // Given
    const draft = { ...newTodoDraft(null, now), day: 'other' as const, other: on(30) };

    // When
    const days = [pickDay(draft, on(25), now), pickDay(draft, on(26), now)];

    // Then
    expect(days.map((picked) => [picked.day, picked.other])).toEqual([
      ['today', on(30)],
      ['tomorrow', on(30)],
    ]);
  });

  it('picks a day before today as Today', () => {
    // Given
    const draft = { ...newTodoDraft(null, now), day: 'other' as const, other: on(30) };

    // When
    const picked = pickDay(draft, on(24), now);

    // Then
    expect(picked.day).toBe('today');
  });

  it('keeps the text, label and time when a day is picked', () => {
    // Given
    const draft: TodoDraftState = { ...newTodoDraft('Appointments', now), text: 'Checkup', timed: true, minutes: 14 * 60 + 40 };

    // When
    const picked = pickDay(draft, on(30), now);

    // Then
    expect(picked).toMatchObject({ text: 'Checkup', label: 'Appointments', timed: true, minutes: 14 * 60 + 40 });
  });

  it('saves a picked time at its exact minute', () => {
    // Given
    const draft = { ...newTodoDraft(null, now), day: 'tomorrow' as const, timed: true };

    // When
    const picked = pickTime(draft, 14 * 60 + 40);

    // Then
    expect(draftDue(picked, now)).toEqual({ kind: 'time', at: on(26, 14, 40) });
  });

  it('steps 15 minutes either way from a picked time', () => {
    // Given
    const picked = pickTime({ ...newTodoDraft(null, now), timed: true }, 14 * 60 + 40);

    // When
    const steps = [stepTime(picked, 15), stepTime(picked, -15)];

    // Then
    expect(steps.map((draft) => draft.minutes)).toEqual([14 * 60 + 55, 14 * 60 + 25]);
  });

  it('keeps a picked time within the day', () => {
    // Given
    const draft = { ...newTodoDraft(null, now), timed: true };

    // When
    const times = [pickTime(draft, -1), pickTime(draft, 24 * 60)];

    // Then
    expect(times.map((picked) => picked.minutes)).toEqual([0, 23 * 60 + 59]);
  });

  it('reminds an hour before a time picked for today', () => {
    // Given
    const picked = pickTime({ ...newTodoDraft(null, now), day: 'today', timed: true }, 14 * 60 + 40);

    // When
    const line = reminderLine({ due: draftDue(picked, now), quiet: false }, now);

    // Then
    expect(line).toBe('This phone reminds you today at 13:40');
  });

  it('says when the phone will remind, or that the time has passed', () => {
    // Given
    const dues = [
      { kind: 'time' as const, at: on(25, 14, 30) },
      { kind: 'day' as const, at: on(28) },
      { kind: 'time' as const, at: on(25, 10, 30) },
    ];

    // When
    const lines = [...dues.map((due) => reminderLine({ due, quiet: false }, now)), reminderLine({ due: null, quiet: false }, now)];

    // Then
    expect(lines).toEqual([
      'This phone reminds you today at 13:30',
      'This phone reminds you on 27 Oct at 19:00',
      'Too late for a reminder',
      null,
    ]);
  });

  it('reads whether this phone reminds about an item from its quiet ids', () => {
    // Given
    const item = { id: 7, text: 'Vaccination', label: null, due: { kind: 'time' as const, at: on(26, 15) } };

    // When
    const drafts = [todoDraftOf(item, now, [7]), todoDraftOf(item, now, [3])];

    // Then
    expect(drafts.map((draft) => draft.quiet)).toEqual([true, false]);
  });

  it('says this phone won\'t remind when quiet, and nothing without a date', () => {
    // Given
    const due = { kind: 'time' as const, at: on(25, 14, 30) };

    // When
    const lines = [reminderLine({ due, quiet: true }, now), reminderLine({ due: null, quiet: true }, now)];

    // Then
    expect(lines).toEqual(['No reminder on this phone', null]);
  });
});

describe('whether the to-do sheet has changes', () => {
  const item = { id: 7, text: 'Checkup', label: 'Appointments', due: { kind: 'time' as const, at: on(26, 14, 30) } };
  const unchanged = { photo: 'keep', added: [] } as const;

  it.each([
    ['a new item', newTodoDraft(null, now)],
    ['an existing item', todoDraftOf(item, now, [])],
  ])('has none when %s is just opened', (_, opened) => {
    // When
    const changed = todoChanged(opened, opened, unchanged);

    // Then
    expect(changed).toBe(false);
  });

  it.each<[string, Partial<TodoDraftState>]>([
    ['text', { text: 'Checkup at 15' }],
    ['label', { label: null }],
    ['day', { day: 'today' }],
    ['time', { minutes: 15 * 60 }],
    ['any time', { timed: false }],
    ['reminder', { quiet: true }],
  ])('has some when the %s changed', (_, change) => {
    // Given
    const opened = todoDraftOf(item, now, []);

    // When
    const changed = todoChanged(opened, { ...opened, ...change }, unchanged);

    // Then
    expect(changed).toBe(true);
  });

  it('has some when another day is stepped', () => {
    // Given
    const opened = { ...newTodoDraft(null, now), day: 'other' as const };

    // When
    const changed = todoChanged(opened, stepDay(opened, 1, now), unchanged);

    // Then
    expect(changed).toBe(true);
  });

  it.each([
    ['a photo picked', { photo: 'new', added: [] }],
    ['the photo removed', { photo: 'remove', added: [] }],
    ['a new label added', { photo: 'keep', added: ['Pharmacy'] }],
  ] as const)('has some with %s', (_, extras) => {
    // Given
    const opened = newTodoDraft(null, now);

    // When
    const changed = todoChanged(opened, opened, extras);

    // Then
    expect(changed).toBe(true);
  });

  it('has none when changed and changed back', () => {
    // Given
    const opened = todoDraftOf(item, now, []);
    const back = { ...stepTime(stepTime(opened, 15), -15), text: 'Checkup', day: 'tomorrow' as const };

    // When
    const changed = todoChanged(opened, back, unchanged);

    // Then
    expect(changed).toBe(false);
  });

  it('has none for what a cleared choice hid: a stepped other day, a time with no date', () => {
    // Given
    const opened = newTodoDraft(null, now);
    const hidden = { ...stepDay(opened, 3, now), minutes: 12 * 60, timed: true, text: '  ' };

    // When
    const changed = todoChanged(opened, hidden, unchanged);

    // Then
    expect(changed).toBe(false);
  });
});
