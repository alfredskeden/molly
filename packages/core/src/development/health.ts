import { GUIDE_PAGES, type GuidePage } from './pages';
import type { SourceId } from './sources';
import type { GuideRegion } from './types';

/**
 * Sweden's BVC visits (Rikshandboken's programme, approved 2026-05-13, and 1177), by the page they fall
 * on: the weekly ones in the first two months share Newborn and 1 month.
 */
const BVC_VISITS: Partial<Record<GuidePage, string>> = {
  0: 'BVC visits: a home visit at about 1 week, the nurse at 2 and 3 weeks, and the doctor at 4 weeks for a physical exam and a look at development.',
  1: 'BVC visits at 6 and 8 weeks with the nurse: development, and at one of them a talk with the parent who gave birth about how they feel, with a short questionnaire.',
  3: "BVC visit at 3 months with the nurse. At one of the visits from 3 to 5 months, many BVCs offer a talk with the parent who didn't give birth.",
  4: 'BVC visit at 4 months with the nurse.',
  5: 'BVC visit at 5 months with the nurse.',
  6: 'BVC visit at 6 months with the doctor and nurse: a physical exam and a look at development.',
  8: 'The 8-month visit is usually a home visit: the nurse talks about child safety. Some regions hold it at BVC.',
  10: 'BVC visit at 10 months with the nurse: a look at development.',
  12: 'BVC visit at 12 months with the doctor and nurse: a physical exam, growth and BMI.',
  18: 'BVC visit at 18 months with the nurse: development, growth and BMI.',
  30: 'BVC visit at 2.5 years with the nurse: development, growth, and a check of language at this visit or the next.',
  36: "BVC visit at 3 years with the doctor and nurse: development, growth, and a check of language if it wasn't done at 2.5 years.",
};

const AFTER_SHOTS = "Afterwards some babies are tired, eat less or get a fever; if you're unsure about a fever after vaccines, call 1177.";

/** 1177: intussusception after the rotavirus drops is very rare, and an emergency (crying in bursts, the week after). */
const ROTAVIRUS =
  "Very rarely, the drops make the bowel fold into itself: if your baby cries in hard bursts and can't be comforted in the week after, go to an emergency department straight away.";

/** Folkhälsomyndigheten's programme (2026), by the page each dose falls on. The next after 18 months is at 5 years. */
const VACCINES: Partial<Record<GuidePage, { at: string; text: string }>> = {
  1: {
    at: '6 weeks',
    text: `At 6 weeks: rotavirus, as drops by mouth. Babies born before week 32 also get a first 6-in-1 dose from 6 weeks. ${ROTAVIRUS}`,
  },
  3: {
    at: '3 months',
    text: `At 3 months: rotavirus drops, the 6-in-1 (diphtheria, tetanus, whooping cough, polio, Hib and hepatitis B) and pneumococcal. ${AFTER_SHOTS} ${ROTAVIRUS}`,
  },
  5: {
    at: '5 months',
    text: `At 5 months: second doses of the 6-in-1 and pneumococcal, and a third rotavirus dose only with brands given in 3 doses. ${AFTER_SHOTS} ${ROTAVIRUS}`,
  },
  12: { at: '12 months', text: `At 12 months: third doses of the 6-in-1 and pneumococcal. ${AFTER_SHOTS}` },
  18: {
    at: '18 months',
    text: "At 18 months: MMR (measles, mumps and rubella). A fever and a rash can come 1 to 2 weeks later; the rash isn't contagious.",
  },
};

const VACCINES_AFTER_GUIDE = '5 years';

/** The ages CDC's milestone checklists are for, which match common check-up ages. */
const CHECKLIST_PAGES: readonly GuidePage[] = [2, 4, 6, 9, 12, 15, 18, 24, 30, 36];

const LOCAL = 'Ask what your local programme offers.';

const INTERNATIONAL_VACCINES =
  "Vaccines follow your country's programme, and schedules differ between countries. WHO lists the vaccines it recommends for every child. Ask your child's doctor or nurse what's due.";

/** The Health topic's check-up and vaccine lines for a page: around this age, or when the next ones are. */
export function checkUps(page: GuidePage, region: GuideRegion): { visit: string; vaccines: string; sources: SourceId[] } {
  if (region === 'international') {
    return { visit: internationalVisit(page), vaccines: INTERNATIONAL_VACCINES, sources: ['cdc-milestones', 'nhs-reviews', 'who-vaccines'] };
  }
  const nextVisit = pagesAfter(page).find((later) => BVC_VISITS[later]);
  const nextVaccine = pagesAfter(page).find((later) => VACCINES[later]);
  return {
    visit: BVC_VISITS[page] ?? `No BVC visit around this age. Next: ${visitAge(nextVisit!, region)}.`,
    vaccines:
      VACCINES[page]?.text ??
      `No vaccines in the programme around this age. Next: ${nextVaccine === undefined ? VACCINES_AFTER_GUIDE : VACCINES[nextVaccine]!.at}.`,
    sources: ['rikshandboken-visits', '1177-bvc', 'fhm-vaccines', '1177-vaccines'],
  };
}

function internationalVisit(page: GuidePage): string {
  if (page === 0) {
    return `Babies usually have a physical check in the first days after birth, and many countries offer a visit in the first weeks. ${LOCAL}`;
  }
  if (CHECKLIST_PAGES.includes(page)) {
    return `Many countries offer a check-up around ${visitAge(page, 'international')}, often with questions about development. ${LOCAL}`;
  }
  const next = CHECKLIST_PAGES.find((later) => later > page)!;
  return `Check-ups differ between countries. Many offer the next one around ${visitAge(next, 'international')}. ${LOCAL}`;
}

function pagesAfter(page: GuidePage): GuidePage[] {
  return GUIDE_PAGES.filter((later) => later > page);
}

/** `3 months`, `2 years`, `3 years`; the 30-month visit is `2.5 years` at BVC, `30 months` in CDC's checklists. */
function visitAge(page: GuidePage, region: GuideRegion): string {
  if (page === 24) return '2 years';
  if (page === 30 && region === 'sweden') return '2.5 years';
  if (page === 36) return '3 years';
  return `${page} months`;
}
