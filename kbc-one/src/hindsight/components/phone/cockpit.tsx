"use client";

import { dayLabel } from "../../engine/everyday";
import { euro, months1 } from "../../engine/format";
import type { Gated } from "../../engine/gate";
import type { LifeState } from "../../engine/life";
import type { CoverDef } from "../../engine/lives";

// The car is what you have. Shared by the App (Today) and the City (dashboard HUD).
// fuel = months of buffer · trip computer = the next 30 days · boot = pots + goals · tyres = cover

const FUEL_MAX = 6;

function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}

/** Fuel gauge: months of everyday life your buffer covers, with the crowd's median as a tick. */
export function FuelGauge({
  fuel,
  crowd,
  care,
  size = 150,
  ends = true,
}: { fuel: number; crowd?: Gated<number> | null; care?: boolean; size?: number; ends?: boolean }) {
  const w = size;
  const h = size * 0.62 + (ends ? 10 : 0);
  const cx = w / 2;
  const cy = size * 0.62 - 6;
  const r = w / 2 - Math.max(6, size * 0.08);
  const ang = (v: number) => Math.PI * (1 - Math.min(FUEL_MAX, Math.max(0, v)) / FUEL_MAX);
  const needle = ang(fuel);
  const tone = care ? "var(--lilac)" : fuel < 1 ? "var(--amber)" : fuel < 3 ? "var(--cream)" : "var(--mint)";
  const crowdV = crowd?.shown ? crowd.value : null;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Fuel: your buffer covers ${months1(fuel)} months`} className="fuel-svg">
      <path d={arc(cx, cy, r, Math.PI, 0)} className="fuel-track" style={{ strokeWidth: size * 0.066 }} />
      <path d={arc(cx, cy, r, Math.PI, ang(1))} className="fuel-seg low" style={{ strokeWidth: size * 0.04 }} />
      <path d={arc(cx, cy, r, ang(1), ang(3))} className="fuel-seg mid" style={{ strokeWidth: size * 0.04 }} />
      <path d={arc(cx, cy, r, ang(3), 0)} className="fuel-seg high" style={{ strokeWidth: size * 0.04 }} />
      {[0, 1, 2, 3, 4, 5, 6].map((t) => {
        const a = ang(t);
        return (
          <line
            key={t}
            x1={cx + r * 0.86 * Math.cos(a)}
            y1={cy - r * 0.86 * Math.sin(a)}
            x2={cx + r * 0.96 * Math.cos(a)}
            y2={cy - r * 0.96 * Math.sin(a)}
            className="fuel-tick"
          />
        );
      })}
      {crowdV != null && !care && (
        <g>
          <line
            x1={cx + (r + 1) * Math.cos(ang(crowdV))}
            y1={cy - (r + 1) * Math.sin(ang(crowdV))}
            x2={cx + (r + 7) * Math.cos(ang(crowdV))}
            y2={cy - (r + 7) * Math.sin(ang(crowdV))}
            className="fuel-crowd"
          />
          <circle cx={cx + (r + 8) * Math.cos(ang(crowdV))} cy={cy - (r + 8) * Math.sin(ang(crowdV))} r={2.5} className="fuel-crowd-dot" />
        </g>
      )}
      <line x1={cx} y1={cy} x2={cx + r * 0.78 * Math.cos(needle)} y2={cy - r * 0.78 * Math.sin(needle)} stroke={tone} strokeWidth={size > 100 ? 3 : 2.4} strokeLinecap="round" className="fuel-needle" />
      <circle cx={cx} cy={cy} r={size > 100 ? 5 : 3.5} fill={tone} />
      {ends && (
        <>
          <text x={cx - r} y={h - 1} textAnchor="middle" className="fuel-end">
            0
          </text>
          <text x={cx + r} y={h - 1} textAnchor="middle" className="fuel-end">
            6+
          </text>
        </>
      )}
    </svg>
  );
}

/** The balance over the next 30 days, with the lowest point marked. */
export function Sparkline({ life, width = 340, height = 72 }: { life: LifeState; width?: number; height?: number }) {
  const pts = life.curve;
  const vals = pts.map((p) => p.bal);
  const lo = Math.min(0, ...vals);
  const hi = Math.max(...vals, 1);
  const pad = 8;
  const x = (d: number) => pad + (d / 30) * (width - pad * 2);
  const y = (v: number) => pad + (1 - (v - lo) / (hi - lo || 1)) * (height - pad * 2);
  const path = pts.map((p, i) => `${i ? "L" : "M"}${x(p.d).toFixed(1)} ${y(p.bal).toFixed(1)}`).join(" ");
  const low = pts.reduce((a, b) => (b.bal < a.bal ? b : a), pts[0]);
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Your balance over the next 30 days" className="spark">
      {lo < 0 && <line x1={pad} x2={width - pad} y1={y(0)} y2={y(0)} className="spark-zero" />}
      <path d={`${path} L${x(30)} ${height - pad} L${x(0)} ${height - pad} Z`} className="spark-fill" />
      <path d={path} className="spark-line" />
      <circle cx={x(0)} cy={y(pts[0].bal)} r={3.5} className="spark-now" />
      <circle cx={x(low.d)} cy={y(low.bal)} r={4} className={low.bal < 0 ? "spark-low neg" : "spark-low"} />
    </svg>
  );
}

const TYRE_POS = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
];

/** Four tyres = your cover. A tyre to check is amber, a missing one is hollow. */
export function Tyres({ cover, checked, size = 56 }: { cover: CoverDef[]; checked: string[]; size?: number }) {
  const four = [...cover.slice(0, 4)];
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 56 70" role="img" aria-label={`Cover: ${cover.map((c) => `${c.label} ${checked.includes(c.id) ? "checked" : c.state}`).join(", ")}`}>
      <rect x="15" y="6" width="26" height="58" rx="9" className="tyre-body" />
      {TYRE_POS.map(([cx, cy], i) => {
        const c = four[i];
        const st = !c ? "none" : checked.includes(c.id) ? "ok" : c.state;
        return <rect key={`${cx}-${cy}`} x={cx ? 41 : 5} y={cy ? 44 : 10} width="10" height="16" rx="3" className={`tyre tyre-${st}`} />;
      })}
    </svg>
  );
}

export function TripComputer({ life, care }: { life: LifeState; care?: boolean }) {
  const inc = life.next30.filter((i) => i.amount > 0).reduce((s, i) => s + i.amount, 0);
  const out = life.next30.filter((i) => i.amount < 0).reduce((s, i) => s + i.amount, 0);
  const spend = life.essentials - life.monthlyBills;
  return (
    <div className="trip">
      <div className="trip-kicker">NEXT 30 DAYS</div>
      <div className="trip-row">
        <span>In</span>
        <b className="mint">{euro(inc)}</b>
      </div>
      <div className="trip-row">
        <span>Out</span>
        <b>{euro(-out)}</b>
      </div>
      <div className="trip-row">
        <span>Everyday</span>
        <b>~{euro(spend)}</b>
      </div>
      <div className={`trip-row ${life.lowest.bal < 0 ? "neg" : ""}`}>
        <span>Lowest</span>
        <b className={life.lowest.bal < 0 ? (care ? "lilac" : "amber") : ""}>{euro(life.lowest.bal)}</b>
      </div>
      <div className="trip-sub">on {dayLabel(life.lowest.cal, life.lowest.day)}</div>
    </div>
  );
}
