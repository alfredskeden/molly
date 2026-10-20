import { describe, expect, it } from 'vitest';

import { amountOf, steppedAmount, typedAmount } from './bottle-amount';

describe('stepping a bottle amount', () => {
  it('+5 adds five millilitres', () => {
    // Given
    const amount = 120;

    // When
    const stepped = steppedAmount(amount, 1);

    // Then
    expect(stepped).toBe(125);
  });

  it('−5 takes five millilitres off', () => {
    // Given
    const amount = 120;

    // When
    const stepped = steppedAmount(amount, -1);

    // Then
    expect(stepped).toBe(115);
  });

  it('−5 stops at 5 ml', () => {
    // Given
    const amount = 5;

    // When
    const stepped = steppedAmount(amount, -1);

    // Then
    expect(stepped).toBe(5);
  });

  it('−5 from under 10 ml lands on 5 ml, not below', () => {
    // Given
    const amount = 8;

    // When
    const stepped = steppedAmount(amount, -1);

    // Then
    expect(stepped).toBe(5);
  });

  it('+5 from a typed odd amount keeps its ones', () => {
    // Given
    const amount = 132;

    // When
    const stepped = steppedAmount(amount, 1);

    // Then
    expect(stepped).toBe(137);
  });
});

describe('typing a bottle amount', () => {
  it('the first digit starts the amount', () => {
    // Given
    const digits = '';

    // When
    const typed = typedAmount(digits, '9');

    // Then
    expect(typed).toBe('9');
  });

  it('more digits build a whole number', () => {
    // Given
    const digits = '13';

    // When
    const typed = typedAmount(digits, '5');

    // Then
    expect(typed).toBe('135');
  });

  it('a fourth digit is ignored', () => {
    // Given
    const digits = '135';

    // When
    const typed = typedAmount(digits, '0');

    // Then
    expect(typed).toBe('135');
  });

  it('a leading zero is ignored', () => {
    // Given
    const digits = '';

    // When
    const typed = typedAmount(digits, '0');

    // Then
    expect(typed).toBe('');
  });

  it('a zero after the first digit counts', () => {
    // Given
    const digits = '1';

    // When
    const typed = typedAmount(digits, '0');

    // Then
    expect(typed).toBe('10');
  });

  it('a key that is not a digit is ignored', () => {
    // Given
    const digits = '12';

    // When
    const typed = typedAmount(digits, '.');

    // Then
    expect(typed).toBe('12');
  });
});

describe('the amount typed digits save', () => {
  it('is none while nothing is typed', () => {
    // Given
    const digits = '';

    // When
    const amount = amountOf(digits);

    // Then
    expect(amount).toBeNull();
  });

  it('is the typed whole number', () => {
    // Given
    const digits = '135';

    // When
    const amount = amountOf(digits);

    // Then
    expect(amount).toBe(135);
  });

  it('is none for zero', () => {
    // Given
    const digits = '0';

    // When
    const amount = amountOf(digits);

    // Then
    expect(amount).toBeNull();
  });
});
