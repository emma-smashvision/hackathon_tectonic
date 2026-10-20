import { roadViewFor, stopEvidenceFor } from "../crowd";
import { lessonEvidence, money, shown } from "./evidence";
import type { Choice, Lesson } from "./types";

const unsure: Choice = { id: "unsure", label: "Not sure, show me" };
const choice = (id: string, label: string, correct: boolean, why: string): Choice => ({ id, label, correct, why });

function stopLesson(personaId: string, roadId: string, stopId: string, content: Pick<Lesson, "order" | "title" | "guess" | "apply" | "reward" | "stamp">, actionId?: string): Lesson {
  const evidence = stopEvidenceFor(roadId, stopId);
  const action = evidence?.actions.find(item => item.id === actionId);
  return { id: `${personaId}:${stopId}`, personaId, roadId, stopId: `${roadId}:${stopId}`, month: evidence?.month ?? 0, ...content,
    ...lessonEvidence(evidence), save: action ? { id: action.pick.id, label: action.label, pick: action.pick.id } : undefined, synthetic: true };
}

function tomLessons(): Lesson[] {
  const energy = stopLesson("tom", "moving-house", "energy-new-address", {
    order: 1, title: "First energy bill",
    guess: { question: "You get the keys. What helps you check your first energy bill later?", choices: [
      choice("meter", "Photos of the meters at handover", true, "A dated reading records where your usage starts."),
      choice("advance", "The monthly advance amount", false, "An advance is a payment estimate, not a record of usage."), unsure] },
    apply: { question: "Sam gets a flatmate halfway through the month. What helps them split usage fairly?", choices: [
      choice("dated", "A dated meter photo on moving-in day", true, "A reading with a date separates usage before and after the move."),
      choice("half", "Split the monthly advance in two", false, "The advance does not record when energy was used. Try the dated reading.")],
      explain: "Record the reading and date together so you can check who used what." },
    reward: { label: "Ground floor built" }, stamp: { icon: "⚡", label: "Energy bill explained" },
  }, "meter");
  const setup = stopLesson("tom", "moving-house", "setting-up", {
    order: 2, title: "Setting up the new place",
    guess: { question: "What helps when lots of small purchases arrive together?", choices: [
      choice("list", "A room-by-room list and a total budget", true, "Small purchases add up across rooms."),
      choice("sale", "Choose each item because it is on sale", false, "A discount does not show what the whole setup costs."), unsure] },
    apply: { question: "Alex needs a desk, curtains and kitchen basics. What is a useful first step?", choices: [
      choice("needs", "List essentials, compare second-hand, then set a total", true, "A total keeps the whole room in view before buying."),
      choice("buy", "Buy the desk first and decide the rest later", false, "That leaves the other essentials outside the budget. Try listing them together.")],
      explain: "Separate what you need now from what can wait. Check the total before choosing individual items." },
    reward: { label: "Next floor built" }, stamp: { icon: "🛋", label: "Setup budget explained" },
  }, "second");
  const deposit = stopLesson("tom", "moving-house", "old-deposit", {
    order: 3, title: "Your old rental deposit",
    guess: { question: "Can the typical deposit refund tell you when your own money arrives?", choices: [
      choice("no", "No, the amount and timing can differ", true, "A group median is not your payment schedule."),
      choice("yes", "Yes, use it as money available on moving day", false, "The refund may arrive after you need to pay."), unsure] },
    apply: { question: "Jo needs to pay a bill before a deposit refund arrives. Which plan accounts for the gap?", choices: [
      choice("available", "Check money available now and ask about the release steps", true, "That keeps an uncertain refund separate from money already available."),
      choice("expected", "Count the expected refund as already available", false, "Expected money is not yet available. Check the gap and the release steps.")],
      explain: "Check the release process and keep uncertain timing separate from the money available today." },
    reward: { label: "Roof finished and windows lit" }, stamp: { icon: "🔑", label: "Deposit timing explained" },
  });
  deposit.save = { id: "lesson:tom:old-deposit:release", label: "Save a deposit-release checklist" };
  return [energy, setup, deposit];
}

const cache = new Map<string, Lesson[]>();
function familyEnergy(): Lesson {
  return stopLesson("sofie", "first-home", "energy-settlement", {
    order: 1, title: "Your household’s first energy settlement",
    guess: { question: "When you explore a first home, does the advance tell you the final energy cost?", choices: [
      choice("estimate", "It is an estimate; actual usage still matters", true, "A regular payment can differ from the final cost."),
      choice("fixed", "The advance fixes the final cost", false, "The settlement accounts for actual usage and previous payments."), unsure] },
    apply: { question: "A family uses more heating after someone starts working at home. What could they check?", choices: [
      choice("usage", "Meter readings and whether the advance still fits", true, "Compare actual usage with the estimate before the settlement."),
      choice("wait", "Assume the old advance still covers everything", false, "Usage has changed. Check the readings and the estimate together.")],
      explain: "Check the advance against your meter readings when your household’s energy use changes." },
    reward: { label: "Family courtyard built" }, stamp: { icon: "🌿", label: "Energy settlement explained" },
  }, "advance");
}

function december(): Lesson {
  return stopLesson("lina", "everyday-only", "december", {
    order: 1, title: "December, at your own pace",
    guess: { question: "What helps you see December spending before it adds up?", choices: [
      choice("list", "A gift list with a total you choose", true, "A list makes the total visible before you buy."),
      choice("each", "Decide separately for every offer", false, "Separate offers can hide the combined cost."), unsure] },
    apply: { question: "Noor adds another gift idea. How could Lina keep the overall plan in view?", choices: [
      choice("review", "Review the full list and decide what to swap or leave", true, "A budget is a choice about the whole list, not a rule to buy everything."),
      choice("add", "Add it without looking at the other gifts", false, "The total changes when an item is added. Look at the full list again.")],
      explain: "Choose a total that works for you. Changing the list or choosing not to buy is part of the plan." },
    reward: { label: "Winter garden built" }, stamp: { icon: "🎁", label: "December plan explained" },
  }, "list");
}

function yearlyEnergy(): Lesson {
  return stopLesson("margaret", "everyday-only", "energy-year", {
    order: 1, title: "Your yearly energy bill",
    guess: { question: "Your energy payment is the same each month. Can the yearly bill still be different?", choices: [
      choice("yes", "Yes. The bill also depends on energy used", true, "The monthly amount is an advance towards the final bill."),
      choice("no", "No. The same payment means the same bill", false, "The final bill compares actual usage with what you paid."), unsure] },
    apply: { question: "Pat uses more heating this winter. What could Pat check before the yearly bill?", choices: [
      choice("check", "The meter reading and the monthly advance", true, "The reading helps compare actual usage with the advance."),
      choice("ignore", "Only last year’s monthly payment", false, "Last year’s payment does not show this winter’s usage. Check the reading too.")],
      explain: "Check the reading and the advance together. Ask your adviser for help if you want to talk it through." },
    reward: { label: "Village garden complete" }, stamp: { icon: "🌳", label: "Yearly energy bill explained" },
  }, "advance");
}

function freelance(): Lesson {
  const fork = roadViewFor("karim")?.fork;
  const rows = fork?.comparisons.flatMap(comparison => comparison.branches.map(branch => {
    const buffer = branch.metrics.find(m => m.key === "buffer")?.value;
    const admin = branch.metrics.find(m => m.key === "admin")?.value;
    return [`Year ${comparison.horizon} · ${branch.id === "sole" ? "Sole trader" : "Company (BV)"}`, buffer && shown(buffer) ? money(buffer.value!) : "Withheld", admin && shown(admin) ? `${Math.round(admin.value! * 100)}%` : "Withheld"];
  })) ?? [];
  return {
    id: "karim:company", personaId: "karim", roadId: "freelance", stopId: "freelance:company", order: 1, month: fork?.month ?? 24,
    title: "Sole trader or a company?",
    guess: { question: "Which option would you like to explore first?", choices: [
      { id: "sole", label: "Stay a sole trader", why: "Let’s compare both horizons before drawing a conclusion." },
      { id: "bv", label: "Start a company (BV)", why: "Let’s compare both horizons before drawing a conclusion." }, unsure] },
    reveal: { headline: "The trade-off changes with the time horizon.",
      table: { caption: "Whole-group outcomes", columns: ["Time and choice", "Median buffer", "Admin manageable"], rows },
      withheld: "Matching subgroup withheld: too few people." },
    helped: [{ label: "Compare both the near-term administration and the longer-term outcome." }, { label: "Ask which structure fits your needs; a higher group median does not decide for you." }],
    apply: { question: "Sam needs simpler administration now. Does a higher year-3 buffer prove a BV fits?", choices: [
      choice("needs", "No. Compare horizons, administration and Sam’s needs", true, "A group outcome cannot settle an individual choice."),
      choice("highest", "Yes. Always choose the highest later buffer", false, "That ignores administration now and uncertainty. Compare both horizons.")],
      explain: "Ask your adviser how administration and timing compare for the structure you are exploring." },
    save: { id: "lesson:karim:company:adviser", label: "Save my question about administration and timing" },
    reward: { label: "Workshop built" }, stamp: { icon: "🛠", label: "Business trade-offs explained" }, synthetic: true,
  };
}

/** Stable persona-scoped lesson IDs; unknown and care personas have no lessons. */
export function lessonsFor(personaId: string): Lesson[] {
  if (!cache.has(personaId)) {
    const factories: Record<string, () => Lesson[]> = { tom: tomLessons, karim: () => [freelance()], sofie: () => [familyEnergy()], lina: () => [december()], margaret: () => [yearlyEnergy()] };
    cache.set(personaId, Object.hasOwn(factories, personaId) ? factories[personaId]() : []);
  }
  return cache.get(personaId)!;
}

export function lessonById(id: string): Lesson | undefined {
  return lessonsFor(id.split(":")[0]).find(lesson => lesson.id === id);
}
