import type { Feeding } from '@molly/api';

import { counted } from './format';

/**
 * Roughly how much a baby drank over a span. `estimated` once the default bottle (or half of it) stood
 * in for a feed with no ml; with no default those feeds add nothing and are counted in `unmeasured`
 * instead (`unmeasuredBreast` of them breastfeeds), so the words can name them.
 */
export type Drank = { ml: number; estimated: boolean; unmeasured: number; unmeasuredBreast: number };

const SOLIDS: ReadonlySet<Feeding['method']> = new Set(['parent fed', 'self fed']);
const ONE_SIDE: ReadonlySet<Feeding['method']> = new Set(['left breast', 'right breast']);

/**
 * Bottles count their saved amount. Feeds from both breasts and bottles saved without one count
 * `defaultMl`, the most the baby probably drank; a feed from one breast counts half of it. The
 * total is rounded once to whole ml. A feed counts when it started in `[from, to)`, like `totalsBetween`.
 */
export function drank(feedings: Feeding[], from: Date, to: Date, defaultMl: number | undefined): Drank {
  const [start, end] = [from.getTime(), to.getTime()];
  const drunk = feedings.filter(
    (feed) => !SOLIDS.has(feed.method) && Date.parse(feed.start) >= start && Date.parse(feed.start) < end,
  );
  const measured = drunk.flatMap((feed) => (feed.method === 'bottle' && feed.amount !== null ? [feed.amount] : []));
  const unmeasured = drunk.filter((feed) => feed.method !== 'bottle' || feed.amount === null);
  const guessed = defaultMl === undefined ? [] : unmeasured;
  const left = defaultMl === undefined ? unmeasured : [];
  const shares = guessed.reduce((total, feed) => total + (ONE_SIDE.has(feed.method) ? 0.5 : 1), 0);
  return {
    ml: Math.round(measured.reduce((total, ml) => total + ml, 0) + shares * (defaultMl ?? 0)),
    estimated: guessed.length > 0,
    unmeasured: left.length,
    unmeasuredBreast: left.filter((feed) => feed.method !== 'bottle').length,
  };
}

type Words = { text: string; spoken: string };

/** `≈ 840 ml`, `360 ml + 3 breastfeeds`; null when nothing was drunk. `spoken` spells out `≈` and `ml`. */
export function drankText({ ml, estimated, unmeasured, unmeasuredBreast }: Drank): Words | null {
  const amount: Words | null =
    ml > 0 || unmeasured === 0
      ? { text: `${estimated ? '≈ ' : ''}${ml} ml`, spoken: `${estimated ? 'about ' : ''}${ml} millilitres` }
      : null;
  const rest = unmeasured > 0 ? unmeasuredWords(unmeasured, unmeasuredBreast) : null;
  if (ml === 0 && !rest) return null;
  if (!amount || !rest) return amount ?? rest;
  return { text: `${amount.text} + ${rest.text}`, spoken: `${amount.spoken} plus ${rest.spoken}` };
}

/** `3 breastfeeds` when every unmeasured feed was one, else `4 feeds without ml`. */
function unmeasuredWords(unmeasured: number, unmeasuredBreast: number): Words {
  if (unmeasuredBreast === unmeasured) {
    const breastfeeds = counted(unmeasured, 'breastfeed');
    return { text: breastfeeds, spoken: breastfeeds };
  }
  const feeds = counted(unmeasured, 'feed');
  return { text: `${feeds} without ml`, spoken: `${feeds} without millilitres` };
}
