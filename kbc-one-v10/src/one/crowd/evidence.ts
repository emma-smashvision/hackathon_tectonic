import { evKey, TODAY } from "../../hindsight/engine/everyday";
import { gateMoney, gateRate, K_MIN } from "../../hindsight/engine/gate";
import { potSpec, type LifeState } from "../../hindsight/engine/life";
import { classifyTip, specForTip, type Advisor, type PlanSource, type TripPick } from "../../hindsight/engine/plan";
import { crowdFor, forkStats, statsFor } from "../../hindsight/engine/simulate";
import type { RoadDef, StopDef } from "../../hindsight/engine/types";
import { catalogueRoad, engineRoad, EVERYDAY_ONLY_ID } from "./catalogue";
import { countFor, publish, SYNTHETIC_LABEL, withheld, type CrowdNumber } from "./gate";

export interface StopRef { roadId: string; stopId: string }
export const stopKey = ({ roadId, stopId }: StopRef) => `${roadId}:${stopId}`;
export interface EvidenceOptions {
  careOptIn?: boolean;
  /** Supply the real replay only for a confirmed road; previews need no fictional dates. */
  life?: LifeState;
  advisor?: Advisor;
  year?: number;
}
export interface CrowdAction {
  id: string;
  label: string;
  kind: "reminder" | "checklist" | "adviser-question";
  kbcProduct: boolean;
  source: PlanSource;
  pick: TripPick;
}
export interface HelpedAction {
  id: string;
  label: string;
  outcome: CrowdNumber;
  denominator: CrowdNumber;
  association: string;
  kbcProduct: boolean;
  action: CrowdAction;
}
export interface EvidenceBin {
  id: string;
  lower: CrowdNumber;
  upper: CrowdNumber;
  count: CrowdNumber;
  share: CrowdNumber;
}
export interface StopEvidence extends StopRef {
  id: string;
  title: string;
  short: string;
  month: number;
  kind: StopDef["kind"];
  available: boolean;
  reason: string | null;
  synthetic: true;
  disclosure: string;
  denominator: CrowdNumber;
  surprised: { label: string; share: CrowdNumber; median: CrowdNumber; threshold: CrowdNumber; range: EvidenceBin[] };
  helped: HelpedAction[];
  noteCount: CrowdNumber;
  notes: { id: string; text: string; by: string; synthetic: true }[];
  actions: CrowdAction[];
}

function actionFor(roadId: string, road: RoadDef, stop: StopDef, actionId: string, label: string, options: EvidenceOptions): CrowdAction {
  const key = roadId === EVERYDAY_ONLY_ID ? evKey(stop.id, options.year ?? TODAY.year) : stop.id;
  const source: PlanSource = { scope: roadId === EVERYDAY_ONLY_ID ? "everyday" : "road", roadId, key, actionId };
  const classified = classifyTip(label, road.care);
  const kind = classified === "remind" ? "reminder" : classified === "book" || classified === "talk" ? "adviser-question" : "checklist";
  const product = !road.care && (classified === "setup" && (!!potSpec(road.id, stop.id, actionId, label) || stop.kind === "boost"));
  // Existing actions use the existing spec when a caller supplies its actual replay.
  const existing = options.life && !road.care ? specForTip({ road, life: options.life, advisor: options.advisor }, key, actionId) : null;
  const spec = existing ?? {
    kind: road.care ? "talk" as const : kind === "adviser-question" ? "book" as const : "check" as const,
    title: road.care ? "Talk it through with a person" : `Save: ${label}`,
    detail: "Save this question or checklist item. No money moves and no date is assumed.",
    ...(product ? { product: "KBC savings" } : {}),
  };
  return { id: actionId, label: road.care ? "Talk it through with a person" : label, kind: road.care ? "adviser-question" : kind,
    kbcProduct: !!spec.product, source, pick: { id: `tip:${roadId}:${key}:${actionId}`, source, spec } };
}

export function stopEvidenceFor(roadId: string, stopId: string, options: EvidenceOptions = {}): StopEvidence | null {
  const road = engineRoad(roadId);
  const stop = road?.stops.find((s) => s.id === stopId);
  if (!road || !stop || road.status !== "live") return null;
  const blocked = road.status !== "live" ? "Under review: no published insights." : road.care && !options.careOptIn ? "Show what helped others when you are ready." : null;
  const empty = withheld(blocked ?? "No published measurement for this stop.");
  const base: StopEvidence = {
    roadId, stopId, id: stopKey({ roadId, stopId }), title: stop.title, short: stop.short, month: stop.month, kind: stop.kind,
    available: !blocked, reason: blocked, synthetic: true, disclosure: SYNTHETIC_LABEL,
    denominator: empty, surprised: { label: "What people experienced", share: empty, median: empty, threshold: empty, range: [] },
    helped: [], noteCount: empty, notes: [], actions: [],
  };
  if (blocked) return base;
  const stats = statsFor(road, stop);
  base.denominator = countFor(`${base.id}:drivers`, stats.n);
  // Seed notes are illustrative excerpts, not hundreds of invented contributions.
  base.noteCount = countFor(`${base.id}:notes`, stop.notes.length);
  if (base.denominator.shown) base.notes = stop.notes.map((note, index) => ({ ...note, id: `${base.id}:note:${index}`, synthetic: true }));
  if (stats.kind === "bump") {
    const edges = [0, .25 * stats.threshold, .5 * stats.threshold, .75 * stats.threshold, stats.threshold, 1.5 * stats.threshold];
    base.surprised = {
      label: "Had a cost above their simulated capacity to absorb it",
      share: publish(stats.hitRate), median: publish(stats.median), threshold: publish(gateMoney(`${base.id}:threshold`, stats.threshold, stats.n)),
      range: stats.bins.map((bin, i) => {
        const count = countFor(`${base.id}:bin:${i}`, bin.count);
        return { id: `${base.id}:bin:${i}`, count,
          lower: publish(gateMoney(`${base.id}:bin:${i}:lower`, edges[i], bin.count)),
          upper: i === edges.length - 1 ? withheld("Open-ended amount band.") : publish(gateMoney(`${base.id}:bin:${i}:upper`, edges[i + 1], bin.count)),
          share: count.shown ? publish(gateRate(`${base.id}:bin:${i}:share`, bin.count, stats.n)) : withheld(`Not published: fewer than ${K_MIN} people in this band.`),
        };
      }),
    };
    base.helped = stats.behaviours.map((behaviour): HelpedAction => {
      // P(calm | did action), not the inverse P(action | calm), and never readiness.
      const result = stats.calmIf([behaviour.id]);
      const outcome = publish(result);
      const action = actionFor(roadId, road, stop, behaviour.id, behaviour.action.label, options);
      return { id: behaviour.id, label: behaviour.label, outcome,
        denominator: countFor(`${base.id}:${behaviour.id}:participants`, result.n),
        association: outcome.value === null ? "Outcome withheld: too few people in this group." : `${Math.round(outcome.value * 100)}% avoided a strain on their buffer; associated with this action, not proof of cause.`,
        kbcProduct: action.kbcProduct, action };
    }).sort((a, b) => (b.outcome.value ?? -1) - (a.outcome.value ?? -1) || a.id.localeCompare(b.id));
    base.actions = base.helped.map((h) => h.action);
  } else if (stats.kind === "boost") {
    base.surprised.label = "Typical amount received";
    base.surprised.median = publish(stats.median);
  } else {
    base.surprised.label = stop.rate?.label ?? "Reported this experience";
    base.surprised.share = publish(stats.rate);
  }
  if (stop.action) base.actions.push(actionFor(roadId, road, stop, "main", stop.action.label, options));
  return base;
}

export interface ForkOptions extends EvidenceOptions { likeYou?: { bufferBand: number; incomeBand: number } | null }
export function forkEvidenceFor(roadId: string, options: ForkOptions = {}) {
  const road = engineRoad(roadId);
  if (!road?.fork || road.status !== "live" || (road.care && !options.careOptIn)) return null;
  const fork = road.fork;
  const comparison = (horizon: 1 | 3, likeYou: ForkOptions["likeYou"]) => {
    const result = forkStats(road, fork, horizon, likeYou ?? null);
    return {
      horizon, denominator: countFor(`${roadId}:${fork.id}:${horizon}:total:${!!likeYou}`, result.n),
      branches: result.branches.map((branch) => ({ id: branch.id, label: fork.branches.find((b) => b.id === branch.id)!.label,
        driverCount: countFor(`${roadId}:${fork.id}:${horizon}:${branch.id}:${!!likeYou}`, branch.n),
        share: branch.n < K_MIN ? withheld("Not published: subgroup below the crowd minimum.") : publish(gateRate(`${roadId}:${fork.id}:${horizon}:${branch.id}:share:${!!likeYou}`, branch.n, result.n)),
        metrics: branch.metrics.map((metric) => ({ key: metric.key, label: metric.label, kind: metric.kind, goodHigh: metric.goodHigh, value: publish(metric.value) })),
      })),
    };
  };
  return { roadId, stopId: fork.id, id: stopKey({ roadId, stopId: fork.id }), title: fork.title, month: fork.month,
    synthetic: true as const, disclosure: SYNTHETIC_LABEL,
    wording: "Outcomes associated with each choice; not proof of cause or a recommendation.",
    comparisons: ([1, 3] as const).map((h) => comparison(h, null)),
    subgroup: options.likeYou ? ([1, 3] as const).map((h) => comparison(h, options.likeYou)) : [],
  };
}

/** Aggregate question frequencies for adviser; no raw definition shares escape. */
export function questionsFor(roadId: string, options: EvidenceOptions = {}) {
  const road = engineRoad(roadId);
  if (!road || catalogueRoad(roadId)?.status !== "live" || (road.care && !options.careOptIn)) return [];
  const n = crowdFor(road).n;
  return road.callReasons.map((q, i) => ({ question: q.q, denominator: countFor(`${roadId}:question:${i}:people`, n),
    share: publish(gateRate(`${roadId}:question:${i}`, Math.round(q.share * n), n)), synthetic: true as const }));
}
