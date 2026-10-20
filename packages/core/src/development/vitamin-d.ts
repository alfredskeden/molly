import type { Medication } from '@molly/api';

import { ageInMonths } from '../sleep-guide';
import { type VitaminDCycle, vitaminDStatus } from '../vitamin-d';
import type { GuideRegion } from './types';

const SWEDEN_UNTIL_MONTHS = 24;

/**
 * Health and Feeding's Vitamin D line. Sweden gives drops to every child until 2, so there it says so and
 * whether a dose is logged in the baby's day (the reminder's cycle); from 2 there's nothing to say.
 * Elsewhere the advice differs, so only the general line.
 */
export function vitaminDLine(
  region: GuideRegion,
  birthDate: string,
  cycle: VitaminDCycle,
  medication: readonly Medication[],
  now: Date,
): { text: string; status: 'Given today' | 'Not logged today' | null } | null {
  if (region === 'international') {
    return {
      text: "Advice on vitamin D for babies and young children differs between countries. Ask your child's doctor or nurse what applies to you.",
      status: null,
    };
  }
  if (ageInMonths(birthDate, now) >= SWEDEN_UNTIL_MONTHS) return null;
  return {
    text: 'In Sweden, children get vitamin D drops every day from about 1 week old until they turn 2.',
    status: vitaminDStatus(cycle, [...medication]).due ? 'Not logged today' : 'Given today',
  };
}
