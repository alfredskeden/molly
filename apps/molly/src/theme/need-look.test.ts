import { describe, expect, it } from 'vitest';

import { needTone } from './need-look';
import { THEMES } from './themes';

const needs = THEMES.sim.day.needs!;

describe("a need's tone", () => {
  it.each([
    [0, 0],
    [4, 0],
    [5, 1],
    [52, 5],
    [100, 10],
  ])('at %f is the colour and ink of tenth %i', (value, tenth) => {
    // When
    const tone = needTone(needs, value);

    // Then
    expect(tone).toEqual({ color: needs.colors[tenth], ink: needs.inks[tenth] });
  });

  it.each([
    [-5, 0],
    [120, 10],
  ])('stays within the scale at %i', (value, tenth) => {
    // When
    const tone = needTone(needs, value);

    // Then
    expect(tone.color).toBe(needs.colors[tenth]);
  });
});
