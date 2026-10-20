import { worldEvidence as stopEvidenceFor } from "./evidence";
import type { Lesson } from "../learning/types";
import type { AreaId } from "./types";

/** Each scenario teaches a distinct transfer principle; no trading or deposit earns progress. */
type Blueprint = {
  area: AreaId; key: string; road: string; stop: string; title: string;
  guess: string; principle: string; misconception: string;
  situation: string; answer: string; wrong: string; why: string; save: string;
};
const blueprints: Blueprint[] = [
  { area: "home", key: "meter", road: "everyday-only", stop: "energy-year", title: "Read the meter before winter",
    guess: "What lets you compare energy used with your monthly advance?", principle: "Dated meter readings", misconception: "The advance amount on its own",
    situation: "A household changes its heating hours. What could it check before the next bill?", answer: "Compare dated readings with the advance", wrong: "Assume the previous payment still covers the usage", why: "The payment is an estimate; readings show what changed.", save: "Save a meter-reading checklist" },
  { area: "home", key: "renewals", road: "everyday-only", stop: "renewals", title: "Review the cover for your home",
    guess: "What matters when two cover renewals have different prices?", principle: "Compare cover, exclusions and excess together", misconception: "Choose by the price alone",
    situation: "A renewal is cheaper but has a larger excess. What helps Jo compare it?", answer: "Check what Jo would pay when making a claim", wrong: "Assume a lower premium means a better fit", why: "Price alone does not describe the protection or the cost of a claim.", save: "Save my cover-review questions" },
  { area: "car", key: "renewal", road: "everyday-only", stop: "renewals", title: "Your car renewal, in context",
    guess: "What should you compare before deciding about a car renewal?", principle: "The cover, excess and exclusions as well as price", misconception: "Only the annual premium",
    situation: "A driver finds a lower premium with less cover. What is a useful next step?", answer: "Compare both policies against the driver’s needs", wrong: "Buy the lowest premium immediately", why: "A lower price can reflect different cover. Learning earns the blueprint; buying does not.", save: "Save a car-cover comparison checklist" },
  { area: "car", key: "calendar", road: "everyday-only", stop: "renewals", title: "Give annual car costs a place",
    guess: "What helps you see an annual cost before it arrives?", principle: "A calendar and a total you can review", misconception: "Treat it as an unexpected monthly bill",
    situation: "Pat has a renewal and maintenance in the same month. What shows the overlap?", answer: "Put both dates and estimates in one plan", wrong: "Look at each cost only when it arrives", why: "A shared calendar makes the timing visible without committing money.", save: "Save my annual-car-cost checklist" },
  { area: "savings", key: "goal", road: "everyday-only", stop: "holidays", title: "Choose a goal that is yours",
    guess: "What makes progress meaningful for a personal goal?", principle: "The share of your own target reached", misconception: "How much another household has saved",
    situation: "Two people have different goals and incomes. What is fair to show in their worlds?", answer: "Each person’s progress towards their own target", wrong: "Give the larger balance a larger world", why: "Progress is personal. A balance is not a score and does not earn a building.", save: "Save my goal-review checklist" },
  { area: "savings", key: "timing", road: "everyday-only", stop: "december", title: "Plan the whole seasonal total",
    guess: "What helps when many small seasonal costs arrive together?", principle: "A list with a total you choose", misconception: "Deciding on every offer separately",
    situation: "An extra outing appears on the family calendar. What keeps the plan visible?", answer: "Review the total and choose what to keep or change", wrong: "Add it without reviewing anything else", why: "Changing a plan is allowed. There is no penalty for pausing or choosing not to spend.", save: "Save my seasonal-total checklist" },
  { area: "work", key: "invoices", road: "freelance", stop: "late-client", title: "An invoice is not cash received",
    guess: "What belongs in money available today?", principle: "Payments already received", misconception: "Every invoice you have sent",
    situation: "A client pays later than expected. What should a freelancer review first?", answer: "Actual available money and the timing of bills", wrong: "Count the unpaid invoice as cash in the account", why: "Expected income and money available now have different timing.", save: "Save a cash-timing checklist" },
  { area: "work", key: "payslip", road: "first-job", stop: "first-payslip", title: "Read what reaches your account",
    guess: "Which figure helps you plan with the money you receive?", principle: "Net pay and the dates it arrives", misconception: "Gross pay without checking deductions",
    situation: "A new starter compares two offers. What keeps the comparison useful?", answer: "Compare net pay, benefits and timing together", wrong: "Pick the biggest gross figure alone", why: "Gross pay alone does not describe available money or the whole offer.", save: "Save my payslip questions" },
  { area: "family", key: "shared", road: "everyday-only", stop: "december", title: "A shared plan needs two voices",
    guess: "What makes a shared household plan useful?", principle: "Agree on the total and who checks each part", misconception: "Assume the other person already knows",
    situation: "Two adults both plan the same family purchase. What helps avoid a duplicate?", answer: "Review one shared list before deciding", wrong: "Buy separately and compare afterwards", why: "A shared checklist makes responsibilities clear without changing anyone’s accounts.", save: "Save our shared-plan checklist" },
  { area: "family", key: "changes", road: "everyday-only", stop: "energy-year", title: "When household routines change",
    guess: "What is useful when someone spends more time at home?", principle: "Review usage and the household plan together", misconception: "Assume every cost stays the same",
    situation: "An adult starts working from home. What could the household review?", answer: "Meter readings and the regular advance", wrong: "Only the previous year’s payment", why: "Changed routines can change usage. A review helps you see it before the settlement.", save: "Save our household-change checklist" },
  { area: "kids", key: "choose", road: "everyday-only", stop: "school", title: "Build a goal together",
    guess: "How can a child take part in a small saving goal?", principle: "Choose a goal together and talk about choices", misconception: "Compare the child with other children",
    situation: "A child wants two things but chooses one goal for now. What should the parent celebrate?", answer: "The child explaining the choice", wrong: "Having more money than another child", why: "The lesson rewards a conversation and a choice. There is no public child score.", save: "Save a parent-and-child goal conversation" },
  { area: "kids", key: "uni", road: "student-kid", stop: "registration", title: "Plan learning costs in steps",
    guess: "What is a useful way to explore future study costs together?", principle: "Separate essentials, timing and things that can wait", misconception: "Assume one fixed cost applies to every child",
    situation: "A family explores books, travel and a course fee. What helps them start?", answer: "List the costs and dates, then review their own goal", wrong: "Copy another family’s target without checking", why: "Study plans differ. You can revisit your own goal without a penalty.", save: "Save our study-cost questions" },
  { area: "pension", key: "overview", road: "everyday-only", stop: "pension", title: "Understand the pension overview",
    guess: "What should you understand before considering a pension choice?", principle: "The terms, access rules, costs and uncertainty", misconception: "Only the amount shown today",
    situation: "A statement shows a projection. What should Alex check?", answer: "What is assumed and what is guaranteed", wrong: "Treat the projection as a guaranteed payment", why: "An estimate depends on assumptions. Reading the terms earns learning progress.", save: "Save my pension-overview questions" },
  { area: "pension", key: "questions", road: "first-job", stop: "pension-saving", title: "Bring a question, not a conclusion",
    guess: "What helps when pension information is unclear?", principle: "Write down what you need explained", misconception: "Choose a product to finish the lesson",
    situation: "An adviser explains two options with different access rules. What can Sam do?", answer: "Ask how each fits Sam’s needs before deciding", wrong: "Assume the lesson requires a purchase", why: "Education does not require a contribution or product choice. Both decisions leave your progress unchanged.", save: "Save my pension-access question" },
  { area: "investments", key: "risk", road: "education-investments", stop: "risk", title: "Understand risk before returns",
    guess: "Does a past return promise the same result next year?", principle: "No; outcomes remain uncertain", misconception: "Yes; repeat the previous winner",
    situation: "An investment rose last year. What can Lee conclude about next year?", answer: "The past result does not guarantee the next one", wrong: "The same rise is certain", why: "Risk, time horizon and uncertainty matter. No trade or holding earns world progress.", save: "Save my risk questions" },
  { area: "investments", key: "costs", road: "education-investments", stop: "costs", title: "Read costs before choosing",
    guess: "What belongs in a comparison of investment costs?", principle: "All disclosed charges and when they apply", misconception: "Only the most visible headline fee",
    situation: "Two options show different entry and ongoing costs. What helps Lee understand them?", answer: "Compare the complete cost information over the same period", wrong: "Ignore ongoing charges because they look small", why: "Costs and risk need context. This lesson never recommends a product or rewards trading.", save: "Save my investment-cost questions" },
];

export function authoredQuests(personaId: string, area: AreaId): Lesson[] {
  return blueprints.filter(b => b.area === area && (area !== "work" || (personaId === "karim" ? b.key === "invoices" : b.key === "payslip"))).map((b, index) => {
    const evidence = stopEvidenceFor(b.road, b.stop);
    const published = evidence?.available && evidence.denominator.shown;
    const share = evidence?.surprised.share;
    const id = `${personaId}:world-${area}-${b.key}`;
    const choice = (id: string, label: string, correct: boolean) => ({ id, label, correct, why: correct ? b.why : `Try again. ${b.why}` });
    return { id, personaId, roadId: b.road, stopId: `${b.road}:${b.stop}`, order: index + 1,
      month: evidence?.month ?? 0, title: b.title,
      guess: { question: b.guess, choices: [choice("principle", b.principle, true), choice("misconception", b.misconception, false), { id: "unsure", label: "Not sure, show me" }] },
      reveal: { headline: published && share?.shown && share.value !== null ? `${Math.round(share.value * 100)}% · ${b.stop.includes("energy") ? "couldn’t cover their energy bill" : "couldn’t cover this cost"}.` : b.principle,
        detail: b.why, ...(!published ? { withheld: "Authored education. No published crowd measurement is claimed for this lesson." } : {}) },
      helped: published ? evidence.helped.map(h => ({ label: h.label, ...(h.outcome.shown && h.outcome.value !== null ? { share: Math.round(h.outcome.value * 100) } : {}) })) : [{ label: b.principle }],
      note: published && evidence.notes[0] ? { text: evidence.notes[0].text, by: evidence.notes[0].by } : undefined,
      apply: { question: b.situation, choices: [choice("apply", b.answer, true), choice("retry", b.wrong, false)], explain: b.why },
      save: { id: `lesson:${id}:step`, label: b.save }, reward: { label: `${area === "kids" ? "Mini-world" : "Area"} blueprint learned` },
      stamp: { icon: "✦", label: b.title }, synthetic: true as const };
  });
}
