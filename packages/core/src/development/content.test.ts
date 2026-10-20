import { describe, expect, it } from 'vitest';

import { entryFor, prematureNote, readingMinutes, resolveEntry, sourcesFor } from './content';
import type { TopicEntry } from './types';

const entry = (overrides: Partial<TopicEntry> = {}): TopicEntry => ({
  topic: 'movement',
  pages: [4, 5],
  headline: 'Rolling and reaching',
  summary: 'Rolling, reaching',
  intro: 'Babies get stronger.',
  now: [{ text: 'Roll over', sources: ['1177-motor-table'] }],
  tryTogether: ['Floor time'],
  getHelp: [{ text: 'Stops doing something they could do', sources: ['cdc-4-months'] }],
  sources: ['nhs-talk'],
  ...overrides,
});

describe('the entry for a page', () => {
  it('is none when no entry covers the page', () => {
    // When
    const found = entryFor([entry()], 6, 'movement');

    // Then
    expect(found).toBeNull();
  });

  it('is the entry whose pages include it', () => {
    // Given
    const covering = entry({ pages: [4, 6] });

    // When
    const found = entryFor([entry({ pages: [0, 3] }), covering], 5, 'movement');

    // Then
    expect(found).toBe(covering);
  });

  it("is the page's entry for that topic", () => {
    // Given
    const sleep = entry({ topic: 'sleep' });

    // When
    const found = entryFor([entry(), sleep], 5, 'sleep');

    // Then
    expect(found).toBe(sleep);
  });
});

describe('a topic in a region', () => {
  it('takes the shared text as it is', () => {
    // When
    const content = resolveEntry(entry(), 'sweden');

    // Then
    expect(content).toMatchObject({ name: 'Movement', headline: 'Rolling and reaching', tryTogether: ['Floor time'] });
  });

  it("takes the region's variant where the text differs", () => {
    // Given
    const regional = entry({ intro: { sweden: 'Tiny tastes from 4 months.', international: 'Solids around 6 months.' } });

    // When
    const content = resolveEntry(regional, 'international');

    // Then
    expect(content.intro).toBe('Solids around 6 months.');
  });

  it.each([
    ['sweden', "If you're worried, contact BVC or call 1177 (+46 771-11 77 00 from a foreign phone). In an emergency, call 112."],
    ['international', "If you're worried, contact your child's doctor or nurse. In an emergency, call your local emergency number."],
  ] as const)('ends When to get help with the contacts in %s', (region, contact) => {
    // When
    const content = resolveEntry(entry(), region);

    // Then
    expect(content.contact).toBe(contact);
  });

  it("points parents to help for themselves in Parents' corner", () => {
    // When
    const content = resolveEntry(entry({ topic: 'parents' }), 'sweden');

    // Then
    expect(content.contact).toBe(
      "If you're worried about how you feel, talk to BVC, your midwife or your health centre, or call 1177 (+46 771-11 77 00 from a foreign phone). In an emergency, call 112.",
    );
  });

  it('says what the list is and that a missing one is usually nothing to worry about', () => {
    // When
    const content = resolveEntry(entry(), 'sweden');

    // Then
    expect(content).toMatchObject({
      nowTitle: 'Many children around now',
      nowNotes: [
        'Many children do these around this age. Missing one on its own is usually nothing to worry about.',
        'The ages are wide windows: some children get there months before or after others.',
      ],
    });
  });

  it('says a list from CDC is what about 3 in 4 children do by this age', () => {
    // Given
    const fromCdc = entry({ now: [{ text: 'Coo', sources: ['cdc-4-months'] }] });

    // When
    const content = resolveEntry(fromCdc, 'international');

    // Then
    expect(content.nowNotes.slice(1)).toEqual(["From CDC's checklists: things about 3 in 4 children do by around this age."]);
  });

  it('says both when a list comes from wide windows and CDC', () => {
    // Given
    const mixed = entry({
      now: [
        { text: 'Roll over', sources: ['1177-motor-table'] },
        { text: 'Coo', sources: ['cdc-4-months'] },
      ],
    });

    // When
    const content = resolveEntry(mixed, 'sweden');

    // Then
    expect(content.nowNotes).toHaveLength(3);
  });

  it("doesn't call a list that isn't milestones something to miss", () => {
    // When
    const content = resolveEntry(entry({ topic: 'feeding' }), 'sweden');

    // Then
    expect(content.nowNotes).toEqual(['Every child is different, so take this as a rough picture, not a checklist.']);
  });

  it("talks about parents in Parents' corner", () => {
    // When
    const content = resolveEntry(entry({ topic: 'parents' }), 'sweden');

    // Then
    expect(content).toMatchObject({
      nowTitle: 'Many parents around now',
      nowNotes: ["Many parents feel some of this. You're not alone in it."],
    });
  });

  it('carries the disclaimer', () => {
    // When
    const content = resolveEntry(entry(), 'international');

    // Then
    expect(content.disclaimer).toBe('A rough guide, not medical advice. Every child develops at their own pace.');
  });

  it("lists every source once, the items' and the entry's, the region's own first", () => {
    // When
    const content = resolveEntry(entry(), 'sweden');

    // Then
    expect(content.sources.map(({ id }) => id)).toEqual(['1177-motor-table', 'cdc-4-months', 'nhs-talk']);
  });
});

describe('the sources in a region', () => {
  it("puts the region's own first and keeps the order within each", () => {
    // When
    const sources = sourcesFor(['nhs-talk', '1177-motor-table', 'cdc-4-months', '1177-development-0-6'], 'sweden');

    // Then
    expect(sources.map(({ id }) => id)).toEqual(['1177-motor-table', '1177-development-0-6', 'nhs-talk', 'cdc-4-months']);
  });

  it('puts the international ones first for International', () => {
    // When
    const sources = sourcesFor(['1177-motor-table', 'nhs-talk'], 'international');

    // Then
    expect(sources.map(({ id }) => id)).toEqual(['nhs-talk', '1177-motor-table']);
  });

  it('lists a source named twice once', () => {
    // When
    const sources = sourcesFor(['nhs-talk', 'nhs-talk'], 'international');

    // Then
    expect(sources).toHaveLength(1);
  });
});

describe('the reading time', () => {
  it('is at least a minute', () => {
    // When
    const minutes = readingMinutes(['A few words.']);

    // Then
    expect(minutes).toBe(1);
  });

  it('is the words at 200 a minute, rounded up', () => {
    // Given
    const texts = [Array(250).fill('word').join(' '), Array(160).fill('word').join(' ')];

    // When
    const minutes = readingMinutes(texts);

    // Then
    expect(minutes).toBe(3);
  });
});

describe('the note on babies born early', () => {
  it.each([
    ['sweden', 'Babies born early are often followed from their due date until about 2 years. Ask BVC how this applies to your child.'],
    [
      'international',
      "Babies born early are often followed from their due date until about 2 years. Ask your child's doctor or nurse how this applies to your child.",
    ],
  ] as const)('points to who to ask in %s', (region, note) => {
    // When
    const text = prematureNote(region);

    // Then
    expect(text).toBe(note);
  });
});

describe('a CDC item on a page before its checklist age', () => {
  const early = entry({ pages: [8, 9], now: [{ text: 'Sit without support', sources: ['cdc-9-months'] }] });

  it('says the age it comes from', () => {
    // When
    const content = resolveEntry(early, 'international', [], 8);

    // Then
    expect(content.now[0]?.text).toBe('Sit without support (by 9 months)');
  });

  it('says the framing covers the age shown', () => {
    // When
    const content = resolveEntry(early, 'international', [], 8);

    // Then
    expect(content.nowNotes[1]).toBe("From CDC's checklists: things about 3 in 4 children do by around this age, or by the age shown.");
  });

  it('stays as it is from its checklist age', () => {
    // When
    const content = resolveEntry(early, 'international', [], 9);

    // Then
    expect(content.now[0]?.text).toBe('Sit without support');
  });
});
