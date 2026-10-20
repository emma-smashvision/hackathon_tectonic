"use client";

import type * as THREE from "three";
import { createContext, type ReactNode, useContext, useMemo, useRef, useState } from "react";
import type { Car, Input } from "./driving";
import { NO_INPUT } from "./driving";
import { buildCity, type CityNet, type Nearest } from "./network";
import { generateCity } from "./cityGen";

// Shared state between the 3D scene (60 fps, refs) and the HUD (React, ~10 fps).

export type Panel =
  | { type: "stop"; key: string }
  | { type: "fork"; roadId: string }
  | { type: "care"; roadId: string }
  | { type: "complete"; roadId: string }
  | { type: "passport" }
  | { type: "map" }
  | { type: "closed"; roadId: string }
  | { type: "everyday"; key: string }
  | { type: "recap" }
  | null;

export interface Hud {
  roadId: string | null;
  branch: "trunk" | "a" | "b" | "ring";
  month: number;
  speed: number;
  forward: boolean;
  /** next stop ahead on this road, in months */
  ahead: { key: string; months: number } | null;
  /** last stop just passed within half a month */
  here: { key: string } | null;
  /** an Everyday Road stop close by on the ring (journey done-key) */
  ring: { key: string; dist: number } | null;
  /** salary-day autopilot is driving */
  autopilot: boolean;
  flash: { kind: "hit" | "paved" | "boost" | "info"; text: string; at: number } | null;
}

export interface Runtime {
  car: Car;
  near: Nearest | null;
  keys: Input;
  touch: Input;
  teleport: { x: number; z: number; heading: number } | null;
  jolt: number;
  paused: boolean;
  smooth: number;
  hits: number;
  /** the scene camera, so the label layer can project world anchors to the screen */
  cam: THREE.Camera | null;
  /** salary day: the car drives itself one month along your road */
  autopilot: { roadId: string; month: number; to: number } | null;
}

interface GameCtx {
  net: CityNet;
  dressing: ReturnType<typeof generateCity>;
  rt: React.MutableRefObject<Runtime>;
  hud: Hud;
  setHud: (h: Hud) => void;
  panel: Panel;
  setPanel: (p: Panel) => void;
  mapView: boolean;
  setMapView: (v: boolean) => void;
  flash: (kind: NonNullable<Hud["flash"]>["kind"], text: string) => void;
}

const Ctx = createContext<GameCtx | null>(null);

export const EMPTY_HUD: Hud = {
  roadId: null,
  branch: "ring",
  month: Number.NaN,
  speed: 0,
  forward: true,
  ahead: null,
  here: null,
  ring: null,
  autopilot: false,
  flash: null,
};

export function GameProvider({ children }: { children: ReactNode }) {
  const net = useMemo(() => buildCity(), []);
  const dressing = useMemo(() => generateCity(net), [net]);
  const rt = useRef<Runtime>({
    car: { x: 0, z: 0, heading: 0, speed: 0 },
    near: null,
    keys: { ...NO_INPUT },
    touch: { ...NO_INPUT },
    teleport: null,
    jolt: 0,
    paused: false,
    smooth: 0,
    hits: 0,
    cam: null,
    autopilot: null,
  });
  const [hud, setHudState] = useState<Hud>(EMPTY_HUD);
  const [panel, setPanelState] = useState<Panel>(null);
  const [mapView, setMapView] = useState(false);
  const flashRef = useRef<Hud["flash"]>(null);

  const value: GameCtx = {
    net,
    dressing,
    rt,
    hud,
    setHud: (h) => setHudState({ ...h, flash: flashRef.current }),
    panel,
    setPanel: (p) => {
      rt.current.paused = !!p && p.type !== "closed";
      setPanelState(p);
    },
    mapView,
    setMapView,
    flash: (kind, text) => {
      flashRef.current = { kind, text, at: Date.now() };
      if (kind === "paved") rt.current.smooth += 1;
      if (kind === "hit") rt.current.hits += 1;
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame(): GameCtx {
  const g = useContext(Ctx);
  if (!g) throw new Error("useGame outside GameProvider");
  return g;
}
