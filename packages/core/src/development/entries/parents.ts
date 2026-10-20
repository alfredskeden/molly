import type { TopicEntry } from '../types';

/**
 * Parents' corner, about the adults: 1177 and Rikshandboken (BVC's talks and EPDS) for Sweden, the NHS
 * elsewhere. The contacts at the end point parents to help for themselves.
 */
export const PARENTS: TopicEntry[] = [
  {
    topic: 'parents',
    pages: [0, 1],
    headline: 'The first weeks',
    summary: 'Baby blues, rest, and letting others help',
    intro:
      'Low mood, mood swings and tiredness a few days after a birth are common. Often called the baby blues, they usually pass within 2 weeks. Rest when you can, and let others help.',
    now: [
      { text: 'Have weepy, up-and-down days after the birth, which for most ease within 2 weeks', sources: ['1177-postnatal-depression', 'nhs-postnatal-depression'] },
      { text: 'Worry about not being a good enough parent', sources: ['1177-after-birth'] },
      { text: 'Feel exhausted from waking at night', sources: ['nhs-parent-tiredness'] },
    ],
    tryTogether: [
      'Nap when your baby naps; the housework can wait.',
      "Let family and friends help, and help each other if you're two.",
      'Eat regularly, and get outside for a short walk when you can.',
      "If the crying gets too much, it's fine to put your baby down somewhere safe and take a few minutes in another room.",
    ],
    getHelp: [
      {
        text: "The low mood hasn't lifted after 2 weeks, or you feel low almost every day",
        sources: ['1177-postnatal-depression', 'nhs-postnatal-depression'],
      },
      {
        text: "You or your partner seem confused, see or hear things others don't, or seem like a different person: get help straight away",
        sources: ['nhs-psychosis', '1177-postnatal-depression'],
      },
      {
        text: 'You have thoughts of harming yourself or your baby, or are afraid you could hurt them: get help today, and if you might act on them or someone may be in danger, call your emergency number now',
        sources: ['1177-postnatal-depression', '1177-crying'],
      },
    ],
    sources: ['rikshandboken-epds'],
  },
  {
    topic: 'parents',
    pages: [2, 5],
    headline: 'How are you doing?',
    summary: 'Your own sleep and mood, and sharing the load',
    intro:
      "Months of broken nights add up, and it helps to share the load and to say how you're feeling. Depression after a baby can start any time in the first year, and it can affect either parent, not only the one who gave birth.",
    now: [
      { text: 'Feel worn out by broken nights', sources: ['nhs-parent-tiredness', '1177-after-birth'] },
      { text: 'Feel worried or low at times, and swing between happy and low', sources: ['1177-after-birth'] },
      { text: "Are asked at the baby's check-ups how they're feeling", sources: ['1177-bvc', 'nhs-reviews'] },
    ],
    tryTogether: [
      'Rest when your baby sleeps, and let the housework wait.',
      'Share the nights: take turns, so one of you gets a stretch of sleep.',
      'Say yes when family or friends offer to help.',
      'A short walk outside each day can help.',
    ],
    getHelp: [
      {
        text: "You or your partner seem confused, see or hear things others don't, or seem like a different person: get help straight away",
        sources: ['nhs-psychosis', '1177-postnatal-depression'],
      },
      {
        text: "You've felt low, hopeless or lost interest in things almost every day for more than 2 weeks",
        sources: ['1177-postnatal-depression', 'nhs-postnatal-depression'],
      },
      { text: "You can't sleep even when your baby sleeps, or feel exhausted all the time", sources: ['nhs-parent-tiredness'] },
      {
        text: 'You find it hard to care for your baby, or have thoughts of harming yourself or your baby: get help today, and if you might act on them or someone may be in danger, call your emergency number now',
        sources: ['1177-postnatal-depression', 'nhs-postnatal-depression'],
      },
    ],
    sources: ['rikshandboken-epds'],
  },
  {
    topic: 'parents',
    pages: [6, 11],
    headline: 'Looking after the two of you',
    summary: 'Sleep, sharing the load, and arguing more when tired',
    intro:
      "Many parents are still short on sleep, and it's common to argue more when you're both worn out. Sharing nights and chores, and saying what you need, helps. Depression after a baby can still start now, up to a year after the birth.",
    now: [
      { text: 'Are still tired from broken nights', sources: ['nhs-parent-tiredness'] },
      { text: "Argue more when they're worn out, for example over a crying baby, which doesn't mean the relationship is in trouble", sources: ['1177-crying'] },
    ],
    tryTogether: [
      'Take turns with the nights, so each of you gets a stretch of sleep.',
      'Ask family or friends to watch your baby while you nap or go out.',
      'Get outside for a short walk each day.',
    ],
    getHelp: [
      {
        text: "You've felt low, hopeless or lost interest in things almost every day for more than 2 weeks",
        sources: ['1177-postnatal-depression', 'nhs-postnatal-depression'],
      },
      { text: "You can't sleep even when your baby sleeps, or feel exhausted all the time", sources: ['nhs-parent-tiredness'] },
      { text: 'You have thoughts of harming yourself or your baby: get help today, and if you might act on them or someone may be in danger, call your emergency number now', sources: ['1177-postnatal-depression', 'nhs-postnatal-depression'] },
    ],
    sources: ['nhs-parent-tiredness'],
  },
  {
    topic: 'parents',
    pages: [12, 21],
    headline: 'Your turn to recharge',
    summary: 'Rest, sharing the load, and support with a toddler',
    intro:
      'The first year is behind you, but many parents are still tired. Keep sharing nights and chores, and say yes to help: being rested makes it easier to be the calm adult a toddler needs.',
    now: [
      { text: 'Are still tired, especially when nights are broken', sources: ['nhs-parent-tiredness'] },
      { text: 'Find tantrums hard: they are very common in toddlers, often from around 18 months', sources: ['nhs-tantrums'] },
    ],
    tryTogether: [
      'Take turns with nights and early mornings, so each of you gets rest.',
      'Ask family or friends to take your toddler for a while.',
      'Get outdoors every day: it does you both good.',
    ],
    getHelp: [
      {
        text: "You've felt low, hopeless or lost interest in things almost every day for more than 2 weeks",
        sources: ['1177-postnatal-depression', 'nhs-postnatal-depression'],
      },
      { text: 'Tantrums or behaviour leave you at a loss: support for parents is there to ask for', sources: ['rikshandboken-defiance', 'nhs-tantrums'] },
      { text: 'You have thoughts of harming yourself or your child: get help today, and if you might act on them or someone may be in danger, call your emergency number now', sources: ['1177-postnatal-depression', 'nhs-postnatal-depression'] },
    ],
    sources: ['nhs-parent-tiredness'],
  },
  {
    topic: 'parents',
    pages: [24, 36],
    headline: 'Steady, not perfect',
    summary: 'Patience with limits, making up after conflicts, your own needs',
    intro:
      'Two- and three-year-olds test limits, and that tests parents too. Losing your temper sometimes is human. What matters most is making up quickly and being a warm, steady adult, not a perfect one.',
    now: [
      { text: 'Get angry with their child sometimes', sources: ['1177-development-2-3'] },
      { text: 'Find the protests around 2.5 to 3 years wearing: they are a common peak', sources: ['rikshandboken-defiance'] },
    ],
    tryTogether: [
      'If you get too angry, step away and let another adult take over if you can.',
      'Make up quickly after a conflict.',
      'Plan ahead for the hard moments, like leaving the playground.',
      'Take turns with mornings and evenings, so each of you gets a break.',
    ],
    getHelp: [
      {
        text: "You've felt low, hopeless or lost interest in things almost every day for more than 2 weeks",
        sources: ['1177-postnatal-depression', 'nhs-postnatal-depression'],
      },
      { text: "You often feel you can't cope with your child's behaviour: ask for support as a parent", sources: ['rikshandboken-defiance', 'nhs-tantrums'] },
      {
        text: "You're afraid you might hurt your child, or have thoughts of harming yourself: get help today, and if you might act on them or someone may be in danger, call your emergency number now",
        sources: ['1177-postnatal-depression', '1177-crying'],
      },
    ],
    sources: ['nhs-parent-tiredness'],
  },
];
