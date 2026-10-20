import { describe, expect, it } from 'vitest';

import { checkUps } from './health';
import { GUIDE_PAGES } from './pages';

describe('the BVC visits around a page in Sweden', () => {
  it.each([
    [0, 'BVC visits: a home visit at about 1 week, the nurse at 2 and 3 weeks, and the doctor at 4 weeks for a physical exam and a look at development.'],
    [1, 'BVC visits at 6 and 8 weeks with the nurse: development, and at one of them a talk with the parent who gave birth about how they feel, with a short questionnaire.'],
    [2, 'No BVC visit around this age. Next: 3 months.'],
    [3, "BVC visit at 3 months with the nurse. At one of the visits from 3 to 5 months, many BVCs offer a talk with the parent who didn't give birth."],
    [4, 'BVC visit at 4 months with the nurse.'],
    [5, 'BVC visit at 5 months with the nurse.'],
    [6, 'BVC visit at 6 months with the doctor and nurse: a physical exam and a look at development.'],
    [7, 'No BVC visit around this age. Next: 8 months.'],
    [8, 'The 8-month visit is usually a home visit: the nurse talks about child safety. Some regions hold it at BVC.'],
    [9, 'No BVC visit around this age. Next: 10 months.'],
    [10, 'BVC visit at 10 months with the nurse: a look at development.'],
    [11, 'No BVC visit around this age. Next: 12 months.'],
    [12, 'BVC visit at 12 months with the doctor and nurse: a physical exam, growth and BMI.'],
    [15, 'No BVC visit around this age. Next: 18 months.'],
    [18, 'BVC visit at 18 months with the nurse: development, growth and BMI.'],
    [21, 'No BVC visit around this age. Next: 2.5 years.'],
    [24, 'No BVC visit around this age. Next: 2.5 years.'],
    [30, 'BVC visit at 2.5 years with the nurse: development, growth, and a check of language at this visit or the next.'],
    [36, "BVC visit at 3 years with the doctor and nurse: development, growth, and a check of language if it wasn't done at 2.5 years."],
  ] as const)('on page %s says the visit or the next one', (page, visit) => {
    // When
    const health = checkUps(page, 'sweden');

    // Then
    expect(health.visit).toBe(visit);
  });

  it('has a line for every page', () => {
    // When
    const visits = GUIDE_PAGES.map((page) => checkUps(page, 'sweden').visit);

    // Then
    expect(visits.every((visit) => visit.length > 0)).toBe(true);
  });
});

describe('the vaccines around a page in Sweden', () => {
  it.each([
    [0, 'No vaccines in the programme around this age. Next: 6 weeks.'],
    [
      1,
      "At 6 weeks: rotavirus, as drops by mouth. Babies born before week 32 also get a first 6-in-1 dose from 6 weeks. Very rarely, the drops make the bowel fold into itself: if your baby cries in hard bursts and can't be comforted in the week after, go to an emergency department straight away.",
    ],
    [2, 'No vaccines in the programme around this age. Next: 3 months.'],
    [
      3,
      "At 3 months: rotavirus drops, the 6-in-1 (diphtheria, tetanus, whooping cough, polio, Hib and hepatitis B) and pneumococcal. Afterwards some babies are tired, eat less or get a fever; if you're unsure about a fever after vaccines, call 1177. Very rarely, the drops make the bowel fold into itself: if your baby cries in hard bursts and can't be comforted in the week after, go to an emergency department straight away.",
    ],
    [4, 'No vaccines in the programme around this age. Next: 5 months.'],
    [
      5,
      "At 5 months: second doses of the 6-in-1 and pneumococcal, and a third rotavirus dose only with brands given in 3 doses. Afterwards some babies are tired, eat less or get a fever; if you're unsure about a fever after vaccines, call 1177. Very rarely, the drops make the bowel fold into itself: if your baby cries in hard bursts and can't be comforted in the week after, go to an emergency department straight away.",
    ],
    [6, 'No vaccines in the programme around this age. Next: 12 months.'],
    [11, 'No vaccines in the programme around this age. Next: 12 months.'],
    [12, "At 12 months: third doses of the 6-in-1 and pneumococcal. Afterwards some babies are tired, eat less or get a fever; if you're unsure about a fever after vaccines, call 1177."],
    [15, 'No vaccines in the programme around this age. Next: 18 months.'],
    [18, "At 18 months: MMR (measles, mumps and rubella). A fever and a rash can come 1 to 2 weeks later; the rash isn't contagious."],
    [21, 'No vaccines in the programme around this age. Next: 5 years.'],
    [36, 'No vaccines in the programme around this age. Next: 5 years.'],
  ] as const)('on page %s says what is given or when the next ones are', (page, vaccines) => {
    // When
    const health = checkUps(page, 'sweden');

    // Then
    expect(health.vaccines).toBe(vaccines);
  });

  it("names the BVC and vaccine programme's sources", () => {
    // When
    const health = checkUps(5, 'sweden');

    // Then
    expect(health.sources).toEqual(['rikshandboken-visits', '1177-bvc', 'fhm-vaccines', '1177-vaccines']);
  });
});

describe('check-ups and vaccines for International', () => {
  it('says newborns are usually checked in the first days and weeks', () => {
    // When
    const health = checkUps(0, 'international');

    // Then
    expect(health.visit).toBe(
      'Babies usually have a physical check in the first days after birth, and many countries offer a visit in the first weeks. Ask what your local programme offers.',
    );
  });

  it.each([2, 4, 6, 9, 12, 15, 18, 24, 30, 36] as const)('says many countries check around %s months', (page) => {
    // When
    const health = checkUps(page, 'international');

    // Then
    expect(health.visit).toBe(
      `Many countries offer a check-up around ${page === 24 ? '2 years' : page === 36 ? '3 years' : `${page} months`}, often with questions about development. Ask what your local programme offers.`,
    );
  });

  it.each([
    [1, '2 months'],
    [7, '9 months'],
    [21, '2 years'],
  ] as const)('on page %s points to the next common check-up age', (page, next) => {
    // When
    const health = checkUps(page, 'international');

    // Then
    expect(health.visit).toBe(`Check-ups differ between countries. Many offer the next one around ${next}. Ask what your local programme offers.`);
  });

  it('points to the local programme and WHO for vaccines, with no schedule', () => {
    // When
    const health = checkUps(3, 'international');

    // Then
    expect(health).toMatchObject({
      vaccines:
        "Vaccines follow your country's programme, and schedules differ between countries. WHO lists the vaccines it recommends for every child. Ask your child's doctor or nurse what's due.",
      sources: ['cdc-milestones', 'nhs-reviews', 'who-vaccines'],
    });
  });
});
