import type { NewChange } from '@molly/api';

export type DiaperButton = 'wet' | 'dirty' | 'both';

export function diaperFor(button: DiaperButton): Pick<NewChange, 'wet' | 'solid'> {
  return { wet: button !== 'dirty', solid: button !== 'wet' };
}
