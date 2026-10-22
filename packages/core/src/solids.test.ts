import { describe, expect, it } from 'vitest';

import { feeding } from '../test/fixtures';
import { ateLabel, chosenFoods, eatQuestion, recentFoods, tapFood } from './solids';

const meal = (start: string, notes: string | null) =>
  feeding({ start, end: start, type: 'solid food', method: 'parent fed', amount: 0, notes });

describe('the recent foods', () => {
  it('are none without meals', () => {
    // When
    const foods = recentFoods([]);

    // Then
    expect(foods).toEqual([]);
  });

  it("are a meal's food", () => {
    // Given
    const meals = [meal('2026-10-20T12:00:00Z', 'Carrot')];

    // When
    const foods = recentFoods(meals);

    // Then
    expect(foods).toEqual(['Carrot']);
  });

  it('split a note into its foods on commas', () => {
    // Given
    const meals = [meal('2026-10-20T12:00:00Z', 'Carrot, Porridge')];

    // When
    const foods = recentFoods(meals);

    // Then
    expect(foods).toEqual(['Carrot', 'Porridge']);
  });

  it('are newest first whatever the input order', () => {
    // Given
    const meals = [meal('2026-10-19T12:00:00Z', 'Carrot, Porridge'), meal('2026-10-20T12:00:00Z', 'Banana')];

    // When
    const foods = recentFoods(meals);

    // Then
    expect(foods).toEqual(['Banana', 'Carrot', 'Porridge']);
  });

  it('keep a food once, ignoring case, with the newest spelling', () => {
    // Given
    const meals = [meal('2026-10-19T12:00:00Z', 'carrot'), meal('2026-10-20T12:00:00Z', 'Carrot')];

    // When
    const foods = recentFoods(meals);

    // Then
    expect(foods).toEqual(['Carrot']);
  });

  it('are at most five', () => {
    // Given
    const meals = [meal('2026-10-20T12:00:00Z', 'A, B, C, D, E, F')];

    // When
    const foods = recentFoods(meals);

    // Then
    expect(foods).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('skip blank and missing notes and empty parts', () => {
    // Given
    const meals = [meal('2026-10-20T12:00:00Z', null), meal('2026-10-19T12:00:00Z', ' , '), meal('2026-10-18T12:00:00Z', 'Pear,')];

    // When
    const foods = recentFoods(meals);

    // Then
    expect(foods).toEqual(['Pear']);
  });

  it('ignore milk feeds', () => {
    // Given
    const milk = feeding({ start: '2026-10-20T12:00:00Z', end: '2026-10-20T12:10:00Z', notes: 'Fussy' });

    // When
    const foods = recentFoods([milk]);

    // Then
    expect(foods).toEqual([]);
  });
});

describe('the chosen foods', () => {
  const chips = ['Carrot', 'Porridge', 'Banana'];

  it('are none with an empty field', () => {
    // When
    const chosen = chosenFoods('', chips);

    // Then
    expect(chosen).toEqual([]);
  });

  it("are the field's foods when each is a chip", () => {
    // When
    const chosen = chosenFoods('Carrot, Porridge', chips);

    // Then
    expect(chosen).toEqual(['Carrot', 'Porridge']);
  });

  it('are none once the field holds something typed that is not a chip', () => {
    // When
    const chosen = chosenFoods('Carrot, Pea', chips);

    // Then
    expect(chosen).toEqual([]);
  });
});

describe('tapping a food chip', () => {
  const chips = ['Carrot', 'Porridge', 'Banana'];

  it('fills an empty field with the food', () => {
    // When
    const text = tapFood('', chips, 'Carrot');

    // Then
    expect(text).toBe('Carrot');
  });

  it('adds an off chip after the chosen ones', () => {
    // When
    const text = tapFood('Carrot', chips, 'Porridge');

    // Then
    expect(text).toBe('Carrot, Porridge');
  });

  it('removes an on chip', () => {
    // When
    const text = tapFood('Carrot, Porridge', chips, 'Carrot');

    // Then
    expect(text).toBe('Porridge');
  });

  it('adds the food after typed text, keeping it', () => {
    // When
    const text = tapFood('Pea purée', chips, 'Banana');

    // Then
    expect(text).toBe('Pea purée, Banana');
  });
});

describe('the eat question', () => {
  it('asks about her for a girl', () => {
    // When
    const question = eatQuestion('Ella', 'girl');

    // Then
    expect(question).toBe('What did she eat?');
  });

  it('asks about him for a boy', () => {
    // When
    const question = eatQuestion('Otto', 'boy');

    // Then
    expect(question).toBe('What did he eat?');
  });

  it('names the child when the sex is not set', () => {
    // When
    const question = eatQuestion('Ella', null);

    // Then
    expect(question).toBe('What did Ella eat?');
  });
});

describe('the ate label', () => {
  it('says she for a girl', () => {
    // When
    const label = ateLabel('Ella', 'girl');

    // Then
    expect(label).toBe('What she ate');
  });

  it('says he for a boy', () => {
    // When
    const label = ateLabel('Otto', 'boy');

    // Then
    expect(label).toBe('What he ate');
  });

  it('names the child when the sex is not set', () => {
    // When
    const label = ateLabel('Ella', null);

    // Then
    expect(label).toBe('What Ella ate');
  });
});
