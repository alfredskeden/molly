import type { TopicEntry } from '../types';

/**
 * Feeding: 1177 and Livsmedelsverket for Sweden (tiny tastes from 4 months at the earliest, taste portions
 * from about 6), WHO and the NHS elsewhere (solids around 6 months).
 */
export const FEEDING: TopicEntry[] = [
  {
    topic: 'feeding',
    pages: [0, 0],
    headline: 'Milk, little and often',
    summary: 'Breast milk or formula, as often as your baby wants',
    intro: {
      sweden:
        "Breast milk or formula is all your baby needs. There's no set number of feeds: in the first days many babies feed around the clock.",
      international:
        'Breast milk or formula is all your baby needs. Feed as often and for as long as your baby wants: there is no set number of feeds.',
    },
    now: {
      sweden: [
        { text: 'Feed often, sometimes around the clock in the first days', sources: ['1177-breastfeeding'] },
        {
          text: 'Wet at least 6 soaked diapers a day once feeding is under way, with stools turning from black to yellow in the first week',
          sources: ['1177-breastfeeding'],
        },
        { text: 'Start vitamin D drops at about 1 week old', sources: ['1177-food-0-1'] },
      ],
      international: [
        { text: 'Lose a little weight in the first 3 to 4 days, then gain steadily', sources: ['nhs-enough-milk'] },
        { text: 'From day 5, have at least 6 heavy wet diapers in 24 hours', sources: ['nhs-enough-milk'] },
        { text: 'Feed day and night', sources: ['who-feeding'] },
      ],
    },
    tryTogether: {
      sweden: [
        'A very sleepy newborn may need waking for feeds.',
        'Formula: make it fresh for each feed with cold tap water, follow the pack, serve it lukewarm and skip the microwave.',
        'For help with feeding, ask the maternity ward in the first week, then BVC or a breastfeeding clinic.',
      ],
      international: [
        'Feed when your baby shows they are hungry, and let them set the pace.',
        'Ask early for help with feeding from a midwife, nurse or breastfeeding specialist.',
      ],
    },
    getHelp: {
      sweden: [
        {
          text: 'After the first days, fewer than 6 soaked diapers a day, or your baby seems unsettled after feeds',
          sources: ['1177-breastfeeding'],
        },
        { text: "Your baby is limp, won't feed, or doesn't act like themselves: seek care straight away", sources: ['1177-colic', '1177-crying'] },
        { text: 'Your baby refuses all drinks, or has a dry mouth and wets fewer diapers than usual', sources: ['1177-fever'] },
      ],
      international: [
        { text: "Fewer wet or dirty diapers than expected, or you're worried your baby isn't getting enough milk", sources: ['nhs-enough-milk'] },
        { text: "Your baby isn't feeding, or hasn't had a wet diaper in 12 hours: get urgent help", sources: ['nhs-urgent'] },
      ],
    },
    sources: ['1177-formula', 'who-feeding'],
  },
  {
    topic: 'feeding',
    pages: [1, 3],
    headline: 'Milk on demand',
    summary: 'Breast milk or formula, and no solid food yet',
    intro: {
      sweden:
        'Breast milk or formula is still all your baby needs, with vitamin D drops every day. How often babies feed varies a lot.',
      international: 'Breast milk or formula is all your baby needs for around the first 6 months. How often babies feed varies a lot.',
    },
    now: {
      sweden: [
        { text: 'Get all their food from breast milk or formula', sources: ['1177-food-0-1'] },
        { text: 'Feed at night too: most babies do until about 4 months', sources: ['1177-sleep'] },
      ],
      international: [
        { text: 'Get all their food from breast milk or formula', sources: ['who-feeding'] },
        { text: 'Wake to feed at night', sources: ['nhs-sleep'] },
      ],
    },
    tryTogether: {
      sweden: [
        'Keep giving the vitamin D drops every day.',
        'Formula: make it fresh for each feed with cold tap water, follow the pack, serve it lukewarm and skip the microwave.',
      ],
      international: ['Feed responsively, day and night: watch for their signs of hunger and of having had enough.'],
    },
    getHelp: {
      sweden: [
        { text: "You're worried your baby isn't getting enough milk or isn't gaining weight", sources: ['1177-breastfeeding'] },
        { text: 'Your baby refuses all drinks, or has a dry mouth and wets fewer diapers than usual', sources: ['1177-fever'] },
      ],
      international: [
        { text: "You're worried your baby isn't getting enough milk: ask early", sources: ['nhs-enough-milk'] },
        { text: "Your baby isn't feeding, or hasn't had a wet diaper in 12 hours: get urgent help", sources: ['nhs-urgent'] },
      ],
    },
    sources: ['1177-formula', 'who-feeding'],
  },
  {
    topic: 'feeding',
    pages: [4, 5],
    headline: { sweden: 'Milk, and maybe a first taste', international: 'Milk is still everything' },
    summary: {
      sweden: 'Milk is the main food; tiny tastes are fine from 4 months',
      international: 'Breast milk or formula is all they need for now',
    },
    intro: {
      sweden:
        'Breast milk or formula is still all your baby needs. A curious baby can try tiny tastes from 4 months at the earliest: a pinch of food on a fingertip or spoon, too little to replace any milk.',
      international:
        'Breast milk or formula is still all your baby needs. WHO and the NHS advise starting solid food at around 6 months, once your baby shows they are ready.',
    },
    now: {
      sweden: [
        { text: 'Get all their food from breast milk or formula', sources: ['1177-food-0-1', 'livsmedelsverket-babies'] },
        {
          text: "From about 4 to 6 months, many no longer need a feed at night if they're gaining weight well",
          sources: ['1177-sleep'],
        },
      ],
      international: [
        { text: 'Open their mouth when they see the breast or bottle and are hungry', sources: ['cdc-4-months'] },
        { text: 'Get all their food from breast milk or formula', sources: ['who-feeding', 'nhs-first-foods'] },
        { text: 'Need fewer feeds at night than before', sources: ['nhs-sleep'] },
      ],
    },
    tryTogether: {
      sweden: [
        'If your baby seems curious about food, let them try a pinch of something soft from your fingertip or a spoon.',
        'Keep giving the vitamin D drops every day.',
      ],
      international: [
        'Watch for the signs of being ready, which come together around 6 months: sitting up with a steady head, picking food up and putting it in their mouth, and swallowing it instead of pushing it out.',
        "Chewing fists, waking more at night or wanting more milk aren't signs they need solid food yet.",
      ],
    },
    getHelp: {
      sweden: [
        { text: 'Your baby refuses all drinks, or has a dry mouth and wets fewer diapers than usual', sources: ['1177-fever'] },
        { text: 'Your baby reacts to a taste of a new food', sources: ['1177-food-0-1'] },
        { text: "You're worried your baby isn't getting enough milk", sources: ['1177-breastfeeding'] },
      ],
      international: [
        { text: "Your baby isn't feeding, or hasn't had a wet diaper in 12 hours: get urgent help", sources: ['nhs-urgent'] },
        { text: "You're worried your baby isn't getting enough milk: ask early", sources: ['nhs-enough-milk'] },
      ],
    },
    sources: ['1177-food-0-1', 'livsmedelsverket-babies', 'who-feeding', 'nhs-first-foods'],
  },
  {
    topic: 'feeding',
    pages: [6, 7],
    headline: { sweden: 'Taste portions', international: 'First solid foods' },
    summary: {
      sweden: 'Taste portions from about 6 months; milk is still the main food',
      international: 'Solid food starts around 6 months, alongside milk',
    },
    intro: {
      sweden:
        'From about 6 months babies start on taste portions: a teaspoon or so of soft food, growing slowly. Milk is still the main food, and food now also brings the iron babies need.',
      international:
        'Around 6 months, once your baby is ready, solid food can start alongside milk: a few teaspoons or soft pieces at first. WHO suggests 2 to 3 small meals a day at 6 to 8 months.',
    },
    now: {
      sweden: [
        { text: 'Start with about a teaspoon of soft food, mashed or in soft pieces they can pick up', sources: ['1177-food-0-1', '1177-taste-portions'] },
        { text: 'Try potato, vegetables, meat, lentils, chicken, egg, fish or baby porridge', sources: ['1177-taste-portions'] },
        { text: 'Get small tastes of gluten, a little at a time', sources: ['livsmedelsverket-babies'] },
        { text: 'Drink water with meals', sources: ['1177-food-0-1'] },
      ],
      international: [
        { text: 'Sit up with a steady head, pick food up and swallow it', sources: ['nhs-first-foods'] },
        { text: 'Have a few teaspoons or pieces of food before a milk feed', sources: ['nhs-first-foods'] },
        { text: 'Sip water from an open or free-flow cup with meals', sources: ['nhs-first-foods'] },
        { text: 'Gag sometimes while learning to eat: common, and not the same as choking', sources: ['nhs-first-foods'] },
      ],
    },
    tryTogether: {
      sweden: [
        'Offer peanut (as butter or flour, never whole), fish and egg during the first year, even if allergies run in the family.',
        'Add about a teaspoon of oil to home-made baby food.',
        'No honey, and wait with spinach, rocket, chard and beetroot juice until 1 year. No rice drinks before 6 years.',
        'Keep giving the vitamin D drops.',
      ],
      international: [
        'Offer peanut, egg, gluten and fish from around 6 months, one at a time and in small amounts.',
        'A new food can take 10 or more tries before your baby takes to it.',
        'No honey before 1 year, and no added salt or sugar. Whole nuts are a choking risk for under-5s.',
        'Stay with your baby while they eat.',
      ],
    },
    getHelp: {
      sweden: [
        { text: 'Your baby seems to react to a food (redness around the mouth or bottom on its own is often not an allergy)', sources: ['1177-food-0-1'] },
        { text: 'Diarrhoea or constipation after starting food', sources: ['1177-food-0-1'] },
        { text: "Your baby is choking and can't breathe: call 112", sources: ['1177-choking'] },
      ],
      international: [
        { text: 'Swollen lips, tongue or throat: get emergency help', sources: ['nhs-urgent'] },
        { text: "Your baby is choking and can't cough it out: get emergency help", sources: ['nhs-choking'] },
        { text: "Your baby isn't feeding, or hasn't had a wet diaper in 12 hours: get urgent help", sources: ['nhs-urgent'] },
      ],
    },
    sources: ['livsmedelsverket-babies', 'who-feeding', 'nhs-foods-to-avoid'],
  },
  {
    topic: 'feeding',
    pages: [8, 11],
    headline: { sweden: 'Small meals', international: 'Meals and milk' },
    summary: {
      sweden: 'Small meals from about 8 months, two main meals by 1 year',
      international: 'Working up to 3 meals a day, alongside milk',
    },
    intro: {
      sweden:
        'From about 8 months, taste portions grow into small meals, and by 10 to 12 months many babies eat two main meals a day plus snacks. Food can get coarser as they learn to chew.',
      international:
        'Your baby works up to 3 meals a day alongside milk: about 4 milk feeds a day at 7 to 9 months, and about 3 at 10 to 12 months.',
    },
    now: {
      sweden: [
        { text: 'Eat small meals from about 8 months', sources: ['livsmedelsverket-babies'] },
        { text: 'Eat two main meals a day plus some snacks by 10 to 12 months', sources: ['livsmedelsverket-babies'] },
        { text: 'Need plenty of iron: from meat, fish, beans, lentils and iron-fortified porridge', sources: ['livsmedelsverket-babies'] },
        { text: 'Eat food with more texture, mashed and then finely chopped, as they learn to chew', sources: ['1177-taste-portions'] },
      ],
      international: [
        { text: 'Work up to 3 meals a day', sources: ['nhs-first-foods'] },
        { text: 'Have about 4 milk feeds a day at 7 to 9 months, and about 3 at 10 to 12 months', sources: ['nhs-first-foods'] },
        { text: 'Feed themselves finger foods', sources: ['nhs-first-foods'] },
        { text: 'Eat foods with iron in them', sources: ['nhs-first-foods'] },
      ],
    },
    tryTogether: {
      sweden: [
        'Porridge or välling at most 3 times a day.',
        'Water is the best drink. Skip juice and other sweet drinks.',
        'Mash or cut food small, and stay with your baby while they eat.',
        'Keep offering fish, egg and peanut (never whole) through the first year. No honey before 1 year, and peel potatoes for babies.',
      ],
      international: [
        'Offer finger foods and let your baby feed themselves.',
        'Water from an open or free-flow cup with meals; no juice or sugary drinks.',
        'No honey before 1 year. Whole nuts are a choking risk for under-5s.',
        'Stay with your baby while they eat.',
      ],
    },
    getHelp: {
      sweden: [
        { text: 'Your baby seems to react to a food (redness around the mouth or bottom on its own is often not an allergy)', sources: ['1177-food-0-1'] },
        { text: 'Diarrhoea or constipation after starting food', sources: ['1177-food-0-1'] },
        { text: "Your baby is choking and can't breathe: call 112", sources: ['1177-choking'] },
      ],
      international: [
        { text: 'Swollen lips, tongue or throat: get emergency help', sources: ['nhs-urgent'] },
        { text: "Your baby is choking and can't cough it out: get emergency help", sources: ['nhs-choking'] },
        { text: "Your baby isn't feeding, or hasn't had a wet diaper in 12 hours: get urgent help", sources: ['nhs-urgent'] },
      ],
    },
    sources: ['who-feeding'],
  },
  {
    topic: 'feeding',
    pages: [12, 21],
    headline: { sweden: 'Family food', international: 'Eating with the family' },
    summary: {
      sweden: "The family's food, and milk as a drink from 1 year",
      international: "Family meals, and whole cow's milk as a main drink from 1 year",
    },
    intro: {
      sweden:
        'From about 1 year, children can eat much the same food as the rest of the family, chopped or mashed as needed. Milk can now be a drink: about half a litre a day of milk, fil, yoghurt or välling covers the calcium they need.',
      international:
        "From 12 months, children can eat 3 meals and 2 healthy snacks a day, and whole cow's milk can be their main drink. Formula is no longer needed.",
    },
    now: {
      sweden: [
        { text: "Eat the family's food, chopped or mashed as needed", sources: ['1177-food-1-6'] },
        { text: 'Drink low-fat milk with added vitamins, or fortified plant drinks', sources: ['1177-food-1-6', 'livsmedelsverket-1-2'] },
        { text: 'Need a little extra fat under 2: up to a tablespoon of oil a day in their food', sources: ['1177-food-1-6'] },
        { text: 'Get iron from fortified porridge or välling, meat, fish, beans and lentils', sources: ['livsmedelsverket-1-2'] },
      ],
      international: [
        { text: 'Eat 3 meals and 2 healthy snacks a day', sources: ['nhs-first-foods'] },
        { text: "Drink whole cow's milk, or an unsweetened, calcium-fortified plant drink, as their main drink", sources: ['nhs-first-foods'] },
        { text: 'Feed themselves with their fingers', sources: ['cdc-15-months'] },
      ],
    },
    tryTogether: {
      sweden: [
        'Water is the best drink between meals. Put off juice and sweet drinks as long as you can.',
        'Fish 2 to 3 times a week, but fatty fish from the Baltic only 2 to 3 times a year.',
        'No rice drinks before 6 years.',
        'Let the tap run cold before using the water.',
      ],
      international: [
        'No juice, smoothies or sugary drinks for children aged 4 and under: water and milk are best.',
        'Whole nuts are a choking risk until 5: give them ground, or as smooth nut butter.',
        'Keep salt and sugar out of their food.',
      ],
    },
    getHelp: {
      sweden: [
        { text: 'Your child seems to react to a food', sources: ['1177-food-1-6'] },
        { text: "Your child eats very little, and isn't active or following their growth curve", sources: ['1177-food-1-6'] },
        { text: "Your child is choking and can't breathe: call 112", sources: ['1177-choking'] },
      ],
      international: [
        { text: 'Swollen lips, tongue or throat: get emergency help', sources: ['nhs-urgent'] },
        { text: "Your child is choking and can't cough it out: get emergency help", sources: ['nhs-choking'] },
        { text: 'No drink for 8 hours while awake, or vomiting for 24 hours: get urgent help', sources: ['nhs-urgent'] },
      ],
    },
    sources: ['nhs-foods-to-avoid'],
  },
  {
    topic: 'feeding',
    pages: [24, 36],
    headline: 'Eating like the family',
    summary: { sweden: "The family's food, low-fat milk, water to drink", international: 'Family meals and snacks, water and milk to drink' },
    intro: {
      sweden:
        'From 2, children eat the same food as the family and need no extra oil in their food. Picky phases are common, and usually fine if your child is active and follows their growth curve.',
      international: 'Children this age eat family meals with healthy snacks in between. Water and milk are the best drinks.',
    },
    now: {
      sweden: [
        { text: "Eat the family's food, with no extra oil needed from 2", sources: ['1177-food-1-6'] },
        { text: 'Have about half a litre of milk, fil or yoghurt a day, low-fat with added vitamins', sources: ['1177-food-1-6', 'livsmedelsverket-2-17'] },
        { text: 'Go through picky phases', sources: ['1177-food-1-6'] },
      ],
      international: [
        { text: 'Eat 3 meals and 2 healthy snacks a day', sources: ['nhs-first-foods'] },
        { text: 'Eat with a spoon, and from 3 with a fork too', sources: ['cdc-2-years', 'cdc-3-years'] },
      ],
    },
    tryTogether: {
      sweden: [
        'Water is the best drink between meals. Put off juice and sweet drinks as long as you can.',
        'Fish 2 to 3 times a week, but fatty fish from the Baltic only 2 to 3 times a year.',
        'No rice drinks before 6 years.',
        'Go easy on salt, and use iodised salt when you do.',
      ],
      international: [
        'No juice, smoothies or sugary drinks for children aged 4 and under: water and milk are best.',
        'Whole nuts are a choking risk until 5: give them ground, or as smooth nut butter.',
        'Keep salt and sugar out of their food.',
      ],
    },
    getHelp: {
      sweden: [
        { text: 'Your child seems to react to a food', sources: ['1177-food-1-6'] },
        { text: "Your child eats very little, and isn't active or following their growth curve", sources: ['1177-food-1-6'] },
        { text: "Your child is choking and can't breathe: call 112", sources: ['1177-choking'] },
      ],
      international: [
        { text: 'Swollen lips, tongue or throat: get emergency help', sources: ['nhs-urgent'] },
        { text: "Your child is choking and can't cough it out: get emergency help", sources: ['nhs-choking'] },
        { text: 'No drink for 8 hours while awake, or vomiting for 24 hours: get urgent help', sources: ['nhs-urgent'] },
      ],
    },
    sources: ['nhs-foods-to-avoid'],
  },
];
