import { formatEur } from "../format";
import { directDebitList, findDuplicatePayment } from "./infer";
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
  windfall: "What can we do with the €10k?",
  duplicate: "Was a bill paid twice?",
  debits: "Show my direct debits",
  exchange: "How do I exchange currency?",
  appointment: "When is our next appointment?",
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
        value:
          recent.find((t) => t.category === "foreign_card")?.city ??
          `${recent.filter((t) => t.category === "flight").length} flight booked`,
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
    case "windfall": {
      const prize = recent.find((t) => t.category === "prize");
      return {
        label: "Your prize",
        value: prize ? `${formatEur(prize.amount)} 🎉` : "3 ideas",
      };
    }
    case "duplicatePayment": {
      const pair = findDuplicatePayment(profile);
      return {
        label: "Paid twice?",
        value: pair ? `2× ${pair[0].merchant}` : "All clear",
      };
    }
    case "directDebits":
      return {
        label: "Direct debits",
        value: `${directDebitList(profile).length} active`,
      };
    case "fxAccounts": {
      const first = c.currencies?.[0];
      return {
        label: first ? `${first.code} pocket` : "Currencies",
        value: first ? compactMoney(first.amount, first.code) : "Open one",
      };
    }
    case "esim":
      return { label: "Travel eSIM", value: "From €9" };
    case "atmMap":
      return { label: "ATMs nearby", value: "3 fee-free" };
    case "appointments": {
      const next = c.appointments?.find((a) => !a.done);
      return {
        label: "Next appointment",
        value: next ? next.when.replace(/ \d+ \w+,/, "") : "Book one",
      };
    }
    case "houseTimeline":
      return { label: "House timeline", value: "Step 2 of 5" };
    case "houseInsurance":
      return { label: "Insurance", value: "3 to arrange" };
    case "performers": {
      const best = [...(c.holdings ?? [])].sort((a, b) => b.ytd - a.ytd)[0];
      return {
        label: best?.name ?? "Top performer",
        value: best ? signedPercent(best.ytd) : "—",
      };
    }
    case "dividends":
      return {
        label: "Dividends",
        value: formatEur(
          recentTransactions(profile, 60)
            .filter((t) => t.category === "investment" && t.amount > 0)
            .reduce((sum, t) => sum + t.amount, 0),
        ),
      };
    case "business":
      return { label: "Start a business", value: "4 steps" };
    case "celebrate": {
      const team = c.teamSize ?? 1;
      const prize = recent.find((t) => t.category === "prize");
      return {
        label: "Split & celebrate",
        value:
          prize && team > 1
            ? `${formatEur(prize.amount / team)} each`
            : "Trip ideas",
      };
    }
  }
}

const SYMBOLS: Record<string, string> = { GBP: "£", JPY: "¥", USD: "$" };

/** "¥48k", "£420": short figures that fit inside a bubble. */
export function compactMoney(amount: number, code = "EUR"): string {
  if (code === "EUR") return formatEur(amount);
  const symbol = SYMBOLS[code] ?? `${code} `;
  const abs = Math.abs(amount);
  const short =
    abs >= 1000
      ? `${Math.round(abs / 100) / 10}k`.replace(".0k", "k")
      : `${abs}`;
  return `${amount < 0 ? "−" : ""}${symbol}${short}`;
}

export function signedPercent(value: number): string {
  const pct = Math.round(value * 1000) / 10;
  return `${pct > 0 ? "+" : pct < 0 ? "−" : ""}${Math.abs(pct)}%`;
}

export type Direction = "up" | "down" | "neutral";

/** Subtle tint for figures that move: green up, red down, otherwise neutral. */
export function bubbleDirection(
  id: AdaptiveWidgetId,
  profile: Profile,
): Direction {
  const c = profile.customer;
  switch (id) {
    case "performers": {
      const best = [...(c.holdings ?? [])].sort((a, b) => b.ytd - a.ytd)[0];
      return best && best.ytd < 0 ? "down" : best ? "up" : "neutral";
    }
    case "dividends":
    case "windfall":
      return "up";
    case "investments": {
      const holdings = c.holdings ?? [];
      const total = holdings.reduce((s, h) => s + h.value, 0);
      const ytd = holdings.reduce((s, h) => s + h.value * h.ytd, 0);
      return total === 0 ? "neutral" : ytd >= 0 ? "up" : "down";
    }
    default:
      return "neutral";
  }
}

/** Items that ask for attention get a pulsing dot (after InvestSuite's nudge). */
export function needsNudge(id: AdaptiveWidgetId, profile: Profile): boolean {
  if (id === "duplicatePayment") return findDuplicatePayment(profile) !== null;
  if (id === "windfall")
    return recentTransactions(profile).some((t) => t.category === "prize");
  if (id === "paymentCheck")
    return recentTransactions(profile, 7).some(
      (t) => t.newPayee && t.amount <= -1000 && t.category === "transfer",
    );
  return false;
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
  if (relevant("windfall")) candidates.push("windfall");
  if (relevant("homeBuying")) candidates.push("house");
  if (relevant("travel")) candidates.push("travel");
  if (relevant("paymentCheck")) candidates.push("safety");
  if (config.density === "simple") candidates.push("advisor", "balance");
  if (relevant("investments")) candidates.push("investments");
  if (relevant("duplicatePayment")) candidates.unshift("duplicate");
  if (relevant("directDebits")) candidates.push("debits");
  if (relevant("fxAccounts")) candidates.push("exchange");
  if (relevant("appointments")) candidates.push("appointment");
  return [
    ...new Set<ChipId>([...candidates, "changes", "safety", "balance"]),
  ].slice(0, 3);
}

export function narrative(profile: Profile, config: HomepageConfig): string {
  const name = profile.customer.firstName;
  if (config.adaptive.some((s) => s.id === "windfall"))
    return `Congratulations, ${name}! No rush — here are a few ways to make that prize work for you.`;
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

/** Ambient mood of the home, picked from what the engine put on it. */
export type Mood =
  | "calm"
  | "warm"
  | "focused"
  | "celebratory"
  | "bright"
  | "neutral";

export function moodFor(config: HomepageConfig): Mood {
  const shown = (id: AdaptiveWidgetId) =>
    config.adaptive.some((s) => s.id === id);
  if (shown("windfall")) return "celebratory";
  if (config.density === "simple") return "calm";
  if (config.density === "detailed") return "focused";
  if (shown("homeBuying") || shown("moving")) return "warm";
  if (shown("travel")) return "bright";
  return "neutral";
}

/** Bubble diameter bounds per density; the minimum keeps text readable. */
export const BUBBLE_SIZE: Record<Density, { min: number; max: number }> = {
  simple: { min: 112, max: 150 },
  standard: { min: 80, max: 128 },
  detailed: { min: 76, max: 116 },
};

/** Area-true sizing: diameter grows with the square root of the weight (0–1). */
export function bubbleSize(weight: number, density: Density): number {
  const { min, max } = BUBBLE_SIZE[density];
  const w = Math.max(0, Math.min(1, weight));
  return Math.round(min + Math.sqrt(w) * (max - min));
}

/** Height of the floating field inside the phone, per density. */
export const BUBBLE_FIELD: Record<Density, number> = {
  simple: 330,
  standard: 290,
  detailed: 290,
};

export interface BubblePosition {
  /** Centre as a share of the field (0–1). */
  x: number;
  y: number;
}

// Deterministic seeds spread across the field (after InvestSuite).
const SEED_LEFTS = [22, 74, 48, 84, 14, 62, 36, 80, 26, 56];
const SEED_TOPS = [28, 36, 70, 72, 66, 30, 56, 48, 40, 60];
const SAFE_INSET = 4;

/**
 * Seeded positions, then repeated overlap-resolution passes, each clamped to
 * a safe zone so bubbles never overlap and never leave their field (so they
 * never cover the chips or the Kate dock underneath).
 */
export function layoutBubbles(
  diameters: number[],
  width: number,
  height: number,
  gap = 8,
): BubblePosition[] {
  const items = diameters.map((d, i) => ({
    x: (SEED_LEFTS[i % SEED_LEFTS.length] / 100) * width,
    y: (SEED_TOPS[i % SEED_TOPS.length] / 100) * height,
    r: d / 2,
  }));
  const clamp = (it: (typeof items)[number]) => {
    it.x = Math.max(
      SAFE_INSET + it.r,
      Math.min(width - SAFE_INSET - it.r, it.x),
    );
    it.y = Math.max(
      SAFE_INSET + it.r,
      Math.min(height - SAFE_INSET - it.r, it.y),
    );
  };
  items.forEach(clamp);
  for (let pass = 0; pass < 120; pass++) {
    let moved = false;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const min = a.r + b.r + gap;
        if (dist === 0) {
          a.x -= 10;
          b.x += 10;
          moved = true;
        } else if (dist < min) {
          const push = (min - dist) / 2;
          a.x -= (dx / dist) * push;
          a.y -= (dy / dist) * push;
          b.x += (dx / dist) * push;
          b.y += (dy / dist) * push;
          moved = true;
        }
      }
    }
    items.forEach(clamp);
    if (!moved) break;
  }
  return items.map((it) => ({ x: it.x / width, y: it.y / height }));
}

export function presentHomepage(profile: Profile, config: HomepageConfig) {
  const limit = PRESENTATION[config.density].bubbles;
  const questions = config.questions.slice(0, 1);
  const slots = config.adaptive.slice(0, limit - questions.length);
  return {
    narrative: narrative(profile, config),
    chips: selectChips(config),
    mood: moodFor(config),
    bubbles: slots.map((slot) => ({
      ...slot,
      ...bubbleMetric(slot.id, profile),
      diameter: bubbleDiameter(slot.score, config.density),
      size: bubbleSize(
        slot.score / Math.max(1, ...slots.map((s) => s.score)),
        config.density,
      ),
      direction: bubbleDirection(slot.id, profile),
      nudge: needsNudge(slot.id, profile),
    })),
    questions,
    more: config.adaptive.slice(slots.length),
    moreQuestions: config.questions.slice(questions.length),
  };
}
