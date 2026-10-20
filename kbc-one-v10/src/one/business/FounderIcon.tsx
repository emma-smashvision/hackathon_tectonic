import type { IconName } from "./founder";

type Extra = "check" | "book" | "fork" | "flag" | "play" | "arrow" | "info" | "laptop" | "store" | "spark2" | "chevron" | "back";

const PATHS: Record<IconName | Extra, string> = {
  spark: "M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.4 1 2.5h6c0-1.1.4-1.9 1-2.5A6 6 0 0 0 12 3z",
  card: "M3 6h18v12H3zM3 10h18M7 15h4",
  badge: "M3 12V4h8l9 9-8 8zM7.5 7.5h.01",
  shield: "M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6zM9 12l2 2 4-4",
  doc: "M6 3h12v18H6zM9 8h6M9 12h6M9 16h4",
  percent: "M19 5L5 19M7 9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM17 19.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  health: "M3 12h4l2-4 4 8 2-4h6",
  umbrella: "M3 12a9 9 0 0 1 18 0zM12 12v6a2 2 0 0 0 4 0",
  euro: "M17 6.5A7 7 0 1 0 17 17.5M4 10h9M4 14h9",
  calendar: "M3 5h18v16H3zM3 10h18M8 3v4M16 3v4",
  refresh: "M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4",
  key: "M8 19a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM11 12l9-9M17 6l3 3",
  piggy: "M5 11a7 6 0 0 1 13-2h2v4h-2a7 6 0 0 1-3 3v3h-3v-2H9v2H6v-3.5A6 6 0 0 1 5 11zM15 10h.01",
  gift: "M3 8h18v4H3zM5 12v9h14v-9M12 8v13M12 8c-2-4-6-3-5 0M12 8c2-4 6-3 5 0",
  scale: "M12 3v18M5 7h14M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0zM8 21h8",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  bank: "M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18",
  pen: "M4 20l4-1 11-11-3-3L5 16zM14 6l3 3",
  people: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M16 11a3 3 0 1 0 0-6M21 20a6 6 0 0 0-4-5.6",
  box: "M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10",
  home: "M3 11l9-8 9 8M5 9v12h14V9M10 21v-6h4v6",
  door: "M5 21V3h10v18M15 4l4 2v15M11 12h1M3 21h18",
  check: "M5 12l5 5 9-10",
  book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7",
  fork: "M6 3v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3M12 14v7",
  flag: "M6 21V4h11l-2 4 2 4H6",
  play: "M8 5v14l11-7z",
  arrow: "M5 12h14M13 6l6 6-6 6",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01",
  laptop: "M5 5h14v10H5zM2 19h20",
  store: "M4 10v10h16V10M3 4h18l-1 6H4zM9 20v-5h6v5",
  spark2: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z",
  chevron: "M9 6l6 6-6 6",
  back: "M15 6l-6 6 6 6",
};

export function FIcon({ name, size = 22, className }: { name: IconName | Extra; size?: number; className?: string }) {
  const filled = name === "play" || name === "spark2";
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill={filled ? "currentColor" : "none"} stroke={filled ? "none" : "currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={PATHS[name]} />
  </svg>;
}
