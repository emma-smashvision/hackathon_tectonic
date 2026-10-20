"use client";

import { useEffect, useMemo, useRef } from "react";
import { useStore } from "../../components/store";
import { STREET_COLOR } from "../network";
import { useGame } from "../runtime";

/** Small city map with your car. Click to open the full map. */
export function Minimap() {
  const { net, rt, setPanel, spots, places, landmarks } = useGame();
  const { roads, road, explored } = useStore();
  const car = useRef<SVGGElement>(null);
  const R = net.radius + 30;
  const lines = useMemo(
    () =>
      net.paths.map((p) => ({
        id: p.id,
        roadId: p.roadId,
        street: p.street,
        d: `M${p.pts.map((q) => `${q.x.toFixed(0)} ${q.z.toFixed(0)}`).join(" L")}`,
      })),
    [net],
  );
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const c = rt.current.car;
      if (car.current) car.current.setAttribute("transform", `translate(${c.x.toFixed(1)} ${c.z.toFixed(1)}) rotate(${(-c.heading * 180) / Math.PI})`);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [rt]);

  return (
    <button type="button" className="minimap" data-hud onClick={() => setPanel({ type: "map" })} aria-label="Open the city map (M)">
      <svg viewBox={`${-R} ${-R} ${R * 2} ${R * 2}`} aria-hidden="true">
        {lines.map((l) => {
          const r = roads.find((x) => x.id === l.roadId);
          const own = l.roadId === road.id;
          const color = l.street ? STREET_COLOR[l.street] : l.roadId === null ? "#D8C9A3" : r?.status === "pending" ? "#F3A93C" : r?.care ? "#B7B0DA" : (r?.hue ?? "#C9C2AE");
          const seen = l.roadId === null || explored.includes(l.roadId) || own;
          return (
            <path
              key={l.id}
              d={l.d}
              fill="none"
              stroke={color}
              strokeWidth={own ? 22 : 12}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={own ? 1 : seen ? 0.75 : 0.3}
              strokeDasharray={r?.status === "pending" ? "16 18" : undefined}
            />
          );
        })}
        {landmarks.map((l) => (
          <circle key={l.id} cx={l.x} cy={l.z} r={9} fill="#0B1626" stroke={l.accent} strokeWidth={5} />
        ))}
        {spots.map((sp) => {
          const p = places.find((x) => x.id === sp.id);
          return <rect key={sp.id} x={sp.x - 6} y={sp.z - 6} width={12} height={12} rx={sp.id === "home" ? 2 : 6} fill={p?.accent ?? "#9FB0C6"} opacity={0.9} />;
        })}
        <g ref={car}>
          <circle r={42} fill="#5ED4E8" opacity={0.25} />
          <path d="M0 34 L22 -22 L0 -10 L-22 -22 Z" fill="#EDE7D7" stroke="#0B1626" strokeWidth={6} />
        </g>
      </svg>
      <span className="minimap-hint mono">M · map</span>
    </button>
  );
}
