import type { TopicEntry } from '../types';

/**
 * Sleep: 1177 for Sweden, the NHS for International; safe sleep from 1177 and the NHS. The typical range
 * beside the child's own numbers comes from `typicalSleep`. No source gives nap counts by age under 18
 * months, so these entries don't either.
 */
export const SLEEP: TopicEntry[] = [
  {
    topic: 'sleep',
    pages: [0, 0],
    headline: 'Sleep in short stretches',
    summary: 'Sleeping round the clock in short stretches, waking to feed',
    intro:
      "Newborns sleep a lot, in short stretches round the clock, and wake often to feed. Their rhythm of day and night hasn't settled yet. How you put them down to sleep matters most now.",
    now: {
      sweden: [
        { text: 'Wake several times a night', sources: ['1177-sleep'] },
        { text: 'Need feeds at night: most babies do until about 4 months', sources: ['1177-sleep'] },
      ],
      international: [{ text: 'Wake again and again at night for feeds', sources: ['nhs-sleep'] }],
    },
    tryTogether: {
      sweden: [
        'Put your baby to sleep on their back. It is the most important thing you can do to lower the risk of sudden infant death.',
        "Under 3 months, the safest place to sleep is your baby's own bed in your room. Feeding or cuddling in your bed is fine, but put them back in their own bed before anyone falls asleep.",
        'Keep blankets, pillows and toys away from their face, and dress them for the room: comfortably warm, not hot.',
        'Keep their air free of smoke, and if you breastfeed, avoid nicotine, snus included.',
      ],
      international: [
        'Put your baby to sleep on their back, with their feet at the foot of the crib, on a firm, flat mattress.',
        'Keep their crib in your room for every sleep until at least 6 months, with no pillows, bumpers, loose blankets or soft toys.',
        'Keep the room at 16 to 20 °C, and never put them to sleep near a heater or in direct sun.',
        "Never sleep with your baby on a sofa or armchair. Don't share a bed if anyone in it smokes, has drunk alcohol or taken drugs or drowsy medicine, or if your baby was born early or small.",
      ],
    },
    getHelp: {
      sweden: [
        { text: "Your baby seems very ill, or doesn't act like themselves: seek care straight away", sources: ['1177-crying', '1177-fever'] },
        { text: "Sleep is a struggle for your family and you'd like ideas or support", sources: ['1177-sleep'] },
      ],
      international: [
        { text: 'Your baby is floppy, hard to wake, or breathing fast or with difficulty: call your emergency number now', sources: ['nhs-urgent'] },
        { text: "Sleep is a struggle for your family and you'd like ideas or support", sources: ['nhs-sleep'] },
      ],
    },
    sources: ['1177-safe-sleep', 'nhs-sids'],
  },
  {
    topic: 'sleep',
    pages: [1, 3],
    headline: 'Day and night start to differ',
    summary: 'Waking at night is still common; longer stretches are coming',
    intro:
      'Waking several times a night is very common in the first months. Over the coming weeks many babies start to sleep longer stretches at night, but when varies a lot.',
    now: {
      sweden: [
        { text: 'Wake several times a night', sources: ['1177-sleep'] },
        { text: 'Still feed at night, for hunger and for closeness: most babies do until about 4 months', sources: ['1177-sleep'] },
        { text: 'Start sleeping longer stretches at night, from around 2 to 4 months', sources: ['1177-sleep'] },
      ],
      international: [
        { text: 'Wake at night for feeds', sources: ['nhs-sleep'] },
        { text: 'Need fewer feeds at night from around 3 months', sources: ['nhs-sleep'] },
      ],
    },
    tryTogether: {
      sweden: [
        'Put your baby to sleep on their back, with blankets, pillows and toys away from their face.',
        "Under 3 months, the safest place to sleep is your baby's own bed in your room; the risk falls as they get older and can turn over.",
        'Dress them for the room: comfortably warm, not hot.',
      ],
      international: [
        'Put your baby to sleep on their back, on a firm, flat mattress, in a crib in your room until at least 6 months.',
        'Start a simple, soothing bedtime routine whenever you like.',
        'Keep the room at 16 to 20 °C.',
      ],
    },
    getHelp: {
      sweden: [
        { text: "Your baby seems very ill, or doesn't act like themselves: seek care straight away", sources: ['1177-crying', '1177-fever'] },
        { text: "Sleep is a struggle for your family and you'd like ideas or support", sources: ['1177-sleep'] },
      ],
      international: [
        { text: 'Your baby is floppy, hard to wake, or breathing fast or with difficulty: call your emergency number now', sources: ['nhs-urgent'] },
        { text: "Sleep is a struggle for your family and you'd like ideas or support", sources: ['nhs-sleep'] },
      ],
    },
    sources: ['1177-safe-sleep', 'nhs-sids'],
  },
  {
    topic: 'sleep',
    pages: [4, 6],
    headline: 'Longer stretches at night',
    summary: 'Longer stretches at night for many, still on the back to sleep',
    intro:
      'Many babies now sleep longer stretches at night than in the first months, though plenty still wake. How much babies sleep varies a lot, so the range below is wide.',
    now: {
      sweden: [
        { text: 'Sleep longer stretches at night than in the first months', sources: ['1177-sleep'] },
        { text: 'Sleep 3 to 6 hours of the day, spread over their naps', sources: ['1177-sleep'] },
        { text: 'Still wake at night: some settle back by themselves, others need help', sources: ['1177-sleep'] },
        {
          text: "From about 4 to 6 months, many no longer need a feed at night if they're gaining weight well",
          sources: ['1177-sleep'],
        },
      ],
      international: [
        { text: 'Need fewer feeds at night than before', sources: ['nhs-sleep'] },
        { text: 'Sleep for 5 to 8 hours or more at night, for some', sources: ['nhs-sleep'] },
        { text: 'Still wake at night: when babies start sleeping through varies a lot', sources: ['nhs-sleep'] },
      ],
    },
    tryTogether: {
      sweden: [
        'Put your baby to sleep on their back, with blankets, pillows and toys away from their face.',
        'Dress them for the room: comfortably warm, not hot.',
      ],
      international: [
        'Put your baby to sleep on their back, on a firm, flat mattress, with no pillows, bumpers or soft toys in the crib.',
        'Keep their crib in your room for every sleep until at least 6 months.',
        'A short, calm bedtime routine, the same steps in the same order, helps many babies settle.',
      ],
    },
    getHelp: {
      sweden: [
        { text: "Sleep is a struggle for your family and you'd like ideas or support", sources: ['1177-sleep'] },
        { text: 'Your baby seems very ill, or is in a lot of pain', sources: ['1177-fever'] },
      ],
      international: [
        { text: "Sleep is a struggle for your family and you'd like ideas or support", sources: ['nhs-sleep'] },
        { text: 'Your baby is floppy, hard to wake, or breathing fast or with difficulty: call your emergency number now', sources: ['nhs-urgent'] },
      ],
    },
    sources: ['1177-safe-sleep', 'nhs-sids'],
  },
  {
    topic: 'sleep',
    pages: [7, 11],
    headline: 'Nights and naps',
    summary: 'Most sleep at night now; some still wake',
    intro:
      "Most of your baby's sleep now comes at night, with naps in the day. Some babies sleep through, others still wake, and both are common.",
    now: {
      sweden: [
        { text: 'Sleep 3 to 6 hours of the day, and 9 to 10 hours at night', sources: ['1177-sleep'] },
        { text: 'Still wake at night: some settle back by themselves, others need help', sources: ['1177-sleep'] },
        { text: 'Manage without a feed at night if they are gaining weight well', sources: ['1177-sleep'] },
        { text: 'Sleep less soundly for a while as they start to worry about being apart from you', sources: ['1177-development-6-12'] },
      ],
      international: [
        { text: 'No longer need feeds at night, for some', sources: ['nhs-sleep'] },
        { text: 'Wake from teething or hunger, for some', sources: ['nhs-sleep'] },
        { text: 'Still wake at night: when babies start sleeping through varies a lot', sources: ['nhs-sleep'] },
      ],
    },
    tryTogether: {
      sweden: [
        'Stopping night feeds? Offer water instead, help them eat more in the day, let another adult take the first nights, and comfort in other ways.',
        'Put your baby to sleep on their back, with blankets, pillows and toys away from their face.',
      ],
      international: [
        'Keep a simple, calm bedtime routine.',
        'Put your baby to sleep on their back on a firm, flat mattress until they can roll both ways by themselves.',
      ],
    },
    getHelp: {
      sweden: [
        { text: "Sleep is a struggle for your family and you'd like ideas or support", sources: ['1177-sleep'] },
        { text: "Your baby seems very ill, or doesn't act like themselves: seek care straight away", sources: ['1177-crying', '1177-fever'] },
      ],
      international: [
        { text: "Sleep is a struggle for your family and you'd like ideas or support", sources: ['nhs-sleep'] },
        { text: 'Your baby is floppy, hard to wake, or breathing fast or with difficulty: call your emergency number now', sources: ['nhs-urgent'] },
      ],
    },
    sources: ['1177-safe-sleep', 'nhs-sids'],
  },
  {
    topic: 'sleep',
    pages: [12, 15],
    headline: 'Toddler sleep',
    summary: { sweden: 'About 2 hours of sleep in the day for many', international: 'Most sleep at night, with naps in the day' },
    intro: {
      sweden:
        'Toddlers sleep most of their hours at night. A "full night" at this age often means about 5 hours in a row, so waking in between is still common.',
      international: 'Toddlers sleep most of their hours at night, with naps in the day. A calm, regular bedtime routine helps many settle.',
    },
    now: {
      sweden: [
        { text: 'Sleep about 2 hours of the day', sources: ['1177-sleep'] },
        { text: 'Sleep about 5 hours in a row at night, which counts as a full night at this age', sources: ['1177-sleep'] },
        { text: 'Sleep less settled for a while after starting preschool, for some', sources: ['1177-development-1-2'] },
      ],
      international: [
        { text: 'Sleep most of their hours at night', sources: ['nhs-sleep'] },
        { text: 'Still wake at night sometimes: when children sleep through varies a lot', sources: ['nhs-sleep'] },
      ],
    },
    tryTogether: {
      sweden: [
        'If waking at night wears you out, let another adult take some of the nights.',
        'Comfort them back to sleep in whatever way works: closeness, a diaper change, rocking.',
      ],
      international: ['Keep a simple, calm bedtime routine.'],
    },
    getHelp: {
      sweden: [{ text: "Sleep is a struggle for your family and you'd like ideas or support", sources: ['1177-sleep'] }],
      international: [{ text: "Sleep is a struggle for your family and you'd like ideas or support", sources: ['nhs-sleep'] }],
    },
    sources: [],
  },
  {
    topic: 'sleep',
    pages: [18, 24],
    headline: 'From two naps to one',
    summary: { sweden: 'Many go from two naps to one at about 1.5 to 2 years', international: 'Most sleep at night, with naps in the day' },
    intro: {
      sweden:
        'Many children go from two naps to one somewhere around 1.5 to 2 years. Sleep can be unsettled for a while after big changes, like starting preschool.',
      international: 'Most toddlers sleep their longest stretch at night, with naps in the day. A calm, regular bedtime routine helps many settle.',
    },
    now: {
      sweden: [
        { text: 'Go from two naps to one, many at about 1.5 to 2 years', sources: ['1177-sleep'] },
        { text: 'Sleep about 2 hours of the day', sources: ['1177-sleep'] },
        { text: 'Need extra closeness and sleep less settled for a while after starting preschool', sources: ['1177-development-1-2'] },
      ],
      international: [
        { text: 'Sleep most of their hours at night', sources: ['nhs-sleep'] },
        { text: 'Still wake at night sometimes', sources: ['nhs-sleep'] },
      ],
    },
    tryTogether: {
      sweden: [
        'If waking at night wears you out, take turns with the nights.',
        'Comfort them back to sleep in whatever way works for your family.',
      ],
      international: ['Keep a simple, calm bedtime routine.'],
    },
    getHelp: {
      sweden: [{ text: "Sleep is a struggle for your family and you'd like ideas or support", sources: ['1177-sleep'] }],
      international: [{ text: "Sleep is a struggle for your family and you'd like ideas or support", sources: ['nhs-sleep'] }],
    },
    sources: [],
  },
  {
    topic: 'sleep',
    pages: [30, 36],
    headline: 'Napping, or not',
    summary: { sweden: 'Some still nap; most have stopped by 5', international: 'Some still nap, some have stopped' },
    intro: {
      sweden:
        'Some children this age still nap and some have stopped; most have stopped by 5. Some sleep restlessly for a while and want a parent close at night.',
      international: 'Some children this age still nap and some have stopped. A calm, regular bedtime routine helps.',
    },
    now: {
      sweden: [
        { text: 'Still nap in the day, for some: most children have stopped by 5', sources: ['1177-sleep'] },
        { text: 'Sleep restlessly for a while, for some, and need a parent close', sources: ['1177-development-2-3'] },
      ],
      international: [
        { text: 'Still need a nap in the day, for some', sources: ['nhs-sleep'] },
        { text: 'Sleep most of their hours at night', sources: ['nhs-sleep'] },
      ],
    },
    tryTogether: {
      sweden: [
        "If your child seems to need a rest but doesn't fall asleep, a quiet rest of 25 to 45 minutes, well before bedtime, can be enough.",
      ],
      international: ['Keep a simple, calm bedtime routine.', 'Keep screens out of the bedroom.'],
    },
    getHelp: {
      sweden: [{ text: "Sleep is a struggle for your family and you'd like ideas or support", sources: ['1177-sleep'] }],
      international: [{ text: "Sleep is a struggle for your family and you'd like ideas or support", sources: ['nhs-sleep'] }],
    },
    sources: ['cdc-3-years'],
  },
];
