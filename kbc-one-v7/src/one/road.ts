// KBC One: the bridge between a Kate customer and their road.
// Pure TypeScript (no React), so the server can give Kate the same road facts the phone shows.
// Every crowd number below has passed Hindsight's crowd gate; held-back numbers say so.

import { dayLabel, MONTH_LONG, EVERYDAY } from "../hindsight/engine/everyday";
import { duration, euro, int, months1, pct } from "../hindsight/engine/format";
import { type Journey, newJourney } from "../hindsight/engine/game";
import { computeLife, fuelCrowd, goalCrowd, type LifeState, type UpcomingItem } from "../hindsight/engine/life";
import { EVERYDAY_ONLY, EVERYDAY_ONLY_ID, getRoad } from "../hindsight/engine/roads";
import { gateCount, type GateDecision } from "../hindsight/engine/gate";
import { forkStats, statsFor } from "../hindsight/engine/simulate";
import type { RoadDef } from "../hindsight/engine/types";
import { type PersonRoad, PEOPLE } from "./people";
import { plainPlanText } from "./yourroad/model";

/** Keep inherited city wording out of the app and Kate's context. */
export const plainJourneyText = (text: string) => plainPlanText(text.replace(/\bdrove\b/gi, "experienced"));

/** The displayed cohort count follows the existing crowd gate. */
export function journeyPeople(road: RoadDef): string | null {
  const count = gateCount(`stage:${road.id}:alumni`, road.alumni);
  return count.value == null ? null : `${int(count.value)} people like you`;
}

/** The person's own road, carrying the person (name, month, passport). */
export function ownRoad(p: PersonRoad): RoadDef {
  if (p.roadId === EVERYDAY_ONLY_ID) return { ...EVERYDAY_ONLY, persona: p.persona };
  const r = getRoad(p.roadId);
  if (!r) throw new Error(`Unknown road ${p.roadId}`);
  return { ...r, persona: p.persona };
}

export function lifeOf(p: PersonRoad, j?: Journey): { road: RoadDef; journey: Journey; life: LifeState } {
  const road = ownRoad(p);
  const journey = j ?? newJourney(road);
  return { road, journey, life: computeLife(road, journey, p.household) };
}

/** A reason to explore a journey. Null means there is nothing to offer. */
export interface LookAhead {
  kind: "told" | "crossroads" | "bump" | "preview";
  kicker: string;
  title: string;
  line: string;
  button: string;
  /** Existing city entry coordinates; keep the shared API key stable. */
  drive: { roadId: string; month: number };
  /** optional one-tap tip for the stop just ahead (B1: road tips become quick actions) */
  tip?: { key: string; id: string; label: string };
}

export const inWords = (days: number) =>
  days <= 0 ? "today" : days === 1 ? "tomorrow" : days < 14 ? `in ${days} days` : days < 60 ? `in about ${Math.round(days / 7)} weeks` : `in about ${Math.ceil(days / 30)} months`;

export function lookAhead(p: PersonRoad, road: RoadDef, journey: Journey, life: LifeState, opts: { large?: boolean } = {}): LookAhead | null {
  if (road.care || p.noGame || opts.large) return null;
  const ahead = life.upcoming.filter((u) => u.scope === "road");
  const firstCost = ahead.find((u) => u.kind === "bump" && u.ready < 50);
  const tipFor = (u: UpcomingItem | undefined): LookAhead["tip"] => {
    if (!u) return undefined;
    const st = road.stops.find((s) => s.id === u.ref.id);
    const b = st?.behaviours?.filter((x) => !u.done.includes(x.id)).sort((a, c) => c.action.readiness - a.action.readiness)[0];
    return b ? { key: u.ref.key, id: b.id, label: plainJourneyText(b.action.label) } : undefined;
  };
  // a crossroads within about six months
  const fork = road.fork;
  if (fork && !journey.forkChoice[fork.id] && fork.month > journey.month && fork.month - journey.month <= 6) {
    const months = fork.month - journey.month;
    return {
      kind: "crossroads",
      kicker: `ON YOUR ROAD · IN ABOUT ${months} MONTH${months === 1 ? "" : "S"}`,
      title: plainJourneyText(fork.title),
      line: `${road.name}: ${int(road.alumni)} people experienced this before you. See how each branch was going a year later, before you choose.`,
      button: "See what is coming up",
      drive: { roadId: road.id, month: journey.month },
    };
  }
  // a life event the customer told us about, at the start of the road
  if (p.told && journey.month <= 1 && road.id !== EVERYDAY_ONLY_ID) {
    const next = firstCost ?? ahead[0];
    return {
      kind: "told",
      kicker: `YOUR ROAD · ${road.name.toUpperCase()}`,
      title: `${p.told.replace(/\.$/, "")}. See what is coming up.`,
      line: next
        ? `${int(road.alumni)} people experienced this before you. First up, ${inWords(next.inDays)}: ${plainJourneyText(next.title).toLowerCase()}. ${plainJourneyText(next.crowd)}.`
        : `${int(road.alumni)} people experienced this before you.`,
      button: "See what is coming up",
      drive: { roadId: road.id, month: journey.month },
      tip: tipFor(firstCost),
    };
  }
  // an unprepared cost within about six weeks
  if (firstCost && firstCost.inDays <= 42) {
    return {
      kind: "bump",
      kicker: `ON YOUR ROAD · ${inWords(firstCost.inDays).toUpperCase()}`,
      title: plainJourneyText(firstCost.title),
      line: `${plainJourneyText(firstCost.crowd)}. See what the people who came through calmly did.`,
      button: "See what is coming up",
      drive: { roadId: road.id, month: journey.month },
      tip: tipFor(firstCost),
    };
  }
  // a journey this person is about to start
  if (p.preview) {
    const r = getRoad(p.preview.roadId);
    if (r)
      return {
        kind: "preview",
        kicker: `NEXT ROAD · ${r.name.toUpperCase()}`,
        title: "Your first home: prepare before you buy",
        line: "You have been exploring your first home. See what other people prepared before the keys.",
        button: "Explore this journey",
        drive: { roadId: r.id, month: 0 },
      };
  }
  return null;
}

/** Road facts for Kate: only gated crowd numbers, phrased as what people before them lived. */
export const allowsCity = (person: Pick<PersonRoad, "noGame">, road: Pick<RoadDef, "care">, large = false) => !large && !person.noGame && !road.care;

export function roadFactsFor(personaId: string, options: { large?: boolean } = {}) {
  const p = PEOPLE[personaId];
  if (!p) return null;
  const { road, journey, life } = lifeOf(p);
  const bufferCrowd = road.care ? null : fuelCrowd(road);
  const items = life.upcoming.filter((u) => u.kind !== "fork").slice(0, 5);
  const fork = road.fork && road.fork.month > journey.month ? road.fork : undefined;
  const la = lookAhead(p, road, journey, life);
  return {
    rule: "This is what people at the customer's point lived (the crowd's hindsight), not a prediction about them. Say 'people at your point' or 'last year you paid', never 'you will'.",
    care: road.care,
    lifeRoad:
      road.id === EVERYDAY_ONLY_ID
        ? null
        : `${road.name}, month ${journey.month} of ${road.months} (${int(road.alumni)} people experienced it before)`,
    everydayRoad: `Everyday Road, ${MONTH_LONG[life.today.cal.month]} ${life.today.cal.year}`,
    buffer: road.care
      ? undefined
      : {
          months: months1(life.fuel),
          peopleAtThisPoint: bufferCrowd?.value != null ? months1(bufferCrowd.value) : "held back: too few people",
        },
    next30days: {
      lowestBalance: `${euro(life.lowest.bal)} on ${dayLabel(life.lowest.cal, life.lowest.day)}`,
      ...(life.salary ? { nextIncome: `${life.salary.label} ${euro(life.salary.amount)} on ${dayLabel(life.salary.cal, life.salary.day)}` } : {}),
    },
    comingUp: road.care && !journey.careOptIn
      ? "hidden: the customer has not asked to look ahead yet"
      : items.map((u) => ({
          when: `${dayLabel(u.cal, u.day)} ${u.cal.year} (${inWords(u.inDays)})`,
          what: plainJourneyText(u.title),
          on: u.scope === "everyday" ? "Everyday Road" : road.name,
          amount: u.amount == null ? null : `${euro(u.amount)} (${u.amountSource === "crowd" ? "typical for people at this point" : "your own amount last year"})`,
          crowd: plainJourneyText(u.crowd),
          prepared: `${u.ready}%`,
        })),
    crossroads: fork
      ? { what: plainJourneyText(fork.title), inMonths: fork.month - journey.month, branches: fork.branches.map((b) => `${b.label} (${pct(b.share)} took it)`) }
      : null,
    destinations: life.goals.map((g) => {
      const gc = goalCrowd(road, g, road.persona.bufferBand);
      return {
        goal: g.label,
        saved: `${euro(g.saved)} of ${euro(g.target)}`,
        pace: `${euro(g.monthly)} a month`,
        arrival: g.eta ? `${MONTH_LONG[g.eta.month]} ${g.eta.year}` : "no monthly pace yet",
        peopleLikeYou:
          gc.reach.value != null ? `${pct(gc.reach.value)} of people who started like you got there within ${duration(gc.within)}` : "held back: too few people started like you",
      };
    }),
    nextRoadToTestDrive: p.preview ? `${getRoad(p.preview.roadId)?.name}: prepare before you buy` : null,
    canDrive: allowsCity(p, road, options.large),
    driveOffer: la ? la.title : null,
  };
}

/** Plain journey copy uses the same gated, synthetic crowd as the existing road. */
export function journeyCrowd(kind: "renewals" | "company" | "first-home", road: RoadDef): { text: string; decisions: GateDecision[] } {
  if (kind === "company" && road.fork) {
    const stats = forkStats(road, road.fork, 1, road.persona);
    const branch = stats.branches.find((b) => b.id === "sole");
    const metric = branch?.metrics.find((m) => m.key === "admin");
    return {
      text: metric?.value.value != null
        ? `${pct(metric.value.value)} of people like you who stayed sole traders found the administration manageable after a year. This describes their experience, not your future.`
        : "We hold back this comparison because too few people match. Your advisor can help you compare the options.",
      decisions: stats.decisions,
    };
  }
  const r = kind === "renewals" ? EVERYDAY : getRoad("first-home");
  const stop = r?.stops.find((s) => s.id === (kind === "renewals" ? "renewals" : "energy-settlement"));
  if (!r || !stop) return { text: "No crowd comparison is available for this step.", decisions: [] };
  const stats = statsFor(r, stop);
  const behaviour = stats.kind === "bump" ? stats.behaviours.find((b) => b.id === (kind === "renewals" ? "spread" : "pot")) : undefined;
  return {
    text: behaviour?.calm.value != null
      ? kind === "renewals"
        ? `${pct(behaviour.calm.value)} of people who spread yearly premiums over 12 months avoided a large renewal bill. This is about yearly premiums, not a quote for your cover.`
        : `${pct(behaviour.calm.value)} of first-home buyers who started a monthly pot avoided a large first energy settlement. Their experience can help you prepare.`
      : "We hold back this comparison because too few people match.",
    decisions: stats.decisions,
  };
}
