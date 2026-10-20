import { EVERYDAY_STOPS, TODAY } from "../../hindsight/engine/everyday";
import { gateRate } from "../../hindsight/engine/gate";
import { convoySize, crowdFor } from "../../hindsight/engine/simulate";
import { catalogueRoad, engineRoad, EVERYDAY_ONLY_ID } from "./catalogue";
import { forkEvidenceFor, stopEvidenceFor, type EvidenceOptions, type StopRef } from "./evidence";
import { countFor, CROWD_MIN, publish, SYNTHETIC_LABEL } from "./gate";
import { pointersFor, resolvePerson, unknownStage, type PersonInput, type PersonPointers } from "./pointers";

export interface RoadViewOptions extends EvidenceOptions { pointers?: PersonPointers; largeSimple?: boolean }
export function roadViewFor(input: PersonInput, roadId?: string, options: RoadViewOptions = {}) {
  const person = resolvePerson(input);
  const pointers = options.pointers ?? pointersFor(person);
  if (pointers.personId !== person.key) throw new Error("Pointers belong to another person.");
  const id = roadId ?? pointers.confirmed?.roadId ?? pointers.exploring[0]?.roadId ?? EVERYDAY_ONLY_ID;
  const road = engineRoad(id);
  const entry = catalogueRoad(id);
  if (!road || !entry) return null;
  const pointer = pointers.confirmed?.roadId === id ? pointers.confirmed : pointers.exploring.find((p) => p.roadId === id);
  const everyday = id === EVERYDAY_ONLY_ID;
  const confirmed = everyday || pointers.confirmed?.roadId === id;
  const stage = everyday ? pointers.everyday.stage : pointer?.stage ?? unknownStage();
  const available = entry.status === "live" && (!entry.care || !!options.careOptIn);
  const largeSimple = pointers.largeSimple || !!options.largeSimple;
  const position = { ...stage, confirmed, preview: !confirmed, provenance: pointer?.provenance ?? (everyday ? null : "exploring" as const) };
  const nextStops = available ? road.stops.map((stop) => {
    const calendar = everyday ? EVERYDAY_STOPS.find((s) => s.id === stop.id) : undefined;
    const offset = calendar ? (calendar.calMonth - TODAY.month + 12) % 12 : stop.month - (stage.month ?? 0);
    const year = calendar ? TODAY.year + (calendar.calMonth < TODAY.month ? 1 : 0) : null;
    return { roadId: id, stopId: stop.id, id: `${id}:${stop.id}`, title: stop.title, short: stop.short, kind: stop.kind,
      month: stop.month, offset, year, passed: !everyday && confirmed && stage.month !== null && stop.month < stage.month };
  }).sort((a, b) => a.offset - b.offset) : [];
  const ahead = nextStops.filter((s) => !s.passed);
  // Illustrative equal-width stage bins from the synthetic alumni population.
  // Each is an aggregate, never an individual rider or an inferred personal outcome.
  const population = available && !entry.care ? crowdFor(road).n : 0;
  const ghostGroups = available && !entry.care && !largeSimple ? ahead.map((stop) => {
    const n = Math.floor(population / road.months);
    const count = countFor(`${id}:ghost:${stop.stopId}:count`, n);
    return { id: `${id}:ghost:${stop.stopId}`, roadId: id, stopId: stop.stopId, month: stop.month,
      count, density: count.shown ? publish(gateRate(`${id}:ghost:${stop.stopId}:density`, n, population)) : count,
      label: `Anonymous groups of ≥ ${CROWD_MIN} · not a prediction`,
      basis: "Illustrative stage density: synthetic alumni divided across road months", synthetic: true as const };
  }) : [];
  return { road: entry, roadId: id, position, available,
    reason: entry.status === "review" ? "Under review: no published insights." : !available ? "Show what helped others when you are ready." : null,
    care: entry.care, largeSimple, canDrive: available && !entry.care && !largeSimple,
    canNudge: available && !entry.care && confirmed,
    disclosure: SYNTHETIC_LABEL, synthetic: true as const, ghostGroups,
    convoy: available && !entry.care ? countFor(`${id}:convoy`, convoySize(road)) : null,
    stops: nextStops, nextStops: ahead,
    fork: available ? forkEvidenceFor(id, { ...options, likeYou: confirmed ? person.persona : null }) : null,
  };
}

export interface HomeCrowdCard extends StopRef {
  id: string;
  title: string;
  line: string;
  button: string;
  source: "note" | "evidence" | "care";
  synthetic: true;
  disclosure: string;
}
/** Exactly one card, with the same road/stop identity used by Map, Drive and channels. */
export function homeCardFor(input: PersonInput, options: RoadViewOptions = {}): HomeCrowdCard | null {
  const view = roadViewFor(input, undefined, options);
  if (!view || view.road.status === "review") return null;
  const road = engineRoad(view.roadId)!;
  if (view.fork && view.position.confirmed && view.position.month !== null && view.fork.month >= view.position.month && view.fork.month - view.position.month <= 6) {
    const branch = view.fork.comparisons[0].branches[0];
    const metric = branch.metrics.find((m) => m.kind === "pct" && m.value.shown);
    if (metric?.value.value !== null && metric?.value.value !== undefined) return {
      roadId: view.roadId, stopId: view.fork.stopId, id: view.fork.id,
      title: `${view.road.name} · ${view.position.label}`,
      line: `${Math.round(metric.value.value * 100)}%: ${metric.label.toLowerCase()} after 1 year, associated with “${branch.label.toLowerCase()}”.`,
      button: "Compare what helped", source: "evidence", synthetic: true, disclosure: SYNTHETIC_LABEL,
    };
  }
  const stopId = view.roadId === "moving-house" ? "energy-new-address" : view.roadId === "first-home" ? "energy-settlement" :
    view.roadId === EVERYDAY_ONLY_ID ? "december" : view.nextStops[0]?.stopId ?? road.stops[0]?.id;
  if (!stopId) return null;
  const base = { roadId: view.roadId, stopId, id: `${view.roadId}:${stopId}`, title: `${view.road.name} · ${view.position.label}`,
    synthetic: true as const, disclosure: SYNTHETIC_LABEL };
  if (view.care && !options.careOptIn) return { ...base, line: "A person first, at your pace.", button: "Show what helped others when I’m ready", source: "care" };
  const evidence = stopEvidenceFor(view.roadId, stopId, options);
  if (!evidence?.available || !evidence.denominator.shown) return null;
  const note = evidence.notes[0];
  if (note) return { ...base,
    line: view.roadId === "moving-house" ? "Earlier movers: photograph the meters at key handover." : `Earlier travellers: ${note.text}`,
    button: "See what helped", source: "note" };
  const helped = evidence.helped.find((h) => h.outcome.shown);
  return helped ? { ...base, line: helped.association, button: "See what helped", source: "evidence" } : null;
}
