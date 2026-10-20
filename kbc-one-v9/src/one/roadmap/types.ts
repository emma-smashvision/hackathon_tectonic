// v7.1 shared contract: one road map per person, drawn as a 2D tree (Your road)
// and as roads in the 3D city. WS5 implements `roadmapFor()` in ./model.ts;
// the map (WS3) and the city (WS4/WS6) only read this shape.

import type { TripPick, When } from "../../hindsight/engine/plan";

/** Why a track is on your map, in plain words ("You told us you're moving on 1 Nov"). */
export interface TrackOrigin {
  kind: "everyday" | "told-us" | "detected" | "calendar" | "test-drive";
  text: string;
}

export type StopState = "done" | "ready" | "next" | "later" | "locked";

export interface MapStop {
  id: string;
  trackId: string;
  title: string;
  /** One plain sentence: what happens and what people like you did. */
  detail: string;
  when: When;
  inDays: number;
  state: StopState;
  /** Major stops are individual checkpoints; minor stops can share a monthly bundle. */
  weight: "major" | "minor";
  /** Known source amount in EUR, as a positive magnitude. Omitted when unknown. */
  amount?: number;
  /** 0–100, from the person's plan items. */
  ready: number;
  /** One-tap steps; adding one = a real plan item (store.addPlanItem). */
  actions: { label: string; pick: TripPick }[];
  /** Product this stop is about, if any ("KBC car insurance, omnium"). */
  product?: string;
  /** City focus id (LandscapeCity `focus={{ kind: "journey", id }}`). */
  cityFocus?: string;
}

/** A fork: the track splits into branches; the person chooses (or test-drives) one. */
export interface MapCrossing {
  id: string;
  trackId: string;
  title: string;
  question: string;
  when: When;
  inDays: number;
  branches: { id: string; label: string; trackId: string; chosen: boolean }[];
}

export interface MapTrack {
  id: string;
  title: string;
  /** Root track = the Everyday road; others branch off it at `fromStopId`. */
  parentId?: string;
  fromStopId?: string;
  origin: TrackOrigin;
  /** "active": you're on it; "upcoming": it appears soon; "possible": a test drive. */
  status: "active" | "upcoming" | "possible";
  stops: MapStop[];
  crossings: MapCrossing[];
  /** Hindsight road id, for the city. */
  roadId?: string;
}

export interface RoadMap {
  personKey: string;
  today: When;
  tracks: MapTrack[];
  /** The single most useful stop to prepare now, if any (same one the nudge uses). */
  nextUp?: { trackId: string; stopId: string };
  /** Care roads and Large & simple get no game; the map still renders as a plain list. */
  allowCity: boolean;
}

export interface MonthBundle {
  id: string;
  /** Calendar month as YYYY-MM (includes the year; January = 01). */
  month: string;
  count: number;
  /** Sum of known amount magnitudes in EUR, rounded to cents; unknown amounts add nothing. */
  total: number;
  stops: MapStop[];
}
