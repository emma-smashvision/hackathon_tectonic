import { type GateDecision, type Gated, gateMoney, gateRate } from "./gate";
import { clamp, gaussian, hashSeed, lognormal, mulberry32 } from "./rng";
import type { ForkDef, ForkMetric, RoadDef, StopDef } from "./types";

// Synthetic crowd. For every road we generate the people who already drove it,
// then let each of them live through each stop. Nothing below is hardcoded output:
// rates, histograms and "what made the difference" emerge from the simulation.

interface Crowd {
  n: number;
  prep: Float32Array; // how much a person tends to prepare (0..1)
  buffer: Float32Array; // savings quantile (0..1), correlated with prep
  bufferBand: Uint8Array; // 0..3
  incomeBand: Uint8Array; // 0..2
}

const crowdCache = new Map<string, Crowd>();

export function crowdFor(road: RoadDef): Crowd {
  const hit = crowdCache.get(road.id);
  if (hit) return hit;
  const n = road.alumni;
  const rand = mulberry32(hashSeed(`crowd:${road.id}`));
  const prep = new Float32Array(n);
  const buffer = new Float32Array(n);
  const bufferBand = new Uint8Array(n);
  const incomeBand = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const p = rand();
    const q = clamp(0.55 * p + 0.45 * rand(), 0, 0.9999);
    prep[i] = p;
    buffer[i] = q;
    bufferBand[i] = Math.floor(q * 4);
    incomeBand[i] = Math.floor(rand() * 3);
  }
  const crowd = { n, prep, buffer, bufferBand, incomeBand };
  crowdCache.set(road.id, crowd);
  return crowd;
}

export interface HistBin {
  label: string;
  count: number;
  share: number;
  over: boolean;
}

export interface BehaviourStat {
  id: string;
  label: string;
  calm: Gated<number>;
  hit: Gated<number>;
  action: { label: string; readiness: number };
}

export interface BumpStats {
  kind: "bump";
  n: number;
  hitRate: Gated<number>;
  median: Gated<number>;
  threshold: number;
  bins: HistBin[];
  behaviours: BehaviourStat[];
  /** Calm rate among drivers who did at least the given behaviours. */
  calmIf: (ids: string[]) => Gated<number>;
  decisions: GateDecision[];
}

export interface BoostStats {
  kind: "boost";
  n: number;
  median: Gated<number>;
  decisions: GateDecision[];
}

export interface MilestoneStats {
  kind: "milestone";
  n: number;
  rate: Gated<number>;
  decisions: GateDecision[];
}

export type StopStats = BumpStats | BoostStats | MilestoneStats;

const statCache = new Map<string, StopStats>();

function median(values: Float64Array | number[]): number {
  const arr = Array.from(values).sort((a, b) => a - b);
  if (!arr.length) return 0;
  const m = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[m] : (arr[m - 1] + arr[m]) / 2;
}

export function statsFor(road: RoadDef, stop: StopDef): StopStats {
  const key = `${road.id}:${stop.id}`;
  const cached = statCache.get(key);
  if (cached) return cached;
  const crowd = crowdFor(road);
  const rand = mulberry32(hashSeed(`stop:${key}`));
  const n = crowd.n;
  let out: StopStats;

  if (stop.kind === "bump" && stop.amount) {
    const t = stop.amount.threshold ?? stop.amount.median * 1.4;
    const behaviours = stop.behaviours ?? [];
    const mask = new Uint8Array(n);
    const hit = new Uint8Array(n);
    const amounts = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const amount = lognormal(rand, stop.amount.median, stop.amount.sigma);
      let cap = t * (0.7 + 0.6 * crowd.buffer[i]);
      let m = 0;
      behaviours.forEach((bh, bi) => {
        const p = clamp(bh.base + (crowd.prep[i] - 0.5) * 0.7, 0.02, 0.98);
        if (rand() < p) {
          m |= 1 << bi;
          cap *= 1 + bh.lift;
        }
      });
      mask[i] = m;
      amounts[i] = amount;
      hit[i] = amount > cap ? 1 : 0;
    }
    const edges = [0, 0.25 * t, 0.5 * t, 0.75 * t, t, 1.5 * t, Number.POSITIVE_INFINITY];
    const counts = new Array(edges.length - 1).fill(0);
    let hits = 0;
    for (let i = 0; i < n; i++) {
      hits += hit[i];
      for (let e = 0; e < edges.length - 1; e++) {
        if (amounts[i] < edges[e + 1]) {
          counts[e]++;
          break;
        }
      }
    }
    const short = (v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : `${Math.round(v)}`);
    const bins: HistBin[] = counts.map((c, e) => ({
      label: e === 0 ? `<${short(edges[1])}` : e === counts.length - 1 ? `${short(edges[e])}+` : `${short(edges[e])}–${short(edges[e + 1])}`,
      count: c,
      share: c / n,
      over: edges[e] >= t,
    }));
    const behaviourStats: BehaviourStat[] = behaviours.map((bh, bi) => {
      let calmN = 0;
      let calmDid = 0;
      let hitN = 0;
      let hitDid = 0;
      for (let i = 0; i < n; i++) {
        const did = (mask[i] >> bi) & 1;
        if (hit[i]) {
          hitN++;
          hitDid += did;
        } else {
          calmN++;
          calmDid += did;
        }
      }
      return {
        id: bh.id,
        label: bh.label,
        calm: gateRate(`${key}:${bh.id}:calm`, calmDid, calmN),
        hit: gateRate(`${key}:${bh.id}:hit`, hitDid, hitN),
        action: bh.action,
      };
    });
    const calmIf = (ids: string[]) => {
      let need = 0;
      ids.forEach((id) => {
        const bi = behaviours.findIndex((b) => b.id === id);
        if (bi >= 0) need |= 1 << bi;
      });
      let matchN = 0;
      let calm = 0;
      for (let i = 0; i < n; i++) {
        if ((mask[i] & need) === need) {
          matchN++;
          calm += 1 - hit[i];
        }
      }
      return gateRate(`${key}:calmIf:${need}`, calm, matchN);
    };
    const hitRate = gateRate(`${key}:hit`, hits, n);
    const med = gateMoney(`${key}:median`, median(amounts), n);
    out = {
      kind: "bump",
      n,
      hitRate,
      median: med,
      threshold: t,
      bins,
      behaviours: behaviourStats,
      calmIf,
      decisions: [hitRate.decision, med.decision, ...behaviourStats.flatMap((b) => [b.calm.decision, b.hit.decision])],
    };
  } else if (stop.kind === "boost" && stop.amount) {
    const amounts = new Float64Array(n);
    for (let i = 0; i < n; i++) amounts[i] = lognormal(rand, stop.amount.median, stop.amount.sigma);
    const med = gateMoney(`${key}:median`, median(amounts), n);
    out = { kind: "boost", n, median: med, decisions: [med.decision] };
  } else {
    const p = stop.rate?.p ?? 0.5;
    let yes = 0;
    for (let i = 0; i < n; i++) if (rand() < clamp(p + (crowd.prep[i] - 0.5) * 0.2, 0, 1)) yes++;
    const rate = gateRate(`${key}:rate`, yes, n);
    out = { kind: "milestone", n, rate, decisions: [rate.decision] };
  }
  statCache.set(key, out);
  return out;
}

// ---------- Forks ----------

export interface ForkMetricStat {
  key: string;
  label: string;
  kind: ForkMetric["kind"];
  goodHigh?: boolean;
  value: Gated<number>;
}

export interface ForkBranchStats {
  id: string;
  n: number;
  metrics: ForkMetricStat[];
}

export interface ForkStats {
  likeYou: boolean;
  horizon: 1 | 3;
  n: number;
  branches: ForkBranchStats[];
  decisions: GateDecision[];
}

export function forkStats(
  road: RoadDef,
  fork: ForkDef,
  horizon: 1 | 3,
  likeYou: { bufferBand: number; incomeBand: number } | null,
): ForkStats {
  const crowd = crowdFor(road);
  const rand = mulberry32(hashSeed(`fork:${road.id}:${fork.id}:${horizon}`));
  const choice = new Uint8Array(crowd.n);
  const include = new Uint8Array(crowd.n);
  let total = 0;
  for (let i = 0; i < crowd.n; i++) {
    choice[i] = rand() < fork.branches[0].share ? 0 : 1;
    const ok = !likeYou || (crowd.bufferBand[i] === likeYou.bufferBand && crowd.incomeBand[i] === likeYou.incomeBand);
    include[i] = ok ? 1 : 0;
    total += include[i];
  }
  const decisions: GateDecision[] = [];
  const branches = fork.branches.map((br, bi) => {
    const metrics = br.metrics.map((m) => {
      const spec = horizon === 1 ? m.y1 : m.y3;
      const vals: number[] = [];
      let yes = 0;
      let count = 0;
      for (let i = 0; i < crowd.n; i++) {
        // every person draws, so subsets stay comparable
        const z = gaussian(rand);
        const u = rand();
        if (choice[i] !== bi || !include[i]) continue;
        const shift = (crowd.buffer[i] - 0.5) * (m.bufferEffect ?? 0);
        count++;
        if (m.kind === "pct") {
          const p = clamp((spec as number) + shift * 0.15, 0.01, 0.99);
          if (u < p) yes++;
        } else {
          const [mean, sd] = spec as [number, number];
          vals.push(mean + shift * sd * 1.2 + z * sd);
        }
      }
      const label = `${road.id}:${fork.id}:${br.id}:${m.key}:${horizon}:${likeYou ? "like" : "all"}`;
      const value = m.kind === "pct" ? gateRate(label, yes, count) : gateMoney(label, median(vals), count);
      decisions.push(value.decision);
      return { key: m.key, label: m.label, kind: m.kind, goodHigh: m.goodHigh, value };
    });
    let n = 0;
    for (let i = 0; i < crowd.n; i++) if (choice[i] === bi && include[i]) n++;
    return { id: br.id, n, metrics };
  });
  return { likeYou: !!likeYou, horizon, n: total, branches, decisions };
}

/** Number of people on this road at roughly the same month as you right now. */
export function convoySize(road: RoadDef): number {
  return Math.round(road.current / Math.max(1, road.months)) * 3;
}
