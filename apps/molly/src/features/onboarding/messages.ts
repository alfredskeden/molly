import type { NormalisedUrl, OnboardingProblem } from '@molly/core';
import { Platform } from 'react-native';

import type { HelpTopic } from '@/features/help/topics';

type UrlProblem = Extract<NormalisedUrl, { ok: false }>['reason'];

export type Message = { title: string; hints?: string[]; help?: HelpTopic };

export const URL_MESSAGES: Record<UrlProblem, Message> = {
  empty: { title: 'Enter your Baby Buddy address.' },
  invalid: { title: "That isn't a web address, e.g. https://baby.example.com." },
  insecure: { title: 'Use https://. Plain http:// only works for addresses on your home network.' },
};

export const PROBLEM_MESSAGES: Record<OnboardingProblem, Message> = {
  keyRejected: { title: 'Key rejected. Copy the API key again from your Baby Buddy user settings.', help: 'key' },
  unreachable: {
    title: "Can't reach Baby Buddy.",
    hints: [
      'Check the address and that Baby Buddy is running.',
      'CORS: Baby Buddy must list this site in CORS_ALLOWED_ORIGINS.',
      'Cloudflare Access: Baby Buddy’s /api/* needs a bypass rule, or Access answers with a login page.',
      ...(Platform.OS === 'web'
        ? ["Molly's web server only allows the Baby Buddy address it was set up with (BABY_BUDDY_ORIGIN)."]
        : []),
    ],
    help: 'reach',
  },
  missingProfilePermission: {
    title: "Your Baby Buddy user can't read its own profile.",
    hints: ['Grant it the "view settings" permission (babybuddy.view_settings), or make it a superuser.'],
    help: 'permissions',
  },
  notBabyBuddy: { title: "There's no Baby Buddy API at this address. Use the address you open Baby Buddy at." },
  serverError: { title: 'Baby Buddy answered with an error. Try again in a moment.' },
};

export const NO_CHILDREN: Message = { title: 'Baby Buddy has no children yet. Add your child there first.' };
