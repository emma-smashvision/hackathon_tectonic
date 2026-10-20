"use client";
import { useMemo, type PointerEvent } from "react";
import { useCityEngine } from "../engine/runtime";
import { nearest } from "../engine/network";
import type { Vec2 } from "../api";
const coord = (value: number) => Math.round(value * 100) / 100;
export const pathData = (points: Vec2[]) => points.length ? 'M' + points.map(p => `${p.x.toFixed(1)},${p.z.toFixed(1)}`).join(' L') : '';
export function CityMap({ full = false, onClose, onOpen }: { full?: boolean; onClose?: () => void; onOpen?: () => void }) {
  const { net, rt, api, village } = useCityEngine(), R = rt.current, c = R.car;
  const lines = useMemo(() => net.paths.map(p => ({ id: p.id, d: pathData(p.pts), color: net.avenues.find(a => a.road.id === p.roadId)?.road.hue ?? '#cabf92' })), [net]);
  const bounds = useMemo(() => {
    const pts = net.paths.flatMap(p => p.pts), xs = pts.map(p => p.x), zs = pts.map(p => p.z);
    const x = Math.min(...xs) - 100, z = Math.min(...zs) - 90;
    return `${coord(x)} ${coord(z)} ${coord(Math.max(...xs) - x + 120)} ${coord(Math.max(...zs) - z + 90)}`;
  }, [net]);
  const radius = 145;
  const centre = full ? { x: 0, z: 0 } : c;
  const select = (e: PointerEvent<SVGSVGElement>) => {
    if (!full) return;
    const svg = e.currentTarget, matrix = svg.getScreenCTM(); if (!matrix) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
    api.setWaypoint({ x: p.x, z: p.y });
  };
  const near = nearest(net, c.x, c.z), label = near.path.street ? 'Your block' : net.avenues.find(a => a.road.id === near.roadId)?.road.name ?? 'Everyday ring';
  const map = <svg viewBox={full ? bounds : `${centre.x - radius} ${centre.z - radius} ${radius * 2} ${radius * 2}`} onPointerDown={select} aria-label={full ? 'City map. Select a road to set a waypoint.' : 'Local street map'} role="img">
    <g transform={full ? undefined : `rotate(${c.heading * 180 / Math.PI + 180} ${c.x} ${c.z})`}>
      {lines.map(l => <path key={l.id} d={l.d} fill="none" stroke={l.color} strokeWidth={full ? 7 : 4} opacity={.7} strokeLinejoin="round" />)}
      {R.route.length > 1 && <path d={pathData(R.autopilot ? [{ x: c.x, z: c.z }, ...R.route.slice(R.routeIndex)] : R.route)} fill="none" stroke="#98ffdb" strokeWidth={full ? 9 : 5} strokeLinejoin="round" />}
      <rect x={api.home().x - 6} y={api.home().z - 6} width={12} height={12} fill="#ffe2a0" />
      {api.districts().map(d => <circle key={d.id} cx={coord(d.centre.x)} cy={coord(d.centre.z)} r={full ? 7 : 4} fill="#ffe3a2" />)}
      {full && api.districts().map(d => {
        const p = api.pointOn(d.id, .75).pos;
        return <text key={d.id} x={coord(p.x + (p.x < 0 ? -14 : 14))} y={coord(p.z - 16)} textAnchor={p.x < 0 ? 'end' : 'start'} fill="#f1f5fc" fontSize={23} paintOrder="stroke" stroke="#071525" strokeWidth={6}>{d.name}</text>;
      })}
      {[...R.missionMarkers, ...R.spawnedMarkers.values()].map(m => <g key={m.id}><circle cx={m.at.x} cy={m.at.z} r={full ? 9 : 5} fill={m.color ?? "#ffe3a2"} /><title>{m.label}</title></g>)}
      {R.waypoint && <g><circle cx={R.waypoint.x} cy={R.waypoint.z} r={full ? 13 : 8} fill="#98ffdb" /><circle cx={R.waypoint.x} cy={R.waypoint.z} r={full ? 22 : 14} fill="none" stroke="#98ffdb" strokeWidth={2} /></g>}
      <g transform={`translate(${c.x},${c.z}) rotate(${-c.heading * 180 / Math.PI})`}><path d="M0 10 L-7 -6 L0 -3 L7 -6 Z" fill="#fff" stroke="#123346" strokeWidth={2} /></g>
    </g>
  </svg>;
  if (!full) return <button className="c10-minimap" onClick={onOpen} aria-label="Open city map (M)">{map}<span>{label}<small>M · full map</small></span></button>;
  return <div className="c10-map" role="dialog" aria-modal="true" aria-label="City map">
    <header><div><small>YOUR CITY</small><h2>Choose your next road</h2><p>Select a road on the map, or choose a district.</p></div><button onClick={onClose} autoFocus>Close map · M</button></header>
    <div className="c10-map-body"><div className="c10-map-canvas">{map}</div><aside>
      <button onClick={() => api.setWaypoint(api.home())}>⌂ Your block</button>
      <button onClick={() => api.setWaypoint(api.pointOn('everyday', .15).pos)}>Everyday ring</button>
      {api.districts().map(d => <button key={d.id} onClick={() => api.setWaypoint(d.centre)}>{d.name}{village.destination?.roadId === d.id ? ' · Your road' : ''}</button>)}
    </aside></div>
    <footer><span>{R.waypoint ? 'GPS route ready. Autopilot follows the connected roads.' : 'Explore freely. You can return to your block at any time.'}</span><button disabled={!R.waypoint} onClick={() => { if (R.waypoint) api.setAutopilot(R.waypoint); onClose?.(); }}>Autopilot there →</button><button disabled={!R.waypoint} onClick={() => { api.setWaypoint(null); }}>Clear route</button></footer>
  </div>;
}
