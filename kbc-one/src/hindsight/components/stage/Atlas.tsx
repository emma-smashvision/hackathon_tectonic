"use client";

import { useMemo, useState } from "react";
import { int } from "../../engine/format";
import { K_MIN } from "../../engine/gate";
import { type PlacementResult, POPULATION, pointerSpace, runPlacement } from "../../engine/placement";
import { hashSeed, mulberry32 } from "../../engine/rng";
import { useStore } from "../store";
import { Icon } from "../ui";

type Pt = [number, number];
const LAYOUT: Record<string, { pts: Pt[]; label: Pt; anchor?: "start" | "end" }> = {
  "first-job": { pts: [[40, 110], [220, 110]], label: [40, 76] },
  "first-home": { pts: [[220, 110], [300, 110], [420, 200]], label: [318, 92] },
  "first-child": { pts: [[420, 200], [520, 200], [600, 130]], label: [430, 160] },
  "student-kid": { pts: [[600, 130], [880, 130]], label: [680, 100] },
  freelance: { pts: [[220, 110], [260, 110], [340, 320], [560, 320], [760, 320]], label: [380, 344] },
  separation: { pts: [[420, 200], [500, 260], [680, 260]], label: [508, 226] },
  "caring-parent": { pts: [[640, 130], [700, 250], [760, 380], [800, 460]], label: [770, 268] },
  retirement: { pts: [[440, 460], [520, 480], [960, 480]], label: [820, 504] },
  "moving-abroad": { pts: [[220, 110], [160, 200], [160, 400], [300, 420]], label: [148, 300], anchor: "end" },
  "losing-parent": { pts: [[760, 380], [860, 380], [960, 340]], label: [800, 412] },
  "job-loss": { pts: [[340, 320], [300, 520], [600, 540]], label: [320, 560] },
  "heat-pump": { pts: [[420, 200], [410, 250], [460, 290]], label: [470, 286] },
  "moving-house": { pts: [[300, 110], [340, 40], [540, 40]], label: [360, 28] },
};

function pathOf(pts: Pt[]) {
  return `M${pts.map((p) => p.join(" ")).join(" L")}`;
}

function along(pts: Pt[], f: number): Pt {
  const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  let d = f * seg.reduce((a, b) => a + b, 0);
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i]) {
      const a = d / seg[i];
      return [pts[i][0] + a * (pts[i + 1][0] - pts[i][0]), pts[i][1] + a * (pts[i + 1][1] - pts[i][1])];
    }
    d -= seg[i];
  }
  return pts[pts.length - 1];
}

export function Atlas() {
  const { roads, road: current, pickRoad, setView, approveRoad } = useStore();
  const [focus, setFocus] = useState<string>(current.id);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<PlacementResult | null>(null);
  const [running, setRunning] = useState(false);
  const focused = roads.find((r) => r.id === focus) ?? current;
  const pending = roads.filter((r) => r.status === "pending");
  const totalAlumni = roads.filter((r) => r.status === "live").reduce((s, r) => s + r.alumni, 0);

  const dots = useMemo(() => {
    const out: { key: string; x: number; y: number; o: number }[] = [];
    for (const r of roads) {
      const lay = LAYOUT[r.id];
      if (!lay) continue;
      const rand = mulberry32(hashSeed(`atlas:${r.id}`));
      const count = Math.round(r.current / 220);
      const w = 3 + 9 * Math.sqrt(r.alumni / 61400);
      for (let i = 0; i < count; i++) {
        const [x, y] = along(lay.pts, rand());
        out.push({ key: `${r.id}-${i}`, x: x + (rand() - 0.5) * w * 1.6, y: y + (rand() - 0.5) * w * 1.6, o: 0.3 + rand() * 0.55 });
      }
    }
    return out;
  }, [roads]);

  const run = async () => {
    setRunning(true);
    setResult(null);
    const r = await runPlacement(setProgress);
    setResult(r);
    setRunning(false);
  };

  return (
    <div className="atlas">
      <header className="atlas-head">
        <div className="stack-8">
          <div className="kicker">KBC · HINDSIGHT · THE ATLAS</div>
          <h1 className="atlas-title">Every road 2.3 million customers travel.</h1>
          <p className="atlas-sub">Nobody is predicted. Everyone is placed on a road others already drove, and sees what's ahead through their eyes.</p>
        </div>
        <div className="synthetic-tag">Synthetic population · illustrative</div>
      </header>

      <div className="tiles">
        <div className="tile">
          <div className="tile-num">{roads.filter((r) => r.status === "live").length}</div>
          <div className="tile-label">roads live in this demo</div>
        </div>
        <div className="tile">
          <div className="tile-num">{int(totalAlumni)}</div>
          <div className="tile-label">simulated drivers behind the numbers</div>
        </div>
        <div className="tile">
          <div className="tile-num">1</div>
          <div className="tile-label">pointer per customer: road + month</div>
        </div>
        <div className="tile">
          <div className="tile-num">≥ {K_MIN}</div>
          <div className="tile-label">people behind every number shown</div>
        </div>
      </div>

      <div className="atlas-body">
        <figure className="map-card">
          <svg viewBox="0 0 1000 580" role="img" aria-label="Network of life roads. Line width shows how many customers drove each road." className="map-svg">
            {roads.map((r) => {
              const lay = LAYOUT[r.id];
              if (!lay) return null;
              const w = 3 + 9 * Math.sqrt(r.alumni / 61400);
              return <path key={`bed-${r.id}`} d={pathOf(lay.pts)} className="map-bed" strokeWidth={w + 8} />;
            })}
            {roads.map((r) => {
              const lay = LAYOUT[r.id];
              if (!lay) return null;
              const w = r.status === "pending" ? 3 : 3 + 9 * Math.sqrt(r.alumni / 61400);
              const cls = r.status === "pending" ? "map-line pending" : r.care ? "map-line care" : "map-line";
              return (
                <path
                  key={`line-${r.id}`}
                  d={pathOf(lay.pts)}
                  className={`${cls} ${focus === r.id ? "focus" : ""}`}
                  stroke={r.care || r.status === "pending" ? undefined : r.hue}
                  strokeWidth={w}
                />
              );
            })}
            {dots.map((d) => (
              <circle key={d.key} cx={d.x} cy={d.y} r={1.5} opacity={d.o} className="rider" />
            ))}
            {[[220, 110], [420, 200], [600, 130], [340, 320], [760, 380], [440, 460]].map(([x, y]) => (
              <circle key={`st-${x}-${y}`} cx={x} cy={y} r={7} className="map-station" />
            ))}
            {roads.map((r) => {
              const lay = LAYOUT[r.id];
              if (!lay) return null;
              const placed = result?.perRoad[r.id];
              return (
                <g key={`lbl-${r.id}`} className="map-label-g">
                  <text x={lay.label[0]} y={lay.label[1]} textAnchor={lay.anchor ?? "start"} className={`map-label ${r.status === "pending" ? "amber" : ""}`}>
                    {r.status === "pending" ? `New road found: ${r.name}` : r.name}
                  </text>
                  <text x={lay.label[0]} y={lay.label[1] + 17} textAnchor={lay.anchor ?? "start"} className="map-count">
                    {r.status === "pending"
                      ? `${int(r.alumni)} drivers · awaits a human yes`
                      : placed != null
                        ? `${int(placed)} placed now`
                        : `${int(r.alumni)} drove it${r.care ? " · care road" : ""}`}
                  </text>
                </g>
              );
            })}
            {roads.map((r) => {
              const lay = LAYOUT[r.id];
              if (!lay) return null;
              return (
                <path
                  key={`hit-${r.id}`}
                  d={pathOf(lay.pts)}
                  className="map-hit"
                  strokeWidth={22}
                  onClick={() => setFocus(r.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setFocus(r.id);
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Focus ${r.name}`}
                />
              );
            })}
          </svg>
          <figcaption className="map-legend">
            <span>Line width = people who drove it</span>
            <span>Each dot ≈ 220 people on it now</span>
            <span className="lilac">Lilac dashed = care road</span>
            <span className="amber">Amber dotted = discovered, not live</span>
          </figcaption>
        </figure>

        <aside className="atlas-side">
          <section className="side-card">
            <div className="row between">
              <div className="side-card-title">{focused.name}</div>
              <span className="road-dot" style={{ background: focused.hue }} />
            </div>
            <div className="xs muted">{focused.tagline}</div>
            <div className="kv">
              <span>Drove it</span>
              <b>{int(focused.alumni)}</b>
              <span>On it now</span>
              <b>{int(focused.current)}</b>
              <span>Length</span>
              <b>{focused.months} months</b>
              <span>Stops</span>
              <b>{focused.stops.length + (focused.fork ? 1 : 0)}</b>
            </div>
            {focused.status === "live" ? (
              <button
                type="button"
                className="btn small primary"
                onClick={() => {
                  pickRoad(focused.id);
                  setView("city");
                }}
              >
                Drive it as {focused.persona.name}
              </button>
            ) : (
              <div className="xs amber">Not live: a person must approve this road first.</div>
            )}
          </section>

          {pending.map((p) => (
            <section key={p.id} className="side-card pending-card">
              <div className="kicker amber">NEW ROAD FOUND THIS MONTH</div>
              <div className="side-card-title">{p.name}</div>
              <p className="xs lh muted">
                {int(p.alumni)} customers share a new pattern: a large installer payment, then gas debits stop and electricity
                rises. Sensitive categories were checked and none were used.
              </p>
              <div className="row gap">
                <button type="button" className="btn small primary grow" onClick={() => approveRoad(p.id)}>
                  Approve road
                </button>
                <button type="button" className="btn small ghost" onClick={() => setFocus(p.id)}>
                  Inspect
                </button>
              </div>
            </section>
          ))}

          <section className="side-card">
            <div className="side-card-title">Place all 2.3M customers</div>
            <p className="xs lh muted">
              Runs the placement rules over a synthetic population of {int(POPULATION)}, right here in your browser. Care roads are checked first.
            </p>
            <button type="button" className="btn small primary" onClick={run} disabled={running}>
              <Icon name="play" size={14} /> {running ? "Placing…" : result ? "Run again" : "Run placement"}
            </button>
            {(running || result) && (
              <div className="bar-track">
                <div className="bar calm" style={{ width: `${(progress / POPULATION) * 100}%` }} />
              </div>
            )}
            {result && (
              <div className="kv">
                <span>Compute time</span>
                <b>{(result.ms / 1000).toFixed(2)} s</b>
                <span>Per second</span>
                <b>{int(result.perSecond)}</b>
                <span>On a road now</span>
                <b>{int(result.placed)}</b>
                <span>Quiet home</span>
                <b>{int(result.quiet)}</b>
                <span>Shared views</span>
                <b>
                  {result.pointers} / {pointerSpace()}
                </b>
              </div>
            )}
            {result && (
              <div className="xs lh muted">
                {int(POPULATION)} customers need only {result.pointers} precomputed views. Cost grows with roads, not with customers.
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
