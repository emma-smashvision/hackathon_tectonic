import type { MapStop } from "./types";

export type MapKind =
  "home" | "car" | "euro" | "calendar" | "crossing" | "pension";
export function kindFor(stop: MapStop): MapKind {
  if (/car|insurance renews/i.test(stop.title)) return "car";
  if (/pension/i.test(stop.title)) return "pension";
  if (/home|house|rent|mortgage|address|deposit/i.test(stop.title))
    return "home";
  if (/appointment|conversation|return is due|holiday|school/i.test(stop.title))
    return "calendar";
  return "euro";
}

export function MapGlyph({ kind }: { kind: MapKind }) {
  const paths: Record<MapKind, React.ReactNode> = {
    home: (
      <>
        <path d="m4 12 12-9 12 9v15H4Z" />
        <path d="M12 27V17h8v10M3 12l13-10 13 10" />
      </>
    ),
    car: (
      <>
        <path d="m5 12 3-7h16l3 7M4 12h24v12H4Z" />
        <path d="M7 24v3m18-3v3M8 17h3m10 0h3" />
      </>
    ),
    euro: (
      <>
        <path d="M24 7c-10-7-18 0-18 9s8 16 18 9M3 13h17M3 19h14" />
      </>
    ),
    calendar: (
      <>
        <rect x="4" y="6" width="24" height="23" rx="4" />
        <path d="M10 3v6m12-6v6M4 13h24m-17 8 4 4 7-8" />
      </>
    ),
    crossing: (
      <>
        <path d="M16 29V16M16 17C16 8 6 15 6 4m10 13c0-9 10-2 10-13M2 8l4-4 4 4m12 0 4-4 4 4" />
      </>
    ),
    pension: (
      <>
        <path d="m16 3 10 12h-5l7 9H4l7-9H6Zm0 21v6M11 30h10" />
      </>
    ),
  };
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[kind]}
    </svg>
  );
}
