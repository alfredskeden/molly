import { describe, expect, it } from 'vitest';

import { defaultChildPrefs } from '@molly/core';

import {
  DEFAULT_SETTINGS,
  parseSettings,
  prefsOnScreen,
  settingsAfterSignIn,
  settingsAfterSignOut,
  withChildPrefs,
} from './types';

describe('device settings', () => {
  it('fall back to the defaults when nothing is stored', () => {
    // Given
    const stored = null;

    // When
    const settings = parseSettings(stored);

    // Then
    expect(settings).toEqual({
      childId: null,
      children: {},
      theme: 'system',
      notifications: true,
      notificationPrompted: false,
      haptics: true,
      look: 'classic',
      playful: true,
      guideRegion: 'sweden',
      guideNoteSeen: false,
      feedTimer: false,
      todoSeen: null,
    });
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('follow the system theme when nothing is stored', () => {
    // Given
    const stored = null;

    // When
    const settings = parseSettings(stored);

    // Then
    expect(settings.theme).toBe('system');
  });

  it('load a chosen theme back', () => {
    // Given
    const stored = JSON.stringify({ theme: 'night' });

    // When
    const settings = parseSettings(stored);

    // Then
    expect(settings.theme).toBe('night');
  });

  it.each(['dark', 42])('follow the system theme when the stored theme (%s) is unknown', (theme) => {
    // Given
    const stored = JSON.stringify({ theme });

    // When
    const settings = parseSettings(stored);

    // Then
    expect(settings.theme).toBe('system');
  });

  it('show lock-screen notifications when nothing is stored', () => {
    // Given
    const stored = null;

    // When
    const settings = parseSettings(stored);

    // Then
    expect(settings.notifications).toBe(true);
  });

  it('remember that notifications were turned off', () => {
    // Given
    const stored = JSON.stringify({ notifications: false });

    // When
    const settings = parseSettings(stored);

    // Then
    expect(settings.notifications).toBe(false);
  });

  it.each(['no', 0])('show notifications when the stored choice (%s) is unreadable', (notifications) => {
    // Given
    const stored = JSON.stringify({ notifications });

    // When
    const settings = parseSettings(stored);

    // Then
    expect(settings.notifications).toBe(true);
  });

  it('remember that the lock-screen question was answered', () => {
    // Given
    const stored = JSON.stringify({ notificationPrompted: true });

    // When
    const settings = parseSettings(stored);

    // Then
    expect(settings.notificationPrompted).toBe(true);
  });

  it('remember that haptics were turned off', () => {
    // Given
    const stored = JSON.stringify({ haptics: false });

    // When
    const settings = parseSettings(stored);

    // Then
    expect(settings.haptics).toBe(false);
  });

  it('remember that feeds are timed', () => {
    // Given
    const stored = JSON.stringify({ feedTimer: true });

    // When
    const settings = parseSettings(stored);

    // Then
    expect(settings.feedTimer).toBe(true);
  });

  it('save feeds at once when the stored choice is unreadable', () => {
    // Given
    const stored = JSON.stringify({ feedTimer: 'yes' });

    // When
    const settings = parseSettings(stored);

    // Then
    expect(settings.feedTimer).toBe(false);
  });

  it('load the selected child back', () => {
    // Given
    const stored = JSON.stringify({ childId: 3 });

    // When
    const settings = parseSettings(stored);

    // Then
    expect(settings.childId).toBe(3);
  });

  it.each(['{not json', '{"childId":"three"}'])(
    'fall back to the defaults when the stored value (%s) is corrupt',
    (stored) => {
      // Given
      const corrupt = stored;

      // When
      const settings = parseSettings(corrupt);

      // Then
      expect(settings).toEqual(DEFAULT_SETTINGS);
    },
  );

  it('look like Molly Classic with playful labels when nothing is stored', () => {
    // Given
    const stored = null;

    // When
    const settings = parseSettings(stored);

    // Then
    expect(settings).toMatchObject({ look: 'classic', playful: true });
  });

  it('load a chosen look and playful setting back', () => {
    // Given
    const stored = JSON.stringify({ look: 'classic', playful: false });

    // When
    const settings = parseSettings(stored);

    // Then
    expect(settings).toMatchObject({ look: 'classic', playful: false });
  });

  it('keep the Colours choice from before themes, with Classic and playful labels', () => {
    // Given
    const stored = JSON.stringify({ theme: 'night', haptics: false });

    // When
    const settings = parseSettings(stored);

    // Then
    expect(settings).toMatchObject({ theme: 'night', haptics: false, look: 'classic', playful: true });
  });

  it.each([['disco'], [42], [null]])('look like Molly Classic when the stored look (%s) is unknown', (look) => {
    // Given
    const stored = JSON.stringify({ look });

    // When
    const settings = parseSettings(stored);

    // Then
    expect(settings.look).toBe('classic');
  });

  it.each([['no'], [0]])('keep playful labels on when the stored value (%s) is not a yes or no', (playful) => {
    // Given
    const stored = JSON.stringify({ playful });

    // When
    const settings = parseSettings(stored);

    // Then
    expect(settings.playful).toBe(true);
  });

  it("follow Sweden's guidance, with the guide's first note not yet seen, when stored before the guide", () => {
    // Given
    const stored = JSON.stringify({ theme: 'night', haptics: false });

    // When
    const settings = parseSettings(stored);

    // Then
    expect(settings).toMatchObject({ guideRegion: 'sweden', guideNoteSeen: false });
  });

  it('load the chosen guidance and the seen note back', () => {
    // Given
    const stored = JSON.stringify({ guideRegion: 'international', guideNoteSeen: true });

    // When
    const settings = parseSettings(stored);

    // Then
    expect(settings).toMatchObject({ guideRegion: 'international', guideNoteSeen: true });
  });

  it.each([['norway'], [1], [null]])("follow Sweden's guidance when the stored region (%s) is unknown", (guideRegion) => {
    // Given
    const stored = JSON.stringify({ guideRegion, guideNoteSeen: 'yes' });

    // When
    const settings = parseSettings(stored);

    // Then
    expect(settings).toMatchObject({ guideRegion: 'sweden', guideNoteSeen: false });
  });
});

describe('the preferences of each child', () => {
  it('are none when nothing is stored', () => {
    // Given
    const stored = null;

    // When
    const settings = parseSettings(stored);

    // Then
    expect(settings.children).toEqual({});
  });

  it("load each child's preferences back", () => {
    // Given
    const ella = {
      shown: true,
      hue: 2,
      napWindow: { start: '08:30', end: '18:00' },
      bottle: { type: 'breast milk', amount: 90 },
      vitaminDReminder: true,
      sex: 'girl',
      solids: true,
    };
    const otto = {
      shown: false,
      hue: 1,
      napWindow: { start: '07:00', end: '19:00' },
      bottle: { type: 'formula' },
      vitaminDReminder: false,
      sex: null,
      solids: false,
    };
    const stored = JSON.stringify({ childId: 3, children: { 3: ella, 4: otto } });

    // When
    const settings = parseSettings(stored);

    // Then
    expect(settings.children).toEqual({ 3: ella, 4: otto });
  });

  it('drop only the broken fields of an entry, so they fall back to the defaults', () => {
    // Given
    const stored = JSON.stringify({
      children: {
        3: {
          shown: 'no',
          hue: 7,
          napWindow: { start: '25:00', end: '18:00' },
          bottle: { type: 'juice' },
          vitaminDReminder: 1,
          sex: 'other',
          solids: 'yes',
        },
        4: { hue: 3, shown: false },
      },
    });

    // When
    const settings = parseSettings(stored);

    // Then
    expect(settings.children).toEqual({ 3: {}, 4: { hue: 3, shown: false } });
  });

  it.each([['not a record'], [[1, 2]]])('are none when the stored children (%j) are unreadable', (children) => {
    // Given
    const stored = JSON.stringify({ children });

    // When
    const settings = parseSettings(stored);

    // Then
    expect(settings.children).toEqual({});
  });

  it('ignore entries that are not keyed by a child id or are not records', () => {
    // Given
    const stored = JSON.stringify({ children: { ella: { hue: 1 }, 3: 'shown', 4: { hue: 1 } } });

    // When
    const settings = parseSettings(stored);

    // Then
    expect(settings.children).toEqual({ 4: { hue: 1 } });
  });
});

describe('settings stored before several children', () => {
  it("move the nap window, bottle and Vitamin D reminder to the selected child's preferences", () => {
    // Given
    const stored = JSON.stringify({
      childId: 3,
      napWindow: { start: '08:30', end: '18:00' },
      bottle: { type: 'breast milk', amount: 90 },
      vitaminDReminder: true,
    });

    // When
    const settings = parseSettings(stored);

    // Then
    expect(settings).toEqual({
      ...DEFAULT_SETTINGS,
      childId: 3,
      children: {
        3: { napWindow: { start: '08:30', end: '18:00' }, bottle: { type: 'breast milk', amount: 90 }, vitaminDReminder: true },
      },
    });
  });

  it('move only the readable fields', () => {
    // Given
    const stored = JSON.stringify({ childId: 3, napWindow: { start: '25:00', end: '18:00' }, bottle: { type: 'juice' } });

    // When
    const settings = parseSettings(stored);

    // Then
    expect(settings).toEqual({ ...DEFAULT_SETTINGS, childId: 3 });
  });

  it('move nothing without a selected child', () => {
    // Given
    const stored = JSON.stringify({ napWindow: { start: '08:30', end: '18:00' } });

    // When
    const settings = parseSettings(stored);

    // Then
    expect(settings.children).toEqual({});
  });

  it('are ignored once there are preferences per child', () => {
    // Given
    const stored = JSON.stringify({ childId: 3, napWindow: { start: '08:30', end: '18:00' }, children: { 3: { hue: 1 } } });

    // When
    const settings = parseSettings(stored);

    // Then
    expect(settings.children).toEqual({ 3: { hue: 1 } });
  });
});

describe('the to-do seen mark', () => {
  it('reads back what was stored, and nothing from a malformed value', () => {
    // Given
    const stored = [JSON.stringify({ todoSeen: { mark: 40, saved: [41, 42] } }), JSON.stringify({ todoSeen: { mark: '40' } })];

    // When
    const seen = stored.map((value) => parseSettings(value).todoSeen);

    // Then
    expect(seen).toEqual([{ mark: 40, saved: [41, 42] }, null]);
  });
});

describe('signing out', () => {
  it("drops the child on screen, every child's preferences and the to-do seen mark, and keeps the device's choices", () => {
    // Given
    const settings = {
      ...DEFAULT_SETTINGS,
      todoSeen: { mark: 40, saved: [41] },
      childId: 4,
      children: { 4: { hue: 2, vitaminDReminder: true } },
      theme: 'night' as const,
      notifications: false,
      notificationPrompted: true,
      haptics: false,
      guideRegion: 'international' as const,
      guideNoteSeen: true,
      feedTimer: true,
    };

    // When
    const after = settingsAfterSignOut(settings);

    // Then
    expect(after).toEqual({
      ...DEFAULT_SETTINGS,
      theme: 'night',
      notifications: false,
      notificationPrompted: true,
      haptics: false,
      guideRegion: 'international',
      guideNoteSeen: true,
      feedTimer: true,
    });
  });
});

describe("changing a child's preferences", () => {
  it('starts an entry for a child without one', () => {
    // When
    const settings = withChildPrefs(DEFAULT_SETTINGS, 3, { hue: 2 });

    // Then
    expect(settings.children).toEqual({ 3: { hue: 2 } });
  });

  it("keeps the child's other preferences and the other children's", () => {
    // Given
    const before = { ...DEFAULT_SETTINGS, children: { 3: { hue: 2, shown: true }, 4: { hue: 1 } } };

    // When
    const settings = withChildPrefs(before, 3, { shown: false });

    // Then
    expect(settings.children).toEqual({ 3: { hue: 2, shown: false }, 4: { hue: 1 } });
  });
});

describe('the preferences of the child on screen', () => {
  it('are the first defaults when no child is chosen', () => {
    // When
    const prefs = prefsOnScreen(DEFAULT_SETTINGS);

    // Then
    expect(prefs).toEqual(defaultChildPrefs(0));
  });

  it("are the chosen child's, over the defaults", () => {
    // Given
    const settings = { ...DEFAULT_SETTINGS, childId: 4, children: { 3: { vitaminDReminder: true }, 4: { napWindow: { start: '08:00', end: '18:00' } } } };

    // When
    const prefs = prefsOnScreen(settings);

    // Then
    expect(prefs).toEqual({ ...defaultChildPrefs(0), napWindow: { start: '08:00', end: '18:00' } });
  });
});

describe('signing in', () => {
  it('puts the first picked child on screen and hides the children left unticked', () => {
    // When
    const settings = settingsAfterSignIn(DEFAULT_SETTINGS, { childId: 3, hidden: [4, 5] });

    // Then
    expect(settings).toMatchObject({ childId: 3, children: { 4: { shown: false }, 5: { shown: false } } });
  });

  it('keeps the device choices', () => {
    // Given
    const before = { ...DEFAULT_SETTINGS, theme: 'night' as const, haptics: false };

    // When
    const settings = settingsAfterSignIn(before, { childId: 3, hidden: [] });

    // Then
    expect(settings).toEqual({ ...before, childId: 3, children: {} });
  });

  it("keeps every child's preferences when the choice isn't made again (a new key for the rejected one)", () => {
    // Given
    const before = { ...DEFAULT_SETTINGS, childId: 3, children: { 3: { hue: 2 }, 4: { shown: false } } };

    // When
    const settings = settingsAfterSignIn(before, { childId: 3 });

    // Then
    expect(settings).toEqual(before);
  });
});
