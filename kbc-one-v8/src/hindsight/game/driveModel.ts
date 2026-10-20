import { pointersFor, roadViewFor, type PersonInput, type RoadViewOptions } from "../../one/crowd";

export type DriveView = NonNullable<ReturnType<typeof roadViewFor>>;
export type DriveStop = { stopId: string; title: string; month: number; kind: string; passed: boolean };
export const MONTH_DISTANCE = 10;

export function driveViewFor(person: PersonInput, roadId: string, options?: RoadViewOptions) {
  const view = roadViewFor(person, roadId, { ...options, largeSimple: !!options?.largeSimple || pointersFor(person).largeSimple });
  return view?.canDrive ? view : null;
}
export function driveStops(view: DriveView): DriveStop[] {
  const stops: DriveStop[] = view.stops.map(s => ({ ...s,
    // Everyday wraps into the next calendar year, still moving forward in time.
    month: view.roadId === "everyday-only" ? (view.position.month ?? 1) + s.offset : s.month,
  }));
  if (view.fork) stops.push({ stopId: view.fork.stopId, title: view.fork.title, month: view.fork.month, kind: "fork", passed: view.fork.month < (view.position.month ?? 0) });
  return stops.sort((a, b) => a.month - b.month);
}
export function nextDriveStop(stops: DriveStop[], month: number, selected?: string) {
  return stops.find(s => s.month >= month - .01 && s.stopId !== selected);
}
/** Only publish visual density when both aggregate gates pass. Never create individual customers. */
export function publishedGhosts(view: DriveView) {
  return view.ghostGroups.filter(g => g.count.shown && g.count.value !== null && g.density.shown && g.density.value !== null);
}
