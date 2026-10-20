import type { BabyBuddyErrorKind } from '@molly/api';

export type ChildChoice<C> =
  | { type: 'noChildren' }
  | { type: 'selected'; children: C[] }
  | { type: 'choose'; children: C[] };

export function chooseChild<C>(children: C[]): ChildChoice<C> {
  const [first] = children;
  if (first === undefined) return { type: 'noChildren' };
  if (children.length === 1) return { type: 'selected', children: [first] };
  return { type: 'choose', children };
}

export type OnboardingProblem =
  | 'keyRejected'
  | 'unreachable'
  | 'missingProfilePermission'
  | 'notBabyBuddy'
  | 'serverError';

export function onboardingProblem(error: BabyBuddyErrorKind): OnboardingProblem {
  switch (error) {
    case 'unauthorized':
      return 'keyRejected';
    case 'unreachable':
      return 'unreachable';
    case 'forbidden':
      return 'missingProfilePermission';
    case 'notFound':
      return 'notBabyBuddy';
    case 'server':
    case 'validation':
      return 'serverError';
  }
}
