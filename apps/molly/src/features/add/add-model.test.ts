import { describe, expect, it } from 'vitest';

import { addChanged, addProblem, addSummary, newDraft, parseClock, withEnd, type AddDraft } from './add-model';

const at = (clock: string, day = 24) => {
  const [hours = 0, minutes = 0] = clock.split(':').map(Number);
  return new Date(2026, 8, day, hours, minutes);
};
const now = at('11:40');
const draft = (changes: Partial<AddDraft>): AddDraft => ({ ...newDraft('sleep', now), ...changes });

describe('a typed time', () => {
  it('is that clock time today when it has passed', () => {
    // When
    const time = parseClock('10:50', now);

    // Then
    expect(time).toEqual(at('10:50'));
  });

  it('is that clock time yesterday when it is later than now', () => {
    // When
    const time = parseClock('23:15', now);

    // Then
    expect(time).toEqual(at('23:15', 23));
  });

  it('is nothing when it is not a time', () => {
    // When
    const times = ['', '25:00', '9:7x', 'noon'].map((text) => parseClock(text, now));

    // Then
    expect(times).toEqual([null, null, null, null]);
  });

  it('takes a time without its leading zero', () => {
    // When
    const time = parseClock('9:05', now);

    // Then
    expect(time).toEqual(at('09:05'));
  });
});

describe('a new entry', () => {
  it('starts now with no end', () => {
    // When
    const fresh = newDraft('sleep', new Date(at('11:40').getTime() + 25_000));

    // Then
    expect(fresh).toMatchObject({ kind: 'sleep', start: now, end: null });
  });

  it('starts a bottle at the amount it is given', () => {
    // When
    const fresh = newDraft('feed', now, 135);

    // Then
    expect(fresh.amount).toBe(135);
  });

  it('gets an end half an hour after its start, never after now', () => {
    // When
    const early = withEnd(draft({ start: at('10:50') }), now);
    const late = withEnd(draft({ start: at('11:30') }), now);

    // Then
    expect(early.end).toEqual(at('11:20'));
    expect(late.end).toEqual(now);
  });
});

describe('what the sheet says it will do', () => {
  it('starts a timer from the start for a sleep with no end', () => {
    // When
    const summary = addSummary(draft({ start: at('10:50') }), now);

    // Then
    expect(summary).toEqual({
      note: 'No end time, so a sleep timer starts 50m ago. Add an end to save it as finished.',
      button: 'Start sleep timer',
      timer: true,
    });
  });

  it('saves a finished sleep with its length', () => {
    // When
    const summary = addSummary(draft({ start: at('09:32'), end: at('10:41') }), now);

    // Then
    expect(summary).toEqual({ note: 'Saved as a finished sleep, 1h 9m. No timer.', button: 'Save sleep', timer: false });
  });

  it('saves a diaper at its time', () => {
    // When
    const summary = addSummary({ ...newDraft('diaper', now), start: at('11:10') }, now);

    // Then
    expect(summary).toEqual({ note: 'Saved as a diaper from 30m ago.', button: 'Save diaper', timer: false });
  });

  it('says a medicine keeps its note', () => {
    // When
    const summary = addSummary({ ...newDraft('med', now), note: 'with the morning feed' }, now);

    // Then
    expect(summary).toEqual({ note: 'Saved as a medicine from just now, with your note.', button: 'Save medicine', timer: false });
  });
});

describe('an entry that can not be saved', () => {
  it('has a start in the future', () => {
    // When
    const problem = addProblem(draft({ start: at('11:45') }), now);

    // Then
    expect(problem).toBe('Start is in the future');
  });

  it('has an end before its start', () => {
    // When
    const problem = addProblem(draft({ start: at('10:00'), end: at('09:50') }), now);

    // Then
    expect(problem).toBe('End must be after start');
  });

  it('has an end in the future', () => {
    // When
    const problem = addProblem(draft({ start: at('10:00'), end: at('11:50') }), now);

    // Then
    expect(problem).toBe('End is in the future');
  });

  it('is another medicine without a name', () => {
    // When
    const problem = addProblem({ ...newDraft('med', now), med: 'Other', note: '  ' }, now);

    // Then
    expect(problem).toBe('Write what was given');
  });

  it('is a finished bottle with no amount typed', () => {
    // When
    const problem = addProblem(draft({ kind: 'feed', feed: 'Bottle', start: at('10:00'), end: at('10:20'), amount: null }), now);

    // Then
    expect(problem).toBe('Type an amount');
  });

  it('is fine as a bottle timer with no amount (the amount comes at its stop)', () => {
    // When
    const problem = addProblem(draft({ kind: 'feed', feed: 'Bottle', start: at('10:00'), end: null, amount: null }), now);

    // Then
    expect(problem).toBeNull();
  });

  it('is a finished meal with no food written', () => {
    // When
    const problem = addProblem(draft({ kind: 'feed', feed: 'Solids', start: at('10:00'), end: at('10:20'), food: '  ' }), now);

    // Then
    expect(problem).toBe('Write what was eaten');
  });

  it('is fine as a finished meal with its food', () => {
    // When
    const problem = addProblem(draft({ kind: 'feed', feed: 'Solids', start: at('10:00'), end: at('10:20'), food: 'Pear' }), now);

    // Then
    expect(problem).toBeNull();
  });

  it('is fine as a side with no food, whatever was typed for a meal before', () => {
    // When
    const problem = addProblem(draft({ kind: 'feed', feed: 'Left', start: at('10:00'), end: at('10:20'), food: '' }), now);

    // Then
    expect(problem).toBeNull();
  });

  it('is fine otherwise', () => {
    // When
    const problem = addProblem({ ...newDraft('med', now), med: 'Other', note: 'Paracetamol 2.5 ml' }, now);

    // Then
    expect(problem).toBeNull();
  });
});

describe('whether the Add entry sheet has changes', () => {
  const opened = newDraft('sleep', now, 120);

  it('has none when just opened', () => {
    // When
    const changed = addChanged(opened, opened);

    // Then
    expect(changed).toBe(false);
  });

  it('has none when only the kind tab changed', () => {
    // When
    const changed = addChanged(opened, { ...opened, kind: 'diaper' });

    // Then
    expect(changed).toBe(false);
  });

  it.each<[string, Partial<AddDraft>]>([
    ['start', { start: at('11:10') }],
    ['end', withEnd(opened, now)],
    ['feed method', { kind: 'feed', feed: 'Bottle' }],
    ['diaper kind', { kind: 'diaper', diaper: 'Dirty' }],
    ['medicine', { kind: 'med', med: 'Other' }],
    ['amount', { amount: 150 }],
    ['notes', { note: 'Half a dose' }],
    ['food', { food: 'Carrot' }],
  ])('has some when the %s changed', (_, change) => {
    // When
    const changed = addChanged(opened, { ...opened, ...change });

    // Then
    expect(changed).toBe(true);
  });

  it('has none when changed and changed back', () => {
    // When
    const changed = addChanged(opened, { ...opened, start: new Date(opened.start), note: '' });

    // Then
    expect(changed).toBe(false);
  });
});
