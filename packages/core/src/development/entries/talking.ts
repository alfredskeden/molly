import type { TopicEntry } from '../types';

/** Sounds and talking: 1177's development pages, Rikshandboken's language checks, CDC's checklists and the NHS. */
export const TALKING: TopicEntry[] = [
  {
    topic: 'talking',
    pages: [0, 0],
    headline: 'Listening from day one',
    summary: 'Hearing well, turning to sounds, knowing your voice',
    intro:
      'Most babies hear well from birth. Within days they can tell where a sound comes from, and they already prefer human voices, most of all familiar ones. Crying is how they tell you what they need.',
    now: [
      { text: 'Turn their head towards a sound', sources: ['1177-development-0-6'] },
      { text: 'Know familiar voices and prefer them to other sounds', sources: ['1177-development-0-6'] },
      { text: 'Calm to soft, rhythmic voices and songs, and startle at sharp, sudden noise', sources: ['1177-development-0-6'] },
      { text: 'Cry in different ways for different needs', sources: ['1177-development-0-6'] },
    ],
    tryTogether: [
      "Tell your baby what you're doing while you feed, change and bathe them.",
      'Hold them close and look at them while you talk: babies love watching faces.',
      'Sing to them. The rhythm helps them tune in to language.',
    ],
    getHelp: [
      { text: "Your baby doesn't seem to react to loud sounds", sources: ['cdc-2-months'] },
      { text: 'Something worries you: you know your child best', sources: ['cdc-2-months', '1177-development-0-6'] },
    ],
    sources: ['nhs-talk'],
  },
  {
    topic: 'talking',
    pages: [1, 1],
    headline: 'First answering sounds',
    summary: 'Asking for contact, first smiles and answering sounds',
    intro:
      'Your baby asks for contact with their eyes, voice and body. By around 6 to 8 weeks many smile and make contented sounds back when you talk to them, and the first coos follow.',
    now: [
      { text: 'Look at you when they want contact, and look away when they need a break', sources: ['1177-development-0-6'] },
      { text: 'Smile and make contented sounds back when you talk to them, by around 6 to 8 weeks', sources: ['rikshandboken-6-8-weeks'] },
      { text: 'Start cooing, like "ooo", towards 2 months', sources: ['1177-development-0-6'] },
    ],
    tryTogether: [
      'Lean in close when they look for your eyes: about 20 cm is where they see best.',
      'Copy their sounds and faces, then wait: give them time to answer.',
      'Say their name, and sing a short song.',
    ],
    getHelp: [
      { text: "By 6 to 8 weeks your baby doesn't smile or make sounds back when you talk to them", sources: ['rikshandboken-6-8-weeks'] },
      { text: "Your baby doesn't seem to react to loud sounds", sources: ['cdc-2-months'] },
      { text: 'Something worries you: you know your child best', sources: ['cdc-2-months', '1177-development-0-6'] },
    ],
    sources: ['nhs-talk'],
  },
  {
    topic: 'talking',
    pages: [2, 3],
    headline: 'Cooing and the first laugh',
    summary: 'Cooing, turning to your voice, first laughs',
    intro:
      'Cooing turns into a real back-and-forth: your baby makes a sound, you answer, they answer back. Around 3 months they turn to your voice on purpose, and many parents hear the first laugh soon after.',
    now: [
      { text: 'Make sounds other than crying', sources: ['cdc-2-months'] },
      { text: 'React to loud sounds', sources: ['cdc-2-months'] },
      { text: 'Coo with vowel sounds and try out new ones', sources: ['1177-development-0-6'] },
      { text: 'Turn their head towards a voice on purpose, from around 3 months', sources: ['1177-development-0-6'] },
      { text: 'Smile or babble back at you', sources: ['1177-development-0-6'] },
      { text: 'Give their first laugh, for many around 3 to 4 months', sources: ['1177-development-0-6'] },
    ],
    tryTogether: [
      'Copy their sounds back, and take turns "talking".',
      'Say the same little rhyme at the same moment every day, like at diaper changes.',
      "Tell them what you're doing and how you both feel.",
      'If you speak more than one language at home, use them: babies learn two languages the same way as one.',
    ],
    getHelp: [
      { text: "Your baby doesn't react to loud sounds", sources: ['cdc-2-months'] },
      { text: "Your baby doesn't answer with smiles or sounds when you talk to them", sources: ['rikshandboken-language'] },
      { text: 'Your baby has lost skills they once had', sources: ['cdc-2-months'] },
    ],
    sources: ['nhs-talk'],
  },
  {
    topic: 'talking',
    pages: [4, 5],
    headline: 'Babbling, laughing, turning to voices',
    summary: 'More varied babbling, laughing out loud, reacting to their name',
    intro:
      'Babbling gets more varied now, and many babies laugh out loud for the first time. What helps most is talking with your baby and answering when they try to talk to you.',
    now: [
      { text: 'Coo, and make sounds back when you talk to them', sources: ['cdc-4-months'] },
      { text: 'Turn their head towards your voice', sources: ['cdc-4-months'] },
      { text: 'Babble with consonants, like "ba", "ga" and "da"', sources: ['1177-development-0-6'] },
      { text: 'React when they hear their name', sources: ['1177-development-0-6'] },
      { text: 'Laugh out loud, many for the first time', sources: ['1177-development-0-6'] },
      { text: 'Hear from your voice whether you sound happy or cross', sources: ['1177-development-0-6'] },
    ],
    tryTogether: [
      'Answer the sounds your baby makes, then pause so they can answer back, like a conversation.',
      'Read, sing and say rhymes, and tell them about what you both can see.',
      'Give them toys that make different sounds.',
    ],
    getHelp: [
      { text: "Your baby doesn't answer with eye contact or sounds when you talk to them", sources: ['rikshandboken-language'] },
      { text: 'Your baby has lost skills they once had', sources: ['cdc-4-months'] },
      { text: "Something worries you, even if it's hard to say what: you know your child best", sources: ['cdc-4-months', '1177-development-0-6'] },
    ],
    sources: ['nhs-talk'],
  },
  {
    topic: 'talking',
    pages: [6, 7],
    headline: 'Ma-ma-ma, ba-ba-ba',
    summary: 'Babbling in syllables, understanding a few words',
    intro:
      'Babbling now comes in syllables, like "ma-ma-ma" and "ba-ba-ba", and your baby copies the sounds of the language around them. They begin to understand a few words, like "no", though acting on it comes later.',
    now: [
      { text: 'Take turns making sounds with you', sources: ['cdc-6-months'] },
      { text: 'Blow raspberries and squeal', sources: ['cdc-6-months'] },
      { text: 'Babble in syllables, like "ma-ma-ma" and "ba-ba-ba"', sources: ['1177-development-6-12'] },
      { text: 'React to their name', sources: ['1177-development-6-12'] },
      { text: 'Understand a few words, like "no"', sources: ['1177-development-6-12'] },
      { text: "Use their voice to show they're happy or cross", sources: ['1177-development-6-12'] },
    ],
    tryTogether: [
      'Answer their babble as if it were talk.',
      'Look at board books together: point, name what you see, and follow where they look.',
      'Roll a ball back and forth and say whose turn it is.',
      'If your baby has a pacifier, keep it for sleep: it is hard to babble with one in.',
    ],
    getHelp: [
      { text: "Your baby doesn't answer with eye contact or sounds when you talk to them", sources: ['rikshandboken-6-months'] },
      { text: "By 8 months your baby doesn't babble, isn't interested in voices or doesn't react to sounds", sources: ['rikshandboken-language'] },
      { text: 'Your baby has lost skills they once had', sources: ['cdc-6-months'] },
    ],
    sources: ['nhs-talk'],
  },
  {
    topic: 'talking',
    pages: [8, 9],
    headline: 'Understanding before talking',
    summary: 'Lots of babble, understanding words, arms up to be picked up',
    intro:
      'Many babies now understand words long before they can say them: they turn to look when you name the dog or the teddy. Babble can sound almost like words, so answer with the real word.',
    now: [
      { text: 'Make lots of different sounds, like "mamamama" and "babababa"', sources: ['cdc-9-months'] },
      { text: 'Lift their arms up to be picked up', sources: ['cdc-9-months'] },
      { text: 'Look when you call their name', sources: ['cdc-9-months'] },
      { text: 'Understand words before they can say them, turning to things you name', sources: ['1177-development-6-12'] },
      { text: 'Shake their head for no, for some', sources: ['1177-development-6-12'] },
      { text: 'Say a first word, for a few', sources: ['1177-development-6-12'] },
    ],
    tryTogether: [
      'Repeat their sounds and turn them into words: "ba-ba-ba" can become "ball".',
      'Wave bye-bye and shake your head for no, so they can copy you.',
      'Name what they look at, and the pictures in books.',
      'Tell them what comes next in the day.',
    ],
    getHelp: [
      { text: "Your baby doesn't babble, isn't interested in voices, or doesn't react to sounds", sources: ['rikshandboken-language'] },
      { text: "Your baby doesn't look when you call their name", sources: ['cdc-9-months'] },
      { text: 'Your baby has lost skills they once had', sources: ['cdc-9-months'] },
    ],
    sources: ['nhs-talk'],
  },
  {
    topic: 'talking',
    pages: [10, 11],
    headline: 'Pointing and first words',
    summary: 'Pointing, waving bye-bye, first words for some',
    intro:
      'Pointing, showing and waving become ways to talk. First real words come around the first birthday for many, but some say them at 10 months and others not until 17 months or later.',
    now: [
      { text: 'Babble in syllables, like "ba", "ba-ba-ba" and "na-na"', sources: ['rikshandboken-language'] },
      { text: 'Ask for things by pointing or reaching and looking at you', sources: ['rikshandboken-language'] },
      { text: 'Understand several words, like when you ask "Where is the lamp?"', sources: ['rikshandboken-language'] },
      { text: 'Point at things: some start at 8 months, others at 16', sources: ['1177-development-6-12'] },
      { text: 'Wave bye-bye, and follow simple requests like "give me"', sources: ['1177-development-6-12'] },
      { text: 'Say a first word, for some', sources: ['1177-development-6-12'] },
    ],
    tryTogether: [
      'Answer their pointing and gestures as if they meant a little more.',
      'Sing songs with animal sounds, and rhymes where they can fill in a word or a movement.',
      'If they use a pacifier, aim to stop by 12 months: it is hard to learn to talk with one in.',
    ],
    getHelp: [
      { text: "By 10 months your baby doesn't babble in syllables", sources: ['rikshandboken-language'] },
      { text: "Your baby doesn't copy you, doesn't seem to understand any words, or doesn't enjoy peekaboo", sources: ['rikshandboken-language', 'rikshandboken-10-months'] },
      { text: 'Your baby has lost skills they once had', sources: ['cdc-9-months'] },
    ],
    sources: ['nhs-talk'],
  },
  {
    topic: 'talking',
    pages: [12, 12],
    headline: 'Mama, dada, bye-bye',
    summary: 'First words for many, understanding no, waving',
    intro:
      'Many children say their first words around their first birthday, often the names of important people and things. A single word can stand for a whole sentence: "Daddy" might mean "Daddy, I want food".',
    now: [
      { text: 'Wave bye-bye', sources: ['cdc-1-year'] },
      { text: 'Call a parent "mama" or "dada" or another special name', sources: ['cdc-1-year'] },
      { text: 'Understand "no", pausing or stopping when you say it', sources: ['cdc-1-year'] },
      { text: 'Point and make sounds at the same time', sources: ['1177-development-6-12'] },
      { text: 'Understand much more than they can say', sources: ['1177-development-1-2'] },
    ],
    tryTogether: [
      'Build on what they say: when they say "ta", answer "Yes, a truck".',
      'Name what they point at.',
      'Read picture books with flaps and textures.',
      'Keep screens away until 2: children learn to talk from people.',
    ],
    getHelp: [
      { text: "Your child doesn't babble with varied sounds, or doesn't use gestures and eye contact to communicate", sources: ['rikshandboken-language'] },
      { text: "Your child isn't interested in voices or doesn't react to sounds", sources: ['rikshandboken-language'] },
      { text: 'Your child has lost skills they once had', sources: ['cdc-1-year'] },
    ],
    sources: ['nhs-talk'],
  },
  {
    topic: 'talking',
    pages: [15, 15],
    headline: 'Words and gestures',
    summary: 'One or two words, pointing to ask, following simple directions',
    intro:
      'Your child understands far more than they can say. Much of their talking is still gestures and pointing, now joined by a word or two. How many words children use at this age varies a lot.',
    now: [
      { text: 'Try to say one or two words besides "mama" or "dada", like "ba" for ball', sources: ['cdc-15-months'] },
      { text: 'Look at a familiar thing when you name it', sources: ['cdc-15-months'] },
      { text: 'Follow directions given with both a gesture and words', sources: ['cdc-15-months'] },
      { text: 'Point to ask for something or to get help', sources: ['cdc-15-months'] },
      { text: 'Use one word for a lot, like "doggie" for every four-legged animal', sources: ['1177-development-1-2'] },
    ],
    tryTogether: [
      'Name what they point at, then wait a few seconds for a sound before you hand it over.',
      'When they say a word wrong, say it back the right way without correcting them: "Yes, a dog."',
      'Offer choices: "Milk or water?"',
      'Action songs and nursery rhymes.',
    ],
    getHelp: [
      { text: "Your child doesn't use gestures or eye contact to communicate", sources: ['rikshandboken-language'] },
      { text: "Your child isn't interested in voices or doesn't react to sounds", sources: ['rikshandboken-language'] },
      { text: 'Your child has lost skills they once had', sources: ['cdc-15-months'] },
    ],
    sources: ['nhs-talk'],
  },
  {
    topic: 'talking',
    pages: [18, 21],
    headline: 'A burst of words',
    summary: 'More words every week, following simple requests',
    intro:
      'Many children have a burst of new words somewhere between 18 months and 2 years. Understanding is still well ahead of talking: most understand far more words than they say.',
    now: [
      { text: 'Try to say three or more words besides "mama" or "dada"', sources: ['cdc-18-months'] },
      { text: 'Follow one-step directions without gestures, like "Give it to me"', sources: ['cdc-18-months'] },
      { text: 'Use about 8 to 10 words or more, animal and car sounds included', sources: ['rikshandboken-language'] },
      { text: 'Point to parts of the body when you ask', sources: ['rikshandboken-language', '1177-development-1-2'] },
      { text: 'Pretend, like feeding a teddy', sources: ['rikshandboken-language'] },
      { text: 'Learn lots of new words quickly, for many between 18 months and 2 years', sources: ['1177-development-1-2'] },
    ],
    tryTogether: [
      'Build on their words: when they say "car", answer "Yes, a red car".',
      'Talk face to face, down at their eye level.',
      'Give short, simple instructions, like "Find your shoes".',
      'Play "Where is your nose?"',
    ],
    getHelp: [
      {
        text: "By 18 months your child uses fewer than about 8 to 10 words, seems to understand only a few, or doesn't follow simple requests",
        sources: ['rikshandboken-language'],
      },
      { text: "Your child doesn't pretend at all, like feeding a doll or talking on a toy phone", sources: ['rikshandboken-language'] },
      { text: 'Your child has lost skills they once had', sources: ['cdc-18-months'] },
    ],
    sources: ['nhs-talk'],
  },
  {
    topic: 'talking',
    pages: [24, 24],
    headline: 'Two words together',
    summary: 'Two-word sentences, lots of new words, pointing in books',
    intro:
      'Around 2, many children put two words together, like "more milk". Some know 50 words, others several hundred: the range is wide.',
    now: [
      { text: 'Say at least two words together, like "More milk"', sources: ['cdc-2-years'] },
      { text: 'Point to things in a book when you ask, like "Where is the bear?"', sources: ['cdc-2-years'] },
      { text: 'Point to at least two parts of the body when you ask', sources: ['cdc-2-years'] },
      { text: 'Use more gestures than waving and pointing, like blowing a kiss or nodding yes', sources: ['cdc-2-years'] },
      { text: 'Know anywhere from about 50 to several hundred words', sources: ['1177-development-1-2'] },
    ],
    tryTogether: [
      'Say their words back the right way, so they hear how they sound.',
      'Answer with a sentence a little longer than theirs.',
      'Switch off background TV and radio when you talk together.',
      'Read together every evening if you can.',
    ],
    getHelp: [
      { text: "Your child doesn't put two words together yet", sources: ['rikshandboken-language-development'] },
      { text: "Your child doesn't seem to understand simple requests", sources: ['rikshandboken-language'] },
      { text: 'Your child has lost skills they once had', sources: ['cdc-2-years'] },
    ],
    sources: ['1177-development-2-3', 'nhs-talk'],
  },
  {
    topic: 'talking',
    pages: [30, 30],
    headline: 'Short sentences',
    summary: 'About 50 words, short sentences, words like I and me',
    intro:
      'Language grows fast at this age: short sentences, words like "I" and "me", and lots of "What is that?". Mixing up sounds in words is common, and usually sorts itself out.',
    now: [
      { text: 'Say about 50 words', sources: ['cdc-30-months'] },
      { text: 'Say two or more words together with an action word, like "Doggie run"', sources: ['cdc-30-months'] },
      { text: 'Name things in a book when you point and ask "What is this?"', sources: ['cdc-30-months'] },
      { text: 'Say words like "I", "me" or "we"', sources: ['cdc-30-months'] },
      { text: 'Mix up sounds in words, which usually sorts itself out', sources: ['1177-development-2-3'] },
    ],
    tryTogether: [
      'Skip correcting mistakes: just say the word the right way yourself.',
      'Describe things: big and small, fast and slow, on and off.',
      'Ask simple questions about the books you read.',
    ],
    getHelp: [
      { text: "Your child uses fewer than about 25 words, or doesn't put two words together", sources: ['rikshandboken-language'] },
      { text: "Your child doesn't understand simple requests", sources: ['rikshandboken-language'] },
      { text: 'Even you find your child very hard to understand', sources: ['rikshandboken-language'] },
      { text: 'Your child has lost skills they once had', sources: ['cdc-30-months'] },
    ],
    sources: ['nhs-talk'],
  },
  {
    topic: 'talking',
    pages: [36, 36],
    headline: 'Real conversations',
    summary: 'Short conversations, why questions, understood by most people',
    intro:
      'Three-year-olds hold short conversations, ask lots of questions and make sentences of three to six words. The family usually understands most of what they say.',
    now: [
      { text: 'Talk with you in a conversation of at least two back-and-forths', sources: ['cdc-3-years'] },
      { text: 'Ask "who", "what", "where" or "why" questions', sources: ['cdc-3-years'] },
      { text: 'Say their first name when asked', sources: ['cdc-3-years'] },
      { text: 'Talk well enough for others to understand them most of the time', sources: ['cdc-3-years'] },
      { text: 'Understand instructions in two or three parts, and words like in, on and under', sources: ['1177-development-2-3'] },
    ],
    tryTogether: [
      'Talk about feelings and give them words for them.',
      'Ask "What is happening?" and "What happens next?" about books.',
      'Use slightly longer sentences than theirs, and repeat what they say in grown-up words.',
    ],
    getHelp: [
      { text: "Your child uses fewer than about 50 words, or doesn't put three words together", sources: ['rikshandboken-language'] },
      { text: "Your child doesn't understand two-step instructions, or words like in and on", sources: ['rikshandboken-language'] },
      { text: 'Only one of you, or a brother or sister, can understand your child', sources: ['rikshandboken-language'] },
      { text: 'Your child stutters, drools a lot, or has trouble chewing and swallowing', sources: ['rikshandboken-language'] },
      { text: 'Your child has lost skills they once had', sources: ['cdc-3-years'] },
    ],
    sources: ['nhs-talk'],
  },
];
