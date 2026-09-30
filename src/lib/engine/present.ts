import { formatEur } from "../format";
import type {
  AdaptiveWidgetId,
  Density,
  HomepageConfig,
  Profile,
} from "./types";

export const PRESENTATION = {
  simple: {
    bubbles: 3,
    font: 18,
    gap: 14,
    target: 56,
    drift: 14,
    amplitude: 2,
  },
  standard: {
    bubbles: 4,
    font: 14,
    gap: 10,
    target: 44,
    drift: 10,
    amplitude: 4,
  },
  detailed: {
    bubbles: 5,
    font: 13,
    gap: 8,
    target: 44,
    drift: 8,
    amplitude: 4,
  },
} satisfies Record<Density, Record<string, number>>;

export const CHIP_POOL = {
  house: "Can we afford a house?",
  changes: "What changed this month?",
  safety: "Is this payment safe?",
  balance: "What is my balance?",
  advisor: "Call my advisor",
  travel: "What about my trip?",
  investments: "Show my portfolio",
} as const;
export type ChipId = keyof typeof CHIP_POOL;

export function recentTransactions(profile: Profile, days = 30) {
  return profile.transactions.filter((tx) => {
    const age = (Date.parse(profile.today) - Date.parse(tx.date)) / 86_400_000;
    return age >= 0 && age <= days;
  });
}

export function bubbleMetric(id: AdaptiveWidgetId, profile: Profile) {
  const c = profile.customer;
  const recent = recentTransactions(profile);
  const goal = c.savingsGoals.find((g) => g.kind === "house");
  switch (id) {
    case "homeBuying":
      return {
        label: "House fund",
        value:
          goal && goal.target > 0
            ? `${Math.round((goal.saved / goal.target) * 100)}%`
            : formatEur(c.savings),
      };
    case "moving":
      return {
        label: "Moving",
        value: `${formatEur(
          recentTransactions(profile, 60)
            .filter((t) => ["furniture", "moving_company"].includes(t.category))
            .reduce((s, t) => s - t.amount, 0),
        )} spent`,
      };
    case "travel":
      return {
        label: "Travel",
        value: `${recent.filter((t) => t.category === "flight").length} flight booked`,
      };
    case "investments":
      return { label: "Portfolio", value: formatEur(c.portfolioValue) };
    case "taxReserve":
      return {
        label: "Tax reserve",
        value: `${formatEur(recent.filter((t) => t.category === "freelance_income").reduce((s, t) => s + t.amount, 0))} income`,
      };
    case "budget":
      return {
        label: "This month",
        value: `${formatEur(recent.filter((t) => t.amount < 0).reduce((s, t) => s - t.amount, 0))} spent`,
      };
    case "pension":
      return {
        label: "Pension",
        value: formatEur(
          profile.transactions.find((t) => t.category === "pension_income")
            ?.amount ?? 0,
        ),
      };
    case "paymentCheck":
      return {
        label: "Payment check",
        value: recentTransactions(profile, 7).some(
          (t) => t.newPayee && t.amount <= -1000 && t.category === "transfer",
        )
          ? "Review payee"
          : "Here to help",
      };
    case "advisor":
      return { label: "Your advisor", value: c.advisorName.split(" ")[0] };
    case "transactions":
      return { label: "Activity", value: `${recent.length} payments` };
  }
}

/** Diameter is monotonic in the actual engine score, even when a pin reorders it. */
export function bubbleDiameter(score: number, density: Density): number {
  return (
    (density === "simple" ? 116 : 96) + Math.min(120, Math.max(0, score)) * 0.3
  );
}

export function selectChips(config: HomepageConfig): ChipId[] {
  const relevant = (id: AdaptiveWidgetId) =>
    config.adaptive.some((s) => s.id === id) ||
    config.questions.some((q) => q.need === id);
  const candidates: ChipId[] = [];
  if (relevant("homeBuying")) candidates.push("house");
  if (relevant("travel")) candidates.push("travel");
  if (relevant("paymentCheck")) candidates.push("safety");
  if (config.density === "simple") candidates.push("advisor", "balance");
  if (relevant("investments")) candidates.push("investments");
  return [
    ...new Set<ChipId>([...candidates, "changes", "safety", "balance"]),
  ].slice(0, 3);
}

export function narrative(profile: Profile, config: HomepageConfig): string {
  const name = profile.customer.firstName;
  if (config.adaptive.some((s) => s.id === "moving"))
    return `${name}, your move is taking shape — your checklist and money are here together.`;
  if (config.adaptive.some((s) => s.id === "homeBuying"))
    return `${name}, your first home starts with a plan — let’s look at it together.`;
  if (config.adaptive.some((s) => s.id === "travel"))
    return `${name}, a trip is on the horizon — your everyday essentials are still here.`;
  if (config.tone === "reassuring")
    return `Hello ${name}, take your time — here’s what matters today.`;
  if (config.tone === "expert")
    return `${name}, your money at a glance, with the detail one tap away.`;
  return `Hi ${name}, a little overview of your day, with room for what’s next.`;
}

export function presentHomepage(profile: Profile, config: HomepageConfig) {
  const limit = PRESENTATION[config.density].bubbles;
  const questions = config.questions.slice(0, 1);
  const slots = config.adaptive.slice(0, limit - questions.length);
  return {
    narrative: narrative(profile, config),
    chips: selectChips(config),
    bubbles: slots.map((slot) => ({
      ...slot,
      ...bubbleMetric(slot.id, profile),
      diameter: bubbleDiameter(slot.score, config.density),
    })),
    questions,
    more: config.adaptive.slice(slots.length),
    moreQuestions: config.questions.slice(questions.length),
  };
}
