// Baby Buddy REST shapes (v2.11). Timestamps are ISO 8601 strings: send them with an offset;
// Baby Buddy returns them in UTC.

import type { DIAPER_COLORS, FEEDING_METHODS, FEEDING_TYPES } from './enums';

/** `GET /api/profile` (no trailing slash). */
export type Profile = {
  user: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    is_staff: boolean;
  };
  language: string;
  timezone: string;
  api_key: string;
};

export type Page<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type Child = {
  id: number;
  first_name: string;
  last_name: string;
  birth_date: string;
  birth_time: string | null;
  slug: string;
  picture: string | null;
};

export type Timer = {
  id: number;
  child: number;
  name: string | null;
  start: string;
  duration: string;
  user: number;
};

export type TimerRef = { child: number; name: string };

/** A new timer; `start` backdates it (Add entry with no end), otherwise Baby Buddy starts it now. */
export type NewTimer = TimerRef & { start?: string };

export type Sleep = {
  id: number;
  child: number;
  start: string;
  end: string;
  duration: string;
  nap: boolean;
  notes: string | null;
  tags: string[];
};

export type FeedingType = (typeof FEEDING_TYPES)[number];

export type FeedingMethod = (typeof FEEDING_METHODS)[number];

export type Feeding = {
  id: number;
  child: number;
  start: string;
  end: string;
  duration: string;
  type: FeedingType;
  method: FeedingMethod;
  amount: number | null;
  notes: string | null;
  tags: string[];
};

/**
 * Consumes the timer: Baby Buddy fills start/end from it and deletes it. `nap` is required,
 * because a missing or null nap is filled in from the server's own nap window, not Molly's.
 */
export type StopSleep = { timer: number; nap: boolean };

/** `notes`: a meal's food (solid food); Molly writes no other feeding notes. */
export type StopFeeding = {
  timer: number;
  type: FeedingType;
  method: FeedingMethod;
  amount?: number;
  notes?: string;
};

export type DiaperColor = (typeof DIAPER_COLORS)[number];

export type Change = {
  id: number;
  child: number;
  time: string;
  wet: boolean;
  solid: boolean;
  color: DiaperColor;
  amount: number | null;
  notes: string | null;
  tags: string[];
};

/**
 * Omit `time` for "now": Baby Buddy then uses its own clock. It rejects times in the future, so a
 * device clock running a few seconds ahead would otherwise fail every one-tap log.
 */
export type NewChange = { child: number; time?: string; wet: boolean; solid: boolean };

export type NewSleep = { child: number; start: string; end: string; nap: boolean };

export type NewFeeding = {
  child: number;
  start: string;
  end: string;
  type: FeedingType;
  method: FeedingMethod;
  amount?: number;
  notes?: string;
};

/** Molly only uses `name` (the parent's whole text, e.g. "Paracetamol 2.5 ml"), never `dosage` / `dosage_unit`. */
export type Medication = {
  id: number;
  child: number;
  name: string;
  time: string;
  notes: string | null;
  tags: string[];
};

/** Omit `time` for "now", as for `NewChange`. */
export type NewMedication = { child: number; name: string; time?: string; notes?: string };

/**
 * A Baby Buddy note: skip notes (`molly-skip`) and to-do items (`molly-todo`, `molly-todo-done`).
 * `image` is an absolute URL built from Baby Buddy's request host, so it may carry the wrong scheme
 * behind a proxy.
 */
export type Note = { id: number; child: number; note: string; time: string; tags: string[]; image: string | null };

/**
 * A photo to upload: a `Blob` (web, tests) or a React Native file (`{ uri, type }`). `name` is the
 * file name Baby Buddy saves it under.
 */
export type NoteImage = { name: string } & ({ blob: Blob } | { uri: string; type: string });

/** Omit `time` for "now". */
export type NewNote = { child: number; note: string; time?: string; tags: string[]; image?: NoteImage };

/** `tags` replaces the note's tags; `image: null` removes the photo, a `NoteImage` replaces it. */
export type NotePatch = { note?: string; time?: string; tags?: string[]; image?: NoteImage | null };

/**
 * Note list filters: `tags` (tag names, comma-separated, matching any), `date_min` / `date_max`
 * (ISO 8601 with offset). Without `child`, every child's notes.
 */
export type NoteQuery = { child?: number; tags?: string; date_min?: string; date_max?: string };

/** A Baby Buddy tag (`GET /api/tags/`). Names are case-sensitive and unique. */
export type Tag = { slug: string; name: string; color: string; last_used: string };

export type EntryKind = 'sleep' | 'feeding' | 'change' | 'medication';

export type Entry<K extends EntryKind> = {
  sleep: Sleep;
  feeding: Feeding;
  change: Change;
  medication: Medication;
}[K];

/** Baby Buddy list filters, e.g. `start_min`, `end_min`, `date_min` (ISO 8601 with offset). */
export type EntryQuery = { child: number } & Record<string, string | number>;

export type EntryPatch<K extends EntryKind> = Partial<Omit<Entry<K>, 'id' | 'child' | 'duration'>>;

/** Weight in grams (Molly's choice: Baby Buddy stores the bare number). Dates are `YYYY-MM-DD`. */
export type Weight = { id: number; child: number; weight: number; date: string; notes: string | null; tags: string[] };

export type Height = { id: number; child: number; height: number; date: string; notes: string | null; tags: string[] };

export type HeadCircumference = {
  id: number;
  child: number;
  head_circumference: number;
  date: string;
  notes: string | null;
  tags: string[];
};

export type Temperature = {
  id: number;
  child: number;
  temperature: number;
  time: string;
  notes: string | null;
  tags: string[];
};

export type Bmi = { id: number; child: number; bmi: number; date: string; notes: string | null; tags: string[] };

export type MeasurementKind = 'weight' | 'height' | 'head' | 'temperature' | 'bmi';

export type Measurement<K extends MeasurementKind> = {
  weight: Weight;
  height: Height;
  head: HeadCircumference;
  temperature: Temperature;
  bmi: Bmi;
}[K];

/** Omit `date` (or `time`) for today (now) on Baby Buddy's clock; it refuses future ones. */
export type NewMeasurement<K extends MeasurementKind> = Partial<Pick<Measurement<K>, 'notes'>> &
  {
    weight: Pick<Weight, 'child' | 'weight'> & { date?: string };
    height: Pick<Height, 'child' | 'height'> & { date?: string };
    head: Pick<HeadCircumference, 'child' | 'head_circumference'> & { date?: string };
    temperature: Pick<Temperature, 'child' | 'temperature'> & { time?: string };
    bmi: Pick<Bmi, 'child' | 'bmi'> & { date?: string };
  }[K];
