import { amountOf, steppedAmount, typedAmount } from '@molly/core';

/**
 * The bottle amount row: `amount` is what Save sends (null while the typed digits are empty or zero),
 * `draft` the digits while the keyboard is up, `before` the amount shown when typing began.
 */
export type AmountState = { amount: number | null; draft: string | null; before: number | null };

export type AmountAction = { type: 'focus' } | { type: 'keys'; text: string } | { type: 'blur' } | { type: 'step'; direction: -1 | 1 };

export const startAmount = (amount: number | null): AmountState => ({ amount, draft: null, before: amount });

export function amountInput(state: AmountState, action: AmountAction): AmountState {
  switch (action.type) {
    case 'focus':
      return state.draft === null ? { amount: null, draft: '', before: state.amount ?? state.before } : state;
    case 'keys': {
      const draft = state.draft ?? '';
      // Shorter is a backspace; anything else is keys added at the end (the caret is hidden and stays there).
      const next =
        action.text.length < draft.length
          ? draft.slice(0, -1)
          : action.text.startsWith(draft)
            ? [...action.text.slice(draft.length)].reduce(typedAmount, draft)
            : draft;
      return { ...state, draft: next, amount: amountOf(next) };
    }
    case 'blur':
      return { ...state, draft: null, amount: state.amount ?? state.before };
    case 'step':
      return { ...state, draft: null, amount: steppedAmount(state.amount ?? state.before ?? 0, action.direction) };
  }
}
