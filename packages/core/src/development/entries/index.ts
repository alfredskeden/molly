import type { TopicEntry } from '../types';
import { FEEDING } from './feeding';
import { FEELINGS } from './feelings';
import { HEALTH } from './health';
import { MOVEMENT } from './movement';
import { PARENTS } from './parents';
import { PLAY } from './play';
import { SLEEP } from './sleep';
import { TALKING } from './talking';

export { PAGE_TEXTS } from './pages';

/** Every topic's entries; each page takes the one covering it. */
export const ENTRIES: readonly TopicEntry[] = [...MOVEMENT, ...TALKING, ...SLEEP, ...FEEDING, ...PLAY, ...FEELINGS, ...HEALTH, ...PARENTS];
