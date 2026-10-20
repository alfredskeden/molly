import type { GuidePage } from './pages';
import type { SourceId } from './sources';

/** Whose advice the guide follows where countries differ. Adding one means adding its variant to every pair. */
export type GuideRegion = 'sweden' | 'international';

export const GUIDE_REGIONS: readonly GuideRegion[] = ['sweden', 'international'];

/** The same for every region, or one per region. */
export type Regional<T> = T | { [R in GuideRegion]: T };

export type TopicId = 'movement' | 'talking' | 'sleep' | 'feeding' | 'play' | 'feelings' | 'health' | 'parents';

/** Every page has every topic, in this order. */
export const TOPICS: readonly { id: TopicId; name: string }[] = [
  { id: 'movement', name: 'Movement' },
  { id: 'talking', name: 'Sounds and talking' },
  { id: 'sleep', name: 'Sleep' },
  { id: 'feeding', name: 'Feeding' },
  { id: 'play', name: 'Play and senses' },
  { id: 'feelings', name: 'Feelings and social' },
  { id: 'health', name: 'Health' },
  { id: 'parents', name: "Parents' corner" },
];

export type SourceLanguage = 'en' | 'sv';

export type Source = { publisher: string; title: string; url: string; language: SourceLanguage; region: GuideRegion };

/** A claim and the sources it comes from. */
export type SourcedItem = { text: string; sources: SourceId[] };

/** One topic's text for a run of pages, from `pages[0]` to `pages[1]`, both included. */
export type TopicEntry = {
  topic: TopicId;
  pages: [GuidePage, GuidePage];
  /** The topic screen's title. */
  headline: Regional<string>;
  /** The overview row's line. */
  summary: Regional<string>;
  intro: Regional<string>;
  now: Regional<SourcedItem[]>;
  tryTogether: Regional<string[]>;
  getHelp: Regional<SourcedItem[]>;
  /** Read more, besides the items' own sources. */
  sources: SourceId[];
};

/** A page's own words. */
export type PageText = {
  /** The overview's intro line. */
  overview: Regional<string>;
  /** All ages' line. */
  oneLiner: string;
  /** The "Coming up at …" card, about the next page; none on the last. */
  comingUp: Regional<string> | null;
};
