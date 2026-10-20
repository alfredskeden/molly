import type { GuidePage } from '../pages';
import type { PageText } from '../types';

/** Each page's own words: the overview's intro line, All ages' line and the Coming up card. */
export const PAGE_TEXTS: Partial<Record<GuidePage, PageText>> = {
  0: {
    overview:
      'The first weeks are about getting to know each other: feeding, sleeping and lots of closeness. Every baby is different, so take this as a rough guide.',
    oneLiner: 'First weeks home',
    comingUp: {
      sweden: 'Lifting the head for a moment, first smiles, and BVC visits at 6 and 8 weeks.',
      international: 'Lifting the head for a moment, first smiles, and a check-up at 6 to 8 weeks in many countries.',
    },
  },
  1: {
    overview: 'Your baby is waking up to the world: looking for faces, listening to your voice and, soon, smiling back.',
    oneLiner: 'First smiles',
    comingUp: 'Cooing, a steadier head, and a lot more looking around.',
  },
  2: {
    overview: 'Cooing, smiling and holding the head steadier: your baby is getting more social by the week.',
    oneLiner: 'Cooing and smiling',
    comingUp: {
      sweden: 'First laughs, reaching for toys, and vaccines at the 3-month BVC visit.',
      international: 'First laughs, reaching for toys, and turning to your voice.',
    },
  },
  3: {
    overview: 'Your baby is discovering their hands and feet, and the people around them.',
    oneLiner: 'Laughing and reaching',
    comingUp: {
      sweden: 'Grabbing toys, more babbling, and tiny tastes of food if your baby is curious.',
      international: 'Grabbing toys, more babbling, and a check-up around 4 months in many countries.',
    },
  },
  4: {
    overview: 'Babies this age reach, grab and explore everything with their mouths, and laugh more and more.',
    oneLiner: 'Grabbing and laughing',
    comingUp: 'Rolling, more varied babbling, and choosing their favourite people.',
  },
  5: {
    overview:
      'Babies this age are getting stronger and more curious about people. Every child moves at their own pace, so take this as a rough guide.',
    oneLiner: 'Rolling and babbling',
    comingUp: {
      sweden: 'Sitting with support, taste portions of food, and the BVC visit with the doctor.',
      international: 'Sitting with support, first solid foods, and a check-up in many countries.',
    },
  },
  6: {
    overview: {
      sweden: 'Half a year. Many babies now sit for a while, babble in syllables and try their first taste portions.',
      international: 'Half a year. Many babies now sit for a while, babble in syllables and start on solid food.',
    },
    oneLiner: 'Sitting, first foods',
    comingUp: 'Getting around in their own way, shyness with strangers, and lots of new tastes.',
  },
  7: {
    overview: 'Many babies are on the move now, in one way or another, and starting to tell familiar people from strangers.',
    oneLiner: 'On the move, shy with strangers',
    comingUp: 'Crawling or shuffling, pulling up, and understanding words before saying them.',
  },
  8: {
    overview: 'Your baby understands more every week, and wants to get to everything they can see.',
    oneLiner: 'Crawling and understanding',
    comingUp: {
      sweden: 'Pulling up to stand, finding hidden toys, and lots of peekaboo.',
      international: 'Pulling up to stand, finding hidden toys, and a check-up around 9 months in many countries.',
    },
  },
  9: {
    overview: 'Hidden toys, peekaboo and pulling up: your baby is busy learning how the world works.',
    oneLiner: 'Pulling up, peekaboo',
    comingUp: 'Walking along the furniture, waving bye-bye, and maybe a first word.',
  },
  10: {
    overview: 'Pointing, waving and standing up: your baby is getting ready for the next big steps.',
    oneLiner: 'Standing and pointing',
    comingUp: 'Cruising along the furniture, filling and emptying, and a will of their own.',
  },
  11: {
    overview: 'Nearly a year. Many babies now cruise along the furniture, and a few walk on their own.',
    oneLiner: 'Cruising, first words for some',
    comingUp: {
      sweden: 'First words for many, family food, and the 1-year visit and vaccines at BVC.',
      international: 'First words for many, family food, and a check-up around 1 year in many countries.',
    },
  },
  12: {
    overview: 'One year. Many children now say a first word, eat with the family and walk holding on, or alone.',
    oneLiner: 'First words, first steps',
    comingUp: 'Walking on their own for many, more words, and the first tantrums.',
  },
  15: {
    overview: 'Many children now take their first steps alone, and say a word or two along with lots of pointing.',
    oneLiner: 'First steps, first words',
    comingUp: {
      sweden: 'Walking steadily, a burst of new words, and the 18-month BVC visit with the MMR vaccine.',
      international: 'Walking steadily, a burst of new words, and a check-up around 18 months in many countries.',
    },
  },
  18: {
    overview: 'Walking, climbing and saying no: toddlers this age want to explore, and want you close while they do.',
    oneLiner: 'Walking, saying no',
    comingUp: 'More words every week, running, and pretend play.',
  },
  21: {
    overview: 'Words are coming fast for many children now, and pretend play is taking off.',
    oneLiner: 'A burst of words',
    comingUp: 'Two words together, running and kicking, and noticing how others feel.',
  },
  24: {
    overview: 'Two years. Many children now put two words together, run and kick a ball, and notice when others are sad.',
    oneLiner: 'Two-word sentences',
    comingUp: {
      sweden: 'Short sentences, jumping with both feet, and the BVC visit at 2.5 years, where language may be checked.',
      international: 'Short sentences, jumping with both feet, and a check-up around 30 months in many countries.',
    },
  },
  30: {
    overview: 'Two and a half. Language grows fast, and so does the wish to decide for themselves.',
    oneLiner: 'Short sentences, own will',
    comingUp: 'Real conversations, playing with other children, and getting dressed with some help.',
  },
  36: {
    overview: 'Three years. Many children now hold short conversations, play with others and do a lot by themselves. This is the last page of the guide.',
    oneLiner: 'Conversations, playing together',
    comingUp: null,
  },
};
