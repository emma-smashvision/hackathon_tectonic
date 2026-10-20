import { gateRate } from "../../hindsight/engine/gate";
import { worldEvidence as stopEvidenceFor } from "./evidence";
import { countFor, publish, withheld } from "../crowd/gate";
import { ACTIVE_AREAS, AREA_CATALOGUE } from "./catalogue";
import { questsFor } from "./quests";
import type { AreaId, WorldAhead } from "./types";

/** Authored synthetic aggregate fixtures, not observed bank customers or telemetry.
 * Each row represents anonymous parent/adult learning paths in the same broad context.
 * There are no names, balances, child fields, dates of birth or individual records.
 */
const PATHS: Record<string, { worlds: number; order: AreaId[] }[]> = {
  tom: [
    { worlds: 1200, order: ["home", "savings", "car", "work"] },
    { worlds: 720, order: ["savings", "home", "work", "car"] },
    { worlds: 480, order: ["car", "work", "home", "savings"] },
  ],
  karim: [
    { worlds: 1200, order: ["work", "home", "savings", "pension", "investments"] },
    { worlds: 720, order: ["savings", "work", "home", "investments", "pension"] },
    { worlds: 480, order: ["home", "pension", "investments", "savings", "work"] },
  ],
  sofie: [
    { worlds: 1200, order: ["home", "savings", "family", "pension"] },
    { worlds: 720, order: ["savings", "family", "home", "pension"] },
    { worlds: 480, order: ["family", "home", "pension", "savings"] },
  ],
  lina: [
    { worlds: 1200, order: ["savings", "home", "family", "pension"] },
    { worlds: 720, order: ["home", "family", "savings", "pension"] },
    { worlds: 480, order: ["family", "pension", "home", "savings"] },
  ],
  margaret: [
    { worlds: 1200, order: ["home", "savings", "pension"] },
    { worlds: 720, order: ["savings", "pension", "home"] },
    { worlds: 480, order: ["pension", "home", "savings"] },
  ],
};

export function worldAhead(personaId: string, areaId: AreaId): WorldAhead {
  const allowed = Object.hasOwn(PATHS, personaId) && ACTIVE_AREAS[personaId].includes(areaId) && areaId !== "kids";
  const rows = allowed ? PATHS[personaId] : [];
  const n = rows.reduce((sum, row) => sum + row.worlds, 0);
  const denominator = n ? countFor(`world-ahead:${personaId}:group`, n) : withheld("No published adult learning group for this area.");
  const selected = new Set<AreaId>();
  const buildOrder: WorldAhead["buildOrder"] = [];
  if (denominator.shown) for (let index = 0; index < Math.max(...rows.map(row => row.order.length)); index++) {
    const votes = new Map<AreaId, number>();
    for (const row of rows) {
      const id = row.order[index];
      if (id) votes.set(id, (votes.get(id) ?? 0) + row.worlds);
    }
    const [winner] = [...votes].filter(([id, count]) => !selected.has(id) && count >= 500).sort((a, b) => b[1] - a[1]);
    if (!winner) continue;
    selected.add(winner[0]);
    buildOrder.push({ areaId: winner[0], title: AREA_CATALOGUE.find(area => area.id === winner[0])!.title, order: index + 1,
      share: publish(gateRate(`world-ahead:${personaId}:${index}:${winner[0]}`, winner[1], n)) });
  }
  const seen = new Set<string>();
  const stormHits = denominator.shown ? questsFor(personaId, areaId).flatMap(q => {
    if (seen.has(q.stopId)) return [];
    seen.add(q.stopId);
    const e = stopEvidenceFor(q.roadId, q.stopId.slice(q.roadId.length + 1));
    return e?.kind === "bump" && e.month <= 24 && e.denominator.shown ? [{ roadId: e.roadId, stopId: e.stopId, title: e.title, share: e.surprised.share, denominator: e.denominator }] : [];
  }) : [];
  return { personaId, areaId, title: "A world like yours, 2 years ahead", yearsAhead: 2, available: denominator.shown,
    reason: denominator.shown ? null : denominator.reason, denominator, buildOrder, stormHits,
    basis: "Authored synthetic adult learning paths in a similar life context. Build order is a demo aggregate, not observed customer behavior. Storm hits use separate published whole-road crowds, not a matched forecast.", synthetic: true };
}
