// Shared types for the Kate adaptive home (branch kate-adaptive-home).
// All customer data is synthetic.

export type StyleId = "calm" | "cards" | "dense" | "large";
export type Size = "s" | "m" | "l";
export type Score = "later" | "now" | "urgent";

export type Tx = {
  id: string;
  date: string; // ISO date-time
  merchant: string;
  category: string;
  amount: number; // negative = money out, in account currency
  currency?: "EUR" | "GBP";
  city?: string;
  account?: string; // account id, default "current"
};

export type Debit = {
  id: string;
  payee: string;
  amount: number;
  due: string; // ISO date
  previous?: number; // last month's amount, when it changed
  kind: "direct_debit" | "standing_order";
  lastUsed?: string; // for subscriptions
};

export type Goal = {
  id: string;
  name: string;
  target: number;
  saved: number;
  monthly?: number;
};

export type Contact = { id: string; name: string; kbc: boolean; color: string };

export type Invoice = {
  client: string;
  amount: number;
  due: string;
  paid?: boolean;
};

export type Holding = { name: string; value: number; changePct: number };

export type Belief = {
  id: string;
  text: string;
  source: string;
  status: "told" | "inferred" | "said_no";
  forget?: string;
};

export type Persona = {
  id: string;
  name: string;
  short: string; // one-line story for the presenter rail
  initial: string;
  color: string;
  now: string; // fixed demo clock, ISO
  city: string;
  abroad?: {
    country: string;
    city: string;
    until: string;
    currency: "GBP";
    dailySpend: number;
  };
  accounts: {
    current: number;
    savings: number;
    business?: number;
    pocketGBP?: number;
    child?: { name: string; balance: number; weekly: number; day: string };
  };
  salary?: { amount: number; day: number; payer: string };
  pension?: { amount: number; next: string };
  transactions: Tx[];
  debits: Debit[];
  goals: Goal[];
  contacts: Contact[];
  splitGroup?: string[]; // contact ids usually split with
  invoices?: Invoice[];
  taxReserve?: { saved: number; target: number; vatDue: string; rate: number };
  portfolio?: { holdings: Holding[]; weekPct: number; checksPerWeek: number };
  pensionSaving?: { paid: number; limit: number; fundValue: number };
  moving?: {
    to: string;
    date: string;
    steps: { label: string; done: boolean }[];
    budget: number;
  };
  home?: { fund: number; target: number; nextAppointment: string };
  card: { last4: string; frozen: boolean; regions: string[] };
  esim?: { country: string; leftGB: number };
  advisor: { name: string; office: string; nextSlot: string };
  behaviour: {
    largeText: boolean;
    zoomsPerWeek: number;
    misTapRate: number;
    opensPerWeek: number;
  };
  calendar: { date: string; label: string; amount?: number }[];
  beliefs: Belief[];
  /** KBC One: a hard moment the customer told us about (a care road). Calm home, no suggestions, a person first. */
  care?: boolean;
};

// ---------- Customer-owned state ----------

export type UserLayout = {
  style: StyleId;
  blocks: { id: string; size: Size }[];
  suggestionsPerDay: number; // 0 = off
};

export type Theme = {
  name: string;
  base: StyleId;
  colors: {
    bg: string;
    surface: string;
    text: string;
    muted: string;
    accent: string;
    accentText: string;
  };
  radius: number;
  font: FontId;
  motif: "none" | "hearts" | "sparkles" | "dots" | "waves" | "stars";
};

export type SavedLook = { id: string; theme: Theme };

export const FONTS = [
  "inter",
  "quicksand",
  "nunito",
  "space",
  "serif",
] as const;
export type FontId = (typeof FONTS)[number];

export type TrackerSpec = {
  id: string;
  title: string;
  keywords: string[];
  categories: string[];
  period: "week" | "month";
  metric: "sum" | "count";
};

export type Rule = {
  id: string;
  text: string;
  actionId: string;
  params: Record<string, number>;
};

export type Customer = {
  persona: Persona;
  layout?: UserLayout;
  theme?: Theme;
  looks?: SavedLook[];
  activeLookId?: string;
  previousLookId?: string;
  trackers: TrackerSpec[];
  muted: string[]; // block/action ids the customer said "don't suggest again" to
  rules: Rule[];
  requests: {
    id: string;
    name: string;
    amount: number;
    status: "sent" | "paid";
  }[];
  log: { at: string; text: string }[];
};

// ---------- What the UI renders ----------

export type BlockView = {
  id: string;
  title: string;
  value: string;
  sub?: string;
  icon: IconId;
  tone: "normal" | "warn" | "good";
  progress?: number; // 0..1
  list?: { left: string; right: string; tone?: "warn" | "good" }[];
  bars?: number[];
  sentence: string; // Large & simple wording
  action?: { id: string; label: string; params?: Record<string, number> };
  facts: string[]; // evidence, plain words, from code
  protection?: boolean;
  product?: boolean; // something KBC sells
  custom?: boolean;
};

export type ActionView = {
  id: string;
  level: 1 | 2 | 3;
  title: string;
  why: string;
  button: string;
  params: Record<string, number>;
  facts: string[];
  icon: IconId;
  product?: boolean;
};

export type IntentView = {
  id: string;
  kicker: string;
  title: string;
  detail: string;
  button: string;
  actionId: string;
  params: Record<string, number>;
  people?: Contact[];
  facts: string[];
};

export type Placed = BlockView & {
  size: Size;
  score: Score;
  reason: string;
  suggested?: boolean;
};

export type HomeModel = {
  persona: string;
  style: StyleId;
  customized: boolean;
  headline: string;
  intent: (IntentView & { reason: string }) | null;
  actions: (ActionView & { reason: string })[];
  blocks: Placed[];
  forYou: Placed[];
  source: "claude" | "rules";
  ms: number;
  model?: string;
  notes: string[];
  composedAt: string;
};

export type IconId =
  | "bars"
  | "clock"
  | "list"
  | "activity"
  | "repeat"
  | "alert"
  | "card"
  | "target"
  | "spark"
  | "box"
  | "home"
  | "plane"
  | "swap"
  | "in"
  | "receipt"
  | "chart"
  | "shield"
  | "calendar"
  | "phone"
  | "kate"
  | "wifi"
  | "user"
  | "split";

export type Snapshot = {
  persona: Pick<
    Persona,
    | "id"
    | "name"
    | "initial"
    | "color"
    | "short"
    | "now"
    | "city"
    | "accounts"
    | "card"
    | "abroad"
    | "advisor"
    | "beliefs"
  >;
  personas: {
    id: string;
    name: string;
    initial: string;
    color: string;
    short: string;
  }[];
  layout: UserLayout | null;
  theme: Theme | null;
  looks: SavedLook[];
  activeLookId: string;
  trackers: TrackerSpec[];
  muted: string[];
  rules: Rule[];
  requests: Customer["requests"];
  log: Customer["log"];
  catalog: {
    id: string;
    title: string;
    group: string;
    view: BlockView | null;
  }[];
  ai: { enabled: boolean; composeModel: string; kateModel: string };
};

export type ActionSheet = {
  to?: string;
  id: string;
  params: Record<string, number>;
  title: string;
  rows: [string, string][];
  level: 1 | 2 | 3;
};
