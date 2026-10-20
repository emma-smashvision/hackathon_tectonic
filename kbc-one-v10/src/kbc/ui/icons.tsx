import type { IconId } from "../types";

const PATHS: Record<
  | IconId
  | "send"
  | "qr"
  | "scan"
  | "x"
  | "plus"
  | "lock"
  | "up"
  | "down"
  | "info"
  | "mic"
  | "back"
  | "edit"
  | "check"
  | "undo"
  | "eye"
  | "stop"
  | "play"
  | "road",
  string
> = {
  road: "M8 21c-3.5-5 7.5-8 3-12.5S10 3 12.5 2M16 21c0-3-1-5-3-7",
  stop: "M7 7h10v10H7z",
  play: "M8 5l11 7-11 7z",
  bars: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  clock: "M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  list: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01",
  activity: "M3 12h4l3-8 4 16 3-8h4",
  repeat:
    "M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3",
  alert: "M12 3 2 20h20zM12 10v4M12 17h.01",
  card: "M2 5h20v14H2zM2 10h20",
  target:
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01",
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z",
  box: "M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8",
  home: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z",
  plane: "M2 16l20-6-3-3-6 2-6-5-2 1 4 6-5 2-2-1-1 1z",
  swap: "M7 7h12l-3-3M17 17H5l3 3",
  in: "M12 3v12M7 10l5 5 5-5M4 21h16",
  receipt: "M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6",
  chart: "M3 17l6-6 4 4 8-8M15 7h6v6",
  shield: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z",
  calendar: "M3 5h18v16H3zM3 10h18M8 3v4M16 3v4",
  phone:
    "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2",
  kate: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z",
  wifi: "M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  split:
    "M4 3v8a3 3 0 0 0 3 3v7M7 3v6M10 3v8a3 3 0 0 1-3 3M17 21V3c-2 1-3 4-3 8h3",
  send: "M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z",
  qr: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 20h1M14 20h1",
  scan: "M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10",
  x: "M6 6l12 12M18 6 6 18",
  plus: "M12 5v14M5 12h14",
  lock: "M5 11h14v10H5zM8 11V8a4 4 0 0 1 8 0v3",
  up: "M12 19V5M5 12l7-7 7 7",
  down: "M12 5v14M5 12l7 7 7-7",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01",
  mic: "M9 3h6v11H9zM5 11a7 7 0 0 0 14 0M12 18v3",
  back: "m15 6-6 6 6 6",
  edit: "M4 20h4L19 9l-4-4L4 16z",
  check: "M5 12l5 5L20 7",
  undo: "M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
};

export type AnyIcon = keyof typeof PATHS;

export function Icon({
  name,
  size = 20,
  label,
}: {
  name: AnyIcon;
  size?: number;
  label?: string;
}) {
  // Kate is shown with her own logo, not a line icon.
  if (name === "kate") return <img src="/kate-logo.png" width={size} height={size} alt={label ?? ""} aria-hidden={label ? undefined : true} style={{ borderRadius: "50%", flex: "none" }} />;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
