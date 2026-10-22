import { describe, expect, it } from 'vitest';

import {
  ageLabel,
  assignHues,
  CHILD_HUE_ANGLES,
  childOnScreen,
  childPrefs,
  childStatus,
  defaultChildPrefs,
  pickChildren,
  shownChildren,
} from './children';
import { DEFAULT_NAP_WINDOW } from './nap';

const on = (year: number, month: number, day: number, hours = 12) => new Date(year, month - 1, day, hours);

const ella = { id: 11, first_name: 'Ella' };
const otto = { id: 12, first_name: 'Otto' };
const mia = { id: 13, first_name: 'Mia' };

describe('the age label', () => {
  it('says born today on the birth date', () => {
    // When
    const label = ageLabel('2026-09-28', on(2026, 9, 28));

    // Then
    expect(label).toBe('Born today');
  });

  it('counts one day in the singular', () => {
    // When
    const label = ageLabel('2026-09-27', on(2026, 9, 28));

    // Then
    expect(label).toBe('1 day');
  });

  it('counts days in the first week', () => {
    // When
    const label = ageLabel('2026-09-22', on(2026, 9, 28));

    // Then
    expect(label).toBe('6 days');
  });

  it('counts one week in the singular', () => {
    // When
    const label = ageLabel('2026-09-21', on(2026, 9, 28));

    // Then
    expect(label).toBe('1 week');
  });

  it('counts weeks until the first month', () => {
    // When
    const label = ageLabel('2026-09-05', on(2026, 9, 28));

    // Then
    expect(label).toBe('3 weeks');
  });

  it('keeps counting weeks when the month is longer than four weeks', () => {
    // When
    const label = ageLabel('2026-01-31', on(2026, 2, 28));

    // Then
    expect(label).toBe('4 weeks');
  });

  it('turns one month exactly on the day of the month', () => {
    // When
    const label = ageLabel('2026-08-28', on(2026, 9, 28));

    // Then
    expect(label).toBe('1 month');
  });

  it('counts months in the first year', () => {
    // When
    const label = ageLabel('2026-04-20', on(2026, 9, 28));

    // Then
    expect(label).toBe('5 months');
  });

  it('is still 11 months the day before the first birthday', () => {
    // When
    const label = ageLabel('2025-09-29', on(2026, 9, 28));

    // Then
    expect(label).toBe('11 months');
  });

  it('turns one year exactly on the birthday', () => {
    // When
    const label = ageLabel('2025-09-28', on(2026, 9, 28));

    // Then
    expect(label).toBe('1 year');
  });

  it('counts a year and a month in the singular', () => {
    // When
    const label = ageLabel('2025-08-20', on(2026, 9, 28));

    // Then
    expect(label).toBe('1 year 1 month');
  });

  it('counts years and months in the plural', () => {
    // When
    const label = ageLabel('2024-05-10', on(2026, 9, 28));

    // Then
    expect(label).toBe('2 years 4 months');
  });

  it('is not thrown off by the clock change', () => {
    // Given
    const afterSummerTime = on(2026, 10, 26, 0);

    // When
    const label = ageLabel('2026-10-19', afterSummerTime);

    // Then
    expect(label).toBe('1 week');
  });
});

describe('the default preferences of a child', () => {
  it('shows the child with the default nap window, bottle, no reminder, no sex and no solid food', () => {
    // When
    const prefs = defaultChildPrefs(0);

    // Then
    expect(prefs).toEqual({
      shown: true,
      hue: 0,
      napWindow: DEFAULT_NAP_WINDOW,
      bottle: { type: 'formula', amount: 120 },
      vitaminDReminder: false,
      sex: null,
      solids: false,
    });
  });

  it('gives the colour of its place in the list', () => {
    // When
    const prefs = defaultChildPrefs(2);

    // Then
    expect(prefs.hue).toBe(2);
  });

  it('gives the fifth child the fifth colour', () => {
    // When
    const prefs = defaultChildPrefs(4);

    // Then
    expect(prefs.hue).toBe(4);
  });

  it('gives the sixth child the first colour again', () => {
    // When
    const prefs = defaultChildPrefs(5);

    // Then
    expect(prefs.hue).toBe(0);
  });
});

describe("a child's preferences", () => {
  it('are the stored ones when the child has an entry', () => {
    // Given
    const stored = { ...defaultChildPrefs(0), hue: 3, napWindow: { start: '08:00', end: '18:00' } };

    // When
    const prefs = childPrefs([ella, otto], { [ella.id]: stored }, ella.id);

    // Then
    expect(prefs).toEqual(stored);
  });

  it("are the defaults for the child's place when it has no entry yet", () => {
    // When
    const prefs = childPrefs([ella, otto], {}, otto.id);

    // Then
    expect(prefs).toEqual(defaultChildPrefs(1));
  });

  it("fill fields missing from a stored entry with the defaults for the child's place", () => {
    // Given
    const stored = { napWindow: { start: '08:00', end: '18:00' } };

    // When
    const prefs = childPrefs([ella, otto], { [otto.id]: stored }, otto.id);

    // Then
    expect(prefs).toEqual({ ...defaultChildPrefs(1), napWindow: { start: '08:00', end: '18:00' } });
  });

  it('keep solid food on when stored on', () => {
    // When
    const prefs = childPrefs([ella], { [ella.id]: { solids: true } }, ella.id);

    // Then
    expect(prefs.solids).toBe(true);
  });

  it('are the first defaults for a child not in the list', () => {
    // When
    const prefs = childPrefs([ella], {}, 99);

    // Then
    expect(prefs).toEqual(defaultChildPrefs(0));
  });
});

describe('the shown children', () => {
  it('are none without children', () => {
    // When
    const shown = shownChildren([], {});

    // Then
    expect(shown).toEqual([]);
  });

  it('are every child in Baby Buddy order without preferences', () => {
    // When
    const shown = shownChildren([ella, otto, mia], {});

    // Then
    expect(shown).toEqual([ella, otto, mia]);
  });

  it('leave hidden children out and count a child without preferences as shown', () => {
    // Given
    const prefs = { [otto.id]: { ...defaultChildPrefs(1), shown: false }, [mia.id]: defaultChildPrefs(2) };

    // When
    const shown = shownChildren([ella, otto, mia], prefs);

    // Then
    expect(shown).toEqual([ella, mia]);
  });

  it('keep the first child when every child is hidden', () => {
    // Given
    const prefs = { [ella.id]: { ...defaultChildPrefs(0), shown: false }, [otto.id]: { ...defaultChildPrefs(1), shown: false } };

    // When
    const shown = shownChildren([ella, otto], prefs);

    // Then
    expect(shown).toEqual([ella]);
  });
});

describe('the child on screen', () => {
  it('is none without shown children', () => {
    // When
    const child = childOnScreen([], 11);

    // Then
    expect(child).toBeNull();
  });

  it('is the chosen child while it is shown', () => {
    // When
    const child = childOnScreen([ella, otto], otto.id);

    // Then
    expect(child).toBe(otto);
  });

  it('is the first shown child when none was chosen', () => {
    // When
    const child = childOnScreen([ella, otto], null);

    // Then
    expect(child).toBe(ella);
  });

  it('is the first shown child when the chosen one is hidden or gone', () => {
    // When
    const child = childOnScreen([otto, mia], ella.id);

    // Then
    expect(child).toBe(otto);
  });
});

describe("a child's status", () => {
  const now = on(2026, 9, 28, 12);
  const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

  it('is nothing when nothing is logged', () => {
    // When
    const status = childStatus({ sleepStart: null, lastSleepEnd: null }, now);

    // Then
    expect(status).toBeNull();
  });

  it('says how long the running sleep has lasted', () => {
    // When
    const status = childStatus({ sleepStart: minutesAgo(42), lastSleepEnd: minutesAgo(200) }, now);

    // Then
    expect(status).toEqual({ sleeping: true, label: 'Sleeping 42m' });
  });

  it('says how long the child has been awake since the last sleep', () => {
    // When
    const status = childStatus({ sleepStart: null, lastSleepEnd: minutesAgo(85) }, now);

    // Then
    expect(status).toEqual({ sleeping: false, label: 'Awake 1h 25m' });
  });

  it('stays in minutes up to 59', () => {
    // When
    const status = childStatus({ sleepStart: minutesAgo(59), lastSleepEnd: null }, now);

    // Then
    expect(status?.label).toBe('Sleeping 59m');
  });

  it('pads the minutes from the first hour', () => {
    // When
    const status = childStatus({ sleepStart: null, lastSleepEnd: minutesAgo(60) }, now);

    // Then
    expect(status?.label).toBe('Awake 1h 00m');
  });

  it('never counts below zero when the phone clock is behind', () => {
    // When
    const status = childStatus({ sleepStart: minutesAgo(-2), lastSleepEnd: null }, now);

    // Then
    expect(status?.label).toBe('Sleeping 0m');
  });
});

describe('the children picked during onboarding', () => {
  it('are none when none is ticked', () => {
    // When
    const picked = pickChildren([ella, otto], []);

    // Then
    expect(picked).toEqual([]);
  });

  it('keep Baby Buddy order whatever order they were ticked in', () => {
    // When
    const picked = pickChildren([ella, otto, mia], [mia.id, ella.id]);

    // Then
    expect(picked).toEqual([ella, mia]);
  });

  it('ignore ticks for children no longer there', () => {
    // When
    const picked = pickChildren([ella, otto], [otto.id, 99]);

    // Then
    expect(picked).toEqual([otto]);
  });
});

describe('giving children their colours', () => {
  it('changes nothing without children', () => {
    // When
    const assigned = assignHues([], {});

    // Then
    expect(assigned).toBeNull();
  });

  it('gives children without a colour the colours in list order', () => {
    // When
    const assigned = assignHues([ella, otto], { [otto.id]: { shown: false } });

    // Then
    expect(assigned).toEqual({ [ella.id]: { hue: 0 }, [otto.id]: { shown: false, hue: 1 } });
  });

  it('changes nothing when every child has its colour', () => {
    // When
    const assigned = assignHues([ella, otto], { [ella.id]: { hue: 3 }, [otto.id]: { hue: 0 } });

    // Then
    expect(assigned).toBeNull();
  });

  it('gives a child added later the first colour no other child has', () => {
    // Given
    const prefs = { [otto.id]: { hue: 0 }, [mia.id]: { hue: 1 } };

    // When
    const assigned = assignHues([ella, otto, mia], prefs);

    // Then
    expect(assigned).toEqual({ ...prefs, [ella.id]: { hue: 2 } });
  });

  it('gives the fifth colour once four are taken', () => {
    // Given
    const noah = { id: 14, first_name: 'Noah' };
    const lea = { id: 15, first_name: 'Lea' };
    const prefs = { [ella.id]: { hue: 0 }, [otto.id]: { hue: 1 }, [mia.id]: { hue: 2 }, [noah.id]: { hue: 3 } };

    // When
    const assigned = assignHues([ella, otto, mia, noah, lea], prefs);

    // Then
    expect(assigned?.[lea.id]).toEqual({ hue: 4 });
  });

  it('reuses colours in turn once all five are taken', () => {
    // Given
    const noah = { id: 14, first_name: 'Noah' };
    const lea = { id: 15, first_name: 'Lea' };
    const max = { id: 16, first_name: 'Max' };
    const prefs = {
      [ella.id]: { hue: 0 },
      [otto.id]: { hue: 1 },
      [mia.id]: { hue: 2 },
      [noah.id]: { hue: 3 },
      [lea.id]: { hue: 4 },
    };

    // When
    const assigned = assignHues([ella, otto, mia, noah, lea, max], prefs);

    // Then
    expect(assigned?.[max.id]).toEqual({ hue: 0 });
  });
});

describe('the child colours', () => {
  it('keep each colour stored before five existed at its nearest new hue', () => {
    // Given
    const before = [350, 210, 145, 75];

    // When
    const after = before.map((_, index) => CHILD_HUE_ANGLES[index]);

    // Then
    expect(after).toEqual([350, 210, 165, 60]);
  });

  it('add the lavender hue as the fifth', () => {
    // Then
    expect(CHILD_HUE_ANGLES[4]).toBe(285);
  });
});
