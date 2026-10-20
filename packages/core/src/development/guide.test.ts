import { describe, expect, it } from 'vitest';

import { GUIDE_DISCLAIMER, guideCard, MILESTONE_TOPICS, pageContent, pageText, pageTopics, regional, resolveEntry } from './content';
import { ENTRIES, PAGE_TEXTS } from './entries';
import { checkUps } from './health';
import { GUIDE_PAGES, type GuidePage } from './pages';
import { typicalSleep } from './sleep';
import { SOURCES, type SourceId } from './sources';
import { GUIDE_REGIONS, type Regional, type SourcedItem, TOPICS } from './types';

/** The pages written so far; all of them once the content steps are done. */
const WRITTEN: readonly GuidePage[] = GUIDE_PAGES;

const ALLOWED_HOSTS = [
  '1177.se',
  'rikshandboken-bhv.se',
  'folkhalsomyndigheten.se',
  'livsmedelsverket.se',
  'who.int',
  'cdc.gov',
  'nhs.uk',
  'healthychildren.org',
  'pmc.ncbi.nlm.nih.gov',
  'thensf.org',
];

/** Swedish sites, except their English pages under `/en/`. */
const isSwedishPage = (url: URL) =>
  ['1177.se', 'rikshandboken-bhv.se', 'folkhalsomyndigheten.se', 'livsmedelsverket.se'].some((host) =>
    url.hostname.endsWith(host),
  ) && !/^\/(?:[^/]+\/)?en\//.test(url.pathname);

const bothRegions = <T>(value: Regional<T>) => GUIDE_REGIONS.map((region) => regional(value, region));

const everyText = (): string[] => [
  ...ENTRIES.flatMap((entry) =>
    [
      bothRegions(entry.headline),
      bothRegions(entry.summary),
      bothRegions(entry.intro),
      bothRegions(entry.tryTogether).flat(),
      bothRegions<SourcedItem[]>(entry.now).flat().map((item) => item.text),
      bothRegions<SourcedItem[]>(entry.getHelp).flat().map((item) => item.text),
    ].flat(),
  ),
  ...Object.values(PAGE_TEXTS).flatMap((text) => [
    ...bothRegions(text.overview),
    text.oneLiner,
    ...(text.comingUp ? bothRegions(text.comingUp) : []),
  ]),
  ...WRITTEN.flatMap((page) =>
    GUIDE_REGIONS.flatMap((region) =>
      TOPICS.flatMap(({ id }) => {
        const content = pageContent(page, id, region);
        return [...content.nowNotes, content.contact, content.disclaimer];
      }),
    ),
  ),
];

describe('the guide content', () => {
  it.each(WRITTEN)('has exactly one entry for every topic on page %s', (page) => {
    // When
    const counts = TOPICS.map(({ id }) => ENTRIES.filter((entry) => entry.topic === id && entry.pages[0] <= page && page <= entry.pages[1]).length);

    // Then
    expect(counts).toEqual(TOPICS.map(() => 1));
  });

  it('starts and ends every entry on a page, in order', () => {
    // When
    const bad = ENTRIES.filter(({ pages: [from, to] }) => !GUIDE_PAGES.includes(from) || !GUIDE_PAGES.includes(to) || from > to);

    // Then
    expect(bad).toEqual([]);
  });

  it('fills every part of every entry in both regions', () => {
    // When
    const empty = ENTRIES.flatMap((entry) =>
      GUIDE_REGIONS.flatMap((region) => {
        const parts = {
          headline: regional(entry.headline, region),
          summary: regional(entry.summary, region),
          intro: regional(entry.intro, region),
          now: regional(entry.now, region),
          tryTogether: regional(entry.tryTogether, region),
          getHelp: regional(entry.getHelp, region),
          sources: resolveEntry(entry, region).sources,
        };
        return Object.entries(parts)
          .filter(([, value]) => value.length === 0)
          .map(([part]) => `${entry.topic} ${entry.pages.join('–')} ${region}: ${part}`);
      }),
    );

    // Then
    expect(empty).toEqual([]);
  });

  it('names a source for every item', () => {
    // When
    const unsourced = ENTRIES.flatMap((entry) =>
      [...bothRegions<SourcedItem[]>(entry.now), ...bothRegions<SourcedItem[]>(entry.getHelp)]
        .flat()
        .filter((item) => item.sources.length === 0)
        .map((item) => item.text),
    );

    // Then
    expect(unsourced).toEqual([]);
  });

  it('says how every milestone list is meant: from wide windows or CDC', () => {
    // When
    const unframed = ENTRIES.filter((entry) => MILESTONE_TOPICS.includes(entry.topic)).filter((entry) =>
      GUIDE_REGIONS.some((region) => resolveEntry(entry, region).nowNotes.length < 2),
    );

    // Then
    expect(unframed.map((entry) => `${entry.topic} ${entry.pages.join('–')}`)).toEqual([]);
  });

  it("shares every part of the milestone topics and Parents' corner between regions", () => {
    // Given
    const shared = [...MILESTONE_TOPICS, 'parents'];

    // When
    const split = ENTRIES.filter((entry) => shared.includes(entry.topic)).filter((entry) =>
      [entry.headline, entry.summary, entry.intro, entry.now, entry.tryTogether, entry.getHelp].some(
        (part) => typeof part === 'object' && !Array.isArray(part),
      ),
    );

    // Then
    expect(split.map((entry) => `${entry.topic} ${entry.pages.join('–')}`)).toEqual([]);
  });

  it.each(WRITTEN)('has the words of page %s', (page) => {
    // When
    const text = PAGE_TEXTS[page];

    // Then
    expect(text).toMatchObject({ overview: expect.anything(), oneLiner: expect.any(String) });
    expect(text?.comingUp === null).toBe(page === 36);
  });

  it('says how urgent every sign from an emergency source is', () => {
    // Given
    const emergencySources = ['nhs-urgent', '1177-breathing', '1177-colic'];

    // When
    const vague = ENTRIES.flatMap((entry) => bothRegions<SourcedItem[]>(entry.getHelp).flat())
      .filter((item) => item.sources.some((id) => emergencySources.includes(id)))
      .filter((item) => !/emergency|urgent|straight away|112/.test(item.text))
      .map((item) => item.text);

    // Then
    expect(vague).toEqual([]);
  });

  it("uses the app's straight quotes and apostrophes", () => {
    // When
    const curly = everyText().filter((text) => /[\u2018\u2019\u201C\u201D]/.test(text));

    // Then
    expect(curly).toEqual([]);
  });

  it('never says should or normal child, and has no exclamation marks', () => {
    // When
    const bad = everyText().filter((text) => /\bshould\b|normal child|!/i.test(text));

    // Then
    expect(bad).toEqual([]);
  });
});

describe('the sources', () => {
  const used = new Set<SourceId>([
    ...WRITTEN.flatMap((page) =>
      GUIDE_REGIONS.flatMap((region) => TOPICS.flatMap(({ id }) => pageContent(page, id, region).sources.map((source) => source.id))),
    ),
    ...GUIDE_PAGES.flatMap((page) =>
      GUIDE_REGIONS.flatMap((region) => [typicalSleep(page, region).source, ...checkUps(page, region).sources]),
    ),
  ]);

  it('are all used', () => {
    // When
    const unused = Object.keys(SOURCES).filter((id) => !used.has(id as SourceId));

    // Then
    expect(unused).toEqual([]);
  });

  it('are https pages on official health sites', () => {
    // When
    const bad = Object.values(SOURCES).filter(({ url }) => {
      const parsed = new URL(url);
      return parsed.protocol !== 'https:' || !ALLOWED_HOSTS.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`));
    });

    // Then
    expect(bad).toEqual([]);
  });

  it('mark Swedish pages as Swedish and the rest as English', () => {
    // When
    const bad = Object.entries(SOURCES).filter(([, source]) => (source.language === 'sv') !== isSwedishPage(new URL(source.url)));

    // Then
    expect(bad.map(([id]) => id)).toEqual([]);
  });

  it("are Sweden's when they are Swedish sites", () => {
    // When
    const bad = Object.entries(SOURCES).filter(
      ([, source]) => (source.region === 'sweden') !== /(^|\.)(1177|rikshandboken-bhv|folkhalsomyndigheten|livsmedelsverket)\.se$/.test(new URL(source.url).hostname),
    );

    // Then
    expect(bad.map(([id]) => id)).toEqual([]);
  });
});

describe('a page in a region', () => {
  it.each(WRITTEN.flatMap((page) => GUIDE_REGIONS.map((region) => [page, region] as const)))(
    "gives every topic on page %s in %s the disclaimer and the region's contacts",
    (page, region) => {
      // When
      const contents = TOPICS.map(({ id }) => pageContent(page, id, region));

      // Then
      const contacts = region === 'sweden' ? [/BVC/, /1177/, /112/] : [/doctor|nurse/, /local emergency number/];
      for (const content of contents) {
        expect(content.disclaimer).toBe(GUIDE_DISCLAIMER);
        for (const contact of contacts) expect(content.contact).toMatch(contact);
      }
    },
  );

  it.each(WRITTEN.flatMap((page) => GUIDE_REGIONS.map((region) => [page, region] as const)))(
    "lists page %s's Read more with %s's own sources first",
    (page, region) => {
      // When
      const orders = TOPICS.map(({ id }) => pageContent(page, id, region).sources.map((source) => source.region === region));

      // Then
      for (const order of orders) expect(order).toEqual([...order].sort((a, b) => Number(b) - Number(a)));
    },
  );

  it('gives the page title, intro and the next page in Coming up', () => {
    // When
    const text = pageText(5, 'sweden');

    // Then
    expect(text).toMatchObject({ title: '5 months', card: 'Month 5', comingUp: { title: 'Coming up at 6 months' } });
  });

  it('lists the 8 topics with their lines, in order', () => {
    // When
    const topics = pageTopics(5, 'international');

    // Then
    expect(topics.map(({ name }) => name)).toEqual(TOPICS.map(({ name }) => name));
  });
});

describe('spot checks against the sources', () => {
  const feeding = (page: GuidePage, region: 'sweden' | 'international') => {
    const content = pageContent(page, 'feeding', region);
    return [content.intro, ...content.now.map((item) => item.text), ...content.tryTogether].join(' ');
  };

  it('has Sweden allow tiny tastes from 4 months at the earliest', () => {
    // When
    const text = feeding(4, 'sweden');

    // Then
    expect(text).toMatch(/tiny tastes from 4 months at the earliest/);
  });

  it('starts taste portions at about 6 months in Sweden and solid food around 6 months elsewhere', () => {
    // When
    const texts = [feeding(6, 'sweden'), feeding(5, 'international'), feeding(6, 'international')];

    // Then
    expect(texts[0]).toMatch(/about 6 months babies start on taste portions/);
    expect(texts[1]).toMatch(/solid food at around 6 months/);
    expect(texts[2]).toMatch(/Around 6 months/);
  });

  it.each(GUIDE_REGIONS)('says no honey before 1 year in %s once food starts', (region) => {
    // When
    const texts = ([6, 8] as const).map((page) => feeding(page, region));

    // Then
    for (const text of texts) expect(text).toMatch(/[Nn]o honey/);
  });

  it('says no rice drinks before 6 in Sweden', () => {
    // When
    const texts = ([6, 12, 24] as const).map((page) => feeding(page, 'sweden'));

    // Then
    for (const text of texts) expect(text).toMatch(/No rice drinks before 6 years/);
  });

  it('says vitamin D drops go on until 2 in Sweden', () => {
    // When
    const health = pageContent(24, 'health', 'sweden');

    // Then
    expect(health.now.map((item) => item.text)).toContain('Keep getting vitamin D drops every day until 2; some need them for longer');
  });

  it("puts every movement window around every page it's on", () => {
    // Given
    const windowed = ENTRIES.filter((entry) => entry.topic === 'movement').flatMap((entry) =>
      bothRegions<SourcedItem[]>(entry.now)
        .flat()
        .map((item) => ({ entry, match: item.text.match(/from (?:about )?(\d+) to (\d+) months/) }))
        .filter(({ match }) => match),
    );

    // When
    const outside = windowed.filter(({ entry, match }) => {
      const [from, to] = [Number(match![1]), Number(match![2])];
      return GUIDE_PAGES.filter((page) => entry.pages[0] <= page && page <= entry.pages[1]).some((page) => page < from || page > to);
    });

    // Then
    expect(windowed.length).toBeGreaterThan(10);
    expect(outside.map(({ entry, match }) => `${entry.pages.join('–')}: ${match![0]}`)).toEqual([]);
  });

  it('only uses a CDC checklist on entries that include or follow its age', () => {
    // Given
    const age: Record<string, number> = {
      'cdc-2-months': 2,
      'cdc-4-months': 4,
      'cdc-6-months': 6,
      'cdc-9-months': 9,
      'cdc-1-year': 12,
      'cdc-15-months': 15,
      'cdc-18-months': 18,
      'cdc-2-years': 24,
      'cdc-30-months': 30,
      'cdc-3-years': 36,
    };

    // When
    const early = ENTRIES.filter((entry) => MILESTONE_TOPICS.includes(entry.topic)).flatMap((entry) =>
      bothRegions<SourcedItem[]>(entry.now)
        .flat()
        .flatMap((item) => item.sources)
        .filter((id) => id in age && age[id]! > entry.pages[1])
        .map((id) => `${entry.topic} ${entry.pages.join('–')}: ${id}`),
    );

    // Then
    expect(early).toEqual([]);
  });
});

describe("the child screen's Development card", () => {
  const on = (year: number, month: number, day: number) => new Date(year, month - 1, day, 12);

  it("opens on the child's page with its line", () => {
    // When
    const card = guideCard('2026-04-20', on(2026, 10, 12), 'sweden');

    // Then
    expect(card).toEqual({
      page: 5,
      label: 'Month 5',
      title: 'What to expect at 5 months',
      line: 'Rolling and babbling',
      button: 'Read this month',
    });
  });

  it('talks about the first weeks for a newborn', () => {
    // When
    const card = guideCard('2026-10-01', on(2026, 10, 12), 'sweden');

    // Then
    expect(card).toMatchObject({ page: 0, label: 'Newborn', title: 'What to expect in the first weeks', button: 'Read about the first weeks' });
  });

  it('says the guide ends at 3 years, and opens on its last page, past 36 months', () => {
    // When
    const card = guideCard('2023-01-10', on(2026, 10, 12), 'international');

    // Then
    expect(card).toEqual({
      page: 36,
      label: 'Up to 3 years',
      title: 'The guide ends at 3 years',
      line: 'You can still look back at every age.',
      button: 'Look back',
    });
  });
});
