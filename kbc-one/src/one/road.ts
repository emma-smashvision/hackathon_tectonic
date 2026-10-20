// KBC One: the bridge between a Kate customer and their road.
// Pure TypeScript (no React), so the server can give Kate the same road facts the phone shows.
// Every crowd number below has passed Hindsight's crowd gate; held-back numbers say so.

import { dayLabel, MONTH_LONG } from "../hindsight/engine/everyday";
import { duration, euro, int, months1, pct } from "../hindsight/engine/format";
import { type Journey, newJourney } from "../hindsight/engine/game";
import { computeLife, fuelCrowd, goalCrowd, type LifeState, type UpcomingItem } from "../hindsight/engine/life";
import { EVERYDAY_ONLY, EVERYDAY_ONLY_ID, getRoad } from "../hindsight/engine/roads";
import type { RoadDef } from "../hindsight/engine/types";
import { type PersonRoad, PEOPLE } from "./people";

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

/** What starts the driving world from the Home, for this person right now. Null = nothing to offer. */
export interface LookAhead {
  kind: "told" | "crossroads" | "bump" | "preview";
  kicker: string;
  title: string;
  line: string;
  button: string;
  /** where the drive starts */
  drive: { roadId: string; month: number };
  /** optional one-tap tip for the stop just ahead (B1: road tips become quick actions) */
  tip?: { key: string; id: string; label: string };
}

const inWords = (days: number) =>
  days <= 1 ? "tomorrow" : days < 14 ? `in ${days} days` : days < 60 ? `in about ${Math.round(days / 7)} weeks` : `in about ${Math.round(days / 30)} months`;

export function lookAhead(p: PersonRoad, road: RoadDef, journey: Journey, life: LifeState, opts: { large?: boolean } = {}): LookAhead | null {
  if (road.care || p.noGame || opts.large) return null;
  const ahead = life.upcoming.filter((u) => u.scope === "road");
  const firstBump = ahead.find((u) => u.kind === "bump" && u.ready < 50);
  const tipFor = (u: UpcomingItem | undefined): LookAhead["tip"] => {
    if (!u) return undefined;
    const st = road.stops.find((s) => s.id === u.ref.id);
    const b = st?.behaviours?.filter((x) => !u.done.includes(x.id)).sort((a, c) => c.action.readiness - a.action.readiness)[0];
    return b ? { key: u.ref.key, id: b.id, label: b.action.label } : undefined;
  };
  // a crossroads within about six months
  const fork = road.fork;
  if (fork && !journey.forkChoice[fork.id] && fork.month > journey.month && fork.month - journey.month <= 6) {
    const months = fork.month - journey.month;
    return {
      kind: "crossroads",
      kicker: `ON YOUR ROAD · IN ABOUT ${months} MONTH${months === 1 ? "" : "S"}`,
      title: fork.title,
      line: `${road.name}: ${int(road.alumni)} people drove it before you. See how each branch was going a year later, before you choose.`,
      button: "See the road ahead",
      drive: { roadId: road.id, month: journey.month },
    };
  }
  // a life event the customer told us about, at the start of the road
  if (p.told && journey.month <= 1 && road.id !== EVERYDAY_ONLY_ID) {
    const next = firstBump ?? ahead[0];
    return {
      kind: "told",
      kicker: `YOUR ROAD · ${road.name.toUpperCase()}`,
      title: `${p.told.replace(/\.$/, "")}. See the road ahead.`,
      line: next
        ? `${int(road.alumni)} people drove this road before you. First up, ${inWords(next.inDays)}: ${next.title.toLowerCase()}. ${next.crowd}.`
        : `${int(road.alumni)} people drove this road before you.`,
      button: "See the road ahead",
      drive: { roadId: road.id, month: journey.month },
      tip: tipFor(firstBump),
    };
  }
  // an unprepared bump within about six weeks
  if (firstBump && firstBump.inDays <= 42) {
    return {
      kind: "bump",
      kicker: `ON YOUR ROAD · ${inWords(firstBump.inDays).toUpperCase()}`,
      title: firstBump.title,
      line: `${firstBump.crowd}. See what the people who came through calmly did.`,
      button: "See the road ahead",
      drive: { roadId: road.id, month: journey.month },
      tip: tipFor(firstBump),
    };
  }
  // a road this person is about to enter: drive it before you're on it
  if (p.preview) {
    const r = getRoad(p.preview.roadId);
    if (r)
      return {
        kind: "preview",
        kicker: `NEXT ROAD · ${r.name.toUpperCase()}`,
        title: p.preview.title,
        line: p.preview.line,
        button: "Test-drive it",
        drive: { roadId: r.id, month: 0 },
      };
  }
  return null;
}

/** Road facts for Kate: only gated crowd numbers, phrased as what people before them lived. */
export function roadFactsFor(personaId: string) {
  const p = PEOPLE[personaId];
  if (!p) return null;
  const { road, journey, life } = lifeOf(p);
  const fuelC = road.care ? null : fuelCrowd(road);
  const items = life.upcoming.filter((u) => u.kind !== "fork").slice(0, 5);
  const fork = road.fork && road.fork.month > journey.month ? road.fork : undefined;
  const la = lookAhead(p, road, journey, life);
  return {
    rule: "This is what people at the customer's point lived (the crowd's hindsight), not a prediction about them. Say 'people at your point' or 'last year you paid', never 'you will'.",
    care: road.care,
    lifeRoad:
      road.id === EVERYDAY_ONLY_ID
        ? null
        : `${road.name}, month ${journey.month} of ${road.months} (${int(road.alumni)} people drove it before)`,
    everydayRoad: `Everyday Road, ${MONTH_LONG[life.today.cal.month]} ${life.today.cal.year}`,
    buffer: road.care
      ? undefined
      : {
          months: months1(life.fuel),
          peopleAtThisPoint: fuelC?.value != null ? months1(fuelC.value) : "held back: too few people",
        },
    next30days: {
      lowestBalance: `${euro(life.lowest.bal)} on ${dayLabel(life.lowest.cal, life.lowest.day)}`,
      ...(life.salary ? { nextIncome: `${life.salary.label} ${euro(life.salary.amount)} on ${dayLabel(life.salary.cal, life.salary.day)}` } : {}),
    },
    comingUp: road.care && !journey.careOptIn
      ? "hidden: the customer has not asked to look ahead yet"
      : items.map((u) => ({
          when: `${dayLabel(u.cal, u.day)} ${u.cal.year} (${inWords(u.inDays)})`,
          what: u.title,
          on: u.scope === "everyday" ? "Everyday Road" : road.name,
          amount: u.amount == null ? null : `${euro(u.amount)} (${u.amountSource === "crowd" ? "typical for people at this point" : "your own amount last year"})`,
          crowd: u.crowd,
          prepared: `${u.ready}%`,
        })),
    crossroads: fork
      ? { what: fork.title, inMonths: fork.month - journey.month, branches: fork.branches.map((b) => `${b.label} (${pct(b.share)} took it)`) }
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
    nextRoadToTestDrive: p.preview ? `${getRoad(p.preview.roadId)?.name} (${p.preview.line})` : null,
    canDrive: !road.care && !p.noGame,
    driveOffer: la ? la.title : null,
  };
}
