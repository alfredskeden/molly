import type { Child } from '@molly/api';
import { createContext, use, useState, type ReactNode } from 'react';

import type { Message } from '@/features/onboarding/messages';
import { useSession } from '@/session/session';
import type { Credentials } from '@/storage/types';

/**
 * Validated but not yet saved: the session starts only after the checklist. `picked`: the children ticked in
 * "Which children?", in Baby Buddy's order (the first opens first); null until chosen.
 */
export type PendingOnboarding = { credentials: Credentials; children: Child[]; picked: Child[] | null };

/** The connect form, shared so the QR scanner can fill it in and report errors on it. */
export type ConnectForm = { url: string; token: string; error: Message | null };

type OnboardingContextValue = {
  pending: PendingOnboarding | null;
  setPending: (pending: PendingOnboarding) => void;
  form: ConnectForm;
  setForm: (form: ConnectForm) => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingOnboarding | null>(null);
  const { state } = useSession();
  // A rejected key keeps the address: only the key is typed again.
  const [form, setForm] = useState<ConnectForm>(() => ({
    url: state.status === 'keyRejected' ? state.session.credentials.baseUrl : '',
    token: '',
    error: null,
  }));
  return <OnboardingContext value={{ pending, setPending, form, setForm }}>{children}</OnboardingContext>;
}

export function useOnboarding(): OnboardingContextValue {
  const value = use(OnboardingContext);
  if (!value) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return value;
}
