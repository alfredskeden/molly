import { BabyBuddyError, createClient } from '@molly/api';
import { chooseChild, normaliseBaseUrl, onboardingProblem } from '@molly/core';
import { router } from 'expo-router';
import { useState } from 'react';

import { useSession } from '@/session/session';

import { NO_CHILDREN, PROBLEM_MESSAGES, URL_MESSAGES, type Message } from './messages';
import { useOnboarding } from './onboarding-context';

/** Errors land on the shared connect form. `replace` keeps the QR scanner out of the back stack. */
export function useConnect() {
  const { setPending, setForm } = useOnboarding();
  const { state, signIn } = useSession();
  const [checking, setChecking] = useState(false);

  async function connect(url: string, token: string, { replace = false } = {}): Promise<boolean> {
    const fail = (error: Message) => {
      setForm({ url, token, error });
      return false;
    };
    const normalised = normaliseBaseUrl(url);
    if (!normalised.ok) return fail(URL_MESSAGES[normalised.reason]);
    setForm({ url, token, error: null });
    setChecking(true);
    try {
      const client = createClient({ baseUrl: normalised.url, token: token.trim() });
      const profile = await client.getProfile();
      const children = await client.listChildren();
      const credentials = { baseUrl: normalised.url, token: token.trim(), userId: profile.user.id };
      // A new key for the rejected one: same Baby Buddy, same child, so skip the choice and checklist. The
      // children's preferences stay (signIn without a picked set).
      if (
        state.status === 'keyRejected' &&
        state.session.credentials.baseUrl === normalised.url &&
        children.some((child) => child.id === state.session.childId)
      ) {
        await signIn({ credentials, childId: state.session.childId });
        return true;
      }
      const choice = chooseChild(children);
      if (choice.type === 'noChildren') return fail(NO_CHILDREN);
      setPending({ credentials, children, picked: choice.type === 'selected' ? choice.children : null });
      const next = choice.type === 'selected' ? '/onboarding/checklist' : '/onboarding/child';
      if (replace) router.replace(next);
      else router.push(next);
      return true;
    } catch (cause) {
      if (!(cause instanceof BabyBuddyError)) throw cause;
      return fail(PROBLEM_MESSAGES[onboardingProblem(cause.kind)]);
    } finally {
      setChecking(false);
    }
  }

  return { connect, checking };
}
