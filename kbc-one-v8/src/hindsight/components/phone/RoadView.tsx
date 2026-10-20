"use client";

import { useEffect, useMemo, useState } from "react";
import { euro, int, oneIn, pct } from "../../engine/format";
import { allStops, readiness, roadReadiness } from "../../engine/game";
import { convoySize, statsFor } from "../../engine/simulate";
import type { AnyStop, RoadDef } from "../../engine/types";
import { useReport, useStore } from "../store";
import { G, Icon, Ring } from "../ui";
import { pathBetween, pos, ROAD_H, ROAD_W, riders, windowFor } from "./geometry";

function visualMonths(stops: AnyStop[]): Record<string, number> {
  const seen: Record<number, number> = {};
  const out: Record<string, number> = {};
  for (const s of stops) {
    const k = seen[s.month] ?? 0;
    out[s.id] = s.month + k * 0.45;
    seen[s.month] = k + 1;
  }
  return out;
}

function headline(road: RoadDef, stop: AnyStop) {
  if (stop.kind === "fork") return { stat: <>Two roads split here</>, decisions: [] };
  const s = statsFor(road, stop);
  if (s.kind === "bump")
    return {
      stat: <G g={s.hitRate} fmt={(v) => `${oneIn(v)} ${stop.hitVerb ?? "paid more than"} ${euro(s.threshold)}`} />,
      decisions: s.decisions.slice(0, 2),
    };
  if (s.kind === "boost") return { stat: <G g={s.median} fmt={(v) => `Typically ${euro(v)}`} />, decisions: s.decisions };
  return { stat: <G g={s.rate} fmt={(v) => `${pct(v)} ${stop.rate?.label}`} />, decisions: s.decisions };
}

const TICKS = [
  (n: number, s: string) => `${int(n)} people are around this month with you`,
  (_n: number, s: string) => `Someone two months ahead just got past “${s}”`,
  (n: number, s: string) => `${int(Math.max(12, Math.round(n / 9)))} people got ready for “${s}” this week`,
];

export function RoadView() {
  const { road, journey, go, newDriver, optInCare, toggleAction } = useStore();
  const stops = useMemo(() => allStops(road), [road]);
  const vm = useMemo(() => visualMonths(stops), [stops]);
  const ahead = stops.filter((s) => s.month > journey.month);
  const [sel, setSel] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const selected = stops.find((s) => s.id === sel) ?? ahead[0] ?? stops[stops.length - 1];
  const careLocked = road.care && !journey.careOptIn;
  const seed = road.id;
  const name = newDriver ? "You" : road.persona.name;

  useEffect(() => setSel(null), [road.id, journey.month]);
  useEffect(() => {
    if (road.care) return;
    const t = window.setInterval(() => setTick((v) => v + 1), 4200);
    return () => window.clearInterval(t);
  }, [road.care]);

  const head = selected ? headline(road, selected) : { stat: null, decisions: [] };
  useReport(careLocked ? [] : head.decisions);

  const win = useMemo(() => windowFor(journey.month, road.months, seed), [journey.month, road.months, seed]);
  const winEnd = win.start + win.span;
  const you = pos(journey.month, win);
  const ready = roadReadiness(road, journey);
  const ghost = useMemo(() => riders(journey.month, win, 60), [journey.month, win]);
  const perDot = Math.max(50, Math.round(road.current / 60 / 50) * 50);
  const visible = stops.filter((s) => vm[s.id] >= win.start - 0.01 && vm[s.id] <= winEnd + 0.01);
  const beyond = stops.filter((s) => vm[s.id] > winEnd + 0.01).length;
  // label placement: away from the centre, but flip when two labels would collide on the same side
  const placed: { s: AnyStop; p: { x: number; y: number }; leftSide: boolean }[] = [];
  for (const s of visible) {
    const p = pos(vm[s.id], win);
    let leftSide = p.x > ROAD_W / 2;
    const clash = placed.find((q) => q.leftSide === leftSide && Math.abs(q.p.y - p.y) < 20);
    if (clash) leftSide = !leftSide;
    placed.push({ s, p, leftSide });
  }
  const nextBump = ahead.find((s) => s.kind === "bump");
  const convoy = convoySize(road);

  const openSelected = () => {
    if (!selected) return;
    if (selected.kind === "fork") go({ name: "fork" });
    else go({ name: "stop", stopId: selected.id });
  };

  const quickAction = () => {
    if (!selected || selected.kind === "fork") return;
    if (selected.kind === "bump") {
      const first = selected.behaviours?.[0];
      if (first) toggleAction(selected.id, first.id);
    } else toggleAction(selected.id, "main");
  };

  const selReady = selected && selected.kind !== "fork" ? readiness(selected, journey.done[selected.id]) : 0;
  const quickLabel =
    selected && selected.kind === "bump"
      ? selected.behaviours?.[0]?.action.label
      : selected && selected.kind !== "fork"
        ? selected.action?.label
        : undefined;
  const quickDone =
    selected && selected.kind !== "fork"
      ? (journey.done[selected.id] ?? []).includes(selected.kind === "bump" ? (selected.behaviours?.[0]?.id ?? "") : "main")
      : false;
  const monthsAway = selected ? selected.month - journey.month : 0;

  return (
    <div className={`screen road-screen ${road.care ? "care" : ""}`}>
      <header className="road-head">
        <div className="row between">
          <div className="kicker">KBC · HINDSIGHT</div>
          <button type="button" className="avatar" aria-label="Open your passport" onClick={() => go({ name: "passport" })}>
            {name.slice(0, 1)}
          </button>
        </div>
        <div className="row between baseline">
          <h1 className="road-title">{road.name}</h1>
          <div className="mono month-pill">
            month {journey.month} / {road.months}
          </div>
        </div>
        {road.care ? (
          <p className="road-sub">This road is quieter. No offers, no nudges. You decide what you see.</p>
        ) : (
          <p className="road-sub">
            <b>{int(road.alumni)}</b> KBC customers drove this road before you. <b>{int(road.current)}</b> are on it now.
          </p>
        )}
      </header>

      <div className="road-canvas" style={{ width: ROAD_W, height: ROAD_H }}>
        <svg width={ROAD_W} height={ROAD_H} viewBox={`0 0 ${ROAD_W} ${ROAD_H}`} aria-hidden="true" className="road-svg">
          <path d={pathBetween(win.start, winEnd, win)} className="road-bed" />
          <path d={pathBetween(win.start, winEnd, win)} className="road-centre" />
          {!careLocked &&
            visible
              .filter((s) => s.kind === "bump" && s.month > journey.month)
              .map((s) => {
                const r = s.kind === "fork" ? 0 : readiness(s, journey.done[s.id]);
                const m = vm[s.id];
                return (
                  <path key={`zone-${s.id}`} d={pathBetween(m - 0.45, m + 0.45, win, 10)} className={r >= 50 ? "zone paved" : "zone rough"} />
                );
              })}
          <path d={pathBetween(win.start, journey.month, win)} className="road-past" />
          {!careLocked && ghost.map((g) => <circle key={g.key} cx={g.x} cy={g.y} r={g.r} opacity={g.o} className="rider" />)}
          {careLocked && <rect x="0" y="0" width={ROAD_W} height={Math.max(0, you.y - 30)} className="fog" />}
          <circle cx={you.x} cy={you.y} r={17} className="you-halo" />
          <circle cx={you.x} cy={you.y} r={8} className="you-dot" />
          <circle cx={you.x} cy={you.y} r={3} className="you-core" />
        </svg>

        <div
          className="you-label mono"
          style={you.x > ROAD_W / 2 ? { right: ROAD_W - you.x + 22, top: you.y - 8, textAlign: "right" } : { left: you.x + 22, top: you.y - 8 }}
        >
          {name.toUpperCase()} · M{journey.month}
        </div>

        {!careLocked && beyond > 0 && (
          <div className="beyond mono">
            +{beyond} more stop{beyond === 1 ? "" : "s"} after M{winEnd}
          </div>
        )}
        {!careLocked && winEnd >= road.months && (
          <div className="road-end mono" style={{ left: pos(road.months, win).x - 40, top: 2 }}>
            END OF ROAD
          </div>
        )}

        {!careLocked &&
          placed.map(({ s, p, leftSide }) => {
            const passed = s.month <= journey.month;
            const isSel = selected?.id === s.id;
            const r = s.kind === "fork" ? 0 : readiness(s, journey.done[s.id]);
            return (
              <div key={s.id}>
                <button
                  type="button"
                  className={`stop-btn kind-${s.kind} ${passed ? "passed" : ""} ${isSel ? "sel" : ""}`}
                  style={{ left: p.x - 22, top: p.y - 22 }}
                  aria-label={`Month ${s.month}: ${s.title}`}
                  aria-pressed={isSel}
                  onClick={() => setSel(s.id)}
                >
                  {!road.care && s.kind === "bump" && !passed && (
                    <svg width="44" height="44" viewBox="0 0 44 44" className="stop-ring" aria-hidden="true">
                      <circle cx="22" cy="22" r="17" className="ring-bg" />
                      <circle
                        cx="22"
                        cy="22"
                        r="17"
                        className="ring-fg"
                        strokeDasharray={`${(2 * Math.PI * 17 * r) / 100} 200`}
                        transform="rotate(-90 22 22)"
                      />
                    </svg>
                  )}
                  <span className="stop-dot">{passed && <Icon name="check" size={11} />}</span>
                </button>
                {Math.abs(p.y - you.y) > 14 && <div
                  className={`stop-label ${passed ? "passed" : ""} ${isSel ? "sel" : ""}`}
                  style={leftSide ? { right: ROAD_W - p.x + 20, top: p.y - 8, textAlign: "right" } : { left: p.x + 20, top: p.y - 8 }}
                >
                  {s.short} <span className="mono">M{s.month}</span>
                </div>}
              </div>
            );
          })}

      </div>
      {!careLocked && (
        <div className="dots-legend">
          <svg width="14" height="8" aria-hidden="true">
            <circle cx="3" cy="4" r="2" className="rider" opacity="0.8" />
            <circle cx="10" cy="4" r="2" className="rider" opacity="0.5" />
          </svg>
          each dot ≈ {int(perDot)} people ahead of you
        </div>
      )}

      {careLocked ? (
        <section className="card care-card">
          <div className="kicker lilac">WE'LL KEEP THIS CALM</div>
          <h2 className="card-title">{int(road.alumni)} people drove this road before you.</h2>
          <p className="card-body">
            When you're ready, you can see what they ran into and what helped. Or talk to a person first. Nothing here will try to sell you anything.
          </p>
          <div className="row gap">
            <button type="button" className="btn primary grow" onClick={() => go({ name: "passport" })}>
              Talk to a person
            </button>
            <button type="button" className="btn ghost" onClick={optInCare}>
              Show what's ahead
            </button>
          </div>
        </section>
      ) : selected ? (
        <section className="card">
          <div className="row between">
            <div className={`kicker tone-${selected.kind}`}>
              {selected.month <= journey.month
                ? `PASSED · MONTH ${selected.month}`
                : `IN ~${monthsAway} MONTH${monthsAway === 1 ? "" : "S"} · MONTH ${selected.month}`}
            </div>
            {!road.care && selected.kind !== "fork" && selected.kind !== "boost" && (
              <div className="mini-ready">
                <Ring value={selReady} size={30} stroke={3} color={selReady >= 50 ? "var(--mint)" : "var(--amber)"} />
              </div>
            )}
          </div>
          <h2 className="card-title">{selected.title}</h2>
          <div className={`card-stat tone-${selected.kind}`}>{head.stat}</div>
          <p className="card-body">{selected.kind === "fork" ? selected.intro : selected.advice}</p>
          <div className="row gap">
            {selected.kind === "fork" ? (
              <button type="button" className="btn primary grow" onClick={openSelected}>
                Compare the two roads
              </button>
            ) : (
              <>
                {quickLabel && !road.care && (
                  <button type="button" className={`btn grow ${quickDone ? "done" : "primary"}`} onClick={quickAction} aria-pressed={quickDone}>
                    {quickDone ? (
                      <>
                        <Icon name="check" size={16} /> {quickLabel}
                      </>
                    ) : (
                      quickLabel
                    )}
                  </button>
                )}
                <button type="button" className={`btn ${quickLabel && !road.care ? "ghost" : "primary grow"}`} onClick={openSelected}>
                  {selected.kind === "bump" ? "What they did" : "See more"}
                </button>
              </>
            )}
          </div>
        </section>
      ) : null}

      {!road.care && (
        <div className="convoy" aria-live="polite">
          <span className="pulse" aria-hidden="true" />
          <span>
            {TICKS[tick % TICKS.length](convoy, nextBump?.short ?? "the next stop")}
          </span>
          <span className="ready-chip" title="How ready you are for the bumps in the next 6 months">
            ready {ready}%
          </span>
        </div>
      )}
    </div>
  );
}
