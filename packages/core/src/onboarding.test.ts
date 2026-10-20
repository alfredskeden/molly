import { describe, expect, it } from 'vitest';

import { chooseChild, onboardingProblem } from './onboarding';

const molly = { id: 1, first_name: 'Molly' };
const sam = { id: 2, first_name: 'Sam' };

describe('choosing the child during onboarding', () => {
  it('with no children there is nothing to choose', () => {
    // Given
    const children: (typeof molly)[] = [];

    // When
    const choice = chooseChild(children);

    // Then
    expect(choice).toEqual({ type: 'noChildren' });
  });

  it('with one child it is selected without asking', () => {
    // Given
    const children = [molly];

    // When
    const choice = chooseChild(children);

    // Then
    expect(choice).toEqual({ type: 'selected', children: [molly] });
  });

  it('with several children the parent chooses', () => {
    // Given
    const children = [molly, sam];

    // When
    const choice = chooseChild(children);

    // Then
    expect(choice).toEqual({ type: 'choose', children: [molly, sam] });
  });
});

describe('onboarding problems', () => {
  it('a rejected key is reported as key rejected', () => {
    // Given
    const error = 'unauthorized';

    // When
    const problem = onboardingProblem(error);

    // Then
    expect(problem).toBe('keyRejected');
  });

  it('an unreachable instance is reported as cannot reach', () => {
    // Given
    const error = 'unreachable';

    // When
    const problem = onboardingProblem(error);

    // Then
    expect(problem).toBe('unreachable');
  });

  it('a user without permission to read its profile is told which permission is missing', () => {
    // Given
    const error = 'forbidden';

    // When
    const problem = onboardingProblem(error);

    // Then
    expect(problem).toBe('missingProfilePermission');
  });

  it('a URL without the Baby Buddy API is reported as not Baby Buddy', () => {
    // Given
    const error = 'notFound';

    // When
    const problem = onboardingProblem(error);

    // Then
    expect(problem).toBe('notBabyBuddy');
  });

  it.each(['server', 'validation'] as const)('a %s failure is reported as a server error', (error) => {
    // Given
    const kind = error;

    // When
    const problem = onboardingProblem(kind);

    // Then
    expect(problem).toBe('serverError');
  });
});
