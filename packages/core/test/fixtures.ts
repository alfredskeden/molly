import type { Bmi, Change, Feeding, HeadCircumference, Height, Medication, Sleep, Temperature, Weight } from '@molly/api';

let nextId = 1;

export function sleep(fields: Pick<Sleep, 'start' | 'end'> & Partial<Sleep>): Sleep {
  return { id: nextId++, child: 1, duration: '', nap: false, notes: null, tags: [], ...fields };
}

export function feeding(fields: Pick<Feeding, 'start' | 'end'> & Partial<Feeding>): Feeding {
  return {
    id: nextId++,
    child: 1,
    duration: '',
    type: 'breast milk',
    method: 'left breast',
    amount: null,
    notes: null,
    tags: [],
    ...fields,
  };
}

export function change(fields: Pick<Change, 'time'> & Partial<Change>): Change {
  return { id: nextId++, child: 1, wet: true, solid: false, color: '', amount: null, notes: null, tags: [], ...fields };
}

export function medication(fields: Pick<Medication, 'time'> & Partial<Medication>): Medication {
  return { id: nextId++, child: 1, name: 'Vitamin D', notes: null, tags: [], ...fields };
}

export function weight(date: string, grams: number): Weight {
  return { id: nextId++, child: 1, weight: grams, date, notes: null, tags: [] };
}

export function height(date: string, cm: number): Height {
  return { id: nextId++, child: 1, height: cm, date, notes: null, tags: [] };
}

export function head(date: string, cm: number): HeadCircumference {
  return { id: nextId++, child: 1, head_circumference: cm, date, notes: null, tags: [] };
}

export function temperature(time: string, celsius: number): Temperature {
  return { id: nextId++, child: 1, temperature: celsius, time, notes: null, tags: [] };
}

export function bmi(date: string, value: number): Bmi {
  return { id: nextId++, child: 1, bmi: value, date, notes: null, tags: [] };
}
