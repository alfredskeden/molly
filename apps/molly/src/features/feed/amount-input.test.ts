import { describe, expect, it } from 'vitest';

import { amountInput, startAmount } from './amount-input';

describe('the bottle amount row', () => {
  it('starts at the amount it is given, not typing', () => {
    // When
    const state = startAmount(130);

    // Then
    expect(state).toEqual({ amount: 130, draft: null, before: 130 });
  });

  it('steps from the amount shown', () => {
    // Given
    const state = startAmount(130);

    // When
    const next = amountInput(amountInput(state, { type: 'step', direction: 1 }), { type: 'step', direction: 1 });

    // Then
    expect(next.amount).toBe(140);
  });

  it('has nothing to save once typing begins, until a digit is typed', () => {
    // Given
    const state = startAmount(130);

    // When
    const next = amountInput(state, { type: 'focus' });

    // Then
    expect(next).toEqual({ amount: null, draft: '', before: 130 });
  });

  it('saves the typed amount', () => {
    // Given
    const typing = amountInput(startAmount(130), { type: 'focus' });

    // When
    const next = amountInput(typing, { type: 'keys', text: '95' });

    // Then
    expect(next).toMatchObject({ amount: 95, draft: '95' });
  });

  it('takes a shorter text as a backspace', () => {
    // Given
    const typing = amountInput(amountInput(startAmount(130), { type: 'focus' }), { type: 'keys', text: '95' });

    // When
    const next = amountInput(typing, { type: 'keys', text: '9' });

    // Then
    expect(next).toMatchObject({ amount: 9, draft: '9' });
  });

  it('keeps the typed amount when the keyboard closes', () => {
    // Given
    const typing = amountInput(amountInput(startAmount(130), { type: 'focus' }), { type: 'keys', text: '95' });

    // When
    const next = amountInput(typing, { type: 'blur' });

    // Then
    expect(next).toEqual({ amount: 95, draft: null, before: 130 });
  });

  it('goes back to the amount before typing when nothing was typed', () => {
    // Given
    const typing = amountInput(startAmount(130), { type: 'focus' });

    // When
    const next = amountInput(typing, { type: 'blur' });

    // Then
    expect(next.amount).toBe(130);
  });

  it('steps from the amount before typing when the typed one is empty', () => {
    // Given
    const typing = amountInput(startAmount(130), { type: 'focus' });

    // When
    const next = amountInput(typing, { type: 'step', direction: -1 });

    // Then
    expect(next).toEqual({ amount: 125, draft: null, before: 130 });
  });

  it('starts at 5 ml on +5 when there was no amount at all', () => {
    // Given
    const state = startAmount(null);

    // When
    const next = amountInput(state, { type: 'step', direction: 1 });

    // Then
    expect(next.amount).toBe(5);
  });
});
