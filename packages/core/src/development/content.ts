import { ENTRIES, PAGE_TEXTS } from './entries';
import { checkUps } from './health';
import { type GuidePage, guidePage, pageNeighbours, pageTitles } from './pages';
import { typicalSleep } from './sleep';
import { SOURCES, type SourceId } from './sources';
import {
  type GuideRegion,
  type Regional,
  type Source,
  type SourcedItem,
  type TopicEntry,
  type TopicId,
  TOPICS,
} from './types';

export const GUIDE_DISCLAIMER = 'A rough guide, not medical advice. Every child develops at their own pace.';

export const SOURCES_NOTE = 'Written by Molly from these sources. Check them for the full advice.';

/** The overview and the first-open note: corrected age is out of scope, so say who follows it. */
export function prematureNote(region: GuideRegion): string {
  const ask = region === 'sweden' ? 'Ask BVC' : "Ask your child's doctor or nurse";
  return `Babies born early are often followed from their due date until about 2 years. ${ask} how this applies to your child.`;
}

const NOW_NOTE = 'Many children do these around this age. Missing one on its own is usually nothing to worry about.';

/**
 * How a milestone list is meant, from where its items come from: 1177's and WHO's ages are wide windows,
 * CDC's checklists are things about 3 in 4 children do by that age. A list from both says both.
 */
const FRAMING_NOTES = [
  {
    from: (id: string) => id === '1177-motor-table' || id === 'who-motor' || id.startsWith('1177-development-'),
    note: 'The ages are wide windows: some children get there months before or after others.',
    cdc: false,
  },
  {
    from: (id: string) => id.startsWith('cdc-'),
    note: "From CDC's checklists: things about 3 in 4 children do by around this age.",
    cdc: true,
  },
];

const CDC_EARLY_NOTE = "From CDC's checklists: things about 3 in 4 children do by around this age, or by the age shown.";

/** The age a CDC checklist is for, in months (`cdc-9-months` 9, `cdc-2-years` 24); none for other sources. */
function checklistAge(id: SourceId): number | null {
  const match = /^cdc-(\d+)-(month|year)s?$/.exec(id);
  return match ? Number(match[1]) * (match[2] === 'year' ? 12 : 1) : null;
}

/** A CDC checklist an item comes from that is for an age after the page; none from its checklist age. */
function laterChecklist(item: SourcedItem, page: GuidePage | undefined): SourceId | undefined {
  return page === undefined ? undefined : item.sources.find((id) => (checklistAge(id) ?? 0) > page);
}

/**
 * An entry spans pages, but CDC's 3 in 4 holds at its checklist's age: on a page before it, the item says the
 * age (`Sit without support (by 9 months)`).
 */
function withChecklistAge(item: SourcedItem, page: GuidePage | undefined): SourcedItem {
  const later = laterChecklist(item, page);
  return later ? { ...item, text: `${item.text} (${SOURCES[later].title.replace('Milestones ', '')})` } : item;
}

/** Under Sleep, Feeding and Health, whose lists aren't milestones a child could be missing. */
const OTHER_NOW_NOTE = 'Every child is different, so take this as a rough picture, not a checklist.';

export const MILESTONE_TOPICS: readonly TopicId[] = ['movement', 'talking', 'play', 'feelings'];

const PARENTS_NOW_NOTE = "Many parents feel some of this. You're not alone in it.";

const PHONE_1177 = 'call 1177 (+46 771-11 77 00 from a foreign phone)';

const CONTACTS: Record<GuideRegion, { child: string; parent: string }> = {
  sweden: {
    child: `If you're worried, contact BVC or ${PHONE_1177}. In an emergency, call 112.`,
    parent: `If you're worried about how you feel, talk to BVC, your midwife or your health centre, or ${PHONE_1177}. In an emergency, call 112.`,
  },
  international: {
    child: "If you're worried, contact your child's doctor or nurse. In an emergency, call your local emergency number.",
    parent:
      "If you're worried about how you feel, talk to your doctor, midwife or nurse. In an emergency, call your local emergency number.",
  },
};

export type GuideSource = Source & { id: SourceId };

/** A topic on a page, in one region, ready to show. */
export type TopicContent = {
  topic: TopicId;
  name: string;
  headline: string;
  summary: string;
  intro: string;
  readMinutes: number;
  nowTitle: string;
  now: SourcedItem[];
  /** Under the list: that missing one is usually fine, and how the list is meant. */
  nowNotes: string[];
  tryTogether: string[];
  getHelp: SourcedItem[];
  /** Ends When to get help: who to contact in the region. */
  contact: string;
  sources: GuideSource[];
  disclaimer: string;
};

export function regional<T>(value: Regional<T>, region: GuideRegion): T {
  return isPair(value) ? value[region] : value;
}

function isPair<T>(value: Regional<T>): value is { [R in GuideRegion]: T } {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && 'sweden' in value;
}

/** The entry covering a page for a topic. */
export function entryFor(entries: readonly TopicEntry[], page: GuidePage, topic: TopicId): TopicEntry | null {
  return entries.find((entry) => entry.topic === topic && entry.pages[0] <= page && page <= entry.pages[1]) ?? null;
}

/**
 * `extraSources`: the sources of the topic's personal block (the sleep range, the check-ups), in Read more too.
 * `page`: the page it's shown on, for CDC items from a later checklist.
 */
export function resolveEntry(
  entry: TopicEntry,
  region: GuideRegion,
  extraSources: readonly SourceId[] = [],
  page?: GuidePage,
): TopicContent {
  const parents = entry.topic === 'parents';
  const listed = regional(entry.now, region);
  const now = listed.map((item) => withChecklistAge(item, page));
  const early = listed.some((item) => laterChecklist(item, page));
  const getHelp = regional(entry.getHelp, region);
  const content = {
    topic: entry.topic,
    name: TOPICS.find(({ id }) => id === entry.topic)!.name,
    headline: regional(entry.headline, region),
    summary: regional(entry.summary, region),
    intro: regional(entry.intro, region),
    nowTitle: parents ? 'Many parents around now' : 'Many children around now',
    now,
    nowNotes: parents
      ? [PARENTS_NOW_NOTE]
      : MILESTONE_TOPICS.includes(entry.topic)
        ? [NOW_NOTE, ...framingNotes(now, early)]
        : [OTHER_NOW_NOTE],
    tryTogether: regional(entry.tryTogether, region),
    getHelp,
    contact: CONTACTS[region][parents ? 'parent' : 'child'],
    sources: sourcesFor([...now, ...getHelp].flatMap((item) => item.sources).concat(entry.sources, extraSources), region),
    disclaimer: GUIDE_DISCLAIMER,
  };
  return { ...content, readMinutes: readingMinutes(wordsOf(content)) };
}

/** `early`: some CDC item is from a later checklist, so the note covers the age shown on it. */
function framingNotes(items: readonly SourcedItem[], early: boolean): string[] {
  const ids = items.flatMap((item) => item.sources);
  return FRAMING_NOTES.filter(({ from }) => ids.some(from)).map(({ note, cdc }) => (cdc && early ? CDC_EARLY_NOTE : note));
}

function wordsOf(content: Omit<TopicContent, 'readMinutes'>): string[] {
  return [
    content.headline,
    content.intro,
    ...content.now.map((item) => item.text),
    ...content.nowNotes,
    ...content.tryTogether,
    ...content.getHelp.map((item) => item.text),
    content.contact,
    content.disclaimer,
  ];
}

/** Each source once, the region's own first, otherwise in the order named. */
export function sourcesFor(ids: readonly SourceId[], region: GuideRegion): GuideSource[] {
  const unique = [...new Set(ids)].map((id) => ({ id, ...SOURCES[id] }));
  return [...unique.filter((source) => source.region === region), ...unique.filter((source) => source.region !== region)];
}

const WORDS_PER_MINUTE = 200;

/** Minutes to read some texts, rounded up, at least one. */
export function readingMinutes(texts: readonly string[]): number {
  const words = texts.join(' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

/** A topic on a page in a region; every page has every topic (checked by the content tests). */
export function pageContent(page: GuidePage, topic: TopicId, region: GuideRegion): TopicContent {
  const entry = entryFor(ENTRIES, page, topic);
  if (!entry) throw new Error(`No ${topic} entry for page ${page}`);
  return resolveEntry(entry, region, personalSources(page, topic, region), page);
}

function personalSources(page: GuidePage, topic: TopicId, region: GuideRegion): SourceId[] {
  if (topic === 'sleep') return [typicalSleep(page, region).source];
  if (topic === 'health') return checkUps(page, region).sources;
  return [];
}

/** The overview's rows: each topic's name and line. */
export function pageTopics(page: GuidePage, region: GuideRegion): { id: TopicId; name: string; summary: string }[] {
  return TOPICS.map(({ id, name }) => ({ id, name, summary: regional(entryFor(ENTRIES, page, id)!.summary, region) }));
}

export type PageWords = {
  title: string;
  card: string;
  short: string;
  overview: string;
  oneLiner: string;
  comingUp: { title: string; text: string } | null;
};

export function pageText(page: GuidePage, region: GuideRegion): PageWords {
  const text = PAGE_TEXTS[page];
  if (!text) throw new Error(`No text for page ${page}`);
  const { next } = pageNeighbours(page);
  return {
    ...pageTitles(page),
    overview: regional(text.overview, region),
    oneLiner: text.oneLiner,
    comingUp:
      next !== null && text.comingUp
        ? { title: `Coming up at ${pageTitles(next).title}`, text: regional(text.comingUp, region) }
        : null,
  };
}

/**
 * The child screen's Development card: the child's page and its line, or, past 36 months, that the guide
 * has ended (it still opens, on its last page).
 */
export function guideCard(
  birthDate: string,
  now: Date,
  region: GuideRegion,
): { page: GuidePage; label: string; title: string; line: string; button: string } {
  const page = guidePage(birthDate, now);
  if (page === null) {
    return { page: 36, label: 'Up to 3 years', title: 'The guide ends at 3 years', line: 'You can still look back at every age.', button: 'Look back' };
  }
  const text = pageText(page, region);
  if (page === 0) {
    return { page, label: text.card, title: 'What to expect in the first weeks', line: text.oneLiner, button: 'Read about the first weeks' };
  }
  return { page, label: text.card, title: `What to expect at ${text.title}`, line: text.oneLiner, button: 'Read this month' };
}
