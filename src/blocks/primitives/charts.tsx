import type { CSSProperties, ReactNode } from "react";

export function clampRatio(value: number) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

/** Progress values are ratios from 0 to 1. */
export function ProgressBar({
  value,
  label,
  color = "var(--block-accent)",
}: {
  value: number;
  label: string;
  color?: string;
}) {
  const percent = Math.round(clampRatio(value) * 100);
  return (
    <div
      className="bp-progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <span style={{ width: `${percent}%`, background: color }} />
    </div>
  );
}

export function ProgressRing({
  value,
  label,
  children,
  color = "var(--block-accent)",
}: {
  value: number;
  label: string;
  children?: ReactNode;
  color?: string;
}) {
  const ratio = clampRatio(value);
  return (
    <div
      className="bp-ring"
      role="img"
      aria-label={`${label}: ${Math.round(ratio * 100)}%`}
    >
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="bp-ring__track" cx="50" cy="50" r="42" />
        <circle
          cx="50"
          cy="50"
          r="42"
          stroke={color}
          strokeDasharray={`${ratio * 263.894} 263.894`}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <span className="bp-ring__label">
        {children ?? `${Math.round(ratio * 100)}%`}
      </span>
    </div>
  );
}

export function sparklinePoints(values: number[]): string {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return "";
  const min = Math.min(...finite),
    max = Math.max(...finite);
  return finite
    .map(
      (value, index) =>
        `${finite.length === 1 ? 120 : (index / (finite.length - 1)) * 232 + 4},${max === min ? 36 : 64 - ((value - min) / (max - min)) * 56}`,
    )
    .join(" ");
}

export function Sparkline({
  values,
  label,
  color = "var(--block-accent)",
  fill = true,
}: {
  values: number[];
  label: string;
  color?: string;
  fill?: boolean;
}) {
  const points = sparklinePoints(values);
  return (
    <svg
      className="bp-sparkline"
      viewBox="0 0 240 72"
      role="img"
      aria-label={label}
      style={{ color }}
    >
      <title>{label}</title>
      {fill && points && (
        <polygon
          points={`4,72 ${points} 236,72`}
          fill="currentColor"
          opacity="0.09"
        />
      )}
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}
export function Donut({
  segments,
  label,
  children,
}: {
  segments: DonutSegment[];
  label: string;
  children?: ReactNode;
}) {
  const total = segments.reduce(
    (sum, segment) =>
      sum + Math.max(0, Number.isFinite(segment.value) ? segment.value : 0),
    0,
  );
  let offset = 0;
  return (
    <div
      className="bp-ring bp-donut"
      role="img"
      aria-label={`${label}. ${segments.map((s) => `${s.label}: ${s.value}`).join(", ")}`}
    >
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="bp-ring__track" cx="50" cy="50" r="42" />
        {segments.map((segment) => {
          const length = total
            ? (Math.max(0, Number.isFinite(segment.value) ? segment.value : 0) /
                total) *
              263.894
            : 0;
          const start = offset;
          offset += length;
          return (
            <circle
              key={segment.label}
              cx="50"
              cy="50"
              r="42"
              stroke={segment.color}
              strokeDasharray={`${Math.max(0, length - 3)} ${263.894 - Math.max(0, length - 3)}`}
              strokeDashoffset={-start}
              transform="rotate(-90 50 50)"
            />
          );
        })}
      </svg>
      <span className="bp-ring__label">{children}</span>
    </div>
  );
}

export interface MapPin {
  id: string;
  x: number;
  y: number;
  label: string;
  selected?: boolean;
}
/** Pin coordinates use a 0–100 percentage grid; schematic, not live navigation. */
export function MiniMap({
  pins,
  label = "Nearby places",
}: {
  pins: MapPin[];
  label?: string;
}) {
  return (
    <div className="bp-map">
      <svg
        viewBox="0 0 300 160"
        role="img"
        aria-label={`${label}. ${pins.map((pin) => pin.label).join(", ")}`}
      >
        <title>{label}</title>
        <rect width="300" height="160" rx="18" fill="#111f2c" />
        <path
          d="M-10 100Q80 20 145 88T320 45"
          fill="none"
          stroke="#16415a"
          strokeWidth="23"
        />
        <path
          d="M40-10L100 175M160-10L220 175M-10 42L310 124M-10 140L310 20"
          fill="none"
          stroke="#8294a2"
          strokeOpacity=".25"
          strokeWidth="9"
        />
        <path
          d="M40-10L100 175M160-10L220 175M-10 42L310 124M-10 140L310 20"
          fill="none"
          stroke="#bccbd5"
          strokeOpacity=".2"
          strokeWidth="1"
        />
        {pins.map((pin) => (
          <g
            key={pin.id}
            transform={`translate(${clampRatio(pin.x / 100) * 272 + 14} ${clampRatio(pin.y / 100) * 132 + 14})`}
            style={
              {
                "--pin-color": pin.selected ? "#7fd6f7" : "#f2f7fc",
              } as CSSProperties
            }
          >
            <circle
              r={pin.selected ? 13 : 10}
              fill="var(--pin-color)"
              stroke="#102231"
              strokeWidth="3"
            />
            <circle r="3" fill="#003665" />
          </g>
        ))}
      </svg>
      <span className="bp-map__caption">Illustrative map</span>
    </div>
  );
}
