import type { Note } from '@molly/api';
import { describe, expect, it } from 'vitest';

import {
  dueText,
  labelFor,
  newCount,
  noteTime,
  photoUrl,
  reminderAt,
  savedBy,
  saveTags,
  seenAfter,
  tickTags,
  todoItems,
  todoLabels,
  todoList,
  untickTags,
  type TodoSeen,
} from './todo';

const on = (day: number, hours = 0, minutes = 0) => new Date(2026, 9, day, hours, minutes);
const now = on(25, 10);

let nextId = 1;
function note(text: string, tags: string[], fields: Partial<Note> = {}): Note {
  return { id: nextId++, child: 1, note: text, time: now.toISOString(), tags, image: null, ...fields };
}
const open = (text: string, label?: string, fields: Partial<Note> = {}, extra: string[] = []) =>
  note(text, ['molly-todo', ...(label ? [`To-do: ${label}`] : []), ...extra], fields);
const dueAt = (text: string, at: Date, label?: string, fields: Partial<Note> = {}) =>
  open(text, label, { time: at.toISOString(), ...fields }, ['molly-todo-due']);
const dueOn = (text: string, day: Date, label?: string, fields: Partial<Note> = {}) =>
  open(text, label, { time: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12).toISOString(), ...fields }, [
    'molly-todo-day',
  ]);
const done = (text: string, day: string, label?: string, fields: Partial<Note> = {}) =>
  note(text, ['molly-todo-done', `molly-done-${day}`, ...(label ? [`To-do: ${label}`] : [])], fields);

const listOf = (notes: Note[], seen: TodoSeen | null = null) => todoList(todoItems(notes), now, seen);
const cardsOf = (notes: Note[]) => listOf(notes).map((card) => [card.label, card.items.map((item) => item.text)]);

describe('the to-do list', () => {
  it('has Buy and Appointments, both empty, and no Other with no notes', () => {
    // Given
    const notes: Note[] = [];

    // When
    const list = listOf(notes);

    // Then
    expect(list).toMatchObject([
      { label: 'Buy', open: 0, items: [] },
      { label: 'Appointments', open: 0, items: [] },
    ]);
  });

  it('shows one open item under Buy, counted', () => {
    // Given
    const notes = [open('Diapers size 3', 'Buy')];

    // When
    const list = listOf(notes);

    // Then
    expect(list[0]).toMatchObject({ label: 'Buy', open: 1, items: [{ text: 'Diapers size 3', done: null }] });
  });

  it('gives a family label its own card, A–Z after Appointments, and Other last', () => {
    // Given
    const notes = [open('Call grandma'), open('Vitamin drops', 'Pharmacy'), open('Sand toys', 'Beach'), open('Wipes', 'Buy')];

    // When
    const cards = cardsOf(notes);

    // Then
    expect(cards).toEqual([
      ['Buy', ['Wipes']],
      ['Appointments', []],
      ['Beach', ['Sand toys']],
      ['Pharmacy', ['Vitamin drops']],
      ['Other', ['Call grandma']],
    ]);
  });

  it('puts labels that differ only in case on one card, and a lower-case built-in on its card', () => {
    // Given
    const notes = [open('Vitamin drops', 'Pharmacy'), open('Plasters', 'pharmacy'), open('Bibs', 'buy')];

    // When
    const cards = cardsOf(notes);

    // Then
    expect(cards).toEqual([
      ['Buy', ['Bibs']],
      ['Appointments', []],
      ['Pharmacy', ['Plasters', 'Vitamin drops']],
    ]);
  });

  it('drops a family label card whose items are all hidden', () => {
    // Given
    const notes = [done('Vitamin drops', '2026-10-24', 'Pharmacy')];

    // When
    const cards = cardsOf(notes);

    // Then
    expect(cards.map(([label]) => label)).toEqual(['Buy', 'Appointments']);
  });

  it('lists dated items soonest first, then undated ones newest first', () => {
    // Given
    const notes = [
      open('Older undated', 'Buy'),
      dueOn('In five days', on(30), 'Buy'),
      open('Newer undated', 'Buy'),
      dueAt('Tomorrow 14:30', on(26, 14, 30), 'Buy'),
    ];

    // When
    const cards = cardsOf(notes);

    // Then
    expect(cards[0]).toEqual(['Buy', ['Tomorrow 14:30', 'In five days', 'Newer undated', 'Older undated']]);
  });

  it('shows an item ticked today struck and uncounted, and hides one ticked yesterday', () => {
    // Given
    const notes = [done('Wipes', '2026-10-25', 'Buy'), done('Bibs', '2026-10-24', 'Buy'), open('Cream', 'Buy')];

    // When
    const list = listOf(notes);

    // Then
    expect(list[0]).toMatchObject({
      open: 1,
      items: [
        { text: 'Cream', done: null },
        { text: 'Wipes', done: '2026-10-25' },
      ],
    });
  });

  it('keeps a ticked item in its place among the open ones', () => {
    // Given
    const notes = [open('First', 'Buy'), done('Middle', '2026-10-25', 'Buy'), open('Last', 'Buy')];

    // When
    const cards = cardsOf(notes);

    // Then
    expect(cards[0]).toEqual(['Buy', ['Last', 'Middle', 'First']]);
  });

  it('marks an open item overdue once its time has passed, and a date-only one only after its day ends', () => {
    // Given
    const notes = [
      dueAt('Missed call', on(25, 9), 'Appointments'),
      dueOn('Today, all day', on(25), 'Appointments'),
      dueOn('Yesterday', on(24), 'Appointments'),
    ];

    // When
    const items = listOf(notes)[1]!.items;

    // Then
    expect(items.map((item) => [item.text, item.overdue])).toEqual([
      ['Yesterday', true],
      ['Today, all day', false],
      ['Missed call', true],
    ]);
  });
});

describe('reading a to-do note', () => {
  it('reads a date-only item saved at 12:00 as that day', () => {
    // Given
    const notes = [dueOn('Checkup', on(28), 'Appointments')];

    // When
    const [item] = todoItems(notes);

    // Then
    expect(item!.due).toEqual({ kind: 'day', at: on(28) });
  });

  it('reads the label, the due moment, the photo and the child', () => {
    // Given
    const image = 'http://baby.example.com/media/notes/images/a1b2.jpg';
    const notes = [dueAt('Checkup', on(26, 14, 30), 'Appointments', { child: 2, image })];

    // When
    const [item] = todoItems(notes);

    // Then
    expect(item).toMatchObject({ label: 'Appointments', due: { kind: 'time', at: on(26, 14, 30) }, image, child: 2, done: null });
  });
});

describe('to-do tags', () => {
  it('saves an open item with its label and date kind', () => {
    // Given
    const draft = { label: 'Appointments', due: { kind: 'time' as const, at: on(26, 14, 30) } };

    // When
    const tags = saveTags(draft);

    // Then
    expect(tags).toEqual(['molly-todo', 'To-do: Appointments', 'molly-todo-due']);
  });

  it('keeps a done item done and other tags when it is edited, and swaps the label and date tags', () => {
    // Given
    const before = ['molly-todo-done', 'molly-done-2026-10-25', 'To-do: Buy', 'molly-todo-due', 'teething'];

    // When
    const tags = saveTags({ label: null, due: { kind: 'day', at: on(27) } }, before);

    // Then
    expect(tags).toEqual(['molly-todo-done', 'molly-done-2026-10-25', 'molly-todo-day', 'teething']);
  });

  it("ticks off with the phone's local date, even just before midnight", () => {
    // Given
    const tags = ['molly-todo', 'To-do: Buy', 'molly-todo-day'];

    // When
    const ticked = tickTags(tags, on(25, 23, 59));

    // Then
    expect(ticked).toEqual(['To-do: Buy', 'molly-todo-day', 'molly-todo-done', 'molly-done-2026-10-25']);
  });

  it('unticks back to open, keeping the label and date', () => {
    // Given
    const tags = ['To-do: Buy', 'molly-todo-day', 'molly-todo-done', 'molly-done-2026-10-25'];

    // When
    const unticked = untickTags(tags);

    // Then
    expect(unticked).toEqual(['molly-todo', 'To-do: Buy', 'molly-todo-day']);
  });

  it('saves a date-only item at 12:00 local, a timed one at its time and an undated one at no set time', () => {
    // Given
    const day = { kind: 'day' as const, at: on(28, 8, 15) };
    const time = { kind: 'time' as const, at: on(28, 14, 30) };

    // When
    const times = [noteTime(day), noteTime(time), noteTime(null)];

    // Then
    expect(times).toEqual([on(28, 12).toISOString(), on(28, 14, 30).toISOString(), undefined]);
  });
});

describe('due text', () => {
  const textOf = (item: Note) => dueText(todoItems([item])[0]!, now);

  it('names today, tomorrow and yesterday, with the time when there is one', () => {
    // Given
    const notes = [
      dueAt('a', on(25, 14, 30)),
      dueOn('b', on(26)),
      dueAt('c', on(24, 10)),
      dueOn('d', on(24)),
    ];

    // When
    const texts = notes.map(textOf);

    // Then
    expect(texts).toEqual(['Today 14:30', 'Tomorrow', 'Yesterday 10:00 · overdue', 'Yesterday · overdue']);
  });

  it('counts days ahead within two weeks, then gives the date', () => {
    // Given
    const notes = [dueOn('a', on(30)), dueAt('b', on(30, 9, 5)), dueOn('c', new Date(2026, 10, 14)), dueOn('d', on(20))];

    // When
    const texts = notes.map(textOf);

    // Then
    expect(texts).toEqual(['in 5 days', 'in 5 days · 09:05', '14 Nov', '20 Oct · overdue']);
  });

  it('is empty for an undated item', () => {
    // Given
    const item = open('Wipes');

    // When
    const text = textOf(item);

    // Then
    expect(text).toBe('');
  });
});

describe('reminders', () => {
  const reminderOf = (item: Note, at = now) => reminderAt(todoItems([item])[0]!, at);

  it('rings an hour before an item with a time', () => {
    // Given
    const item = dueAt('Checkup', on(26, 14, 30));

    // When
    const at = reminderOf(item);

    // Then
    expect(at).toEqual(on(26, 13, 30));
  });

  it('rings at 19:00 the evening before a date-only item', () => {
    // Given
    const item = dueOn('Checkup', on(27));

    // When
    const at = reminderOf(item);

    // Then
    expect(at).toEqual(on(26, 19));
  });

  it('has none once that moment has passed, for done items, or without a date', () => {
    // Given
    const items = [
      dueAt('Too late', on(25, 10, 30)),
      dueOn('Tomorrow, but past 19:00', on(26)),
      note('Done', ['molly-todo-done', 'molly-done-2026-10-25', 'molly-todo-due'], { time: on(27, 9).toISOString() }),
      open('Undated'),
    ];

    // When
    const ats = items.map((item, index) => reminderOf(item, index === 1 ? on(25, 19, 30) : now));

    // Then
    expect(ats).toEqual([null, null, null, null]);
  });
});

describe('new items', () => {
  it('counts nothing on a device that never looked', () => {
    // Given
    const items = todoItems([open('Wipes'), open('Bibs')]);

    // When
    const count = newCount(items, null);

    // Then
    expect(count).toBe(0);
  });

  it("counts open items above the seen mark that this device didn't save, never done ones", () => {
    // Given
    const [seenOne, theirs, mine, theirDone] = [open('Seen'), open('Theirs'), open('Mine'), done('Done', '2026-10-25')];
    const seen = { mark: seenOne.id, saved: [mine.id] };

    // When
    const list = todoList(todoItems([seenOne, theirs, mine, theirDone]), now, seen);
    const count = newCount(todoItems([seenOne, theirs, mine, theirDone]), seen);

    // Then
    expect(count).toBe(1);
    expect(list.at(-1)!.items.filter((item) => item.isNew).map((item) => item.text)).toEqual(['Theirs']);
  });

  it('moves the mark to the highest id on leaving, and remembers ids saved here until then', () => {
    // Given
    const items = todoItems([open('One'), open('Two')]);
    const seen = savedBy({ mark: 0, saved: [] }, 99);

    // When
    const after = seenAfter(items, seen);

    // Then
    expect(seen).toEqual({ mark: 0, saved: [99] });
    expect(after).toEqual({ mark: items[1]!.id, saved: [99] });
  });

  it('forgets saved ids once the mark passes them, and ignores guesses', () => {
    // Given
    const items = todoItems([open('One'), open('Guess', undefined, { id: -5 })]);
    const seen = { mark: 0, saved: [items[0]!.id] };

    // When
    const after = seenAfter(items, seen);

    // Then
    expect(after).toEqual({ mark: items[0]!.id, saved: [] });
  });
});

describe('labels', () => {
  it('offers Buy and Appointments first, then the To-do tags A–Z with case duplicates merged', () => {
    // Given
    const tags = ['molly-skip', 'To-do: pharmacy', 'To-do: Beach', 'To-do: Pharmacy', 'To-do: Buy', 'To-do: '];

    // When
    const labels = todoLabels(tags);

    // Then
    expect(labels).toEqual(['Buy', 'Appointments', 'Beach', 'pharmacy']);
  });

  it('reuses a listed label whatever its case', () => {
    // Given
    const labels = ['Buy', 'Appointments', 'Pharmacy'];

    // When
    const typed = [labelFor('pharmacy ', labels), labelFor('BUY', labels), labelFor('Beach', labels)];

    // Then
    expect(typed).toEqual(['Pharmacy', 'Buy', 'Beach']);
  });

  it('refuses a blank label, Other and one too long for a tag name', () => {
    // Given
    const labels = ['Buy', 'Appointments'];

    // When
    const typed = [labelFor('  ', labels), labelFor('other', labels), labelFor('x'.repeat(94), labels)];

    // Then
    expect(typed).toEqual([null, null, null]);
  });
});

describe('photo URL', () => {
  it("joins the /media/ path to the session's base URL", () => {
    // Given
    const image = 'http://other-host:8000/media/notes/images/a1b2.jpg';

    // When
    const url = photoUrl('https://baby.example.com', image);

    // Then
    expect(url).toBe('https://baby.example.com/media/notes/images/a1b2.jpg');
  });

  it('keeps a base URL with a path, and an image URL without /media/ as it is', () => {
    // Given
    const base = 'https://example.com/baby/';

    // When
    const urls = [photoUrl(base, '/media/notes/images/a.jpg'), photoUrl(base, 'https://cdn.example.com/a.jpg')];

    // Then
    expect(urls).toEqual(['https://example.com/baby/media/notes/images/a.jpg', 'https://cdn.example.com/a.jpg']);
  });
});
