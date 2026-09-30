import { assessNeeds, questionsFrom } from "./infer";
import type {
  AdaptiveSlot,
  AdaptiveWidgetId,
  AssessedNeed,
  CoreWidgetId,
  Decisions,
  Density,
  HomepageConfig,
  NeedId,
  Profile,
  Tone,
  Variant,
  WidgetScore,
  WidgetSize,
} from "./types";

/** The fixed core zone. It never moves, whatever the signals say. */
export const CORE_WIDGETS: readonly CoreWidgetId[] = ["balance", "quickPay"];

interface WidgetRule {
  base: number;
  needs: Partial<Record<NeedId, number>>;
}

/** How strongly each applied need pulls a widget onto the home screen. */
export const WIDGET_RULES: Record<AdaptiveWidgetId, WidgetRule> = {
  homeBuying: { base: 0, needs: { homeBuying: 100 } },
  moving: { base: 0, needs: { moving: 100 } },
  travel: { base: 0, needs: { travel: 90 } },
  investments: { base: 0, needs: { investor: 85, retirement: 5 } },
  taxReserve: { base: 0, needs: { taxReserve: 90 } },
  budget: {
    base: 10,
    needs: { newFixedCosts: 70, moving: 25, homeBuying: 15 },
  },
  pension: { base: 0, needs: { retirement: 60 } },
  paymentCheck: { base: 0, needs: { paymentSafety: 110, simpleUi: 25 } },
  advisor: {
    base: 20,
    needs: { homeBuying: 30, simpleUi: 30, retirement: 10, windfall: 20 },
  },
  transactions: { base: 30, needs: {} },
  windfall: { base: 0, needs: { windfall: 110 } },
};

const ADAPTIVE_WIDGETS = Object.keys(WIDGET_RULES) as AdaptiveWidgetId[];

export const MIN_SCORE = 20;
const MAX_TAP_BONUS_TAPS = 20;
const TAP_WEIGHT = 0.75;

export const MAX_ADAPTIVE: Record<Density, number> = {
  simple: 3,
  standard: 5,
  detailed: 6,
};

const NEED_LABELS: Record<NeedId, string> = {
  homeBuying: "buying a home",
  moving: "moving",
  travel: "travelling",
  taxReserve: "setting aside tax",
  investor: "following your investments",
  simpleUi: "a simpler screen",
  retirement: "your pension",
  newFixedCosts: "new fixed costs",
  paymentSafety: "payment safety",
  windfall: "deciding what to do with a one-off sum",
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function isApplied(
  needs: AssessedNeed[],
  id: NeedId,
): AssessedNeed | undefined {
  return needs.find((n) => n.id === id && n.status === "applied");
}

function chooseDensity(needs: AssessedNeed[]): Density {
  if (isApplied(needs, "simpleUi")) return "simple";
  const investor = isApplied(needs, "investor");
  if (investor && investor.confidence >= 0.8) return "detailed";
  return "standard";
}

const TONES: Record<Density, Tone> = {
  simple: "reassuring",
  standard: "friendly",
  detailed: "expert",
};

interface Scored {
  id: AdaptiveWidgetId;
  score: number;
  reasons: string[];
}

function scoreWidget(
  id: AdaptiveWidgetId,
  profile: Profile,
  needs: AssessedNeed[],
): Scored {
  const rule = WIDGET_RULES[id];
  let score = rule.base;
  const reasons: string[] = [];
  for (const [needId, weight] of Object.entries(rule.needs) as [
    NeedId,
    number,
  ][]) {
    const n = isApplied(needs, needId);
    if (!n) continue;
    score += weight * n.confidence;
    reasons.push(
      `Looks like ${NEED_LABELS[needId]} matters to you (${Math.round(n.confidence * 100)}% ${n.source})`,
      ...n.reasons,
    );
  }
  const taps = profile.behaviour.widgetTaps[id] ?? 0;
  if (taps > 0) {
    score += Math.min(taps, MAX_TAP_BONUS_TAPS) * TAP_WEIGHT;
    reasons.push(`You opened this ${taps}× in the last 30 days`);
  }
  if (reasons.length === 0 && rule.base > 0) {
    reasons.push("Useful for most customers");
  }
  return { id, score: round1(score), reasons: [...new Set(reasons)] };
}

function variantFor(
  id: AdaptiveWidgetId,
  size: WidgetSize,
  density: Density,
  needs: AssessedNeed[],
): Variant {
  // Behaviour beats presentation defaults: an avid investor gets full detail
  // on their portfolio even when the rest of the screen is simplified.
  if (id === "investments") {
    const investor = isApplied(needs, "investor");
    if (
      investor &&
      investor.source !== "declared" &&
      investor.confidence >= 0.85
    ) {
      return "detailed";
    }
  }
  if (density === "simple") return "simple";
  if (density === "detailed") return "detailed";
  return size === "sm" ? "simple" : "detailed";
}

function sizeFor(index: number, density: Density): WidgetSize {
  if (density === "simple" || index === 0) return "lg";
  return index <= 2 ? "md" : "sm";
}

export function rankHomepage(
  profile: Profile,
  decisions: Decisions,
  needs: AssessedNeed[] = assessNeeds(profile, decisions),
): HomepageConfig {
  const density = chooseDensity(needs);
  const scored = ADAPTIVE_WIDGETS.map((id) => scoreWidget(id, profile, needs));

  const visible = scored
    .filter((w) => !decisions.hidden.includes(w.id))
    .filter((w) => decisions.pinned.includes(w.id) || w.score >= MIN_SCORE);

  const pinned = decisions.pinned
    .map((id) => visible.find((w) => w.id === id))
    .filter((w): w is Scored => w !== undefined);
  const ranked = visible
    .filter((w) => !decisions.pinned.includes(w.id))
    .sort((a, b) => b.score - a.score);

  const limit = Math.max(MAX_ADAPTIVE[density], pinned.length);
  const chosen = [...pinned, ...ranked].slice(0, limit);

  const adaptive: AdaptiveSlot[] = chosen.map((w, index) => {
    const size = sizeFor(index, density);
    const isPinned = decisions.pinned.includes(w.id);
    return {
      id: w.id,
      size,
      variant: variantFor(w.id, size, density, needs),
      score: w.score,
      pinned: isPinned,
      reasons: isPinned ? ["You pinned this card", ...w.reasons] : w.reasons,
    };
  });

  const scores: WidgetScore[] = scored
    .map((w) => ({
      id: w.id,
      score: w.score,
      shown: chosen.some((c) => c.id === w.id),
      hidden: decisions.hidden.includes(w.id),
      pinned: decisions.pinned.includes(w.id),
    }))
    .sort((a, b) => b.score - a.score);

  return {
    core: [...CORE_WIDGETS],
    adaptive,
    density,
    tone: TONES[density],
    questions: questionsFrom(needs),
    scores,
  };
}

/** Full pipeline: signals → needs → ranked widgets → homepage config. */
export function runEngine(profile: Profile, decisions: Decisions) {
  const needs = assessNeeds(profile, decisions);
  return { needs, config: rankHomepage(profile, decisions, needs) };
}
