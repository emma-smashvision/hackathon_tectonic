// Core model of Hindsight.
// A ROAD is a life situation that many customers have already lived.
// A customer is never "predicted": they get one pointer (road + month),
// and see what is ahead through the aggregated outcomes of people who drove it before.

export type StopKind = "bump" | "boost" | "milestone" | "fork";

export interface Behaviour {
  id: string;
  /** What people did, phrased in the past tense for the crowd view. */
  label: string;
  /** Baseline share of drivers who did this (0..1). */
  base: number;
  /** How much doing this raises your capacity to absorb the bump (0.3 = +30%). */
  lift: number;
  /** The one-tap action the app offers, and how much it fills the readiness ring. */
  action: { label: string; readiness: number };
}

export interface CrowdNote {
  text: string;
  by: string;
}

export interface StopDef {
  id: string;
  month: number;
  kind: Exclude<StopKind, "fork">;
  title: string;
  /** Two-word label printed on the road. */
  short: string;
  /** Plain advice line shown under the crowd stat. */
  advice: string;
  /** bump = a cost, boost = money coming in. Lognormal in euro. */
  amount?: { median: number; sigma: number; threshold?: number };
  /** How the crowd stat reads, e.g. "paid more than" (default) or "lost more than". */
  hitVerb?: string;
  /** For milestones: the share of drivers who did/experienced something. */
  rate?: { p: number; label: string };
  behaviours?: Behaviour[];
  /** Optional single action for boosts and milestones. */
  action?: { label: string; readiness: number };
  notes: CrowdNote[];
}

export interface ForkMetric {
  key: string;
  label: string;
  kind: "money" | "pct" | "delta";
  /** money/delta: [mean, sd]. pct: probability. */
  y1: [number, number] | number;
  y3: [number, number] | number;
  /** Does a higher personal buffer push this metric up (+1) or down (-1)? */
  bufferEffect?: number;
  /** For pct: is a higher value good? */
  goodHigh?: boolean;
}

export interface ForkBranch {
  id: string;
  label: string;
  /** Share of drivers who took this branch. */
  share: number;
  metrics: ForkMetric[];
  quote: CrowdNote;
}

export interface ForkDef {
  id: string;
  month: number;
  kind: "fork";
  title: string;
  short: string;
  intro: string;
  branches: [ForkBranch, ForkBranch];
}

export interface Persona {
  name: string;
  age: number;
  city: string;
  month: number;
  /** One-line situation, as the customer would describe it. */
  line: string;
  /** Buffer band 0..3 and income band 0..2: used for "people like you". */
  bufferBand: number;
  incomeBand: number;
  /** Roads this person finished earlier: their passport. */
  driven: { roadId: string; year: number }[];
}

export interface RoadDef {
  id: string;
  name: string;
  tagline: string;
  months: number;
  /** People who completed this road (the crowd). */
  alumni: number;
  /** People on it right now. */
  current: number;
  status: "live" | "pending";
  /** Care roads: no offers, no game layer, a person first, crowd view only on opt-in. */
  care: boolean;
  hue: string;
  persona: Persona;
  stops: StopDef[];
  fork?: ForkDef;
  callReasons: { q: string; share: number }[];
  /** Products the policy will never show on this road. */
  blocked: string[];
  family: "home" | "work" | "family" | "later" | "abroad" | "care";
}

export type AnyStop = StopDef | ForkDef;
