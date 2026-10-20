/** The bottle amount row: −5 / +5 steps, never below 5 ml. */
export const AMOUNT_STEP = 5;

const MAX_DIGITS = 3;

export function steppedAmount(amount: number, direction: -1 | 1): number {
  return Math.max(AMOUNT_STEP, amount + direction * AMOUNT_STEP);
}

/** The digits of a typed amount after one more key: a whole number of up to three digits, no leading zero. */
export function typedAmount(digits: string, key: string): string {
  if (!/^\d$/.test(key) || digits.length >= MAX_DIGITS || (digits === '' && key === '0')) return digits;
  return digits + key;
}

/** The ml typed digits save, or null while there's nothing to save (empty or zero). */
export function amountOf(digits: string): number | null {
  const amount = Number(digits);
  return digits === '' || amount === 0 ? null : amount;
}
