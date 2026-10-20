import type { TopicEntry } from '../types';

/** Feelings and social: 1177's development and crying pages, Rikshandboken, CDC's checklists and the NHS. */
export const FEELINGS: TopicEntry[] = [
  {
    topic: 'feelings',
    pages: [0, 1],
    headline: 'Closeness first',
    summary: 'Crying for closeness, first smiles, looking for your face',
    intro:
      'In the first weeks, crying is how your baby asks for closeness, food and comfort. Some crying without a clear reason is common, often in the evening. Holding and comforting a baby never spoils them.',
    now: [
      { text: 'Look for contact with their eyes, voice and body', sources: ['1177-development-0-6'] },
      { text: 'Smile back at you, from around 5 to 8 weeks', sources: ['1177-development-0-6', 'rikshandboken-social'] },
      { text: 'Startle or cry at sudden sounds or quick movements near their face', sources: ['1177-development-0-6'] },
      { text: 'Cry more from around 2 weeks, often in the evening, with the crying easing around 3 months', sources: ['nhs-crying', '1177-crying'] },
      {
        text: 'Have colic, for some: hours of hard crying, often at the same time of day, mostly between 2 weeks and 4 or 5 months',
        sources: ['1177-colic', 'nhs-colic'],
      },
    ],
    tryTogether: [
      "Hold your baby close and answer their crying: you can't spoil a baby this way.",
      'If they seem overwhelmed, lay them down safely and step back a little.',
      'Share the soothing with another adult when you can.',
      'Never shake a baby. If it gets too much, put your baby down somewhere safe, like the crib, and leave the room for a few minutes to calm down.',
    ],
    getHelp: [
      { text: 'Your baby cries intensely or in bursts, is upset most of the day, or cries a lot and feeds poorly', sources: ['1177-development-0-6'] },
      { text: "Your baby's cry sounds different, weak or high-pitched, or they don't seem like themselves: seek care straight away", sources: ['nhs-crying', '1177-crying'] },
      { text: "By 6 to 8 weeks your baby doesn't smile or make sounds back when you talk to them", sources: ['rikshandboken-6-8-weeks'] },
      { text: "You're so frustrated or angry with the crying that you need someone to talk to", sources: ['1177-crying'] },
    ],
    sources: ['nhs-crying'],
  },
  {
    topic: 'feelings',
    pages: [2, 3],
    headline: 'Smiles for their people',
    summary: 'Smiling at family, knowing routines, needing breaks',
    intro:
      'Your baby starts to recognise people, things and routines, and shows feelings more clearly: smiles for the family, protest when put down. Close play tires them quickly, so watch for the signs they need a break.',
    now: [
      { text: 'Smile when you talk to or smile at them', sources: ['cdc-2-months'] },
      { text: 'Seem happy to see you when you walk up', sources: ['cdc-2-months'] },
      { text: 'Calm down when spoken to or picked up', sources: ['cdc-2-months'] },
      { text: 'Expect familiar routines, like bath time and diaper changes', sources: ['1177-development-0-6'] },
      { text: 'Show they need a break by yawning, turning their head away or closing their eyes', sources: ['1177-development-0-6'] },
    ],
    tryTogether: [
      'Smile, sound cheerful, and make your expressions big and clear.',
      "Watch for when they've had enough, and let them rest.",
      'Help them soothe themselves, for example by sucking on their fingers.',
      'Never shake a baby. If the crying gets too much, put your baby down somewhere safe and take a few minutes in another room.',
    ],
    getHelp: [
      { text: "Your baby doesn't look at your face or smile when you smile at them", sources: ['cdc-2-months', 'rikshandboken-6-8-weeks'] },
      { text: 'You think your baby may have colic, or you need support to cope with the crying', sources: ['1177-crying'] },
      {
        text: "Your baby cries in hard bursts and can't be comforted, or isn't acting like themselves: get emergency care straight away, above all in the week after rotavirus drops",
        sources: ['1177-crying', '1177-colic'] },
      { text: 'Your baby has lost skills they once had', sources: ['cdc-2-months'] },
    ],
    sources: ['nhs-colic'],
  },
  {
    topic: 'feelings',
    pages: [4, 5],
    headline: 'Choosing their people',
    summary: 'Showing who they want close, expecting an answer',
    intro:
      "Your baby now shows more clearly who they want to be close to, and may stop smiling at everyone. They're also finding out that they can make things happen: when they call, someone comes.",
    now: [
      { text: 'Smile on their own to get your attention', sources: ['cdc-4-months'] },
      { text: 'Look at you, move or make sounds to get or keep your attention', sources: ['cdc-4-months'] },
      { text: 'Show more clearly who they want to be close to', sources: ['1177-development-0-6'] },
      { text: 'Calm down when they see or hear you, even from across the room', sources: ['1177-development-0-6'] },
      { text: 'Expect a smile or a sound back when they smile or babble', sources: ['1177-development-0-6'] },
    ],
    tryTogether: [
      "Show your joy when they're happy: smile, laugh and talk back.",
      'Keep a rhythm of play and rest through the day.',
      "When they're upset, comfort them with holding, rocking, a soft voice or a song.",
    ],
    getHelp: [
      { text: "Your baby doesn't answer with eye contact or sounds when you talk to them", sources: ['rikshandboken-language'] },
      { text: "Your baby cries most of the day, can't be comforted, or cries differently from usual", sources: ['1177-crying', 'nhs-crying'] },
      { text: 'Your baby has lost skills they once had', sources: ['cdc-4-months'] },
      {
        text: 'You feel low yourself: how you feel affects how you and your baby connect, and there is help for you too',
        sources: ['1177-development-0-6'],
      },
    ],
    sources: ['nhs-crying'],
  },
  {
    topic: 'feelings',
    pages: [6, 7],
    headline: 'Shy with strangers',
    summary: 'Knowing familiar people, shy with others, wanting you close',
    intro:
      "Many babies now get a bit shy or worried around unfamiliar people, even ones they've met before. It shows they've learned that you are their safe place, and it usually passes.",
    now: [
      { text: 'Know familiar people', sources: ['cdc-6-months'] },
      { text: 'Like looking at themselves in a mirror', sources: ['cdc-6-months'] },
      { text: 'Laugh', sources: ['cdc-6-months'] },
      { text: 'Get shy or worried with people they know less well', sources: ['1177-development-6-12'] },
      { text: 'Protest when you leave, and be harder for others to comfort', sources: ['1177-development-6-12'] },
      { text: 'Find comfort in a soft toy or blanket, for some', sources: ['1177-development-6-12'] },
    ],
    tryTogether: [
      'Let your baby meet new people and places at their own pace, from your arms if they like.',
      "Read their moods: take a break and comfort them when they're upset.",
      'Keep familiar routines: they help when sleep gets less settled.',
    ],
    getHelp: [
      { text: "Your baby doesn't answer with eye contact or sounds when you talk to them", sources: ['rikshandboken-6-months'] },
      { text: "Your baby doesn't seem to know familiar people, or shows little interest in people", sources: ['cdc-6-months'] },
      { text: 'Your baby has lost skills they once had', sources: ['cdc-6-months'] },
    ],
    sources: ['nhs-crying'],
  },
  {
    topic: 'feelings',
    pages: [8, 9],
    headline: 'Missing you',
    summary: 'Shy with strangers, upset when you leave, many expressions',
    intro:
      'Your baby may now worry when you leave and follow you out of the room. Fear of strangers and of being apart is part of development: it helps them explore at a safe pace, and it eases with time.',
    now: [
      { text: 'Be shy, clingy or fearful around strangers', sources: ['cdc-9-months'] },
      { text: 'Show many faces: happy, sad, angry and surprised', sources: ['cdc-9-months'] },
      { text: 'React when you leave: look, reach for you or cry', sources: ['cdc-9-months'] },
      { text: 'Smile or laugh at peekaboo', sources: ['cdc-9-months'] },
      { text: 'Show frustration by throwing things or pulling faces', sources: ['1177-development-6-12'] },
    ],
    tryTogether: [
      'Say a quick, cheerful goodbye instead of sneaking away.',
      'Show with your words, face and voice what you think they feel.',
      'Keep familiar routines: many babies this age expect them.',
    ],
    getHelp: [
      { text: "Your baby shows little interest in people, or doesn't seek comfort from you", sources: ['rikshandboken-social-atypical'] },
      { text: "Your baby doesn't look when you call their name", sources: ['cdc-9-months'] },
      { text: 'Your baby has lost skills they once had', sources: ['cdc-9-months'] },
    ],
    sources: ['rikshandboken-social'],
  },
  {
    topic: 'feelings',
    pages: [10, 12],
    headline: 'A will of their own',
    summary: 'Reading your face, copying you, wanting to do it themselves',
    intro:
      "Your child now shares other people's feelings and takes cues from you: after a tumble, your calm face can keep them calm. Their own will grows too: they want to do things themselves, and are proud when they can.",
    now: [
      { text: 'Play games with you, like pat-a-cake', sources: ['cdc-1-year'] },
      { text: 'Look at your face to work out how to react, for example after a tumble', sources: ['1177-development-6-12'] },
      { text: 'Expect someone to come when they call', sources: ['1177-development-6-12'] },
      { text: 'Want to be where you are, and copy what you do', sources: ['1177-development-6-12'] },
      { text: 'Protest when you help, and feel proud when they manage', sources: ['1177-development-6-12'] },
      { text: 'Get less afraid of strangers, for many', sources: ['1177-development-6-12'] },
    ],
    tryTogether: [
      "Stay calm when they're upset: children learn to calm down from calm adults.",
      "Show them what you'd like them to do, and praise it when they do.",
      'Give them time to get to know a new caregiver, and bring a favourite toy along.',
      'Let them help, like fetching things for you.',
    ],
    getHelp: [
      { text: "Your child shows little interest in people, or doesn't seek or accept comfort", sources: ['rikshandboken-social-atypical'] },
      { text: "Your child doesn't use gestures or eye contact to communicate", sources: ['rikshandboken-language'] },
      { text: 'Your child has lost skills they once had', sources: ['cdc-1-year'] },
    ],
    sources: ['rikshandboken-social'],
  },
  {
    topic: 'feelings',
    pages: [15, 18],
    headline: 'Big feelings, few words',
    summary: 'Affection, first tantrums, needing you close',
    intro:
      'Toddlers feel a lot and cannot yet put it into words, so tantrums are common, often when tired or hungry. Around 18 months many protest more, and become more sensitive to being apart from you again.',
    now: [
      { text: 'Show affection with hugs, cuddles or kisses', sources: ['cdc-15-months'] },
      { text: 'Show you something they like', sources: ['cdc-15-months'] },
      { text: 'Move away from you, but look back to check you are close', sources: ['cdc-18-months'] },
      { text: 'Point to show you something interesting', sources: ['cdc-18-months'] },
      { text: 'Have tantrums, more often when tired or hungry', sources: ['cdc-15-months', 'nhs-tantrums'] },
      { text: 'Say "no" and want their own way, especially around 18 months', sources: ['rikshandboken-defiance', '1177-development-1-2'] },
    ],
    tryTogether: [
      'Name their feelings: "You are angry because the tower fell."',
      'Distract them, offer two choices, or swap a taken thing for another.',
      'Stay calm and close during a tantrum, and help them calm down before you talk about it.',
      'Warn them before changes, like leaving the park or going to bed.',
      'Do the same little routine at every drop-off and pick-up.',
    ],
    getHelp: [
      { text: "Your child shows little interest in people, or doesn't seek or accept comfort", sources: ['rikshandboken-social-atypical'] },
      { text: "By 18 months your child doesn't point to show you things", sources: ['cdc-18-months'] },
      { text: 'Your child has lost skills they once had', sources: ['cdc-18-months'] },
    ],
    sources: ['rikshandboken-social'],
  },
  {
    topic: 'feelings',
    pages: [21, 24],
    headline: 'Noticing others',
    summary: 'Caring when others are upset, checking your face, playing side by side',
    intro:
      'Around 2, children start to notice when others are hurt or sad, and look to you to know how to react. They play beside other children, but sharing and taking turns are still too hard to manage alone.',
    now: [
      { text: 'Notice when others are hurt or upset, like pausing or looking sad when someone cries', sources: ['cdc-2-years'] },
      { text: 'Look at your face to see how to react in a new situation', sources: ['cdc-2-years'] },
      { text: 'Play beside other children, but not yet share or solve problems with them', sources: ['cdc-2-years'] },
      { text: 'Want to do things themselves, often more than they can', sources: ['1177-development-2-3'] },
      { text: 'Swing quickly between moods, from hugs to outbursts', sources: ['1177-development-2-3'] },
    ],
    tryTogether: [
      'Show them how to share and take turns, and help them do it.',
      'Notice and praise what goes well more than what goes wrong.',
      'Tell them what is about to happen, and describe what is going on.',
      'If you get too angry, step away and let another adult take over, then make up quickly.',
    ],
    getHelp: [
      { text: 'Your child shows little interest in other children or in people', sources: ['rikshandboken-social-atypical'] },
      {
        text: 'Your child reacts very strongly to sounds, tastes or smells, has very intense or narrow interests, or repeats the same movements a lot',
        sources: ['rikshandboken-social-atypical'],
      },
      { text: 'Your child has lost skills they once had', sources: ['cdc-2-years'] },
    ],
    sources: ['rikshandboken-social'],
  },
  {
    topic: 'feelings',
    pages: [30, 36],
    headline: 'I can do it myself',
    summary: 'Independence, outbursts, and wanting to play with others',
    intro:
      'Wanting to decide for themselves often peaks again around 2.5 to 3 years, with more protests and outbursts. It usually settles by about 4. Most preschool children have outbursts sometimes.',
    now: [
      { text: 'Show you what they can do, saying "Look at me"', sources: ['cdc-30-months'] },
      { text: 'Follow simple routines when told, like helping to tidy up', sources: ['cdc-30-months'] },
      { text: 'Calm down within 10 minutes after you leave, like at a preschool drop-off', sources: ['cdc-3-years'] },
      { text: 'Have outbursts: about 9 in 10 preschool children do, and about 1 in 10 every day', sources: ['rikshandboken-defiance'] },
      { text: 'Want to play with other children, not just beside them', sources: ['rikshandboken-social'] },
    ],
    tryTogether: [
      'Meet the feeling first: name it briefly, in a calm voice and few words.',
      'Stay close while they calm down: young children need an adult nearby to manage big feelings.',
      'Give lots of positive attention, and 10 to 15 minutes a day of play they lead.',
      'Help them with worries: deep breaths, a favourite toy, a quiet safe spot.',
    ],
    getHelp: [
      { text: 'Outbursts are long, hard to predict or destructive, or come many times a day', sources: ['rikshandboken-defiance'] },
      { text: 'By 3, your child is still very afraid every time you leave, or worries all the time that something will happen to you', sources: ['rikshandboken-social-atypical'] },
      { text: 'Your child is so shy they avoid most people and places, or talks at home but has stayed silent at preschool for months', sources: ['rikshandboken-social-atypical'] },
      { text: 'Your child has lost skills they once had', sources: ['cdc-3-years'] },
    ],
    sources: ['nhs-tantrums'],
  },
];
