/**
 * Core types for the personalisation engine.
 *
 * Pipeline: Signals → inferred needs → ranked components → homepage config → render.
 * All data in this prototype is synthetic.
 */

export type CoreWidgetId = "balance" | "quickPay";

export type AdaptiveWidgetId =
  | "homeBuying"
  | "moving"
  | "travel"
  | "investments"
  | "taxReserve"
  | "budget"
  | "pension"
  | "paymentCheck"
  | "advisor"
  | "transactions";

export type WidgetId = CoreWidgetId | AdaptiveWidgetId;

export type TxCategory =
  | "salary"
  | "freelance_income"
  | "pension_income"
  | "rent"
  | "utilities"
  | "insurance"
  | "subscription"
  | "groceries"
  | "restaurant"
  | "furniture"
  | "moving_company"
  | "real_estate_agent"
  | "flight"
  | "hotel"
  | "foreign_card"
  | "investment"
  | "tax"
  | "transfer";

export interface Transaction {
  id: string;
  /** ISO date, e.g. "2026-09-12". */
  date: string;
  merchant: string;
  /** Negative for money out, positive for money in (EUR). */
  amount: number;
  category: TxCategory;
  city?: string;
  /** ISO country code; anything other than "BE" counts as foreign. */
  country?: string;
  /** Beneficiary never paid before. */
  newPayee?: boolean;
}

export type SavingsGoalKind = "house" | "travel" | "emergency" | "other";

export interface SavingsGoal {
  id: string;
  label: string;
  kind: SavingsGoalKind;
  target: number;
  saved: number;
}

export interface Customer {
  id: string;
  firstName: string;
  age: number;
  city: string;
  occupation: "employee" | "freelancer" | "retired";
  household: string;
  balance: number;
  savings: number;
  savingsGoals: SavingsGoal[];
  portfolioValue: number;
  monthlyNetIncome: number;
  advisorName: string;
}

export type TrackedPage = "mortgageSimulator" | "travelInsurance" | "pension";

export interface BehaviourSignals {
  /** Taps per widget over the last 30 days. */
  widgetTaps: Partial<Record<WidgetId, number>>;
  /** Share of sessions (0-1) where the customer pinch-zoomed. */
  zoomUsage: number;
  /** Share of taps (0-1) that were mis-taps / immediate back-navigations. */
  errorRate: number;
  portfolioViewsPerWeek: number;
  /** Page views over the last 30 days. */
  pageViews: Partial<Record<TrackedPage, number>>;
  largeTextEnabled: boolean;
}

export interface Profile {
  customer: Customer;
  transactions: Transaction[];
  behaviour: BehaviourSignals;
  /** Reference "now" for the synthetic dataset (ISO date). */
  today: string;
}

export type NeedId =
  | "homeBuying"
  | "moving"
  | "travel"
  | "taxReserve"
  | "investor"
  | "simpleUi"
  | "retirement"
  | "newFixedCosts"
  | "paymentSafety";

export type NeedSource = "declared" | "inferred" | "behaviour";

export interface Need {
  id: NeedId;
  /** 0-1. */
  confidence: number;
  source: NeedSource;
  reasons: string[];
}

/** Choices the customer made on their home screen. */
export interface Decisions {
  pinned: AdaptiveWidgetId[];
  hidden: AdaptiveWidgetId[];
  /** Answered "Yes" to a question card. */
  declared: NeedId[];
  /** Answered "Not relevant" to a question card. */
  dismissed: NeedId[];
}

export type Density = "simple" | "standard" | "detailed";
export type Variant = "simple" | "detailed";
export type WidgetSize = "sm" | "md" | "lg";
export type Tone = "reassuring" | "friendly" | "expert";

export interface AdaptiveSlot {
  id: AdaptiveWidgetId;
  size: WidgetSize;
  variant: Variant;
  score: number;
  pinned: boolean;
  reasons: string[];
}

export interface QuestionCard {
  need: NeedId;
  confidence: number;
  question: string;
  reasons: string[];
}

export interface WidgetScore {
  id: AdaptiveWidgetId;
  score: number;
  shown: boolean;
  hidden: boolean;
  pinned: boolean;
}

export interface HomepageConfig {
  core: CoreWidgetId[];
  adaptive: AdaptiveSlot[];
  density: Density;
  tone: Tone;
  questions: QuestionCard[];
  /** Every adaptive widget with its score, for the inspector. */
  scores: WidgetScore[];
}

export const EMPTY_DECISIONS: Decisions = {
  pinned: [],
  hidden: [],
  declared: [],
  dismissed: [],
};

export type NeedStatus = "applied" | "question" | "suppressed" | "weak";

export interface AssessedNeed extends Need {
  status: NeedStatus;
}
