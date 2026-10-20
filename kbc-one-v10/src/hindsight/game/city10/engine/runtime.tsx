"use client";
import { createContext, useContext, type MutableRefObject } from "react";
import type { CityApi, Zone, Vec2, MissionMapMarker, DrivingTelemetry, SpawnMarker } from "../api";
import type { Village } from "../../../../one/village/types";
import { buildCity, makePath, nearest, pointAt, type CityNet } from "./network";
import { generateCity } from "./cityGen";
import { homePoint, layoutBlock } from "./streets";
import { buildGraph, routeTo, approachRoad } from "./routing";
import { NO_INPUT, type Car, type Input } from "./driving";
import { createTraffic, type TrafficCar } from './traffic';
export interface CityRuntime {
  car: Car;
  traffic: TrafficCar[];
  spawnedMarkers: Map<string, SpawnMarker>;
  onRoad: boolean;
  reducedMotion: boolean;
  boostMs: number;
  telemetry: DrivingTelemetry;
  speedListeners: Set<(telemetry: DrivingTelemetry) => void>;
  overview: number;
  effects: { skidCount: number; smokeCount: number };
  frameStats: { frames: number; seconds: number; drawCalls: number; triangles: number; fov: number; cameraY: number };
  keys: Input;
  touch: Input;
  frozen: boolean;
  timeScale: number;
  jolt: number;
  missionMarkers: MissionMapMarker[];
  mapOpen: boolean;
  waypoint: Vec2 | null;
  route: Vec2[];
  autopilot: boolean;
  routeIndex: number;
  routeVersion: number;
  cameraCut: boolean;
  scraped: boolean;
  zones: Set<{ zone: Zone; cb: () => void; inside: boolean }>;
  shot: { target: Vec2; from?: Vec2; until: number } | null;
  cinematicFinish: (() => void) | null;
}
export function createEngine(village: Village) {
  const net = buildCity(undefined, { streets: true });
  const graph = buildGraph(net), home = homePoint(net), blocks = layoutBlock(net, village);
  const generated = generateCity(net, blocks.map(b => ({ x: b.x, z: b.z, r: 15 })));
  const colliders = [...generated.buildings.map(b => ({ x: b.x, z: b.z, w: b.w, d: b.d, rot: b.rot })), ...blocks.map(b => ({ x: b.x, z: b.z, w: b.width, d: b.depth, rot: 0 }))];
  const rt: MutableRefObject<CityRuntime> = { current: {
    traffic: createTraffic(net), spawnedMarkers: new Map(), onRoad: true, reducedMotion: false, boostMs: 0,
    telemetry: { speed: 0, rpm: .12, slip: 0, boosting: false, throttle: 0, braking: false }, speedListeners: new Set(), overview: 0,
    effects: { skidCount: 0, smokeCount: 0 }, frameStats: { frames: 0, seconds: 0, drawCalls: 0, triangles: 0, fov: 58, cameraY: 7 },
    car: { ...home, heading: -Math.PI / 2, speed: 0 }, keys: { ...NO_INPUT }, touch: { ...NO_INPUT },
    frozen: false, timeScale: 1, jolt: 0, missionMarkers: [], mapOpen: false, waypoint: null, route: [], autopilot: false, routeIndex: 0,
    routeVersion: 0, cameraCut: true, scraped: false, zones: new Set(), shot: null, cinematicFinish: null,
  } };
  const pathFor = (id: string) => {
    if (id === "everyday" || id === "everyday-only" || id === "ring") return net.ring;
    const av = net.avenues.find(a => a.road.id === id);
    if (!av) return net.paths.find(p => p.id === id) ?? net.ring;
    if (!av.branches) return av.trunk;
    const pts = [...av.trunk.pts, ...av.branches[0].pts.slice(1)];
    return makePath(id, id, "trunk", pts, pts.map(() => 0));
  };
  const waypoint = (p: Vec2 | null) => {
    const R = rt.current;
    R.waypoint = p ? nearest(net, p.x, p.z).point : null;
    const roadRoute = R.waypoint ? routeTo(net, graph, R.car, R.waypoint) : [];
    const approach = roadRoute.length ? approachRoad(R.car, roadRoute[0], colliders) : [];
    R.route = approach.length ? [...approach.slice(0, -1), ...roadRoute] : [];
    R.routeIndex = 0; R.routeVersion++;
    if (!p) R.autopilot = false;
  };
  const api: CityApi = {
    car: () => ({ pos: { x: rt.current.car.x, z: rt.current.car.z }, heading: rt.current.car.heading, speed: rt.current.car.speed }),
    districts: () => net.avenues.map(a => ({ id: a.road.id, name: a.road.name, roadIds: [a.road.id], centre: pointAt(pathFor(a.road.id), pathFor(a.road.id).length * .45).p })),
    roadPath: id => pathFor(id).pts.map(p => ({ ...p })),
    pointOn: (id, t) => { const p = pathFor(id), at = pointAt(p, Math.max(0, Math.min(1, t)) * p.length); return { pos: at.p, heading: Math.atan2(at.tan.x, at.tan.z) }; },
    home: () => ({ ...home }),
    setWaypoint: waypoint,
    teleport: (p, heading) => {
      const R = rt.current; R.car = { ...p, heading: heading ?? R.car.heading, speed: 0 }; R.cameraCut = true; R.boostMs = 0;
      R.autopilot = false; if (R.waypoint) waypoint(R.waypoint);
      for (const z of R.zones) z.inside = false;
    },
    setAutopilot: target => { if (target) waypoint(target); rt.current.autopilot = !!target && rt.current.route.length > 1; if (!target) rt.current.car.speed = 0; },
    freeze: on => { rt.current.frozen = on; if (on) { rt.current.car.speed = 0; rt.current.keys = { ...NO_INPUT }; rt.current.touch = { ...NO_INPUT }; } },
    onEnter: (zone, cb) => { const entry = { zone, cb, inside: false }; rt.current.zones.add(entry); return () => { rt.current.zones.delete(entry); }; },
    spawnMarker: marker => {
      if (!rt.current.spawnedMarkers.has(marker.id) && rt.current.spawnedMarkers.size >= 64) return () => {};
      const value = { ...marker, at: { ...marker.at }, radius: Math.max(.5, Math.min(10, marker.radius ?? 2)) };
      rt.current.spawnedMarkers.set(marker.id, value);
      return () => { if (rt.current.spawnedMarkers.get(marker.id) === value) rt.current.spawnedMarkers.delete(marker.id); };
    },
    boost: ms => {
      const duration = Number.isFinite(ms) ? Math.max(0, Math.min(2500, ms)) : 0;
      rt.current.boostMs = duration;
      if (duration && rt.current.car.speed > 1) rt.current.car.speed = Math.min(54, rt.current.car.speed + 6);
    },
    onSpeed: cb => { rt.current.speedListeners.add(cb); cb({ ...rt.current.telemetry }); return () => { rt.current.speedListeners.delete(cb); }; },
    jolt: (strength = .65) => { rt.current.jolt = Math.max(0, Math.min(1.5, strength)); },
    setTimeScale: scale => { rt.current.timeScale = Number.isFinite(scale) ? Math.max(.1, Math.min(2, scale)) : 1; },
    setMissionMarkers: markers => { rt.current.missionMarkers = markers.map(m => ({ ...m, at: { ...m.at } })); },
    cinematic: shot => new Promise<void>(resolve => {
      rt.current.cinematicFinish?.();
      const ms = Math.max(0, shot.ms);
      rt.current.shot = { ...shot, until: performance.now() + ms };
      rt.current.car.speed = 0;
      const timer = setTimeout(finish, ms);
      function finish() { clearTimeout(timer); rt.current.shot = null; rt.current.cinematicFinish = null; resolve(); }
      rt.current.cinematicFinish = finish;
    }),
  };
  return { net, graph, rt, api, village, blocks, generated, colliders };
}
export type CityEngine = ReturnType<typeof createEngine>;
export const CityEngineContext = createContext<CityEngine | null>(null);
export function useCityEngine(): CityEngine {
  const engine = useContext(CityEngineContext);
  if (!engine) throw new Error("useCityEngine must be inside CityGame");
  return engine;
}
export type { CityNet };
