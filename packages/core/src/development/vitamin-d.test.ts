import type { Medication } from '@molly/api';
import { describe, expect, it } from 'vitest';

import { vitaminDCycleFrom } from '../vitamin-d';
import { vitaminDLine } from './vitamin-d';

const NOW = new Date(2026, 9, 12, 12, 0);
const CYCLE = vitaminDCycleFrom(new Date(2026, 9, 12, 6, 30));

const dose = (time: Date, name = 'Vitamin D'): Medication =>
  ({ id: 1, child: 1, name, time: time.toISOString(), notes: null, tags: [] });

describe('the Vitamin D line', () => {
  it('says the drops are given every day until 2 in Sweden, and that none is logged today', () => {
    // When
    const line = vitaminDLine('sweden', '2026-04-20', CYCLE, [], NOW);

    // Then
    expect(line).toEqual({
      text: 'In Sweden, children get vitamin D drops every day from about 1 week old until they turn 2.',
      status: 'Not logged today',
    });
  });

  it("says it's given once a dose is logged in the baby's day", () => {
    // Given
    const medication = [dose(new Date(2026, 9, 12, 8, 0))];

    // When
    const line = vitaminDLine('sweden', '2026-04-20', CYCLE, medication, NOW);

    // Then
    expect(line?.status).toBe('Given today');
  });

  it("doesn't count a dose from before the baby's day started", () => {
    // Given
    const medication = [dose(new Date(2026, 9, 12, 6, 0))];

    // When
    const line = vitaminDLine('sweden', '2026-04-20', CYCLE, medication, NOW);

    // Then
    expect(line?.status).toBe('Not logged today');
  });

  it('has nothing in Sweden from 2 years', () => {
    // When
    const line = vitaminDLine('sweden', '2024-10-12', CYCLE, [], NOW);

    // Then
    expect(line).toBeNull();
  });

  it('gives the general line and no status for International', () => {
    // When
    const line = vitaminDLine('international', '2026-04-20', CYCLE, [dose(new Date(2026, 9, 12, 8, 0))], NOW);

    // Then
    expect(line).toEqual({
      text: "Advice on vitamin D for babies and young children differs between countries. Ask your child's doctor or nurse what applies to you.",
      status: null,
    });
  });
});
