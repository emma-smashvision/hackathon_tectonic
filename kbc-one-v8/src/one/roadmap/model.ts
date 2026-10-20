import { calOf, EVERYDAY, everydayStop } from "../../hindsight/engine/everyday";
import { anchorOf, type Journey, readiness } from "../../hindsight/engine/game";
import { crowdLine, roadStopDay, type LifeState } from "../../hindsight/engine/life";
import { specForFork, specForTip, todayWhen, whenIndex, type PlanItem, type TripPick, type When } from "../../hindsight/engine/plan";
import { EVERYDAY_ONLY_ID, getRoad } from "../../hindsight/engine/roads";
import type { RoadDef, StopDef } from "../../hindsight/engine/types";
import type { PersonRoad } from "../people";
import { journeysFor, selectJourney } from "../nudge/model";
import { allowsCity, plainJourneyText } from "../road";
import type { MapStop, MapTrack, MonthBundle, RoadMap, StopState } from "./types";

/** A Store value fits this read-only input. Pass large for a chosen Large & simple look. */
export interface RoadMapInput {
  road: RoadDef;
  journey: Journey;
  life: LifeState;
  plan: PlanItem[];
  large?: boolean;
}

const ROOT = "everyday";
const stateFor = (inDays: number, ready: number, locked = false): StopState =>
  locked ? "locked" : inDays < 0 ? "done" : ready >= 100 ? "ready" : "later";

/** Null means Try it for possible tracks, or Done ✓ when an actual track has no steps ahead. */
export function trackReady(track: MapTrack): number | null {
  if (track.status === "possible") return null;
  // Only stops with something to prepare count: a junction with no steps can't be "readied".
  const ahead = track.stops.filter((stop) => (stop.state === "next" || stop.state === "ready" || stop.state === "later") && stop.actions.length > 0);
  return ahead.length ? Math.round(ahead.reduce((sum, stop) => sum + stop.ready, 0) / ahead.length) : null;
}

export function majorStops(track: MapTrack): MapStop[] {
  return track.stops.filter((stop) => stop.id !== "today" && stop.weight === "major");
}

/** Bundle minor stops without changing their dates, actions, identities or the input track. */
export function monthBundles(track: MapTrack): MonthBundle[] {
  const bundles = new Map<string, MonthBundle>();
  for (const stop of track.stops) {
    // The structural "You are here" anchor is rendered separately, never as a bill/checkpoint.
    if (stop.id === "today" || stop.weight !== "minor") continue;
    const month = `${stop.when.year}-${String(stop.when.month + 1).padStart(2, "0")}`;
    const bundle = bundles.get(month) ?? { id: `bundle:${track.id}:${month}`, month, count: 0, total: 0, stops: [] };
    bundle.stops.push(stop);
    bundle.count++;
    bundle.total += Math.round((stop.amount ?? 0) * 100);
    bundles.set(month, bundle);
  }
  return [...bundles.values()].sort((a, b) => a.month.localeCompare(b.month)).map((bundle) => ({
    ...bundle, total: bundle.total / 100,
    stops: [...bundle.stops].sort((a, b) => whenIndex(a.when) - whenIndex(b.when) || a.id.localeCompare(b.id)),
  }));
}

/** Stable identities, source dates and existing plan picks shared by the map and city. */
export function roadmapFor(person: PersonRoad, input: RoadMapInput): RoadMap {
  const { road, journey, life, plan } = input;
  const today = todayWhen(life);
  const map: RoadMap = {
    personKey: person.key, today, allowCity: allowsCity(person, road, input.large),
    tracks: [{ id: ROOT, title: "Everyday road", roadId: EVERYDAY_ONLY_ID, status: "active",
      origin: { kind: "everyday", text: "Your regular income, bills and yearly payments are part of everyday life." }, stops: [], crossings: [] }],
  };
  const root = map.tracks[0];
  const days = (when: When) => whenIndex(when) - whenIndex(today);
  const checkpoint = (track: MapTrack, id: string, title: string, detail: string, when: When, actions: MapStop["actions"] = [], ready = 0, cityFocus?: string, locked = false): MapStop => {
    const inDays = days(when);
    const item: MapStop = { id, trackId: track.id, title: plainJourneyText(title), detail: plainJourneyText(detail), when, inDays,
      actions, ready, state: stateFor(inDays, ready, locked), weight: "minor", cityFocus };
    track.stops.push(item);
    return item;
  };
  checkpoint(root, "today", "You · today", "Your starting point. Choose what to prepare next.", today, [], 100);
  const quiet = road.care && !journey.careOptIn;

  const engineStop = (track: MapTrack, def: StopDef, key: string, when: When, scope: "road" | "everyday", id = key, locked = false, branch = "trunk") => {
    const options = def.behaviours?.map((b) => ({ id: b.id, label: b.action.label })) ?? (def.action ? [{ id: "main", label: def.action.label }] : []);
    const actions: MapStop["actions"] = options.flatMap((action) => {
      const spec = specForTip({ road, life, advisor: person.advisor }, key, action.id);
      if (!spec) return [];
      const pick: TripPick = { id: `tip:${road.id}:${key}:${action.id}`, source: { scope, roadId: road.id, key, actionId: action.id },
        spec: { ...spec, title: plainJourneyText(spec.title), detail: plainJourneyText(spec.detail) } };
      return [{ label: plainJourneyText(action.label), pick }];
    });
    const completed = new Set(journey.done[key] ?? []);
    for (const action of actions) if (plan.some((p) => p.id === action.pick.id)) completed.add(action.pick.source.actionId!);
    const crowd = crowdLine(scope === "everyday" ? EVERYDAY : road, def).text;
    // A map checkpoint is fully prepared when all its available steps are in the plan.
    const maximum = readiness(def, options.map((action) => action.id));
    const ready = maximum ? Math.min(100, Math.round(readiness(def, [...completed]) / maximum * 100)) : 0;
    const stop = checkpoint(track, id, def.title, `${def.advice} ${crowd}.`, when, actions, ready,
      scope === "everyday" ? key : `${road.id}:${def.id}:${branch}`, locked);
    const amount = life.upcoming.find((item) => item.ref.key === key && item.scope === scope)?.amount;
    if (amount != null) stop.amount = Math.abs(amount);
    return stop;
  };

  if (!quiet) {
    // The engine filters annual events to this household; do not add irrelevant yearly bills.
    for (const item of life.upcoming.filter((u) => u.scope === "everyday")) {
      const def = everydayStop(item.ref.id);
      if (def) engineStop(root, def, item.ref.key, { ...item.cal, day: item.day }, "everyday");
    }
    for (const bill of life.next30.filter((item) => item.kind === "bill" || item.kind === "income")) {
      const when = { ...bill.cal, day: bill.day };
      const id = `payment:${bill.key}:${when.year}-${when.month}-${when.day}`;
      if (root.stops.some((item) => item.id === id)) continue;
      const pick: TripPick = { id: `reminder:${id}`, source: { scope: "everyday", roadId: road.id, key: id },
        spec: { kind: "remind", title: `Check ${bill.label}`, detail: "A reminder to review this scheduled payment. No payment changes.", when } };
      const stop = checkpoint(root, id, bill.label, bill.kind === "income" ? "Income expected on your calendar." : "A scheduled payment from your household calendar.", when,
        [{ label: "Remind me", pick }], plan.some((p) => p.id === pick.id) ? 100 : 0, id);
      stop.amount = Math.abs(bill.amount);
    }
  }

  if (road.id !== EVERYDAY_ONLY_ID) {
    const start = road.id === "moving-house" && person.world?.home?.rent
      ? person.world.home.rent.leaseStart : { ...calOf(anchorOf(road, journey), 0), day: 1 };
    const origin = person.told ? { kind: "told-us" as const, text: person.told }
      : { kind: "detected" as const, text: person.persona.line || `Your current situation is ${road.name.toLowerCase()}.` };
    const track: MapTrack = { id: road.id, title: road.name, roadId: road.id, parentId: ROOT, fromStopId: `start:${road.id}`,
      status: days(start) > 0 ? "upcoming" : "active", origin: { ...origin, text: plainJourneyText(origin.text) }, stops: [], crossings: [] };
    checkpoint(root, track.fromStopId!, road.name, track.origin.text, start, [], days(start) <= 0 ? 100 : 0, track.fromStopId);
    map.tracks.push(track);
    if (!quiet) {
      const fork = road.fork;
      const branchTracks = new Map<string, MapTrack>();
      if (fork) {
        const when = { ...calOf(anchorOf(road, journey), fork.month - 1), day: roadStopDay(road.id, fork.id) };
        const source = specForFork(road, person.advisor);
        const pick: TripPick | null = source ? { id: `fork:${road.id}:${fork.id}`, source: { scope: "fork", roadId: road.id, key: fork.id },
          spec: { ...source, title: plainJourneyText(source.title), detail: plainJourneyText(source.detail) } } : null;
        checkpoint(track, fork.id, fork.title, fork.intro, when, pick ? [{ label: "Talk to your advisor", pick }] : [],
          journey.forkChoice[fork.id] || (pick && plan.some((p) => p.id === pick.id)) ? 100 : 0, `${road.id}:${fork.id}:trunk`);
        track.crossings.push({ id: fork.id, trackId: track.id, title: plainJourneyText(fork.title), question: plainJourneyText(fork.intro), when, inDays: days(when),
          branches: fork.branches.map((branch) => {
            const chosen = journey.forkChoice[fork.id] === branch.id;
            const branchTrack: MapTrack = { id: `${road.id}:${fork.id}:${branch.id}`, title: plainJourneyText(branch.label), roadId: road.id,
              parentId: track.id, fromStopId: fork.id, status: chosen ? "active" : "possible", stops: [], crossings: [],
              origin: { kind: "test-drive", text: `${chosen ? "You chose this option" : "An option you can explore"} at “${plainJourneyText(fork.title)}”.` } };
            branchTracks.set(branch.id, branchTrack);
            map.tracks.push(branchTrack);
            return { id: branch.id, label: plainJourneyText(branch.label), trackId: branchTrack.id, chosen };
          }) });
      }
      for (const def of road.stops) {
        const when = { ...calOf(anchorOf(road, journey), def.month - 1), day: roadStopDay(road.id, def.id) };
        if (fork && def.month > fork.month) {
          fork.branches.forEach((branch, index) => engineStop(branchTracks.get(branch.id)!, def, def.id, when, "road",
            `${road.id}:${def.id}:${branch.id}`, journey.forkChoice[fork.id] !== branch.id, index ? "b" : "a"));
        } else engineStop(track, def, def.id, when, "road", `${road.id}:${def.id}`);
      }
    }
  }

  const nudgeJourneys = journeysFor(person, road, journey, life, plan);
  if (person.preview && !map.tracks.some((t) => t.id === person.preview!.roadId)) {
    const preview = getRoad(person.preview.roadId);
    const preparation = nudgeJourneys.find((j) => j.id === person.preview!.roadId);
    if (preview && preparation) {
      const id = `start:${preview.id}`;
      const text = "You have a mortgage appointment and a savings goal for your first home. No purchase date is set.";
      checkpoint(root, id, "Your first-home appointment", text, preparation.when, [], 0, id);
      map.tracks.push({ id: preview.id, title: preview.name, roadId: preview.id, parentId: ROOT, fromStopId: id, status: "upcoming",
        origin: { kind: "calendar", text }, stops: [], crossings: [] });
    }
  }
  // Add or replace the exact nudge stops, preserving their action IDs and preparation rules.
  for (const j of nudgeJourneys) {
    const track = j.id === "first-home" ? map.tracks.find((t) => t.id === "first-home") ?? root
      : j.decision ? map.tracks.find((t) => t.id === road.id) ?? root : root;
    track.stops = track.stops.filter((stop) => stop.id !== j.id && !(
      j.id === "car-renewal" && stop.id.startsWith("payment:bill:car-ins:") && whenIndex(stop.when) === whenIndex(j.when)
    ));
    const stop = checkpoint(track, j.id, j.title, `${j.summary} ${j.crowd.text}`, j.when, j.actions, j.ready, j.cityFocus);
    stop.product = j.product;
  }
  const next = selectJourney(person, road, journey, life, plan);
  if (next) {
    const track = map.tracks.find((t) => t.stops.some((stop) => stop.id === next.id));
    const stop = track?.stops.find((s) => s.id === next.id);
    if (track && stop) { map.nextUp = { trackId: track.id, stopId: stop.id }; stop.state = "next"; }
  }
  for (const track of map.tracks) {
    for (const stop of track.stops) {
      const junction = map.tracks.some((child) => child.parentId === track.id && child.fromStopId === stop.id);
      const crossing = track.crossings.some((fork) => fork.id === stop.id);
      const nextUp = map.nextUp?.trackId === track.id && map.nextUp.stopId === stop.id;
      // Weight must not flip when a step is added: life-journey stops and stops with several steps stay major.
      const journeyStop = Boolean(track.parentId) && stop.actions.length > 0;
      stop.weight = stop.actions.some((action) => action.pick.spec.kind !== "remind") || (stop.amount ?? 0) >= 150
        || stop.actions.length > 1 || journeyStop || junction || crossing || nextUp ? "major" : "minor";
    }
    track.stops.sort((a, b) => whenIndex(a.when) - whenIndex(b.when) || a.id.localeCompare(b.id));
  }
  return map;
}
