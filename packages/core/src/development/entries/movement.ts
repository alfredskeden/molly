import type { TopicEntry } from '../types';

/**
 * Movement: 1177's motor table and development pages and WHO's windows (wide ranges), CDC's checklists
 * (3 in 4 by that age), Rikshandboken's signs BVC looks for, the NHS on active play.
 */
export const MOVEMENT: TopicEntry[] = [
  {
    topic: 'movement',
    pages: [0, 0],
    headline: 'Small, sudden movements',
    summary: 'A head that needs support, fisted hands, jerky movements',
    intro:
      "A newborn's head is big and heavy, so it needs your hand behind it. Movements are sudden and jerky at first, and the hands are mostly in fists. Control comes slowly, from the head and neck downwards.",
    now: [
      { text: 'Need your hand to support their head', sources: ['1177-development-0-6'] },
      { text: 'Keep their hands mostly in fists', sources: ['1177-development-0-6'] },
      { text: 'Move their arms and legs in sudden, jerky movements', sources: ['1177-development-0-6'] },
      { text: 'Move both sides of the body in the same way', sources: ['rikshandboken-motor-4-weeks'] },
    ],
    tryTogether: [
      "Give short spells of tummy time while your baby is awake: on your chest is a good start, as long as you're wide awake too.",
      'Vary which way their head faces when they lie on their back, to avoid a flat spot.',
    ],
    getHelp: [
      { text: 'Arms or legs seem stiff, or hands stay tightly clenched with the thumbs tucked in', sources: ['rikshandboken-motor-4-weeks'] },
      { text: 'One side of the body moves differently from the other', sources: ['rikshandboken-motor-4-weeks'] },
      { text: 'Your baby moves very little, or their face shows little expression', sources: ['rikshandboken-motor-4-weeks'] },
    ],
    sources: ['1177-motor-table', 'nhs-active'],
  },
  {
    topic: 'movement',
    pages: [1, 1],
    headline: 'Lifting the head for a moment',
    summary: 'Balancing the head briefly, lifting it on the tummy',
    intro:
      'Your baby is starting to control their movements. After about a month they can balance their head, but only for a moment, and on the tummy they lift it briefly and turn it from side to side.',
    now: [
      { text: 'Balance their head for a moment when you hold them', sources: ['1177-development-0-6'] },
      { text: 'Lift their head briefly on their tummy and turn it to both sides', sources: ['rikshandboken-motor-6-8-weeks'] },
      { text: 'Start to open their hands and reach out', sources: ['1177-development-0-6'] },
    ],
    tryTogether: [
      'Tummy time little and often, building up day by day.',
      'If your baby turns their head more easily one way, tempt them the other way with your face or a toy.',
      'Let them lie on their tummy and their back on a thin mattress or folded blanket.',
    ],
    getHelp: [
      { text: "By 6 to 8 weeks your baby doesn't lift their head at all on their tummy", sources: ['rikshandboken-motor-6-8-weeks'] },
      { text: 'Arms or legs seem stiff, or hands stay tightly clenched with the thumbs tucked in', sources: ['rikshandboken-motor-6-8-weeks'] },
      { text: 'One side of the body moves differently from the other', sources: ['rikshandboken-motor-6-8-weeks'] },
    ],
    sources: ['nhs-active'],
  },
  {
    topic: 'movement',
    pages: [2, 3],
    headline: 'A steadier head, first reaching',
    summary: 'Holding the head up, propping on the forearms, reaching with the whole hand',
    intro:
      'Your baby now holds their head steadier and turns it to look around. The hands open up: they reach and grab with the whole hand, and suck on their hands and toys.',
    now: [
      { text: 'Hold their head up when on their tummy', sources: ['cdc-2-months'] },
      { text: 'Move both arms and both legs', sources: ['cdc-2-months'] },
      { text: 'Prop themselves briefly on their forearms when on their tummy', sources: ['1177-development-0-6'] },
      { text: 'Reach and grab with the whole hand, and suck on their hands and toys', sources: ['1177-development-0-6'] },
      { text: 'Kick and stretch their legs', sources: ['1177-development-0-6'] },
      { text: 'Grasp things on purpose: somewhere from 2 to 6 months', sources: ['1177-motor-table'] },
    ],
    tryTogether: [
      'Tummy time during diaper changes and dressing, or on your chest.',
      'Hold a toy in front of or above your baby so they can reach for it.',
      'Get outside: under a tree they can watch the leaves move.',
    ],
    getHelp: [
      { text: "Your baby's body feels very floppy or very stiff", sources: ['rikshandboken-motor'] },
      { text: 'One side of the body moves differently from the other, or a hand stays tightly clenched', sources: ['rikshandboken-motor'] },
      { text: 'Your baby has lost skills they once had', sources: ['cdc-2-months'] },
    ],
    sources: ['nhs-active'],
  },
  {
    topic: 'movement',
    pages: [4, 5],
    headline: 'Rolling, reaching, pushing up',
    summary: 'Reaching and grabbing, rolling, pushing up on the arms',
    intro:
      'Babies this age reach for what they want, grab it and bring it to their mouth. Many are starting to roll. Time on a blanket on the floor gives them room to practise.',
    now: [
      { text: 'Hold their head steady without support when you hold them', sources: ['cdc-4-months'] },
      { text: 'Push up onto their elbows or forearms when on their tummy', sources: ['cdc-4-months'] },
      {
        text: 'Reach for things nearby, grab them, pass them from hand to hand and bring them to their mouth',
        sources: ['1177-development-0-6'],
      },
      { text: 'Start rolling, tummy to back or back to tummy: somewhere from 3 to 8 months', sources: ['1177-motor-table'] },
      { text: 'Sit with support, for some: somewhere from 4 to 9 months', sources: ['1177-motor-table'] },
      { text: 'Take weight on their legs when held standing', sources: ['1177-development-0-6'] },
    ],
    tryTogether: [
      "Give tummy time several times a day, while your baby is awake and you're with them.",
      'Lay them on a blanket with safe toys to reach for and kick at.',
      'Keep time in bouncers and baby seats short: no more than 20 minutes at a time.',
    ],
    getHelp: [
      { text: "Your baby's body seems very stiff or very floppy, or they can't hold their head steady", sources: ['rikshandboken-motor'] },
      { text: 'One side of the body moves differently from the other, or a hand stays tightly clenched', sources: ['rikshandboken-motor'] },
      { text: 'Your baby has lost skills they once had', sources: ['cdc-4-months'] },
    ],
    sources: ['nhs-active'],
  },
  {
    topic: 'movement',
    pages: [6, 7],
    headline: 'Sitting, and starting to move',
    summary: 'Sitting for a while, rolling, and the first ways of getting around',
    intro:
      "Many babies now sit for a while without support and start to get around: scooting backwards, spinning on the tummy, rolling or shuffling. Most go on to crawl, but some never do, and that's fine: what matters is that they move.",
    now: [
      { text: 'Roll from tummy to back', sources: ['cdc-6-months'] },
      { text: 'Push up on straight arms when on their tummy', sources: ['cdc-6-months'] },
      { text: 'Lean on their hands to hold themselves up when sitting', sources: ['cdc-6-months'] },
      { text: 'Sit without support: nearly all children get there somewhere from about 4 to 10 months', sources: ['who-motor', '1177-motor-table'] },
      { text: 'Pass things from hand to hand, and shake, throw and drop them', sources: ['1177-development-6-12'] },
      {
        text: 'Try to get up on hands and knees: crawling comes somewhere from 5 to 12 months, and some children skip it',
        sources: ['1177-motor-table', 'rikshandboken-motor-8-months'],
      },
    ],
    tryTogether: [
      'Put toys just out of reach during tummy time, so they roll or stretch for them.',
      'Play on the floor every day, and let them move in their own way.',
      'Make your home safe before they get moving: socket covers, and small things out of reach.',
    ],
    getHelp: [
      { text: 'By about 8 months your baby makes no attempt to roll, even at home', sources: ['rikshandboken-6-months', '1177-motor-table'] },
      { text: 'Your baby feels limp, and their head falls back when you gently pull them up to sitting', sources: ['rikshandboken-6-months'] },
      { text: 'One side of the body moves differently from the other, or a hand stays tightly clenched', sources: ['rikshandboken-motor'] },
      { text: 'Your baby has lost skills they once had', sources: ['cdc-6-months'] },
    ],
    sources: ['nhs-active'],
  },
  {
    topic: 'movement',
    pages: [8, 9],
    headline: 'Crawling and pulling up',
    summary: 'Crawling or shuffling, sitting steadily, pulling up to stand',
    intro:
      'Many babies now get around: crawling, bottom-shuffling or something else entirely. Next comes pulling up on furniture. Thumb and forefinger start working together to pick up small things.',
    now: [
      { text: 'Sit without support', sources: ['cdc-9-months'] },
      { text: 'Get to a sitting position by themselves', sources: ['cdc-9-months'] },
      { text: 'Move things from one hand to the other', sources: ['cdc-9-months'] },
      { text: 'Rake food towards themselves with their fingers', sources: ['cdc-9-months'] },
      { text: 'Crawl, shuffle on their bottom or move some other way: some never crawl', sources: ['1177-development-6-12', 'rikshandboken-motor-8-months'] },
      { text: 'Stand with help: healthy children get there anywhere from about 5 to 11 months', sources: ['who-motor'] },
      { text: 'Pull up to stand on furniture: somewhere from 6 to 16 months', sources: ['1177-motor-table'] },
    ],
    tryTogether: [
      'Put toys just out of reach so they crawl, scoot or roll for them.',
      'Offer safe, sturdy things to pull up on.',
      'Peas and sweetcorn are good practice for small fingers, with you right beside them.',
      'Childproof your home: stair gates, locked cupboards for dangerous things, shelves fixed to the wall.',
    ],
    getHelp: [
      { text: 'Their legs seem floppy or stiff', sources: ['rikshandboken-motor-8-months'] },
      { text: 'One side of the body moves differently from the other', sources: ['rikshandboken-motor-8-months'] },
      { text: 'Your baby has lost skills they once had', sources: ['cdc-9-months'] },
    ],
    sources: ['nhs-active'],
  },
  {
    topic: 'movement',
    pages: [10, 11],
    headline: 'Standing and cruising',
    summary: 'Pulling up, walking along the furniture, maybe a first step',
    intro:
      'Babies this age pull up to stand and walk sideways along the furniture. Many stand for a moment on their own, and some take their first steps before their first birthday, though most take a few more months.',
    now: [
      { text: 'Pull up to stand and walk holding on to furniture', sources: ['rikshandboken-10-months'] },
      { text: 'Sit steadily with both hands free to play', sources: ['rikshandboken-motor-10-months'] },
      { text: 'Pick up small things with thumb and forefinger: somewhere from 9 to 12 months', sources: ['1177-motor-table'] },
      { text: 'Stand alone for a moment: healthy children get there anywhere from about 7 to 17 months', sources: ['who-motor'] },
      { text: 'Walk holding your hands, for many', sources: ['1177-development-6-12'] },
      { text: 'Climb onto sofas and chairs, and down again', sources: ['1177-development-6-12'] },
    ],
    tryTogether: [
      'Let them walk holding your hands or pushing something sturdy. Skip baby walkers.',
      'Walking barefoot on grass, sand or cushions helps balance.',
      'Show them how to come down from the sofa or stairs backwards, feet first, with you close by.',
    ],
    getHelp: [
      { text: "Your baby doesn't move around by themselves", sources: ['rikshandboken-10-months'] },
      { text: 'Your baby clearly uses one hand much more than the other', sources: ['rikshandboken-motor-10-months'] },
      { text: 'Their legs seem stiff, or they stand on their toes', sources: ['rikshandboken-motor-10-months'] },
      { text: 'Your baby has lost skills they once had', sources: ['cdc-9-months'] },
    ],
    sources: ['cdc-1-year', 'nhs-active'],
  },
  {
    topic: 'movement',
    pages: [12, 12],
    headline: 'Steps along the way',
    summary: 'Standing, walking holding on, first steps for some',
    intro:
      "Around the first birthday many children stand and walk holding on, and some walk alone. When the first steps come varies a lot, from about 8 to 18 months, and isn't important in itself.",
    now: [
      { text: 'Pull up to stand', sources: ['cdc-1-year'] },
      { text: 'Walk holding on to furniture', sources: ['cdc-1-year'] },
      { text: 'Drink from a cup without a lid while you hold it', sources: ['cdc-1-year'] },
      { text: 'Pick things up between thumb and pointer finger, like small bits of food', sources: ['cdc-1-year'] },
      { text: 'Walk alone: somewhere from 8 to 18 months', sources: ['1177-motor-table', 'who-motor'] },
    ],
    tryTogether: [
      'Play with blocks and toys that make them use their hands.',
      'Let them push a safe, sturdy object to practise walking, and skip baby walkers.',
      'Walking barefoot on different surfaces helps balance.',
    ],
    getHelp: [
      { text: "Your child won't take weight on their feet, or their legs seem stiff", sources: ['rikshandboken-motor-12-months'] },
      { text: 'Your child finds it hard to get between lying, sitting and standing', sources: ['rikshandboken-motor-12-months'] },
      { text: 'Your child clearly uses one hand much more than the other', sources: ['rikshandboken-motor-10-months'] },
      { text: 'Your child has lost skills they once had', sources: ['cdc-1-year'] },
    ],
    sources: ['nhs-active'],
  },
  {
    topic: 'movement',
    pages: [15, 15],
    headline: 'First steps',
    summary: 'A few steps alone for many, feeding themselves with their fingers',
    intro:
      'Many children now take a few steps on their own. First steps are often wide-legged and stiff; running, climbing and jumping come over the next year.',
    now: [
      { text: 'Take a few steps on their own', sources: ['cdc-15-months'] },
      { text: 'Feed themselves some food with their fingers', sources: ['cdc-15-months'] },
      { text: 'Walk alone: somewhere from 8 to 18 months', sources: ['1177-motor-table', 'who-motor'] },
      { text: 'Climb onto a sofa and down again', sources: ['1177-development-1-2'] },
      { text: 'Build a tower of blocks and knock it down', sources: ['1177-development-1-2'] },
    ],
    tryTogether: [
      'Practise drinking from an open cup and eating with a spoon.',
      'A push-along toy to walk with, once they are walking.',
      'Once they walk, aim for lots of active play spread through the day: the NHS suggests at least 3 hours.',
    ],
    getHelp: [
      { text: "Your child isn't trying to stand or walk, or won't take weight on their feet", sources: ['rikshandboken-motor-12-months'] },
      { text: 'Their legs seem stiff, or they stand on their toes', sources: ['rikshandboken-motor-10-months'] },
      { text: 'Your child has lost skills they once had', sources: ['cdc-15-months'] },
    ],
    sources: ['nhs-active'],
  },
  {
    topic: 'movement',
    pages: [18, 21],
    headline: 'Walking, climbing, running',
    summary: 'Walking steadily, climbing, starting to run',
    intro:
      'By 18 months most children have the basics: sitting, standing and walking. Walking gets steadier, and many start to run, climb and squat down to pick things up.',
    now: [
      { text: 'Walk without holding on to anyone or anything', sources: ['cdc-18-months'] },
      { text: 'Climb on and off a sofa or chair without help', sources: ['cdc-18-months'] },
      { text: 'Scribble', sources: ['cdc-18-months'] },
      { text: 'Drink from a cup without a lid, spilling sometimes', sources: ['cdc-18-months'] },
      { text: 'Feed themselves with their fingers and try to use a spoon', sources: ['cdc-18-months'] },
      { text: 'Squat down and stand up again without holding on', sources: ['rikshandboken-motor-18-months'] },
    ],
    tryTogether: [
      'Toys that are safe to push or pull.',
      'A safe place to climb and jump, like a mattress with cushions around it.',
      'Walk together instead of always using the stroller.',
      'Lock away knives and other dangers: toddlers open drawers and climb onto counters.',
    ],
    getHelp: [
      { text: "By 18 months your child doesn't walk steadily without support", sources: ['rikshandboken-18-months'] },
      { text: 'Your child walks on their toes, has trouble with balance, or seems very clumsy', sources: ['rikshandboken-motor-18-months'] },
      { text: "Your child's movement has stopped developing or gone backwards", sources: ['rikshandboken-motor-18-months', 'cdc-18-months'] },
    ],
    sources: ['1177-motor-table', 'nhs-active'],
  },
  {
    topic: 'movement',
    pages: [24, 24],
    headline: 'Run, kick, climb',
    summary: 'Running, kicking a ball, walking up stairs',
    intro: 'Two-year-olds are on the go: running, climbing and kicking. Balance is still developing, so ball games take patience.',
    now: [
      { text: 'Kick a ball', sources: ['cdc-2-years'] },
      { text: 'Run', sources: ['cdc-2-years'] },
      { text: 'Walk, not climb, up a few stairs, with or without help', sources: ['cdc-2-years'] },
      { text: 'Eat with a spoon', sources: ['cdc-2-years'] },
      { text: 'Hold something in one hand while using the other, like holding a box and taking the lid off', sources: ['cdc-2-years'] },
    ],
    tryTogether: [
      'Balls for kicking, rolling and throwing.',
      'Crayons or finger paint.',
      'Outdoor games like "ready, set, go".',
      'Lots of active play through the day: at least 3 hours, the NHS suggests.',
    ],
    getHelp: [
      { text: 'Your child walks on their toes, has trouble with balance, or seems very clumsy', sources: ['rikshandboken-motor-18-months'] },
      { text: 'One hand or one side of the body is used much less than the other', sources: ['rikshandboken-motor-difficulties'] },
      { text: "Your child's movement has stopped developing or gone backwards", sources: ['rikshandboken-motor-18-months', 'cdc-2-years'] },
    ],
    sources: ['1177-development-2-3', 'nhs-active'],
  },
  {
    topic: 'movement',
    pages: [30, 30],
    headline: 'Jumping with both feet',
    summary: 'Jumping, twisting lids, taking clothes off',
    intro:
      'At two and a half, many children walk with a relaxed, grown-up step, no longer wide-legged, run and stop without falling, and jump forward with both feet. Their hands are getting handier too.',
    now: [
      { text: 'Jump off the ground with both feet', sources: ['cdc-30-months'] },
      { text: 'Twist things with their hands, like turning doorknobs or unscrewing lids', sources: ['cdc-30-months'] },
      { text: 'Take some clothes off by themselves, like loose pants or an open jacket', sources: ['cdc-30-months'] },
      { text: 'Turn book pages one at a time when you read together', sources: ['cdc-30-months'] },
      { text: 'Kick a ball without falling', sources: ['rikshandboken-motor-2-3'] },
    ],
    tryTogether: [
      'Outdoor play: climbing, running, kicking a ball, follow the leader.',
      'Drawing: copying lines, then circles.',
      'Playgrounds, a balance beam, and forest walks over rocks and branches.',
    ],
    getHelp: [
      { text: 'Your child walks on their toes, has trouble with balance, or seems very clumsy', sources: ['rikshandboken-motor-2-3'] },
      { text: "Your child's movement has stopped developing or gone backwards", sources: ['rikshandboken-motor-2-3', 'cdc-30-months'] },
      { text: "You or your child's preschool are worried about how they move", sources: ['rikshandboken-motor-2-3'] },
    ],
    sources: ['1177-development-2-3', 'nhs-active'],
  },
  {
    topic: 'movement',
    pages: [36, 36],
    headline: 'Stairs, circles, getting dressed',
    summary: 'Climbing stairs, drawing circles, dressing with some help',
    intro:
      'Three-year-olds climb stairs without holding on, run fast around obstacles and jump down from low heights. With their hands they draw circles, string beads and start dressing themselves.',
    now: [
      { text: 'String things together, like large beads or pasta', sources: ['cdc-3-years'] },
      { text: 'Put on some clothes by themselves, like loose pants or a jacket', sources: ['cdc-3-years'] },
      { text: 'Use a fork', sources: ['cdc-3-years'] },
      { text: 'Draw a circle after you show them how', sources: ['cdc-3-years'] },
      { text: 'Climb stairs without holding on', sources: ['rikshandboken-motor-2-3'] },
      { text: 'Start riding a tricycle, for many', sources: ['1177-development-2-3'] },
    ],
    tryTogether: [
      'Playdough and art things build strength in small hands.',
      'Throw, catch and kick a ball together.',
      'Play outdoors every day if you can.',
    ],
    getHelp: [
      { text: 'Your child walks on their toes, has trouble with balance, or seems very clumsy', sources: ['rikshandboken-motor-2-3'] },
      { text: "Your child's movement has stopped developing or gone backwards", sources: ['rikshandboken-motor-2-3', 'cdc-3-years'] },
      { text: "You or your child's preschool are worried about how they move", sources: ['rikshandboken-motor-2-3'] },
    ],
    sources: ['1177-play', 'nhs-active'],
  },
];
