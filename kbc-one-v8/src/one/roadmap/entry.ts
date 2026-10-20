import type { MapStop, RoadMap } from "./types";

/** Resolve every city entry against the same map; missing destinations fall back to next up. */
export function cityEntryFor(map: RoadMap, request: { focusId?: string; roadId?: string } = {}): string | null {
  if (!map.allowCity) return null;
  const stops = map.tracks.flatMap((track) => track.stops);
  const focus = (stop: MapStop) => stop.cityFocus ?? stop.id;
  const requested = request.focusId && (stops.find((stop) => stop.id === request.focusId)
    ?? stops.find((stop) => stop.cityFocus === request.focusId));
  if (requested) return focus(requested);
  const next = stops.find((stop) => stop.id === map.nextUp?.stopId && stop.trackId === map.nextUp.trackId);
  const track = map.tracks.find((track) => track.id === (request.roadId ?? request.focusId));
  if (track) {
    if (next?.trackId === track.id) return focus(next);
    const ahead = track.stops.find((stop) => stop.inDays >= 0 && stop.state !== "locked" && stop.actions.length);
    return ahead ? focus(ahead) : track.id;
  }
  if (next) return focus(next);
  const ahead = map.tracks[0]?.stops.find((stop) => stop.inDays >= 0 && stop.actions.length);
  return ahead ? focus(ahead) : "everyday";
}
