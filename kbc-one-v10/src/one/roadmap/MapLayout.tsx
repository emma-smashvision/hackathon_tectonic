import type { MapCrossing, MapStop, MapTrack, RoadMap } from "./types";
import { whenIndex } from "../../hindsight/engine/plan";
import { majorStops, monthBundles } from "./model";

export type MapPoint = { x: number; y: number };
export type MapNode = MapPoint & {
  key: string;
  track: MapTrack;
  stop?: MapStop;
  crossing?: MapCrossing;
  bills?: MapStop[];
  kind: "stop" | "crossing" | "origin" | "today" | "bills";
  branch?: boolean;
  starts?: string;
  stub?: boolean;
};
export type MapEdge = {
  key: string;
  from: MapPoint;
  to: MapPoint;
  track: MapTrack;
  ready: number;
  possible: boolean;
};
export const curve = (a: MapPoint, b: MapPoint) =>
  `M ${a.x} ${a.y} C ${a.x} ${(a.y + b.y) / 2}, ${b.x} ${(a.y + b.y) / 2}, ${b.x} ${b.y}`;
export type MapOptions = {
  expandedTracks?: string[];
};

/** Presentation only: preserve each source stop in a node, a bill group or its track sheet. */
export function layoutMap(
  map: RoadMap,
  { expandedTracks = [] }: MapOptions = {},
) {
  const root = map.tracks.find((t) => !t.parentId) ?? map.tracks[0];
  if (!root)
    return {
      nodes: [] as MapNode[],
      edges: [] as MapEdge[],
      months: [] as { y: number; label: string }[],
      height: 300,
    };
  const branchIds = new Set(
    map.tracks.flatMap((t) =>
      t.crossings.flatMap((c) => c.branches.map((b) => b.trackId)),
    ),
  );
  const collapsed = new Set(
    map.tracks
      .filter(
        (t) =>
          (t.status === "upcoming" || branchIds.has(t.id)) &&
          !expandedTracks.includes(t.id),
      )
      .map((t) => t.id),
  );
  // Descendants of an unopened future journey live in its sheet, not as distant parallel paths.
  const hidden = new Set<string>();
  for (const track of map.tracks)
    if (
      track.parentId &&
      (hidden.has(track.parentId) || collapsed.has(track.parentId))
    ) {
      const parent = map.tracks.find((t) => t.id === track.parentId)!;
      if (parent.parentId) hidden.add(track.id);
    }
  type Entry = Omit<MapNode, "x" | "y"> & { date: number; order: number };
  const entries: Entry[] = [];
  const todayDate = whenIndex(map.today);
  const anchors = new Set(
    map.tracks
      .filter((t) => t.parentId)
      .map((t) => `${t.parentId}/${t.fromStopId}`),
  );
  for (const track of map.tracks) {
    if (hidden.has(track.id)) continue;
    const crossings = new Map(track.crossings.map((c) => [c.id, c]));
    if (track.parentId) {
      const parent = map.tracks.find((t) => t.id === track.parentId);
      const anchor = parent?.stops.find((s) => s.id === track.fromStopId);
      const crossing = parent?.crossings.find((c) => c.id === track.fromStopId);
      const start = anchor?.when ?? crossing?.when ?? map.today;
      const first = track.stops.find((s) => s.inDays >= 0);
      // A journey already in progress joins this view at its next dated checkpoint.
      const date =
        whenIndex(start) < todayDate
          ? whenIndex(first?.when ?? map.today)
          : whenIndex(start);
      entries.push({
        key: `origin:${track.id}`,
        track,
        kind: "origin",
        date,
        order: 1,
        starts:
          track.status === "upcoming"
            ? `Starts in ${new Date(Date.UTC(start.year, start.month, 1)).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })}`
            : undefined,
        stub: collapsed.has(track.id),
      });
    }
    const visibleTrack = {
      ...track,
      stops: track.stops.filter((stop) => {
        const key = `${track.id}/${stop.id}`;
        const isNext =
          map.nextUp?.trackId === track.id && map.nextUp.stopId === stop.id;
        // The origin flag replaces a duplicate 'journey starts' checkpoint.
        return (
          stop.inDays >= 0 &&
          !(anchors.has(key) && !crossings.has(stop.id)) &&
          (!collapsed.has(track.id) || isNext)
        );
      }),
    };
    for (const stop of majorStops(visibleTrack)) {
      entries.push({
        key: `${track.id}/${stop.id}`,
        track,
        stop,
        crossing: crossings.get(stop.id),
        kind: crossings.has(stop.id) ? "crossing" : "stop",
        date: whenIndex(stop.when),
        order: 2,
      });
    }
    for (const bundle of monthBundles(visibleTrack))
      entries.push({
        key: bundle.id,
        track,
        bills: bundle.stops,
        kind: "bills",
        date: whenIndex(bundle.stops[0].when),
        order: 2,
      });
    if (!collapsed.has(track.id))
      for (const crossing of track.crossings.filter(
        (c) => c.inDays >= 0 && !track.stops.some((s) => s.id === c.id),
      ))
        entries.push({
          key: `${track.id}/${crossing.id}`,
          track,
          crossing,
          kind: "crossing",
          date: whenIndex(crossing.when),
          order: 2,
        });
  }
  // Branch flags follow the crossing, while journey flags precede their first step.
  entries.forEach((entry) => {
    if (entry.kind === "origin" && branchIds.has(entry.track.id))
      entry.order = 3;
  });
  entries.sort(
    (a, b) =>
      a.date - b.date || a.order - b.order || a.key.localeCompare(b.key),
  );
  let cursor = 65;
  const nodes: MapNode[] = [
    { key: "today", track: root, x: 168, y: cursor, kind: "today" },
  ];
  const monthRows: { y: number; label: string }[] = [];
  let previousMonth = `${map.today.year}-${map.today.month}`;
  let stopIndex = 0;
  entries.forEach((entry, index) => {
    const date = new Date(entry.date * 86400000);
    const monthKey = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
    if (monthKey !== previousMonth) {
      cursor += 24;
      monthRows.push({
        y: cursor + 34,
        label: date.toLocaleDateString("en-GB", {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }),
      });
      previousMonth = monthKey;
    }
    const previous = entries[index - 1];
    const shared =
      entry.kind === "origin" &&
      branchIds.has(entry.track.id) &&
      previous?.kind === "origin" &&
      previous.track.parentId === entry.track.parentId &&
      previous.track.fromStopId === entry.track.fromStopId;
    if (!shared)
      cursor +=
        entry.kind === "origin"
          ? branchIds.has(entry.track.id)
            ? 114
            : 58
          : entry.kind === "bills"
            ? previous?.stop?.state === "next"
              ? 100
              : 60
            : 92;
    let x = stopIndex++ % 2 ? 252 : 84;
    if (entry.kind === "origin" && !branchIds.has(entry.track.id)) x = 252;
    if (branchIds.has(entry.track.id)) {
      const crossing = map.tracks
        .flatMap((t) => t.crossings)
        .find((c) => c.branches.some((b) => b.trackId === entry.track.id));
      x =
        (crossing?.branches.findIndex((b) => b.trackId === entry.track.id) ??
          0) % 2
          ? 252
          : 84;
    }
    nodes.push({
      ...entry,
      branch: branchIds.has(entry.track.id),
      x,
      y: cursor,
    });
  });
  const height = cursor + 88;
  nodes.forEach((n) => (n.y = height - n.y));
  const months = monthRows.map((m) => ({ ...m, y: height - m.y }));
  const edges: MapEdge[] = [];
  for (const track of map.tracks) {
    const own = nodes.filter(
      (n) => n.track.id === track.id && n.kind !== "today",
    );
    if (!own.length) continue;
    const first = own[0];
    const exact =
      track.parentId &&
      nodes.find(
        (n) =>
          n.track.id === track.parentId &&
          (n.stop?.id === track.fromStopId ||
            n.crossing?.id === track.fromStopId),
      );
    // Only the visible branch connection is drawn; never a faint full-height duplicate line.
    const nearby = nodes
      .filter((n) => n.track.id === track.parentId && n.y > first.y)
      .sort((a, b) => a.y - b.y)[0];
    let from: MapPoint = exact || nearby || nodes[0];
    // The flag sits off the main path, so a short stub cannot disappear over it.
    if (first.kind === "origin" && !first.branch)
      first.x = from.x < 168 ? 252 : 84;
    for (const node of own) {
      edges.push({
        key: `edge:${node.key}`,
        from,
        to: node,
        track,
        ready:
          node.kind === "origin"
            ? track.status === "active"
              ? 100
              : 0
            : (node.stop?.ready ?? 0),
        possible:
          track.status === "possible" ||
          (collapsed.has(track.id) && track.status === "upcoming"),
      });
      from = node;
    }
  }
  return { nodes, edges, months, height };
}
