"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { calLabel, MONTH_LONG, MONTH_SHORT } from "../../engine/everyday";
import { euro, int, months1, oneIn, pct, signedEuro } from "../../engine/format";
import { readiness } from "../../engine/game";
import { goalCrowd } from "../../engine/life";
import { forkStats, statsFor } from "../../engine/simulate";
import type { ForkDef, RoadDef, StopDef } from "../../engine/types";
import { useLiveNotes } from "../../components/phone/useLiveNotes";
import { useStore } from "../../components/store";
import { destinationAnchor, forkBranchAnchor, gateAnchor, noteAnchors, stopAnchor } from "../anchors";
import { dayAngle, everydayAnchorAt, everydayAngles, monthLabelAnchor, ringAt } from "../everydayRing";
import { DISTRICTS, type District, pointAt } from "../network";
import { nextRoads } from "../next";
import { useGame } from "../runtime";

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

function statLine(road: RoadDef, stop: StopDef): string {
  const s = statsFor(road, stop);
  if (s.kind === "bump") return s.hitRate.value != null ? `${oneIn(s.hitRate.value)} ${stop.hitVerb ?? "paid more than"} ${euro(s.threshold)}` : "Not enough drivers yet";
  if (s.kind === "boost") return s.median.value != null ? `Typically ${euro(s.median.value)}` : "Not enough drivers yet";
  return s.rate.value != null ? `${pct(s.rate.value)} ${stop.rate?.label}` : "Not enough drivers yet";
}

function useLabels(): WorldLabel[] {
  const { net, hud, dressing } = useGame();
  const { roads, road: own, journeyFor, life, journey } = useStore();
  const notes = useLiveNotes(hud.roadId ?? "");
  const here = hud.roadId;
  // journeys change often; key the memo on the bits the labels actually show
  const jKey = roads.map((r) => JSON.stringify([journeyFor(r.id).done, journeyFor(r.id).forkChoice, journeyFor(r.id).careOptIn])).join("|");

  // biome-ignore lint/correctness/useExhaustiveDependencies: jKey stands for the journeys
  return useMemo(() => {
    const out: WorldLabel[] = [];
    const onRing = here === null;

    // ---- the Everyday Road (the ring): this year's stops, today, the months ----
    const evList = life.upcoming.filter((u) => u.scope === "everyday");
    const angles = everydayAngles(evList.map((u) => ({ key: u.ref.key, month: u.cal.month, day: u.day })));
    for (const u of evList) {
      const a = everydayAnchorAt(angles.get(u.ref.key) ?? 0);
      const paved = u.kind === "bump" && u.ready >= 50;
      out.push({
        id: `ev:${u.ref.key}`,
        x: a.x,
        y: a.y,
        z: a.z,
        priority: onRing ? 54 : 16,
        accent: u.kind === "bump" ? (paved ? "#7FD6A8" : "#F3A93C") : u.kind === "boost" ? "#7FD6A8" : "#5ED4E8",
        kicker: `EVERYDAY ROAD · ${MONTH_SHORT[u.cal.month].toUpperCase()} ${u.cal.year}`,
        title: u.title,
        lines: [u.crowd],
        note: paved ? "Paved ✓" : u.amount != null && u.amountSource === "last-year" ? `Last year for you: ${signedEuro(u.amount)}` : undefined,
        maxDist: 190,
        mode: "drive",
        size: "lg",
      });
    }
    {
      const t = life.today;
      const p = ringAt(dayAngle(t.cal.month, t.day));
      out.push({
        id: "today",
        x: p.x,
        y: 16,
        z: p.z,
        priority: onRing ? 50 : 14,
        accent: "#D8C9A3",
        kicker: "TODAY ON THE EVERYDAY ROAD",
        title: `${t.day} ${MONTH_LONG[t.cal.month]} ${t.cal.year}`,
        lines: [`Fuel: ${months1(life.fuel)} months of buffer`],
        maxDist: 260,
        mode: "drive",
        size: "lg",
      });
      out.push({
        id: "today:map",
        x: p.x,
        y: 2,
        z: p.z,
        priority: 58,
        accent: "#D8C9A3",
        title: `Today · ${t.day} ${MONTH_SHORT[t.cal.month]}`,
        maxDist: Number.POSITIVE_INFINITY,
        mode: "map",
        size: "sm",
      });
    }
    for (let m = 0; m < 12; m++) {
      const a = monthLabelAnchor(m);
      const now = m === life.today.cal.month;
      out.push({
        id: `month:${m}`,
        x: a.x,
        y: a.y,
        z: a.z,
        priority: now ? 12 : 8,
        accent: now ? "#D8C9A3" : "#9FB0C6",
        title: MONTH_LONG[m].toUpperCase(),
        maxDist: 120,
        mode: "drive",
        size: "sm",
      });
      // bird's eye: the quarters and this month, enough to read the year clock without crowding it
      if (m % 3 === 0 || now)
        out.push({
        id: `month:map:${m}`,
        x: a.x,
        y: 2,
        z: a.z,
        priority: now ? 34 : 24,
        accent: now ? "#D8C9A3" : "#9FB0C6",
        title: MONTH_SHORT[m],
        maxDist: Number.POSITIVE_INFINITY,
        mode: "map",
        size: "sm",
      });
    }

    // ---- your goals: destination pins along your road ----
    const ownAv = net.avenues.find((a) => a.road.id === own.id);
    if (ownAv && !own.care) {
      const fork = own.fork;
      const branch = fork && journey.forkChoice[fork.id] === fork.branches[1].id ? 1 : 0;
      life.goals.forEach((g, i) => {
        if (g.etaMonths == null) return;
        const month = Math.min(own.months - 0.4, journey.month + Math.max(0.6, g.etaMonths));
        const at = destinationAnchor(ownAv, month, branch, i);
        const odds = goalCrowd(own, g, own.persona.bufferBand);
        const beyond = journey.month + g.etaMonths > own.months;
        out.push({
          id: `goal:${g.id}`,
          x: at.x,
          y: at.y,
          z: at.z,
          priority: (here === own.id ? 52 : 20) - i,
          accent: g.reached ? "#7FD6A8" : "#5ED4E8",
          kicker: g.reached ? "DESTINATION · ARRIVED" : `DESTINATION · ETA ${g.eta ? calLabel(g.eta).toUpperCase() : "—"}`,
          title: g.label,
          lines: [odds.reach.value != null ? `${pct(odds.reach.value)} of drivers like you got there` : "Too few drivers like you to show odds"],
          note: beyond ? `Beyond this road · ${euro(g.saved)} of ${euro(g.target)}` : `${euro(g.saved)} of ${euro(g.target)}`,
          maxDist: 240,
          mode: "drive",
          size: "lg",
        });
      });
    }
    const exits = new Map(nextRoads(own.id).map((n) => [n.road?.id, n]));
    for (const ps of net.stops) {
      const road = roads.find((r) => r.id === ps.roadId);
      if (!road) continue;
      const j = journeyFor(road.id);
      if (road.care && !j.careOptIn) continue;
      const mine = road.id === own.id;
      const bonus = (road.id === here ? 30 : 0) + (mine ? 8 : 0);
      const a = stopAnchor(ps);
      if (ps.stop.kind === "fork") {
        const fork = ps.stop as ForkDef;
        out.push({
          id: ps.key,
          ...a,
          priority: 58 + bonus,
          accent: "#EDE7D7",
          kicker: `CROSSROADS · M${fork.month}`,
          title: fork.title,
          maxDist: 170,
          mode: "drive",
          size: "lg",
        });
        const av = net.avenues.find((x) => x.road.id === road.id);
        if (!av) continue;
        const stats = forkStats(road, fork, 1, null);
        ([0, 1] as const).forEach((i) => {
          const at = forkBranchAnchor(av, i);
          if (!at) return;
          const br = fork.branches[i];
          const chosen = j.forkChoice[fork.id] === br.id;
          const fmt = (m: (typeof stats.branches)[number]["metrics"][number]) =>
            m.value.value == null ? "—" : m.kind === "pct" ? pct(m.value.value) : m.kind === "delta" ? `${Math.round(m.value.value)}%` : euro(m.value.value);
          out.push({
            id: `${ps.key}:branch:${i}`,
            ...at,
            priority: 60 + bonus,
            accent: chosen ? "#7FD6A8" : i === 0 ? "#F3A93C" : "#5ED4E8",
            kicker: `${i === 0 ? "◀ LEFT" : "RIGHT ▶"} · A YEAR LATER`,
            title: br.label,
            lines: stats.branches[i].metrics.slice(0, 2).map((m) => `${m.label}: ${fmt(m)}`),
            note: chosen ? "Your road ✓" : undefined,
            maxDist: 190,
            mode: "drive",
            size: "lg",
          });
        });
        continue;
      }
      const stop = ps.stop as StopDef;
      const done = j.done[stop.id] ?? [];
      const ready = readiness(stop, done);
      const paved = ready >= 50;
      const accent = road.care ? "#B7B0DA" : stop.kind === "bump" ? (paved ? "#7FD6A8" : "#F3A93C") : stop.kind === "boost" ? "#7FD6A8" : "#5ED4E8";
      const kicker =
        stop.kind === "bump" ? (road.care ? "WHAT'S AHEAD" : paved ? "PAVED · READY" : "BUMP AHEAD") : stop.kind === "boost" ? "MONEY COMING IN" : "ON THE ROAD";
      out.push({
        id: ps.key,
        ...a,
        priority: (stop.kind === "bump" ? 56 : stop.kind === "boost" ? 50 : 46) + bonus,
        accent,
        kicker: `${kicker} · M${stop.month}`,
        title: stop.title,
        lines: [statLine(road, stop)],
        note: mine && stop.kind === "bump" && !road.care ? `Your readiness ${ready}%` : !mine ? "Test drive" : done.length ? "Done ✓" : undefined,
        maxDist: 230,
        mode: "drive",
        size: "lg",
      });
    }

    for (const av of net.avenues) {
      const road = roads.find((r) => r.id === av.road.id) ?? av.road;
      const g = gateAnchor(av);
      const pending = road.status === "pending";
      out.push({
        id: `gate:${road.id}`,
        x: g.x,
        y: g.y,
        z: g.z,
        priority: here === null ? 52 : here === road.id ? 34 : 24,
        accent: road.care ? "#B7B0DA" : pending ? "#F3A93C" : road.hue,
        kicker: pending ? "ROAD CLOSED · UNDER REVIEW" : road.care ? "QUIET ROAD · CARE" : DISTRICTS[av.district].name.toUpperCase(),
        title: road.name,
        lines: [
          pending ? `${int(road.alumni)} drivers · awaiting a human yes` : `${int(road.alumni)} drove it · ${road.months} months`,
          ...(exits.get(road.id)?.shown && exits.get(road.id)?.share != null
            ? [`Likely next exit: ${pct(exits.get(road.id)?.share ?? 0)} of ${own.name} drivers`]
            : []),
        ],
        note: road.id === own.id ? "Your road" : undefined,
        maxDist: 210,
        mode: "drive",
        size: "lg",
      });
      // map view: one name per avenue
      const q = pointAt(av.trunk, av.trunk.length * 0.55);
      out.push({
        id: `map:${road.id}`,
        x: q.p.x + av.perp.x * 40,
        y: 2,
        z: q.p.z + av.perp.z * 40,
        priority: road.id === own.id ? 60 : 40,
        accent: road.id === own.id ? "#5ED4E8" : road.care ? "#B7B0DA" : pending ? "#F3A93C" : road.hue,
        title: road.name,
        note: road.id === own.id ? "your road" : pending ? "under review" : undefined,
        maxDist: Number.POSITIVE_INFINITY,
        mode: "map",
        size: "sm",
      });
    }

    // district names, in the map view only
    const by = new Map<District, number[]>();
    for (const av of net.avenues) by.set(av.district, [...(by.get(av.district) ?? []), av.angle]);
    for (const [d, angles] of by.entries()) {
      const ang = angles.reduce((s, v) => s + v, 0) / angles.length;
      out.push({
        id: `district:${d}`,
        x: Math.cos(ang) * 230,
        y: 2,
        z: Math.sin(ang) * 230,
        priority: 20,
        accent: DISTRICTS[d].color,
        kicker: "DISTRICT",
        title: DISTRICTS[d].name,
        maxDist: Number.POSITIVE_INFINITY,
        mode: "map",
        size: "sm",
      });
    }
    out.push({ id: "square", x: 0, y: 2, z: 0, priority: 30, accent: "#5ED4E8", title: "Hindsight Square", note: "every road starts here", maxDist: Number.POSITIVE_INFINITY, mode: "map", size: "sm" });

    // month markers on the lamp posts of the avenue you're on
    if (here) {
      for (const l of dressing.lamps) {
        if (l.roadId !== here) continue;
        out.push({ id: `m:${l.x.toFixed(1)}:${l.z.toFixed(1)}`, x: l.x, y: 7.6, z: l.z, priority: 6, accent: "#9FB0C6", title: `M${l.month}`, maxDist: 95, mode: "drive", size: "sm" });
      }
    }

    // notes from drivers ahead
    for (const n of noteAnchors(net, notes)) {
      out.push({
        id: `note:${n.id}`,
        x: n.x,
        y: n.y,
        z: n.z,
        priority: 36 + (n.roadId === here ? 10 : 0),
        accent: "#7FD6A8",
        kicker: "NOTE FROM A DRIVER AHEAD",
        title: `“${n.text}”`,
        maxDist: 140,
        mode: "drive",
        size: "sm",
      });
    }
    return out;
  }, [net, roads, own.id, here, notes, dressing, jKey, life, journey]);
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
  const { rt, mapView } = useGame();
  const labels = useLabels();
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
      if (!isMap) {
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
      const max = W < 700 ? 4 : isMap ? 22 : 7;
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
    <div ref={box} className="world-labels" aria-hidden="true">
      {labels.map((l) => (
        <div
          key={l.id}
          ref={(el) => {
            if (el) els.current.set(l.id, el);
            else els.current.delete(l.id);
          }}
          className={`wl wl-${l.size} ${l.mode === "map" ? "wl-map" : ""}`}
          style={{ "--accent": l.accent } as React.CSSProperties}
          data-label={l.id}
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
