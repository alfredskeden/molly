import type { Feeding, FeedingType, StopFeeding } from '@molly/api';

export type FeedingStopButton = 'left' | 'right' | 'both' | 'bottle' | 'solids';

export type BottleDefaults = { type: FeedingType; amount?: number };

export type FeedingStop = Omit<StopFeeding, 'timer'>;

const SOLIDS: ReadonlySet<Feeding['method']> = new Set(['parent fed', 'self fed']);

/** What Solids saves a meal as: always parent fed (self fed isn't offered). */
export const SOLIDS_METHOD: Feeding['method'] = 'parent fed';

/** A meal rather than milk: decided by the method, as Baby Buddy's own entries may be `self fed`. */
export function isSolidFeed(feeding: Pick<Feeding, 'method'>): boolean {
  return SOLIDS.has(feeding.method);
}

/** `food`: what a meal (`solids`) was, saved trimmed as its notes; the caller never passes a blank one. */
export function feedingForStop(button: FeedingStopButton, bottle: BottleDefaults, food = ''): FeedingStop {
  if (button === 'solids') return { type: 'solid food', method: SOLIDS_METHOD, amount: 0, notes: food.trim() };
  if (button === 'left') return { type: 'breast milk', method: 'left breast' };
  if (button === 'right') return { type: 'breast milk', method: 'right breast' };
  if (button === 'both') return { type: 'breast milk', method: 'both breasts' };
  const stop: FeedingStop = { type: bottle.type, method: 'bottle' };
  if (bottle.amount !== undefined) stop.amount = bottle.amount;
  return stop;
}

/**
 * The bottle a new one starts from: the newest bottle feed with an amount gives its type and amount
 * (amounts creep up week by week), or the child's bottle when there's none.
 */
export function lastBottle<F extends BottleDefaults | null>(feedings: readonly Feeding[], fallback: F): BottleDefaults | F {
  let newest: Feeding | undefined;
  for (const feeding of feedings) {
    if (feeding.method !== 'bottle' || feeding.amount === null) continue;
    if (!newest || Date.parse(feeding.start) > Date.parse(newest.start)) newest = feeding;
  }
  return newest?.amount != null ? { type: newest.type, amount: newest.amount } : fallback;
}
