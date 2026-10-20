import type { CSSProperties } from "react";

const paths: Record<string, string> = {
  home: "M3 11 12 3l9 8M5 10v11h5v-7h4v7h5V10",
  car: "m5 7 2-4h10l2 4 2 3v8H3v-8l2-3Zm-2 4h18M6 14h2m8 0h2M5 18v3m14-3v3",
  family: "M9 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7 2a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM3 21v-6a6 6 0 0 1 12 0v6m1-9a5 5 0 0 1 5 5v4",
  kids: "M4 21V9l8-6 8 6v12H4Zm5 0v-7h6v7M9 9h6",
  savings: "M4 11h16v10H4V11Zm-1-4h18v4H3V7Zm9 0v14M12 7C3 7 5 0 9 3l3 4Zm0 0c9 0 7-7 3-4l-3 4Z",
  investments: "M3 3v18h18M6 16l5-5 4 2 6-8m-5 0h5v5",
  pension: "M12 3v18M7 21h10M4 10a8 8 0 0 1 16 0c-3-2-5-2-8 0-3-2-5-2-8 0Z",
  work: "M3 7h18v14H3V7Zm5 0V3h8v4M3 12h18m-11 0v3h4v-3",
  abroad: "M21 3 3 10l7 3 3 8 8-18ZM10 13l11-10",
  "private-banking": "M3 9 12 3l9 6H3Zm2 3v6m7-6v6m7-6v6M3 21h18",
  care: "M12 21V10m0 7C2 17 2 8 4 5c7 0 8 5 8 8m0-1c0-7 5-9 9-9 1 7-2 10-9 10",
  storm: "M5 15a5 5 0 1 1 1-10 7 7 0 0 1 13 2 4 4 0 0 1 0 8M12 12l-3 6h5l-3 5",
  shield: "M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6l-9-4Zm-5 9 3 3 7-7",
  lantern: "M8 5V3h8v2M6 7h12l2 12H4L6 7Zm2 0v12m8-12v12M3 22h18M12 10v6",
  ahead: "M3 15a9 9 0 1 1 6 6M3 21v-6h6m3-8v6l4 2",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  back: "M20 12H4m6-6-6 6 6 6",
  close: "m6 6 12 12M6 18 18 6",
  check: "m4 12 5 5L20 6",
  key: "M14 3a7 7 0 1 1-4 13L3 23H0v-3l7-7a7 7 0 0 1 7-10Zm3 4h.01",
  lock: "M7 10V7a5 5 0 0 1 10 0v3M5 10h14v12H5V10Zm7 4v4",
  book: "M3 3h6l3 3 3-3h6v17h-6l-3 2-3-2H3V3Zm9 3v16",
  world: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z",
  signpost: "M12 3v19M3 5h15l3 4-3 4H3V5Zm0 11h15",
};

export function Icon({ name, size = 20, style }: { name: string; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d={paths[name] ?? paths.world} /></svg>;
}
