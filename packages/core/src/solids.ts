import type { Feeding } from '@molly/api';

import type { Sex } from './children';
import { isSolidFeed } from './feeding';

const SEPARATOR = ', ';

/** A meal's foods: its notes split on commas, trimmed, blanks left out. */
function foodsOf(text: string | null): string[] {
  return (text ?? '').split(',').flatMap((part) => (part.trim() ? [part.trim()] : []));
}

/**
 * The foods of the newest meals, newest first: each once (ignoring case, the newest spelling), at most `limit`.
 * The Solids panel's chips.
 */
export function recentFoods(feedings: Feeding[], limit = 5): string[] {
  const meals = feedings.filter(isSolidFeed).sort((a, b) => Date.parse(b.start) - Date.parse(a.start));
  const foods = new Map<string, string>();
  for (const food of meals.flatMap((meal) => foodsOf(meal.notes))) {
    if (!foods.has(food.toLowerCase())) foods.set(food.toLowerCase(), food);
  }
  return [...foods.values()].slice(0, limit);
}

/** The chips that show as on: the field's foods when each is a chip (ignoring case), none once something else is typed. */
export function chosenFoods(text: string, chips: string[]): string[] {
  const chosen = foodsOf(text).map((food) => chips.find((chip) => chip.toLowerCase() === food.toLowerCase()));
  return chosen.every((chip) => chip !== undefined) ? chosen : [];
}

/** The field after tapping `chip`: an on chip leaves, an off one joins at the end (after typed text too). */
export function tapFood(text: string, chips: string[], chip: string): string {
  const chosen = chosenFoods(text, chips);
  if (chosen.includes(chip)) return chosen.filter((food) => food !== chip).join(SEPARATOR);
  return [...foodsOf(text), chip].join(SEPARATOR);
}

/** The child as the words name it: the pronoun when the sex is set, else the name (Molly never guesses one). */
function subject(name: string, sex: Sex | null): string {
  return sex === 'girl' ? 'she' : sex === 'boy' ? 'he' : name;
}

/** The Solids panel's question: `What did she eat?`, `What did Ella eat?`. */
export function eatQuestion(name: string, sex: Sex | null): string {
  return `What did ${subject(name, sex)} eat?`;
}

/** The editor's food label: `What she ate`, `What Ella ate`. */
export function ateLabel(name: string, sex: Sex | null): string {
  return `What ${subject(name, sex)} ate`;
}
