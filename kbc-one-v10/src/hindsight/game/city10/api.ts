"use client";
import { createContext, useContext } from "react";
import type React from "react";
export type Vec2 = { x: number; z: number };
export type Zone = { id: string; at: Vec2; radius: number };
export type DistrictInfo = { id: string; name: string; roadIds: string[]; centre: Vec2 };
export type MissionMapMarker = { id: string; at: Vec2; label: string; color?: string; roadId?: string; testDrive?: boolean; passed?: boolean };
export type SpawnMarker = { id: string; at: Vec2; label?: string; color?: string; radius?: number };
/** Speed is signed world units/second. RPM and slip are normalized 0..1. */
export type DrivingTelemetry = { speed: number; rpm: number; slip: number; boosting: boolean; throttle: number; braking: boolean };
export interface CityApi {
  car(): { pos: Vec2; heading: number; speed: number };
  districts(): DistrictInfo[];
  roadPath(roadId: string): Vec2[];
  pointOn(roadId: string, t: number): { pos: Vec2; heading: number };
  home(): Vec2;
  setWaypoint(p: Vec2 | null): void;
  teleport(p: Vec2, heading?: number): void;
  setAutopilot(target: Vec2 | null): void;
  freeze(on: boolean): void;
  onEnter(zone: Zone, cb: () => void): () => void;
  /** Prepared-bump reward; bounded to 2.5 seconds, never a spending reward. */
  boost?(ms: number): void;
  /** Visual marker + map dot. onEnter remains the trigger API. Cleanup removes this instance. */
  spawnMarker?(marker: SpawnMarker): () => void;
  /** Current snapshot immediately, then 10 Hz. Call the returned unsubscribe on unmount. */
  onSpeed?(cb: (telemetry: DrivingTelemetry) => void): () => void;
  jolt?(strength?: number): void;
  setTimeScale?(scale: number): void;
  setMissionMarkers?(markers: MissionMapMarker[]): void;
  cinematic(shot: { target: Vec2; from?: Vec2; ms: number }): Promise<void>;
}
export const CityApiContext: React.Context<CityApi | null> = createContext<CityApi | null>(null);
export function useCityApi(): CityApi {
  const api = useContext(CityApiContext);
  if (!api) throw new Error("useCityApi must be inside CityGame");
  return api;
}
