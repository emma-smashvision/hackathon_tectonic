import { useId } from "react";

export function Sparkline({ expanded = false }: { expanded?: boolean }) {
  const id = useId();
  return (
    <svg
      className={`wealth-sparkline${expanded ? " wealth-sparkline-expanded" : ""}`}
      viewBox="0 0 280 72"
      role="img"
      aria-label="Illustrative portfolio trend: fluctuating and ending higher over the last month"
      preserveAspectRatio="none"
    >
      <title>Portfolio over the last month</title>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00aeef" stopOpacity="0.26" />
          <stop offset="100%" stopColor="#00aeef" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 57L14 50L27 53L41 41L55 47L68 38L82 43L96 30L109 35L123 25L137 33L151 28L165 37L178 23L192 29L206 17L220 22L233 14L247 18L261 9L280 6V72H0Z"
        fill={`url(#${id})`}
      />
      <path
        d="M0 57L14 50L27 53L41 41L55 47L68 38L82 43L96 30L109 35L123 25L137 33L151 28L165 37L178 23L192 29L206 17L220 22L233 14L247 18L261 9L280 6"
        fill="none"
        stroke="#63d3ff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Ring({
  value,
  label,
  allocation = false,
}: {
  value: number;
  label: string;
  allocation?: boolean;
}) {
  return (
    <div className="wealth-ring">
      <svg viewBox="0 0 100 100" role="img" aria-label={label}>
        <title>{label}</title>
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="#ffffff12"
          strokeWidth="9"
        />
        {allocation ? (
          <g transform="rotate(-90 50 50)">
            <circle
              cx="50"
              cy="50"
              r="40"
              pathLength="100"
              fill="none"
              stroke="#58cefa"
              strokeWidth="9"
              strokeDasharray="59 41"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              pathLength="100"
              fill="none"
              stroke="#a6b9f5"
              strokeWidth="9"
              strokeDasharray="24 76"
              strokeDashoffset="-61"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              pathLength="100"
              fill="none"
              stroke="#7dd9b3"
              strokeWidth="9"
              strokeDasharray="12 88"
              strokeDashoffset="-87"
            />
          </g>
        ) : (
          <circle
            cx="50"
            cy="50"
            r="40"
            pathLength="100"
            fill="none"
            stroke="#63d3ff"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${value} ${100 - value}`}
            transform="rotate(-90 50 50)"
          />
        )}
      </svg>
      <span aria-hidden="true">{allocation ? "Mix" : `${value}%`}</span>
    </div>
  );
}
