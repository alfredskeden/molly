import type { TopicEntry } from '../types';

/** Play and senses: 1177's development and play pages, CDC's checklists, the NHS's play ideas. */
export const PLAY: TopicEntry[] = [
  {
    topic: 'play',
    pages: [0, 1],
    headline: 'Faces are the best toy',
    summary: 'Faces, strong contrasts and movement, close up',
    intro:
      "Your baby's touch, smell and taste are ready from birth. Sight is the least developed sense: they see best at about 20 cm, and love faces, strong contrasts and movement.",
    now: [
      { text: 'Look at faces, especially eyes and mouth, about 20 cm away', sources: ['1177-development-0-6'] },
      { text: 'Fix their eyes on a face or a toy and follow it a little', sources: ['rikshandboken-4-weeks'] },
      { text: 'Know your smell, and prefer mild, sweet tastes', sources: ['1177-development-0-6'] },
      { text: 'Focus on one thing for about 5 to 10 seconds', sources: ['1177-development-0-6'] },
      { text: 'See colours about as well as adults by 1 to 2 months', sources: ['1177-development-0-6'] },
    ],
    tryTogether: [
      'Lean in close, copy their faces and sounds, and give them time to answer.',
      'Hang a mobile with black-and-white or simple patterns where they can see it.',
      'Put a child-safe mirror by the changing table.',
      "After the bath, rub them gently with the towel and tell them what you're doing.",
    ],
    getHelp: [
      { text: "Your baby doesn't fix their eyes on your face or follow it", sources: ['rikshandboken-4-weeks'] },
      { text: "Your baby doesn't seem to react to loud sounds", sources: ['cdc-2-months'] },
    ],
    sources: ['1177-play'],
  },
  {
    topic: 'play',
    pages: [2, 3],
    headline: 'Hands, feet and faces',
    summary: 'Finding their own body, following things with their eyes',
    intro:
      'Your baby discovers their own fingers and toes, follows things with their eyes, and starts reaching for what they want. They begin to recognise people, things and routines.',
    now: [
      { text: 'Watch you as you move', sources: ['cdc-2-months'] },
      { text: 'Look at a toy for several seconds', sources: ['cdc-2-months'] },
      { text: 'Discover their fingers and toes', sources: ['1177-development-0-6'] },
      { text: 'Follow things a few metres away with their eyes, and reach for what they want', sources: ['1177-development-0-6'] },
    ],
    tryTogether: [
      'Shake a rattle off to one side and see if they turn to look.',
      'Take them outdoors: under a tree they can watch and touch the leaves.',
      'Sing, and repeat the songs they like.',
    ],
    getHelp: [
      { text: "Your baby doesn't watch you as you move, or follow things with their eyes", sources: ['cdc-2-months'] },
      { text: 'Your baby has lost skills they once had', sources: ['cdc-2-months'] },
    ],
    sources: ['1177-play'],
  },
  {
    topic: 'play',
    pages: [4, 5],
    headline: 'Grab it, taste it, drop it',
    summary: 'Exploring with hands and mouth, peekaboo, dropping things on purpose',
    intro:
      'Your baby explores by touching, tasting and smelling, and is fascinated by tiny details. Dropping things on purpose is the start of understanding cause and effect.',
    now: [
      { text: 'Look at their hands with interest', sources: ['cdc-4-months'] },
      { text: 'Explore things with their hands and mouth, your face included', sources: ['1177-development-0-6'] },
      { text: 'Notice tiny details like crumbs, dust and insects', sources: ['1177-development-0-6'] },
      { text: "Find a toy that's partly hidden, and get frustrated when one disappears", sources: ['1177-development-0-6'] },
      { text: 'Drop things on purpose to see what happens', sources: ['1177-development-0-6'] },
    ],
    tryTogether: [
      'Play peekaboo, and look in a child-safe mirror together.',
      'Stack a few soft blocks for your baby to knock down.',
      'Put a blanket on the floor with safe things to explore with hands, mouth and eyes.',
      'Read baby books together: a few minutes every day helps.',
    ],
    getHelp: [
      { text: "Your baby doesn't seem interested in faces, toys or what's around them", sources: ['1177-play'] },
      { text: 'Your baby has lost skills they once had', sources: ['cdc-4-months'] },
    ],
    sources: ['nhs-play'],
  },
  {
    topic: 'play',
    pages: [6, 7],
    headline: 'Hide, find, bang, shake',
    summary: 'Peekaboo, hidden toys, shaking and throwing to see what happens',
    intro:
      'Your baby learns through hands and mouth whether things are soft or hard, warm or cold, wet or dry. Peekaboo and hidden toys teach them that things still exist when out of sight.',
    now: [
      { text: 'Put things in their mouth to explore them', sources: ['cdc-6-months'] },
      { text: 'Reach to grab a toy they want', sources: ['cdc-6-months'] },
      { text: 'Shake, bang, throw and drop things', sources: ['1177-development-6-12'] },
      { text: 'Enjoy peekaboo', sources: ['1177-development-6-12'] },
      { text: 'Look for a toy hidden under a cloth', sources: ['1177-development-6-12'] },
    ],
    tryTogether: [
      'Hide a small toy under a cloth and let them find it.',
      'Give them a box to put things in and take them out again.',
      'Chewable board books.',
      'Pick up the toys they drop: it teaches cause and effect.',
    ],
    getHelp: [
      { text: "Your baby doesn't react when a toy they hold falls out of sight", sources: ['rikshandboken-6-months'] },
      { text: "Your baby doesn't reach for toys they want", sources: ['cdc-6-months'] },
      { text: 'Your baby has lost skills they once had', sources: ['cdc-6-months'] },
    ],
    sources: ['1177-play', 'nhs-play'],
  },
  {
    topic: 'play',
    pages: [8, 9],
    headline: 'Out of sight, not gone',
    summary: 'Finding hidden toys, opening drawers, banging things together',
    intro:
      "Your baby now knows that something still exists when it's out of sight, and finds a toy hidden under a blanket. Cupboards, drawers and boxes are endlessly interesting.",
    now: [
      { text: 'Look for things that drop out of sight, like a spoon or a toy', sources: ['cdc-9-months'] },
      { text: 'Bang two things together', sources: ['cdc-9-months'] },
      { text: 'Find a toy hidden under a blanket', sources: ['1177-development-6-12'] },
      { text: 'Open cupboards and drawers', sources: ['1177-development-6-12'] },
      { text: 'Use things the way they are meant, like pressing the buttons on a phone', sources: ['1177-development-6-12'] },
      { text: 'Want you or their siblings to join in', sources: ['1177-development-6-12'] },
    ],
    tryTogether: [
      'Play peekaboo, with a cloth over your own head too.',
      'Stack blocks for them to knock down, and take turns: my turn, your turn.',
      'Household things make great toys: lids, pans, whisks, plastic bottles.',
      'Picture books with big, colourful pictures of familiar things.',
    ],
    getHelp: [
      { text: "Your baby doesn't look for things that drop out of sight", sources: ['cdc-9-months'] },
      { text: "Your baby doesn't seem to want to play", sources: ['1177-play'] },
      { text: 'Your baby has lost skills they once had', sources: ['cdc-9-months'] },
    ],
    sources: ['nhs-play'],
  },
  {
    topic: 'play',
    pages: [10, 11],
    headline: 'In, out, and again',
    summary: 'Filling and emptying, stacking, pouring and throwing',
    intro:
      'Babies this age repeat things over and over: stacking, putting in and taking out, banging and shaking. They are learning that what they do makes things happen.',
    now: [
      { text: 'Put things in and take them out, again and again', sources: ['1177-development-6-12'] },
      { text: 'Pour and empty: sand and finger paint are favourites', sources: ['1177-development-6-12'] },
      { text: 'Throw things and watch where they land', sources: ['1177-development-6-12'] },
      { text: 'Start to understand in and out, above and below', sources: ['1177-development-6-12'] },
      { text: 'Copy you, like knocking two blocks together', sources: ['rikshandboken-10-months'] },
      { text: 'Sway to music', sources: ['1177-development-6-12'] },
    ],
    tryTogether: [
      'Give them tins and boxes to fill and empty.',
      'Tie a toy to a string and hide it under a chair for them to pull out.',
      'Put on music and sway together.',
      'Play together at least 15 minutes a day, and let them lead.',
    ],
    getHelp: [
      { text: "Your baby doesn't copy you, or doesn't look for a toy you hide while they watch", sources: ['rikshandboken-language'] },
      { text: "Your baby doesn't seem to want to play", sources: ['1177-play'] },
      { text: 'Your baby has lost skills they once had', sources: ['cdc-9-months'] },
    ],
    sources: ['nhs-play'],
  },
  {
    topic: 'play',
    pages: [12, 15],
    headline: 'Little explorer',
    summary: 'Containers, hidden things, copying you, first pretend play',
    intro:
      'Your child now explores more with their fingers than their mouth, copies what you do, and finds things you hide. Pretend play starts somewhere between 1 and 2 years.',
    now: [
      { text: 'Put something in a container, like a block in a cup', sources: ['cdc-1-year'] },
      { text: 'Look for things they see you hide, like a toy under a blanket', sources: ['cdc-1-year'] },
      { text: 'Try to use things the right way, like a phone, a cup or a book', sources: ['cdc-15-months'] },
      { text: 'Stack at least two small things, like blocks', sources: ['cdc-15-months'] },
      { text: 'Copy what you do', sources: ['1177-development-1-2'] },
      { text: 'Play beside other children more than with them', sources: ['1177-development-1-2'] },
    ],
    tryTogether: [
      'Stack blocks and let them knock them down.',
      'Blow bubbles for them to pop.',
      'Play simple hide-and-seek.',
      'Do chores together: they love to copy you.',
      'Play outdoors, every day if you can.',
    ],
    getHelp: [
      { text: "Your child doesn't look for things they see you hide", sources: ['cdc-1-year'] },
      { text: "Your child doesn't seem to want to play", sources: ['1177-play'] },
      { text: 'Your child has lost skills they once had', sources: ['cdc-1-year', 'cdc-15-months'] },
    ],
    sources: ['1177-play', 'nhs-play'],
  },
  {
    topic: 'play',
    pages: [18, 21],
    headline: "Let's pretend",
    summary: 'Pretend play, copying chores, pushing and pulling toys',
    intro:
      'Pretend play takes off between 1 and 2: pretending to eat, or a block that becomes a car. It gets richer when you join in. Children this age play beside others more than with them.',
    now: [
      { text: 'Copy you doing chores, like sweeping', sources: ['cdc-18-months'] },
      { text: 'Play with toys in a simple way, like pushing a toy car', sources: ['cdc-18-months'] },
      { text: 'Look at a few pages in a book with you', sources: ['cdc-18-months'] },
      { text: 'Pretend, like eating from an empty spoon or turning a block into a car', sources: ['1177-development-1-2'] },
      { text: 'Sort and compare things', sources: ['1177-development-1-2'] },
    ],
    tryTogether: [
      'Pretend together: feed a teddy with a spoon and take turns.',
      'Props for pretend play: a toy phone, dress-up clothes, pretend food.',
      'Back-and-forth games: roll a ball, push cars, pop bubbles.',
      'Make a den under a table with a blanket and cushions.',
    ],
    getHelp: [
      { text: "Your child doesn't pretend at all", sources: ['rikshandboken-language'] },
      { text: "Your child doesn't seem to want to play", sources: ['1177-play'] },
      { text: 'Your child has lost skills they once had', sources: ['cdc-18-months'] },
    ],
    sources: ['1177-play', 'nhs-play'],
  },
  {
    topic: 'play',
    pages: [24, 30],
    headline: 'Busy hands, busy minds',
    summary: 'Puzzles, sorting, pretend play in several steps',
    intro:
      "Two-year-olds sort by size and colour, do simple puzzles, and string pretend play together: feed the doll, change it, put it to bed. Attention spans are short, and that's expected.",
    now: [
      { text: 'Play with more than one toy at a time, like toy food on a toy plate', sources: ['cdc-2-years'] },
      { text: 'Try switches, knobs and buttons on toys', sources: ['cdc-2-years'] },
      { text: 'Use things to pretend, like feeding a block to a doll as if it were food', sources: ['cdc-30-months'] },
      { text: 'Sort by size and colour, and do simple puzzles with a few pieces', sources: ['1177-development-2-3'] },
      { text: 'Play next to other children, and sometimes with them', sources: ['cdc-30-months'] },
    ],
    tryTogether: [
      'Dress-up clothes, hand puppets, and a big box that becomes a car or a house.',
      'Sand, water and containers: pouring is great play.',
      'Crayons, finger paint and playdough.',
      'Screens: none before 2, and after that at most an hour a day, watched together.',
    ],
    getHelp: [
      { text: 'Your child only mouths or bangs toys, and never pretends', sources: ['rikshandboken-2-3-years'] },
      { text: "Your child doesn't seem to want to play", sources: ['1177-play'] },
      { text: 'Your child has lost skills they once had', sources: ['cdc-2-years', 'cdc-30-months'] },
    ],
    sources: ['nhs-play'],
  },
  {
    topic: 'play',
    pages: [36, 36],
    headline: 'Playing together',
    summary: 'Joining other children, role play, drawing circles',
    intro:
      'At 3, many children want to play with others, not just beside them, and role play gets longer. Sharing is still hard, so squabbles over toys are common.',
    now: [
      { text: 'Notice other children and join them to play', sources: ['cdc-3-years'] },
      { text: 'Draw a circle when you show them how', sources: ['cdc-3-years'] },
      { text: 'Stay away from hot things, like the stove, when you warn them', sources: ['cdc-3-years'] },
      { text: 'Play role games together', sources: ['rikshandboken-social'] },
      { text: 'Find sharing hard: they lend a toy and soon want it back', sources: ['1177-development-2-3'] },
    ],
    tryTogether: [
      'Arrange time with other children, and get outdoors.',
      'Counting, matching and opposites games.',
      'Use stories or pretend play to get ready for new places.',
      'Let them lead the play, at least 15 minutes a day.',
    ],
    getHelp: [
      { text: 'Your child only mouths or bangs toys, and never pretends', sources: ['rikshandboken-2-3-years'] },
      { text: 'Your child shows little interest in other children', sources: ['rikshandboken-social-atypical'] },
      { text: 'Your child has lost skills they once had', sources: ['cdc-3-years'] },
    ],
    sources: ['1177-play', 'nhs-play'],
  },
];
