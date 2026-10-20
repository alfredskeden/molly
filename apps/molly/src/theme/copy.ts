// The labels a theme renames (the design "Molly Themed App", its COPY table), mapped onto the app's
// real labels. Plain data, no React: the widget's task handler reads it too. Screen-reader labels, History,
// Help, onboarding and errors never use it: they stay plain in every theme.

import type { ThemeKey } from './themes';

export type Copy = {
  /** The header when the child has no name. */
  appName: string;
  /** The hero while awake. */
  awake: string;
  /** The hero while a feed runs. */
  feeding: string;
  stopAs: string;
  /** The Feed picker's title when a tap saves the feed at once (Time feeds off, plans/implan-instant-feeds). */
  feedAs: string;
  cancelFeed: string;
  /** The hero while a sleep runs. */
  sleeping: string;
  stopSleep: string;
  cancelSleep: string;
  /** The Feed tile while a feed runs. */
  stopFeed: string;
  /** Tile titles, also the trackers' names in toasts ("Sleep saved") and on widgets. */
  sleep: string;
  feed: string;
  /** The feed tracker named on its own: "Feeding started 09:14", the widget's title. */
  feedNoun: string;
  diaper: string;
  med: string;
  startSleep: string;
  startFeed: string;
  /** The diaper buttons. */
  wet: string;
  dirty: string;
  both: string;
  /** The Settings screen's title and the header link to it. */
  settings: string;
  /**
   * The likely-sleep panel (plans/implan-nap-detail). `{n}` is the nap's number, `{t}` the window's start
   * clock; times, lengths and the disclaimer are never themed. Null: nothing shown there.
   */
  likelyNap: string;
  likelyBedtime: string;
  /** Before the panel's `12:56 – 13:26`. */
  likelyRangeLead: string | null;
  likelyYesterday: string;
  likelyUsually: string;
  /** Before a past nap's length. */
  likelyLengthLead: string | null;
  /** Over the later sleeps; without one, the first later sleep reads `Then nap 3`. */
  likelyLaterHeading: string | null;
  likelyLaterNap: string;
  likelyLaterBedtime: string;
  /** The reminder bell's words, off and set; null: the bell is an icon alone. */
  likelyBellOff: string | null;
  likelyBellOn: string | null;
  likelySkip: string;
  likelyWhy: string;
  /** The child screen's Measurements card title, and each measurement's name on its row and its screen (plans/implan-measurements). */
  measurements: string;
  measureWeight: string;
  measureHeight: string;
  measureHead: string;
  measureTemperature: string;
  measureBmi: string;
  /** The Development card's label on the child screen and its first-open note (plans/implan-development). */
  development: string;
  /** The guide's All ages button and screen title. The guide's own text is never themed. */
  allAges: string;
};

const classic: Copy = {
  appName: 'Molly',
  awake: 'Awake',
  feeding: 'Feeding',
  stopAs: 'Stop and save as',
  feedAs: 'Save feed as',
  cancelFeed: 'Cancel feed',
  sleeping: 'Sleeping',
  stopSleep: 'Stop sleep',
  cancelSleep: 'Cancel sleep',
  stopFeed: 'Stop feed',
  sleep: 'Sleep',
  feed: 'Feed',
  feedNoun: 'Feeding',
  diaper: 'Diaper',
  med: 'Medicine',
  startSleep: 'Start sleep',
  startFeed: 'Start feeding',
  wet: 'Wet',
  dirty: 'Dirty',
  both: 'Both',
  settings: 'Settings',
  likelyNap: 'Nap {n} likely',
  likelyBedtime: 'Bedtime likely',
  likelyRangeLead: null,
  likelyYesterday: 'Yesterday',
  likelyUsually: 'Usually',
  likelyLengthLead: null,
  likelyLaterHeading: null,
  likelyLaterNap: 'Nap {n}',
  likelyLaterBedtime: 'Bedtime',
  likelyBellOff: null,
  likelyBellOn: null,
  likelySkip: 'Skip',
  likelyWhy: 'Why ›',
  measurements: 'Measurements',
  measureWeight: 'Weight',
  measureHeight: 'Height',
  measureHead: 'Head circumference',
  measureTemperature: 'Temperature',
  measureBmi: 'BMI',
  development: 'Development',
  allAges: 'All ages',
};

const arcade: Copy = {
  appName: 'MOLLY',
  awake: 'Player 1 awake',
  feeding: 'Powering up',
  stopAs: 'Save power-up as',
  feedAs: 'Power-up with',
  cancelFeed: 'Quit power-up',
  sleeping: 'Game paused',
  stopSleep: 'Continue? Wake up',
  cancelSleep: 'Undo pause',
  stopFeed: 'Power down',
  sleep: 'Save point',
  feed: 'Power-up',
  feedNoun: 'Power-up',
  diaper: 'Respawn',
  med: 'Potion',
  startSleep: 'Pause game',
  startFeed: 'Power up',
  wet: 'Wet',
  dirty: 'Dirty',
  both: 'Combo',
  settings: 'Options',
  likelyNap: 'Save point {n} ahead',
  likelyBedtime: 'Final save ahead',
  likelyRangeLead: null,
  likelyYesterday: 'Last round',
  likelyUsually: 'Usual run',
  likelyLengthLead: null,
  likelyLaterHeading: 'Next levels',
  likelyLaterNap: 'Save point {n}',
  likelyLaterBedtime: 'Final save',
  likelyBellOff: 'Alarm {t}',
  likelyBellOn: 'Alarm on {t}',
  likelySkip: 'Skip level',
  likelyWhy: 'Hint ›',
  measurements: 'Player stats',
  measureWeight: 'Weight class',
  measureHeight: 'Height',
  measureHead: 'Helmet size',
  measureTemperature: 'Heat meter',
  measureBmi: 'BMI score',
  development: 'Level guide',
  allAges: 'All levels',
};

const space: Copy = {
  appName: 'Molly Mission',
  awake: 'Mission time',
  feeding: 'Refuelling',
  stopAs: 'Dock and log as',
  feedAs: 'Refuel with',
  cancelFeed: 'Abort refuel',
  sleeping: 'Hypersleep',
  stopSleep: 'Wake the crew',
  cancelSleep: 'Abort hypersleep',
  stopFeed: 'End refuel',
  sleep: 'Hypersleep',
  feed: 'Refuel',
  feedNoun: 'Refuel',
  diaper: 'Airlock',
  med: 'Med bay',
  startSleep: 'Launch sleep',
  startFeed: 'Start refuel',
  wet: 'Wet',
  dirty: 'Dirty',
  both: 'Both',
  settings: 'Controls',
  likelyNap: 'Hypersleep {n} on approach',
  likelyBedtime: 'Night dock on approach',
  likelyRangeLead: 'window',
  likelyYesterday: 'Last mission',
  likelyUsually: 'Usual orbit',
  likelyLengthLead: null,
  likelyLaterHeading: 'Upcoming burns',
  likelyLaterNap: 'Hypersleep {n}',
  likelyLaterBedtime: 'Night dock',
  likelyBellOff: 'Comms at {t}',
  likelyBellOn: 'Comms set {t}',
  likelySkip: 'Scrub',
  likelyWhy: 'Flight data ›',
  measurements: 'Crew vitals',
  measureWeight: 'Payload mass',
  measureHeight: 'Hull height',
  measureHead: 'Helmet size',
  measureTemperature: 'Core temp',
  measureBmi: 'BMI',
  development: 'Mission briefing',
  allAges: 'All missions',
};

const score: Copy = {
  appName: 'Molly FC',
  awake: 'Time on the pitch',
  feeding: 'Water break',
  stopAs: 'Final score',
  feedAs: 'Water break with',
  cancelFeed: 'Call it off',
  sleeping: 'Time-out',
  stopSleep: 'Back in play',
  cancelSleep: 'Overturn time-out',
  stopFeed: 'End break',
  sleep: 'Time-out',
  feed: 'Water break',
  feedNoun: 'Water break',
  diaper: 'Kit change',
  med: 'Physio',
  startSleep: 'Call time-out',
  startFeed: 'Start break',
  wet: 'Wet',
  dirty: 'Dirty',
  both: 'Double',
  settings: 'Tactics',
  likelyNap: 'Time-out {n} expected',
  likelyBedtime: 'Full time expected',
  likelyRangeLead: null,
  likelyYesterday: 'Last match',
  likelyUsually: 'Season usual',
  likelyLengthLead: null,
  likelyLaterHeading: 'Later fixtures',
  likelyLaterNap: 'Time-out {n}',
  likelyLaterBedtime: 'Full time',
  likelyBellOff: 'Whistle at {t}',
  likelyBellOn: 'Whistle set {t}',
  likelySkip: 'Play on',
  likelyWhy: 'Stats ›',
  measurements: 'Fitness test',
  measureWeight: 'Match weight',
  measureHeight: 'Height',
  measureHead: 'Head size',
  measureTemperature: 'Temperature',
  measureBmi: 'BMI',
  development: 'Season guide',
  allAges: 'All seasons',
};

const term: Copy = {
  appName: 'molly@home',
  awake: 'uptime',
  feeding: 'feed() running',
  stopAs: 'exit with',
  feedAs: 'feed --side',
  cancelFeed: '^C cancel',
  sleeping: 'sleep() running',
  stopSleep: 'wake --now',
  cancelSleep: '^C cancel',
  stopFeed: 'kill feed',
  sleep: 'sleep',
  feed: 'feed',
  feedNoun: 'feed',
  diaper: 'diaper',
  med: 'sudo meds',
  startSleep: 'run sleep',
  startFeed: 'run feed',
  wet: '--wet',
  dirty: '--dirty',
  both: '--both',
  settings: 'config',
  likelyNap: '$ inspect nap_{n}',
  likelyBedtime: '$ inspect bedtime',
  likelyRangeLead: 'eta',
  likelyYesterday: 'yesterday',
  likelyUsually: 'median',
  likelyLengthLead: 'ran',
  likelyLaterHeading: '> queued for later',
  likelyLaterNap: 'nap_{n}',
  likelyLaterBedtime: 'shutdown (bedtime)',
  likelyBellOff: 'ping {t}',
  likelyBellOn: 'ping set {t}',
  likelySkip: 'skip',
  likelyWhy: 'man nap ›',
  measurements: 'stats --all',
  measureWeight: 'weight',
  measureHeight: 'height',
  measureHead: 'head_circ',
  measureTemperature: 'temp',
  measureBmi: 'bmi',
  development: 'guide --age',
  allAges: 'ls --all',
};

const safari: Copy = {
  appName: 'Molly Safari',
  awake: 'Out exploring',
  feeding: 'Munching',
  stopAs: 'Which side?',
  feedAs: 'Which side?',
  cancelFeed: 'Oops, cancel',
  sleeping: 'Lion nap',
  stopSleep: 'Roar, awake!',
  cancelSleep: 'Oops, cancel',
  stopFeed: 'All munched',
  sleep: 'Lion nap',
  feed: 'Munch',
  feedNoun: 'Munch',
  diaper: 'Nappy',
  med: 'Medicine',
  startSleep: 'Nap time',
  startFeed: 'Munch time',
  wet: 'Wee',
  dirty: 'Poo',
  both: 'Both',
  settings: 'Settings',
  likelyNap: 'Lion nap {n} coming up',
  likelyBedtime: 'Den time coming up',
  likelyRangeLead: null,
  likelyYesterday: 'Yesterday',
  likelyUsually: 'Most days',
  likelyLengthLead: null,
  likelyLaterHeading: 'Further down the trail',
  likelyLaterNap: 'Lion nap {n}',
  likelyLaterBedtime: 'Den time',
  likelyBellOff: 'Roar at {t}',
  likelyBellOn: 'Roar set {t}',
  likelySkip: 'Keep exploring',
  likelyWhy: 'Tracks ›',
  measurements: 'Growing up',
  measureWeight: 'Elephant weigh-in',
  measureHeight: 'Giraffe height',
  measureHead: 'Head size',
  measureTemperature: 'Temperature',
  measureBmi: 'BMI',
  development: 'Field guide',
  allAges: 'All ages',
};

// Ribbon: the design shows mostly plain words (Awake, Feeding, Stop and save as, the tiles, Start sleep) and
// two of its own: `Sweet dreams` while asleep and `Wake up` on the running Sleep tile. The rest is drafted in
// that soft, bedside voice (plans/implan-ribbon-theme); wording not yet reviewed.
const ribbon: Copy = {
  appName: 'Molly',
  awake: 'Awake',
  feeding: 'Feeding',
  stopAs: 'Stop and save as',
  feedAs: 'Save feed as',
  cancelFeed: 'Cancel feed',
  sleeping: 'Sweet dreams',
  stopSleep: 'Wake up',
  cancelSleep: 'Still awake',
  stopFeed: 'Tummy full',
  sleep: 'Sleep',
  feed: 'Feed',
  feedNoun: 'Feeding',
  diaper: 'Diaper',
  med: 'Medicine',
  startSleep: 'Start sleep',
  startFeed: 'Cuddle feed',
  wet: 'Wet',
  dirty: 'Dirty',
  both: 'Both',
  settings: 'Settings',
  likelyNap: 'Nap {n} likely',
  likelyBedtime: 'Bedtime likely',
  likelyRangeLead: null,
  likelyYesterday: 'Yesterday',
  likelyUsually: 'Most days',
  likelyLengthLead: null,
  likelyLaterHeading: 'Later today',
  likelyLaterNap: 'Nap {n}',
  likelyLaterBedtime: 'Bedtime',
  likelyBellOff: 'Nudge me at {t}',
  likelyBellOn: 'Nudge set for {t}',
  likelySkip: 'Skip this one',
  likelyWhy: 'How we guess ›',
  measurements: 'Growing bigger',
  measureWeight: 'Weight',
  measureHeight: 'Height',
  measureHead: 'Head size',
  measureTemperature: 'Temperature',
  measureBmi: 'BMI',
  development: 'Little steps',
  allAges: 'Every age',
};

// Life Sim: the design gives `Up and about`, `Refuelling`, `Recharging`, `Wake up`, `Stop and save as` and
// `Cancel feed`, plain tile names and diaper buttons; the rest is drafted in its game-HUD voice
// (plans/implan-life-sim-theme); wording not yet reviewed. Need levels, moods and moodlets are in `sim-words.ts`.
const sim: Copy = {
  appName: 'Molly',
  awake: 'Up and about',
  feeding: 'Refuelling',
  stopAs: 'Stop and save as',
  feedAs: 'Feed with',
  cancelFeed: 'Cancel feed',
  sleeping: 'Recharging',
  stopSleep: 'Wake up',
  cancelSleep: 'Cancel sleep',
  stopFeed: 'Full up',
  sleep: 'Sleep',
  feed: 'Feed',
  feedNoun: 'Feeding',
  diaper: 'Diaper',
  med: 'Medicine',
  startSleep: 'Recharge',
  startFeed: 'Refuel',
  wet: 'Wet',
  dirty: 'Dirty',
  both: 'Both',
  settings: 'Settings',
  likelyNap: 'Nap {n} likely',
  likelyBedtime: 'Bedtime likely',
  likelyRangeLead: null,
  likelyYesterday: 'Yesterday',
  likelyUsually: 'Usually',
  likelyLengthLead: null,
  likelyLaterHeading: 'Coming up',
  likelyLaterNap: 'Nap {n}',
  likelyLaterBedtime: 'Bedtime',
  likelyBellOff: 'Remind me {t}',
  likelyBellOn: 'Reminder {t}',
  likelySkip: 'Skip',
  likelyWhy: 'Why ›',
  measurements: 'Stats',
  measureWeight: 'Weight',
  measureHeight: 'Height',
  measureHead: 'Head size',
  measureTemperature: 'Temperature',
  measureBmi: 'BMI',
  development: 'Skill tree',
  allAges: 'All ages',
};

export const COPY: Record<ThemeKey, Copy> = { classic, ribbon, sim, arcade, space, score, term, safari };

/** The plain labels: Classic's, which every theme shows with Playful labels off. */
export const PLAIN = classic;

export const copyFor = (look: ThemeKey, playful: boolean): Copy => (playful ? COPY[look] : PLAIN);

/** A panel label with its nap number (`{n}`) and window start (`{t}`) filled in. */
export const fill = (label: string, values: { n?: number; t?: string }): string =>
  label.replace('{n}', String(values.n ?? '')).replace('{t}', values.t ?? '');

/** A screen-reader label for a themed label: the plain words, or nothing when they're what's shown. */
export const spoken = (shown: string, plain: string): string | undefined => (shown === plain ? undefined : plain);
