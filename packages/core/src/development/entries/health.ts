import type { TopicEntry } from '../types';

/**
 * Health: fever, teeth and everyday care. The check-ups and vaccines around each page come from `checkUps`,
 * the vitamin D line from `vitaminDLine`. Fever rules follow 1177's Swedish page (stricter than its English
 * one) for Sweden and the NHS elsewhere.
 */
export const HEALTH: TopicEntry[] = [
  {
    topic: 'health',
    pages: [0, 0],
    headline: 'First checks, and fever',
    summary: 'Newborn checks, and why any fever needs care straight away',
    intro: {
      sweden:
        'Your baby has their first checks at the hospital, then BVC takes over. Under 3 months, any fever is a reason to seek care straight away.',
      international:
        'Babies have a physical check in the first days after birth, and a hearing test. Under 3 months, a temperature of 38 °C or more needs urgent help.',
    },
    now: {
      sweden: [
        { text: 'Have a physical exam, a blood test (the PKU test) and a hearing test at the hospital in the first days', sources: ['rikshandboken-0-6-days'] },
        { text: 'Have a temperature of about 36 to 37.8 °C when well; a fever usually means 38 °C or more', sources: ['1177-fever'] },
      ],
      international: [
        { text: 'Have a physical check in the first days after birth, and in many countries a hearing test', sources: ['nhs-reviews'] },
        { text: 'Have a temperature below 38 °C when well: 38 °C or more counts as high', sources: ['nhs-fever'] },
      ],
    },
    tryTogether: {
      sweden: [
        "Take your baby's temperature in the bottom: under 1 year that's the most reliable way.",
        'Call 1177 or a health centre before giving any medicine to a baby under 6 months.',
      ],
      international: [
        'Paracetamol is not for babies under 2 months, and ibuprofen not for babies under 3 months: ask a doctor first.',
      ],
    },
    getHelp: {
      sweden: [
        { text: "Your baby is limp, won't feed, or cries or whimpers in a way that isn't like them: go to an emergency department straight away", sources: ['1177-colic'] },
        { text: 'Very hard to breathe, or skin and lips that look pale or bluish: call 112', sources: ['1177-breathing'] },
        { text: 'Your baby is under 3 months and has a fever: seek care straight away', sources: ['1177-fever'] },
        { text: 'Your baby seems very ill, refuses all drinks, or has a dry mouth and wets fewer diapers: seek care straight away', sources: ['1177-fever'] },
        { text: 'A fit with a fever: call 112', sources: ['1177-fever'] },
      ],
      international: [
        { text: 'A temperature of 38 °C or more under 3 months, or below 36 °C: get urgent help', sources: ['nhs-urgent'] },
        { text: 'Your baby is floppy, hard to wake, or has a weak, high-pitched or constant cry: call your emergency number now', sources: ['nhs-urgent'] },
        { text: 'Breathing fast or with difficulty, or skin, lips or tongue that look blue, grey, pale or blotchy: call your emergency number now', sources: ['nhs-urgent'] },
        { text: "A rash that doesn't fade when you press a glass against it: call your emergency number now", sources: ['nhs-urgent'] },
      ],
    },
    sources: [],
  },
  {
    topic: 'health',
    pages: [1, 2],
    headline: 'Check-ups, first vaccines and fever',
    summary: 'Check-ups and the first vaccines, and fever under 3 months',
    intro: {
      sweden:
        'Below are the BVC visits and vaccines around this age. Under 3 months, any fever is a reason to seek care straight away.',
      international:
        'Below are the check-ups and vaccines around this age. Under 3 months, a temperature of 38 °C or more needs urgent help.',
    },
    now: {
      sweden: [
        { text: 'Have a temperature of about 36 to 37.8 °C when well; a fever usually means 38 °C or more', sources: ['1177-fever'] },
        { text: 'Get vitamin D drops every day', sources: ['1177-food-0-1'] },
      ],
      international: [{ text: 'Have a temperature below 38 °C when well: 38 °C or more counts as high', sources: ['nhs-fever'] }],
    },
    tryTogether: {
      sweden: [
        "Take your baby's temperature in the bottom: under 1 year that's the most reliable way.",
        'Call 1177 or a health centre before giving any medicine to a baby under 6 months.',
      ],
      international: [
        'Paracetamol is not for babies under 2 months, and ibuprofen not for babies under 3 months: ask a doctor first.',
      ],
    },
    getHelp: {
      sweden: [
        { text: "Your baby is limp, won't feed, or cries or whimpers in a way that isn't like them: go to an emergency department straight away", sources: ['1177-colic'] },
        { text: 'Very hard to breathe, or skin and lips that look pale or bluish: call 112', sources: ['1177-breathing'] },
        { text: 'Your baby is under 3 months and has a fever: seek care straight away', sources: ['1177-fever'] },
        { text: 'Your baby seems very ill, refuses all drinks, or has a dry mouth and wets fewer diapers: seek care straight away', sources: ['1177-fever'] },
        { text: 'A fit with a fever: call 112', sources: ['1177-fever'] },
      ],
      international: [
        { text: 'A temperature of 38 °C or more under 3 months, or below 36 °C: get urgent help', sources: ['nhs-urgent'] },
        { text: 'Your baby is floppy, hard to wake, or has a weak, high-pitched or constant cry: call your emergency number now', sources: ['nhs-urgent'] },
        { text: 'Breathing fast or with difficulty, or skin, lips or tongue that look blue, grey, pale or blotchy: call your emergency number now', sources: ['nhs-urgent'] },
        { text: "A rash that doesn't fade when you press a glass against it: call your emergency number now", sources: ['nhs-urgent'] },
      ],
    },
    sources: [],
  },
  {
    topic: 'health',
    pages: [3, 5],
    headline: 'Check-ups, vaccines and fever',
    summary: 'Check-ups and vaccines, and when a fever needs a call',
    intro:
      "Below are the check-ups and vaccines around this age. Until 6 months, a fever is a reason to ask for advice sooner than in older children, so it's worth knowing when to call.",
    now: {
      sweden: [
        { text: 'Have a temperature of about 36 to 37.8 °C when well; a fever usually means 38 °C or more', sources: ['1177-fever'] },
        { text: 'Get their first teeth somewhere around 6 to 8 months; a few start earlier', sources: ['1177-teeth'] },
      ],
      international: [
        { text: 'Have a temperature below 38 °C when well: 38 °C or more counts as high', sources: ['nhs-fever'] },
        { text: 'Get their first teeth around 6 months; some start before 4 months, others after 12', sources: ['nhs-teething'] },
      ],
    },
    tryTogether: {
      sweden: [
        "Take your baby's temperature in the bottom: under 1 year that's the most reliable way.",
        'Call 1177 or a health centre before giving any medicine to a baby under 6 months.',
        'Give more to drink than usual when your baby has a fever.',
      ],
      international: [
        'Ask a pharmacist or doctor before giving medicine: paracetamol is not for babies under 2 months, and ibuprofen not for babies under 3 months or under 5 kg.',
        'Offer plenty to drink when your baby has a temperature.',
      ],
    },
    getHelp: {
      sweden: [
        { text: "Your baby is limp, won't feed, or cries or whimpers in a way that isn't like them: go to an emergency department straight away", sources: ['1177-colic'] },
        { text: 'Very hard to breathe, or skin and lips that look pale or bluish: call 112', sources: ['1177-breathing'] },
        { text: 'Your baby is under 6 months, has a fever and no signs of a cold at all: seek care straight away', sources: ['1177-fever'] },
        { text: "A temperature of 41 °C or more, or your baby seems very ill, is in a lot of pain or can't be comforted", sources: ['1177-fever'] },
        { text: 'Your baby refuses all drinks, or has a dry mouth and wets fewer diapers than usual', sources: ['1177-fever'] },
        { text: 'A fit with a fever for the first time: call 112', sources: ['1177-fever'] },
      ],
      international: [
        { text: 'A temperature of 39 °C or more between 3 and 6 months: get urgent help', sources: ['nhs-urgent', 'nhs-fever'] },
        { text: 'Your baby is floppy, hard to wake, or has a weak, high-pitched or constant cry: call your emergency number now', sources: ['nhs-urgent'] },
        { text: 'Breathing fast or with difficulty, or skin, lips or tongue that look blue, grey, pale or blotchy: call your emergency number now', sources: ['nhs-urgent'] },
        { text: "A rash that doesn't fade when you press a glass against it, or a seizure: call your emergency number now", sources: ['nhs-urgent', 'nhs-fever'] },
      ],
    },
    sources: [],
  },
  {
    topic: 'health',
    pages: [6, 11],
    headline: 'First teeth',
    summary: 'First teeth, brushing from the first one, and fever',
    intro: {
      sweden:
        'Most babies get their first teeth between 6 and 8 months, usually the two lower front teeth first. Brush from the very first tooth.',
      international:
        'Most babies start teething around 6 months, often with the bottom front teeth. Start brushing as soon as the first tooth comes through.',
    },
    now: {
      sweden: [
        {
          text: 'Get their first teeth, usually the two lower front ones, somewhere around 6 to 8 months; for some it takes another half year or more',
          sources: ['1177-teeth', 'rikshandboken-teeth'],
        },
        { text: 'Have sore, itchy gums and dribble more while teething, sometimes with a slight fever', sources: ['1177-teeth'] },
      ],
      international: [
        {
          text: 'Get front teeth around 6 months and the teeth beside them around 8 months; some start after 12 months',
          sources: ['nhs-teething'],
        },
        { text: 'Have sore red gums, a flushed cheek and more dribble while teething, with a temperature below 38 °C', sources: ['nhs-teething'] },
      ],
    },
    tryTogether: {
      sweden: [
        "Brush twice a day, after breakfast and before bed, with fluoride toothpaste no bigger than your child's little fingernail.",
        'Brushing is easier with your baby lying down, on the changing table or with their head in your lap.',
        'Rub sore gums gently with a clean finger, a soft toothbrush or a teething ring.',
      ],
      international: [
        'Brush at least twice a day, including just before bed, with a smear of fluoride toothpaste.',
        'Brush their teeth for them: children need an adult to help for years yet.',
      ],
    },
    getHelp: {
      sweden: [
        { text: "Your baby is limp, won't feed, or cries or whimpers in a way that isn't like them: go to an emergency department straight away", sources: ['1177-colic'] },
        { text: 'Very hard to breathe, or skin and lips that look pale or bluish: call 112', sources: ['1177-breathing'] },
        { text: 'Your baby seems to be in pain while teething, or has a fever: it may have another cause', sources: ['1177-teeth'] },
        { text: 'A temperature of 41 °C or more, or your baby seems very ill, refuses all drinks or seems to be drying out', sources: ['1177-fever'] },
        { text: 'A fever that lasts more than 4 days', sources: ['1177-fever'] },
        { text: 'A fit with a fever for the first time: call 112', sources: ['1177-fever'] },
      ],
      international: [
        { text: 'A temperature of 38 °C or more while teething: teething alone stays below that, so it may have another cause', sources: ['nhs-teething'] },
        { text: 'A high temperature that lasts 5 days or more', sources: ['nhs-fever'] },
        { text: 'Your baby is floppy, hard to wake, or breathing fast or with difficulty: call your emergency number now', sources: ['nhs-urgent'] },
        { text: "A rash that doesn't fade when you press a glass against it, or a seizure: call your emergency number now", sources: ['nhs-urgent'] },
      ],
    },
    sources: ['1177-brushing', 'nhs-baby-teeth'],
  },
  {
    topic: 'health',
    pages: [12, 18],
    headline: 'Back teeth, vaccines and fever',
    summary: 'Check-ups and vaccines, back teeth, and when a fever needs help',
    intro: {
      sweden:
        'Below are the BVC visits and vaccines around this age. The first back teeth come at about 1 to 1.5 years, and most children have all 20 milk teeth by 3.',
      international:
        'Below are the check-ups and vaccines around this age. The first molars come around 12 months and the pointed canines around 18 months.',
    },
    now: {
      sweden: [
        { text: 'Get their first back teeth at about 1 to 1.5 years', sources: ['1177-teeth'] },
        { text: 'Have a temperature of about 36 to 37.8 °C when well; a fever usually means 38 °C or more', sources: ['1177-fever'] },
      ],
      international: [
        { text: 'Get first molars around 12 months and canines around 18 months', sources: ['nhs-teething'] },
        { text: 'Have a temperature below 38 °C when well: 38 °C or more counts as high', sources: ['nhs-fever'] },
      ],
    },
    tryTogether: {
      sweden: [
        "Brush twice a day, after breakfast and before bed, with fluoride toothpaste no bigger than your child's little fingernail.",
        "A fever on its own needs no treatment if your child otherwise seems fine: fever medicine is for when they're uncomfortable, won't drink or can't settle.",
        'Give more to drink than usual when they have a fever.',
      ],
      international: [
        'Brush at least twice a day, including just before bed, with a smear of fluoride toothpaste.',
        'Never give aspirin to children.',
      ],
    },
    getHelp: {
      sweden: [
        { text: 'Very hard to breathe, or skin and lips that look pale or bluish: call 112', sources: ['1177-breathing'] },
        { text: 'No teeth at all by about 1.5 years', sources: ['1177-teeth'] },
        { text: 'A temperature of 41 °C or more, or your child seems very ill, refuses all drinks or seems to be drying out', sources: ['1177-fever'] },
        { text: 'A fever that lasts more than 4 days', sources: ['1177-fever'] },
        { text: 'A fit with a fever for the first time: call 112', sources: ['1177-fever'] },
      ],
      international: [
        { text: 'A high temperature that lasts 5 days or more', sources: ['nhs-fever'] },
        { text: 'Your child is floppy, hard to wake, or breathing fast or with difficulty: call your emergency number now', sources: ['nhs-urgent'] },
        { text: "A rash that doesn't fade when you press a glass against it, a stiff neck, or a seizure: call your emergency number now", sources: ['nhs-fever'] },
        { text: 'No drink for 8 hours while awake, or vomiting for 24 hours: get urgent help', sources: ['nhs-urgent'] },
      ],
    },
    sources: ['1177-brushing', 'nhs-baby-teeth'],
  },
  {
    topic: 'health',
    pages: [21, 36],
    headline: 'Teeth, fever and check-ups',
    summary: 'All the milk teeth by about 3, brushing, and when a fever needs help',
    intro: {
      sweden:
        'Below are the BVC visits around this age. Most children have all 20 milk teeth by 3. Vitamin D drops usually stop at 2, though some children need them for longer.',
      international:
        'Below are the check-ups and vaccines around this age. The back molars come around 2 years, and most children have all their milk teeth by 2 to 3.',
    },
    now: {
      sweden: [
        { text: 'Have all 20 milk teeth by about 3', sources: ['1177-teeth'] },
        { text: 'Keep getting vitamin D drops every day until 2; some need them for longer', sources: ['1177-food-0-1'] },
        { text: 'Have a temperature of about 36 to 37.8 °C when well; a fever usually means 38 °C or more', sources: ['1177-fever'] },
      ],
      international: [
        { text: 'Get their second molars around 24 months, with all the milk teeth by 2 to 3 years', sources: ['nhs-teething'] },
        { text: 'Have a temperature below 38 °C when well: 38 °C or more counts as high', sources: ['nhs-fever'] },
      ],
    },
    tryTogether: {
      sweden: [
        "Brush twice a day, after breakfast and before bed, with fluoride toothpaste no bigger than your child's little fingernail.",
        'Children need an adult to help them brush until about 10 to 12. An electric toothbrush can work from about 3 to 4.',
        "A fever on its own needs no treatment if your child otherwise seems fine: fever medicine is for when they're uncomfortable, won't drink or can't settle.",
      ],
      international: [
        'Brush twice a day with fluoride toothpaste: a smear until 3, then a pea-sized amount.',
        'From 3, help them spit the toothpaste out instead of rinsing.',
        'Never give aspirin to children.',
      ],
    },
    getHelp: {
      sweden: [
        { text: 'Very hard to breathe, or skin and lips that look pale or bluish: call 112', sources: ['1177-breathing'] },
        { text: 'A temperature of 41 °C or more, or your child seems very ill, refuses all drinks or seems to be drying out', sources: ['1177-fever'] },
        { text: 'A fever that lasts more than 4 days', sources: ['1177-fever'] },
        { text: 'A fit with a fever for the first time: call 112', sources: ['1177-fever'] },
      ],
      international: [
        { text: 'A high temperature that lasts 5 days or more', sources: ['nhs-fever'] },
        { text: 'Your child is floppy, hard to wake, or breathing fast or with difficulty: call your emergency number now', sources: ['nhs-urgent'] },
        { text: "A rash that doesn't fade when you press a glass against it, a stiff neck, or a seizure: call your emergency number now", sources: ['nhs-fever'] },
        { text: 'No drink for 8 hours while awake, or vomiting for 24 hours: get urgent help', sources: ['nhs-urgent'] },
      ],
    },
    sources: ['1177-brushing', 'nhs-baby-teeth'],
  },
];
