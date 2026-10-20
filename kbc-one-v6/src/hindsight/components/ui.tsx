"use client";

import type { ReactNode } from "react";
import type { Gated } from "../engine/gate";
import { int } from "../engine/format";
import { useStore } from "./store";

export function GateBadge({ g }: { g: Gated<unknown> }) {
  const { showGate } = useStore();
  if (!showGate) return null;
  return (
    <span className={`gate-badge ${g.shown ? "" : "held"}`} title={g.decision.reason}>
      n={int(g.n)}
      {g.shown ? "" : " · held"}
    </span>
  );
}

/** Renders a gated number, or a calm explanation when the crowd is too small. */
export function G<T>({ g, fmt, fallback }: { g: Gated<T>; fmt: (v: T) => ReactNode; fallback?: string }) {
  if (!g.shown || g.value === null) {
    return (
      <span className="held-value">
        {fallback ?? "Not enough drivers yet"}
        <GateBadge g={g} />
      </span>
    );
  }
  return (
    <>
      {fmt(g.value)}
      <GateBadge g={g} />
    </>
  );
}

export function Ring({ value, size = 44, stroke = 4, color = "var(--cyan)", label }: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label ?? `${value}% ready`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${(c * value) / 100} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray 500ms cubic-bezier(.2,.8,.2,1)" }}
      />
      <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" className="ring-text" style={{ fontSize: size * 0.27 }}>
        {value}
      </text>
    </svg>
  );
}

type IconName =
  | "road" | "back" | "note" | "passport" | "bank" | "atlas" | "desk" | "play" | "pause" | "check" | "lock"
  | "spark" | "people" | "shield" | "reset" | "chev" | "plus" | "phone" | "heart" | "flag"
  | "gauge" | "route" | "pin" | "calendar" | "home";

const PATHS: Record<IconName, ReactNode> = {
  road: <path d="M7 19 C3 14,15 10,10 6 S9 2,12 1" />,
  back: <path d="M12 4 6 10l6 6" />,
  note: <path d="M3 4h14v10H8l-5 4z" />,
  passport: (
    <>
      <rect x="4" y="2" width="12" height="16" rx="2" />
      <circle cx="10" cy="9" r="3" />
      <path d="M7 15h6" />
    </>
  ),
  bank: (
    <>
      <rect x="2" y="5" width="16" height="11" rx="2" />
      <path d="M2 9h16" />
    </>
  ),
  atlas: (
    <>
      <circle cx="10" cy="10" r="8" />
      <path d="M2 10h16M10 2c3 3 3 13 0 16M10 2c-3 3-3 13 0 16" />
    </>
  ),
  desk: (
    <>
      <rect x="2" y="3" width="16" height="11" rx="1.5" />
      <path d="M7 18h6M10 14v4" />
    </>
  ),
  play: <path d="M6 4l10 6-10 6z" />,
  pause: <path d="M6 4v12M14 4v12" />,
  check: <path d="M4 10.5 8 14l8-9" />,
  lock: (
    <>
      <rect x="4" y="9" width="12" height="9" rx="2" />
      <path d="M7 9V6a3 3 0 0 1 6 0v3" />
    </>
  ),
  spark: <path d="M10 2v4M10 14v4M2 10h4M14 10h4M4.5 4.5l2.5 2.5M13 13l2.5 2.5M4.5 15.5 7 13M13 7l2.5-2.5" />,
  people: (
    <>
      <circle cx="7" cy="7" r="3" />
      <circle cx="14" cy="8" r="2.4" />
      <path d="M2 17c0-3 2.5-5 5-5s5 2 5 5M12 17c0-2 1.2-4 3-4s3 2 3 4" />
    </>
  ),
  shield: <path d="M10 2 3 5v5c0 4 3 7 7 8 4-1 7-4 7-8V5z" />,
  home: <path d="M3 9.5 10 3l7 6.5M5 8v9h4v-5h2v5h4V8" />,
  reset: <path d="M4 10a6 6 0 1 0 2-4.5M4 3v3h3" />,
  chev: <path d="M8 4l6 6-6 6" />,
  plus: <path d="M10 4v12M4 10h12" />,
  phone: (
    <>
      <rect x="5" y="2" width="10" height="16" rx="2" />
      <path d="M9 15h2" />
    </>
  ),
  heart: <path d="M10 17s-7-4.3-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 17 8c0 4.7-7 9-7 9z" />,
  flag: <path d="M5 18V3M5 3h10l-2 4 2 4H5" />,
  gauge: (
    <>
      <path d="M3 14a7 7 0 0 1 14 0" />
      <path d="M10 14l3.5-4.5" />
      <circle cx="10" cy="14" r="1.2" />
    </>
  ),
  route: (
    <>
      <circle cx="5" cy="15" r="2" />
      <circle cx="15" cy="5" r="2" />
      <path d="M7 15h5a3 3 0 0 0 0-6H8a3 3 0 0 1 0-6h5" />
    </>
  ),
  pin: (
    <>
      <path d="M10 18s-5.5-5.3-5.5-9.5a5.5 5.5 0 0 1 11 0C15.5 12.7 10 18 10 18z" />
      <circle cx="10" cy="8.5" r="2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="14" height="13" rx="2" />
      <path d="M3 8h14M7 2v4M13 2v4" />
    </>
  ),
};

export function Icon({ name, size = 20, label }: { name: IconName; size?: number; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      {PATHS[name]}
    </svg>
  );
}
