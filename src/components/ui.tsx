import type { ButtonHTMLAttributes, ReactNode, SVGProps } from "react";

type ButtonTone = "primary" | "secondary" | "ghost";

const BUTTON_TONES: Record<ButtonTone, string> = {
  primary: "bg-navy text-white hover:bg-navy-600",
  secondary:
    "bg-white text-navy ring-1 ring-inset ring-navy/25 hover:bg-navy-50",
  ghost: "text-azure-ink hover:bg-azure-50",
};

export function Button({
  tone = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ButtonTone }) {
  return (
    <button
      type={type}
      className={`tap t-body inline-flex items-center justify-center gap-2 rounded-xl px-4 font-semibold transition-colors disabled:opacity-50 ${BUTTON_TONES[tone]} ${className}`}
      {...props}
    />
  );
}

export function Progress({
  value,
  label,
  tone = "navy",
}: {
  value: number;
  label: string;
  tone?: "navy" | "azure" | "ok" | "warn" | "bad";
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const colors = {
    navy: "bg-navy",
    azure: "bg-azure",
    ok: "bg-ok",
    warn: "bg-warn",
    bad: "bg-bad",
  };
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className="h-2 w-full overflow-hidden rounded-full bg-navy/10"
    >
      <div
        className={`h-full rounded-full ${colors[tone]} transition-[width] duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function ProposedBadge() {
  return (
    <span className="t-small inline-flex items-center rounded-full border border-dashed border-azure-ink/60 px-2 py-0.5 font-medium text-azure-ink">
      Proposed service
    </span>
  );
}

export function Chip({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

type IconName =
  | "info"
  | "pin"
  | "eye-off"
  | "close"
  | "check"
  | "arrow-up-right"
  | "phone"
  | "shield"
  | "plane"
  | "home"
  | "box"
  | "chart"
  | "receipt"
  | "wallet"
  | "calendar"
  | "list"
  | "send"
  | "qr"
  | "sparkle";

const PATHS: Record<IconName, ReactNode> = {
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  pin: <path d="M9 4h6l-1 6 3 3H7l3-3-1-6zM12 13v7" />,
  "eye-off": (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A9.8 9.8 0 0 1 12 5c5 0 9 5 9 7a8.6 8.6 0 0 1-2.4 3.4M6.3 6.3C4.3 7.7 3 10.3 3 12c0 2 4 7 9 7a9.3 9.3 0 0 0 4.4-1.1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  "arrow-up-right": <path d="M7 17L17 7M8 7h9v9" />,
  phone: (
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z" />
  ),
  shield: (
    <>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
      <path d="M8.5 12l2.5 2.5 4.5-5" />
    </>
  ),
  plane: (
    <path d="M10.5 13.5L3 11l1.5-1.5 8 1 4-4.5a2 2 0 0 1 3 3l-4.5 4 1 8L14.5 22 12 14.5l-3 3V20l-1.5 1-1-3.5L3 16.5 4 15h2.5l3-3" />
  ),
  home: (
    <>
      <path d="M4 11l8-7 8 7" />
      <path d="M6 10v10h12V10M10 20v-5h4v5" />
    </>
  ),
  box: (
    <>
      <path d="M3 7l9-4 9 4v10l-9 4-9-4V7z" />
      <path d="M3 7l9 4 9-4M12 11v10" />
    </>
  ),
  chart: <path d="M4 19h16M6 15l4-4 3 3 5-6" />,
  receipt: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M16 12.5h2M3 9h18" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </>
  ),
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  send: <path d="M4 12l16-8-6 16-2.5-6.5L4 12z" />,
  qr: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2" />
    </>
  ),
  sparkle: (
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z" />
  ),
};

export function Icon({
  name,
  className = "size-5",
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}

export type { IconName };
