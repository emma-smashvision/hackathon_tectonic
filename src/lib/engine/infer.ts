import { formatEur } from "../format";
import type {
  AssessedNeed,
  Decisions,
  Need,
  NeedId,
  NeedSource,
  Profile,
  QuestionCard,
  Transaction,
  TxCategory,
} from "./types";

/** Needs at or above this confidence change the home screen directly. */
export const APPLY_THRESHOLD = 0.6;
/** Weaker needs above this floor become a gentle question instead. */
export const QUESTION_THRESHOLD = 0.25;
/** A need the customer dismissed only returns on overwhelming evidence. */
export const DISMISSED_OVERRIDE_THRESHOLD = 0.85;

const MAX_INFERRED_CONFIDENCE = 0.98;
const RECENT_DAYS = 60;

interface Evidence {
  weight: number;
  reason: string;
}

const QUESTIONS: Record<NeedId, string> = {
  homeBuying: "Thinking about buying a home?",
  moving: "Planning a move?",
  travel: "Travelling soon?",
  taxReserve: "Want help setting money aside for taxes?",
  investor: "Want your investments front and centre?",
  simpleUi: "Would a simpler, larger home screen help?",
  retirement: "Want to keep an eye on your pension?",
  newFixedCosts: "New monthly costs — want a budget check?",
  paymentSafety: "Want us to double-check a payment?",
  windfall: "Some extra money came in — want a few ideas?",
  duplicatePayment: "Was a bill paid twice?",
  directDebits: "Want an overview of your direct debits?",
};

export function questionFor(need: NeedId): string {
  return QUESTIONS[need];
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function daysBetween(fromIso: string, toIso: string): number {
  const ms =
    Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

function recent(profile: Profile, days = RECENT_DAYS): Transaction[] {
  return profile.transactions.filter((tx) => {
    const age = daysBetween(tx.date, profile.today);
    return age >= 0 && age <= days;
  });
}

function ofCategory(txs: Transaction[], category: TxCategory): Transaction[] {
  return txs.filter((tx) => tx.category === category);
}

function need(
  id: NeedId,
  source: NeedSource,
  evidence: Evidence[],
): Need | null {
  if (evidence.length === 0) return null;
  const total = evidence.reduce((sum, e) => sum + e.weight, 0);
  const confidence = round2(Math.min(MAX_INFERRED_CONFIDENCE, total));
  if (confidence <= 0) return null;
  return { id, source, confidence, reasons: evidence.map((e) => e.reason) };
}

function inferHomeBuying(profile: Profile): Need | null {
  const evidence: Evidence[] = [];
  const views = profile.behaviour.pageViews.mortgageSimulator ?? 0;
  if (views > 0) {
    evidence.push({
      weight: Math.min(views, 4) * 0.1,
      reason: `Opened the mortgage simulator ${views}× this month`,
    });
  }
  const houseGoal = profile.customer.savingsGoals.find(
    (g) => g.kind === "house",
  );
  if (houseGoal) {
    evidence.push({
      weight: 0.3,
      reason: `Savings goal "${houseGoal.label}" (${formatEur(houseGoal.saved)} of ${formatEur(houseGoal.target)})`,
    });
  }
  const agent = ofCategory(recent(profile), "real_estate_agent")[0];
  if (agent) {
    evidence.push({ weight: 0.3, reason: `Payment to ${agent.merchant}` });
  }
  return need("homeBuying", "inferred", evidence);
}

function inferMoving(profile: Profile): Need | null {
  const evidence: Evidence[] = [];
  const txs = recent(profile);
  const furniture = ofCategory(txs, "furniture")[0];
  if (furniture) {
    evidence.push({
      weight: 0.35,
      reason: `Furniture purchase at ${furniture.merchant} (${formatEur(-furniture.amount)}) — could be a move, or just a new shelf`,
    });
  }
  const mover = ofCategory(txs, "moving_company")[0];
  if (mover) {
    evidence.push({ weight: 0.45, reason: `Payment to ${mover.merchant}` });
  }
  const rentElsewhere = ofCategory(txs, "rent").find(
    (tx) => tx.city && tx.city !== profile.customer.city,
  );
  if (rentElsewhere) {
    evidence.push({
      weight: 0.4,
      reason: `Rent paid to a landlord in ${rentElsewhere.city}, not ${profile.customer.city}`,
    });
  }
  return need("moving", "inferred", evidence);
}

function inferTravel(profile: Profile): Need | null {
  const evidence: Evidence[] = [];
  const txs = recent(profile, 30);
  const flight = ofCategory(txs, "flight")[0];
  if (flight) {
    evidence.push({
      weight: 0.65,
      reason: `Flight booked: ${flight.merchant}`,
    });
  }
  const hotel = ofCategory(txs, "hotel")[0];
  if (hotel) {
    evidence.push({ weight: 0.35, reason: `Hotel booked: ${hotel.merchant}` });
  }
  const foreign = txs.filter((tx) => tx.country && tx.country !== "BE");
  const foreignCard = foreign.filter((tx) => tx.category === "foreign_card");
  if (foreignCard.length > 0) {
    evidence.push({
      weight: Math.min(foreignCard.length, 2) * 0.25,
      reason: `${foreignCard.length} card payment${foreignCard.length > 1 ? "s" : ""} abroad`,
    });
  }
  const insuranceViews = profile.behaviour.pageViews.travelInsurance ?? 0;
  if (insuranceViews > 0) {
    evidence.push({
      weight: 0.15,
      reason: `Looked at travel insurance ${insuranceViews}×`,
    });
  }
  return need("travel", "inferred", evidence);
}

function coefficientOfVariation(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

function inferTaxReserve(profile: Profile): Need | null {
  const evidence: Evidence[] = [];
  if (profile.customer.occupation === "freelancer") {
    evidence.push({ weight: 0.5, reason: "Self-employed (freelancer)" });
  }
  const incomes = ofCategory(profile.transactions, "freelance_income").map(
    (tx) => tx.amount,
  );
  if (incomes.length >= 3 && coefficientOfVariation(incomes) > 0.25) {
    evidence.push({
      weight: 0.4,
      reason: `Irregular income: ${incomes.length} client payments between ${formatEur(Math.min(...incomes))} and ${formatEur(Math.max(...incomes))}`,
    });
  }
  if (ofCategory(profile.transactions, "tax").length > 0) {
    evidence.push({ weight: 0.1, reason: "Pays tax prepayments" });
  }
  return need("taxReserve", "inferred", evidence);
}

function inferInvestor(profile: Profile): Need | null {
  const evidence: Evidence[] = [];
  const views = profile.behaviour.portfolioViewsPerWeek;
  if (views >= 7) {
    evidence.push({ weight: 0.9, reason: `Checks portfolio ${views}× a week` });
  } else if (views >= 3) {
    evidence.push({ weight: 0.7, reason: `Checks portfolio ${views}× a week` });
  } else if (views >= 1) {
    evidence.push({
      weight: 0.35,
      reason: `Checks portfolio ${views}× a week`,
    });
  }
  const plan = ofCategory(recent(profile), "investment")[0];
  if (plan) {
    evidence.push({
      weight: 0.15,
      reason: `Regular investment: ${plan.merchant}`,
    });
  }
  // Holding a portfolio alone is weak evidence of wanting it on the home screen.
  if (evidence.length === 0 && profile.customer.portfolioValue > 0) {
    evidence.push({ weight: 0.2, reason: "Holds an investment portfolio" });
  }
  return need("investor", "behaviour", evidence);
}

/**
 * Accessibility needs come from behaviour only. Age is deliberately not an
 * input: a 74-year-old who reads small print happily keeps a detailed home.
 */
function inferSimpleUi(profile: Profile): Need | null {
  const evidence: Evidence[] = [];
  const b = profile.behaviour;
  if (b.largeTextEnabled) {
    evidence.push({
      weight: 0.6,
      reason: "Large text is enabled on this device",
    });
  }
  if (b.zoomUsage >= 0.2) {
    evidence.push({
      weight: Math.min(0.35, b.zoomUsage * 0.6),
      reason: `Zooms in during ${Math.round(b.zoomUsage * 100)}% of sessions`,
    });
  }
  if (b.errorRate >= 0.1) {
    evidence.push({
      weight: Math.min(0.3, b.errorRate * 1.5),
      reason: `${Math.round(b.errorRate * 100)}% of taps are mis-taps`,
    });
  }
  return need("simpleUi", "behaviour", evidence);
}

function inferRetirement(profile: Profile): Need | null {
  const evidence: Evidence[] = [];
  const pension = ofCategory(profile.transactions, "pension_income")[0];
  if (pension) {
    evidence.push({
      weight: 0.7,
      reason: `Receives a monthly pension (${pension.merchant})`,
    });
  }
  const views = profile.behaviour.pageViews.pension ?? 0;
  if (views > 0) {
    evidence.push({
      weight: Math.min(views, 3) * 0.15,
      reason: `Viewed pension overview ${views}×`,
    });
  }
  return need("retirement", "inferred", evidence);
}

const FIXED_COST_CATEGORIES: TxCategory[] = [
  "rent",
  "utilities",
  "insurance",
  "subscription",
];

function inferNewFixedCosts(profile: Profile): Need | null {
  const firstSeen = new Map<string, Transaction>();
  const sorted = [...profile.transactions].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  for (const tx of sorted) {
    if (
      FIXED_COST_CATEGORIES.includes(tx.category) &&
      !firstSeen.has(tx.merchant)
    ) {
      firstSeen.set(tx.merchant, tx);
    }
  }
  const fresh = [...firstSeen.values()].filter(
    (tx) => daysBetween(tx.date, profile.today) <= 30,
  );
  const evidence = fresh.map((tx) => ({
    weight: tx.category === "rent" ? 0.6 : 0.25,
    reason: `New fixed cost: ${tx.merchant} (${formatEur(-tx.amount)}/month)`,
  }));
  return need("newFixedCosts", "inferred", evidence);
}

function inferPaymentSafety(profile: Profile): Need | null {
  const risky = recent(profile, 7).filter(
    (tx) => tx.category === "transfer" && tx.newPayee && tx.amount <= -1000,
  );
  const evidence = risky.map((tx) => ({
    weight: 0.7,
    reason: `Large transfer to a new payee: ${tx.merchant} (${formatEur(-tx.amount)})`,
  }));
  return need("paymentSafety", "inferred", evidence);
}

/** A one-off sum (a prize, not a salary) deserves a moment of thought. */
function inferWindfall(profile: Profile): Need | null {
  const evidence = ofCategory(recent(profile, 30), "prize")
    .filter((tx) => tx.amount >= 1000)
    .map((tx) => ({
      weight: 0.9,
      reason: `One-off ${formatEur(tx.amount)} received: ${tx.merchant}`,
    }));
  return need("windfall", "inferred", evidence);
}

/** The same bill, same amount, collected twice within a few days. */
export function findDuplicatePayment(
  profile: Profile,
): [Transaction, Transaction] | null {
  const bills = recent(profile, 45)
    .filter((tx) => tx.amount < 0 && tx.category !== "transfer")
    .sort((a, b) => a.date.localeCompare(b.date));
  for (let i = 0; i < bills.length; i++) {
    for (let j = i + 1; j < bills.length; j++) {
      const a = bills[i];
      const b = bills[j];
      if (
        a.merchant === b.merchant &&
        a.amount === b.amount &&
        daysBetween(a.date, b.date) <= 3
      ) {
        return [a, b];
      }
    }
  }
  return null;
}

function inferDuplicatePayment(profile: Profile): Need | null {
  const pair = findDuplicatePayment(profile);
  if (!pair) return null;
  const [a, b] = pair;
  return need("duplicatePayment", "inferred", [
    {
      weight: 0.9,
      reason: `${a.merchant} ${formatEur(-a.amount, true)} was paid on ${a.date} and again on ${b.date}`,
    },
  ]);
}

/** Latest collection per direct-debit merchant, with any increase. */
export function directDebitList(profile: Profile) {
  const byMerchant = new Map<string, Transaction[]>();
  for (const tx of [...profile.transactions].sort((a, b) =>
    b.date.localeCompare(a.date),
  )) {
    if (!tx.directDebit) continue;
    byMerchant.set(tx.merchant, [...(byMerchant.get(tx.merchant) ?? []), tx]);
  }
  return [...byMerchant.values()].map(([latest, ...older]) => {
    // A second collection of the same amount is a duplicate, not the usual one.
    const previous = older.find((o) => o.amount !== latest.amount);
    return {
      merchant: latest.merchant,
      amount: -latest.amount,
      date: latest.date,
      increase:
        previous && latest.amount < previous.amount
          ? Math.round((previous.amount - latest.amount) * 100) / 100
          : 0,
    };
  });
}

function inferDirectDebits(profile: Profile): Need | null {
  const debits = directDebitList(profile);
  if (debits.length < 3) return null;
  const evidence: Evidence[] = [
    {
      weight: Math.min(0.72, debits.length * 0.12),
      reason: `${debits.length} bills are paid by direct debit`,
    },
  ];
  const up = debits.find((d) => d.increase >= 5);
  if (up) {
    evidence.push({
      weight: 0.1,
      reason: `${up.merchant} is ${formatEur(up.increase)} higher than usual`,
    });
  }
  return need("directDebits", "inferred", evidence);
}

const RULES: ((profile: Profile) => Need | null)[] = [
  inferDuplicatePayment,
  inferDirectDebits,
  inferHomeBuying,
  inferMoving,
  inferTravel,
  inferTaxReserve,
  inferInvestor,
  inferSimpleUi,
  inferRetirement,
  inferNewFixedCosts,
  inferPaymentSafety,
  inferWindfall,
];

/** Derive needs purely from signals, before customer decisions. */
export function inferNeeds(profile: Profile): Need[] {
  return RULES.map((rule) => rule(profile))
    .filter((n): n is Need => n !== null)
    .sort((a, b) => b.confidence - a.confidence);
}

/**
 * Combine inferred needs with the customer's answers and classify each one:
 * applied (drives the layout), question (ask first), suppressed or weak.
 */
export function assessNeeds(
  profile: Profile,
  decisions: Decisions,
): AssessedNeed[] {
  const inferred = inferNeeds(profile);
  const result: AssessedNeed[] = [];

  for (const n of inferred) {
    if (decisions.declared.includes(n.id)) {
      result.push({
        id: n.id,
        confidence: 1,
        source: "declared",
        reasons: ["You told us this is relevant", ...n.reasons],
        status: "applied",
      });
    } else if (decisions.dismissed.includes(n.id)) {
      const override = n.confidence >= DISMISSED_OVERRIDE_THRESHOLD;
      result.push({
        ...n,
        reasons: override
          ? [
              ...n.reasons,
              "You said this wasn't relevant, but strong new signals appeared",
            ]
          : n.reasons,
        status: override ? "applied" : "suppressed",
      });
    } else if (n.confidence >= APPLY_THRESHOLD) {
      result.push({ ...n, status: "applied" });
    } else if (n.confidence >= QUESTION_THRESHOLD) {
      result.push({ ...n, status: "question" });
    } else {
      result.push({ ...n, status: "weak" });
    }
  }

  for (const id of decisions.declared) {
    if (!result.some((n) => n.id === id)) {
      result.push({
        id,
        confidence: 1,
        source: "declared",
        reasons: ["You told us this is relevant"],
        status: "applied",
      });
    }
  }

  return result;
}

export function questionsFrom(needs: AssessedNeed[]): QuestionCard[] {
  return needs
    .filter((n) => n.status === "question")
    .sort((a, b) => b.confidence - a.confidence)
    .map((n) => ({
      need: n.id,
      confidence: n.confidence,
      question: questionFor(n.id),
      reasons: n.reasons,
    }));
}
