"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { MONTH_SHORT } from "../../engine/everyday";
import { useStore } from "../../components/store";
import { maskMoney } from "../../engine/world";
import { visibleGates } from "../gateFlow";
import { pointAt } from "../network";
import { LANDMARK_SCALE } from "../streetTour";
import { useGame } from "../runtime";
import { trackReady } from "../../../one/roadmap/model";

// The label layer. Every readable word about the world is drawn here, in screen space:
// - always on top: never hidden behind buildings, lamp posts, cars or other signs;
// - solid, high-contrast boxes at a fixed, readable size (no tiny far-away text);
// - laid out every frame so labels never overlap each other or any HUD element,
//   and a label that can't find a free spot is not drawn at all rather than drawn badly.

export interface WorldLabel {
  id: string;
  x: number;
  y: number;
  z: number;
  priority: number;
  accent: string;
  kicker?: string;
  title: string;
  lines?: string[];
  note?: string;
  maxDist: number;
  mode: "drive" | "map";
  size: "lg" | "sm";
}

/** The same personal places shown in the plain app, labelled at their doors. */
function usePlaceLabels(): WorldLabel[] {
  const { hud, places, spots } = useGame();
  const { hideAmounts } = useStore();
  return places.flatMap((place): WorldLabel[] => {
    const spot = spots.find((item) => item.id === place.id);
    if (!spot || (hud.touring && hud.tourPlaceId !== place.id)) return [];
    const heights = { house: 16, flat: 16, plot: 15, garage: 9, silo: 18, child: 10, kiosk: 7, tower: 15, tree: 10 };
    return [{ id: `place:${place.id}`, x: spot.x, y: heights[place.kind] * LANDMARK_SCALE, z: spot.z,
      priority: hud.street === place.street ? 62 : 18, accent: place.accent,
      kicker: place.alert ? `${place.kicker} · 1 to check` : place.kicker, title: place.title,
      lines: hud.touring ? [hideAmounts ? maskMoney(place.line) : place.line] : [],
      maxDist: 180, mode: "drive", size: "lg" }];
  });
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const GAP = 6;
const hit = (a: Rect, b: Rect) => a.x < b.x + b.w + GAP && a.x + a.w + GAP > b.x && a.y < b.y + b.h + GAP && a.y + a.h + GAP > b.y;

export function WorldLabels() {
  const { rt, mapView, travelTo, hud, gameApi, mapNetwork } = useGame();
  const placeLabels = usePlaceLabels();
  const priorityTracks = [
    ...(gameApi.currentFork?.branches.map((branch) => branch.trackId) ?? []),
    gameApi.currentTrackId, gameApi.roadmap.nextUp?.trackId,
  ];
  const signTracks = [...gameApi.roadmap.tracks].sort((a, b) => Number(priorityTracks.includes(b.id)) - Number(priorityTracks.includes(a.id))).slice(0, 3);
  // Keep personal places; all journey labels use the same map as the 2D view.
  const labels: WorldLabel[] = [
    ...placeLabels,
    ...signTracks.flatMap((track): WorldLabel[] => {
      const path = mapNetwork.trackPaths[track.id];
      if (!path) return [];
      const at = pointAt(path, 9);
      return [{ id: `map:${track.id}`, x: at.p.x - at.tan.z * 11, y: 12, z: at.p.z + at.tan.x * 11,
        priority: gameApi.currentTrackId === track.id ? 70 : 40, accent: track.status === "possible" ? "#a8b8d0" : "#72d8ff",
        kicker: track.status === "possible" ? "A road you can explore" : "Your road", title: track.title,
        lines: [track.status === "possible" ? "Try it" : trackReady(track) === null ? "Done ✓" : `${trackReady(track)}% ready`], maxDist: 150, mode: "drive", size: "sm" }];
    }),
    ...visibleGates(mapNetwork.majorGates, rt.current.car.pathId, rt.current.car.laneS ?? 0, rt.current.cam?.position ?? rt.current.car).map((gate): WorldLabel => ({
      id: `gate:${gate.stop.id}`, x: gate.pos.x, y: 14, z: gate.pos.z, priority: gameApi.nextGate?.id === gate.stop.id ? 90 : 65,
      accent: gate.stop.ready === 100 ? "#80e7b9" : "#f2cf8b", kicker: `${gate.stop.when.day} ${MONTH_SHORT[gate.stop.when.month]} · ${gate.stop.ready}% ready`,
      title: gate.stop.title, lines: [gate.stop.ready === 100 ? "Ready for the date" : "Tap to prepare"], maxDist: 100, mode: "drive", size: "sm",
    })),
    ...mapNetwork.bundles.filter((marker) => marker.trackId === gameApi.currentTrackId && marker.s >= (rt.current.car.laneS ?? 0) - 6 && marker.s <= (rt.current.car.laneS ?? 0) + 50).map((marker): WorldLabel => ({
      id: marker.bundle.id, x: marker.pos.x, y: 5, z: marker.pos.z, priority: 25,
      accent: "#8fb5bc", title: marker.title, note: "Nothing to do", maxDist: 80, mode: "drive", size: "sm",
    })),
  ];
  const box = useRef<HTMLDivElement>(null);
  const els = useRef(new Map<string, HTMLDivElement>());
  const stems = useRef(new Map<string, HTMLDivElement>());
  const sizes = useRef(new Map<string, { w: number; h: number }>());
  const last = useRef(new Map<string, number>());
  const mapRef = useRef(mapView);
  mapRef.current = mapView;
  const labelsRef = useRef(labels);
  labelsRef.current = labels;

  // measure every label once its content is known
  useLayoutEffect(() => {
    for (const l of labels) {
      const el = els.current.get(l.id);
      if (el) sizes.current.set(l.id, { w: el.offsetWidth, h: el.offsetHeight });
    }
  }, [labels]);

  useEffect(() => {
    let raf = 0;
    let hudRects: Rect[] = [];
    let lastHud = 0;
    let lastMeasure = 0;
    const v = new THREE.Vector3();
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const root = box.current;
      const cam = rt.current.cam;
      if (!root || !cam) return;
      const W = root.clientWidth;
      const H = root.clientHeight;
      const origin = root.getBoundingClientRect();
      if (t - lastHud > 200) {
        lastHud = t;
        hudRects = [];
        const city = root.parentElement;
        city?.querySelectorAll<HTMLElement>("[data-hud]").forEach((n) => {
          const r = n.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return;
          const cs = getComputedStyle(n);
          if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) return;
          hudRects.push({ x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height });
        });
      }
      if (t - lastMeasure > 1000) {
        // fonts can finish loading late: keep the measured sizes honest
        lastMeasure = t;
        for (const [id, el] of els.current) sizes.current.set(id, { w: el.offsetWidth, h: el.offsetHeight });
      }
      const isMap = mapRef.current;
      const occupied: Rect[] = [...hudRects];
      if (!isMap && rt.current.near?.branch !== "street") {
        // keep the car itself clear
        const c = rt.current.car;
        v.set(c.x, 1.2, c.z).project(cam);
        const cx = (v.x * 0.5 + 0.5) * W;
        const cy = (-v.y * 0.5 + 0.5) * H;
        occupied.push({ x: cx - 80, y: cy - 60, w: 160, h: 100 });
      }
      const cands: { l: WorldLabel; sx: number; sy: number; score: number }[] = [];
      for (const l of labelsRef.current) {
        if ((l.mode === "map") !== isMap) continue;
        v.set(l.x, l.y, l.z);
        const d = v.distanceTo(cam.position);
        if (d > l.maxDist) continue;
        v.project(cam);
        if (v.z < -1 || v.z > 1) continue;
        const sx = (v.x * 0.5 + 0.5) * W;
        const sy = (-v.y * 0.5 + 0.5) * H;
        if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
        const shownBefore = last.current.has(l.id) ? 6 : 0;
        cands.push({ l, sx, sy, score: l.priority + shownBefore - (Number.isFinite(l.maxDist) ? (d / l.maxDist) * 40 : 0) });
      }
      cands.sort((a, b) => b.score - a.score);
      const max = W < 700 ? 4 : isMap ? 7 : 5;
      const placed = new Map<string, { x: number; y: number; stem: number }>();
      for (const c of cands) {
        if (placed.size >= max) break;
        const size = sizes.current.get(c.l.id);
        if (!size || size.w === 0) continue;
        const { w, h } = size;
        const opts: { x: number; y: number; stem: number }[] = isMap
          ? [
              { x: c.sx - w / 2, y: c.sy - h / 2, stem: 0 },
              { x: c.sx - w / 2, y: c.sy - h - 8, stem: 0 },
              { x: c.sx - w / 2, y: c.sy + 8, stem: 0 },
            ]
          : [
              { x: c.sx - w / 2, y: c.sy - h - 14, stem: 14 },
              { x: c.sx - w / 2, y: c.sy - h * 2 - 26, stem: h + 26 },
              { x: c.sx + 16, y: c.sy - h / 2, stem: 0 },
              { x: c.sx - w - 16, y: c.sy - h / 2, stem: 0 },
              { x: c.sx - w / 2, y: c.sy + 14, stem: 0 },
            ];
        const prev = last.current.get(c.l.id);
        const order = opts.map((_, i) => i);
        if (prev !== undefined && prev < opts.length) order.unshift(...order.splice(prev, 1));
        for (const k of order) {
          const o = opts[k];
          const r = { x: o.x, y: o.y, w, h };
          if (r.x < 6 || r.y < 6 || r.x + w > W - 6 || r.y + h > H - 6) continue;
          if (occupied.some((q) => hit(r, q))) continue;
          // the stem must not cross a HUD element either
          if (o.stem > 0 && occupied.some((q) => hit({ x: c.sx - 1, y: o.y + h, w: 2, h: o.stem }, q))) continue;
          occupied.push(r);
          placed.set(c.l.id, o);
          last.current.set(c.l.id, k);
          break;
        }
      }
      for (const id of [...last.current.keys()]) if (!placed.has(id)) last.current.delete(id);
      for (const [id, el] of els.current) {
        const p = placed.get(id);
        const stem = stems.current.get(id);
        if (p) {
          el.style.transform = `translate3d(${Math.round(p.x)}px, ${Math.round(p.y)}px, 0)`;
          if (!el.classList.contains("on")) el.classList.add("on");
          if (stem) {
            stem.style.height = `${p.stem}px`;
            stem.style.display = p.stem > 0 ? "block" : "none";
          }
        } else if (el.classList.contains("on")) {
          el.classList.remove("on");
        }
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [rt]);

  return (
    <div ref={box} className="world-labels">
      {labels.map((l) => (
        <div
          key={l.id}
          ref={(el) => {
            if (el) els.current.set(l.id, el);
            else els.current.delete(l.id);
          }}
          className={`wl ${hud.touring ? "wl-tour" : ""} wl-${l.size} ${l.mode === "map" ? "wl-map" : ""}`}
          style={{ "--accent": l.accent } as React.CSSProperties}
          data-label={l.id}
          role={l.id.startsWith("place:") || l.id.startsWith("gate:") || l.id.startsWith("map:") ? "button" : undefined}
          tabIndex={-1}
          onClick={() => {
            if (l.id.startsWith("place:")) travelTo({kind: "place", id: l.id.slice(6)});
            if (l.id.startsWith("gate:")) travelTo({kind: "journey", id: l.id.slice(5)});
            if (l.id.startsWith("map:")) travelTo({kind: "journey", id: l.id.slice(4)});
          }}
        >
          {l.kicker && <div className="wl-kicker">{l.kicker}</div>}
          <div className="wl-title">{l.title}</div>
          {l.lines?.map((t) => (
            <div key={t} className="wl-line">
              {t}
            </div>
          ))}
          {l.note && <div className="wl-note">{l.note}</div>}
          <div
            className="wl-stem"
            ref={(el) => {
              if (el) stems.current.set(l.id, el);
              else stems.current.delete(l.id);
            }}
          />
        </div>
      ))}
    </div>
  );
}
