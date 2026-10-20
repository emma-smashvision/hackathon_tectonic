import { majorStops, monthBundles } from '../../one/roadmap/model';
import type { MapCrossing, MapStop, RoadMap } from '../../one/roadmap/types';
import { buildCity, makePath, nearest, pointAt, RING_R, type CityNet, type Path, type Vec2 } from './network';

export type MapGate = { stop: MapStop; pathId: string; s: number; pos: Vec2; heading: number };
export type MapFork = { crossing: MapCrossing; pathId: string; s: number; pos: Vec2; heading: number };
export type MapBundle = { bundle: ReturnType<typeof monthBundles>[number]; trackId: string; pathId: string; s: number; pos: Vec2; heading: number; title: string };
export interface MapNetwork { net: CityNet; gates: MapGate[]; majorGates: MapGate[]; bundles: MapBundle[]; forks: MapFork[]; trackPaths: Record<string, Path>; }
/** Stable stop identities win when a start marker also uses the journey ID as an alias. */
export const gateFor = (world: Pick<MapNetwork,"gates">, id:string) => world.gates.find(g=>g.stop.id===id) ?? world.gates.find(g=>g.stop.cityFocus===id);

/** Near dates are spaced linearly; distant plans compress rather than miles of empty road. */
export const dayDistance = (days: number) => 28 + Math.max(0, Math.min(days, 90)) * 1.15 + Math.log1p(Math.max(0, days - 90)) * 22;

export function buildMapNetwork(map: RoadMap): MapNetwork {
  const net = buildCity([], { streets: true });
  const trackPaths: Record<string, Path> = {};
  const branchIds = new Set(map.tracks.flatMap(t => t.crossings.flatMap(c => c.branches.map(b => b.trackId))).filter(id => map.tracks.some(t => t.id === id)));
  const roots = map.tracks.filter(t => !t.parentId && !branchIds.has(t.id));
  const gates: MapGate[] = [], forks: MapFork[] = [];
  const built = new Set<string>();
  const buildTrack = (id: string, start: Vec2, angle: number, dayOffset = 0) => {
    if (built.has(id)) return;
    const track = map.tracks.find(t => t.id === id);
    if (!track) return;
    built.add(id);
    const dates = [...track.stops.map(s => s.inDays), ...track.crossings.map(c => c.inDays)];
    const positions = new Map<string,number>();
    let last = 8;
    for (const stop of track.stops) { const distance = Math.max(last + 16, dayDistance(Math.max(0, stop.inDays-dayOffset))); positions.set(stop.id,distance); last=distance; }
    const crossingDistance = (c:MapCrossing)=>positions.get(c.id) ?? dayDistance(Math.max(0,c.inDays-dayOffset));
    const points = [...positions.values(), ...track.crossings.map(crossingDistance)];
    const length = Math.max(90, ...points.map(d => d + 24));
    const samples = [...Array.from({length: Math.ceil(length / 3) + 1}, (_, i) => Math.min(length, i * 3)), ...points, length].sort((a,b)=>a-b).filter((d,i,a)=>i===0 || d-a[i-1]>.01);
    const pts = samples.map(d => ({ x: start.x + Math.cos(angle) * d - Math.sin(angle) * Math.sin(d / 70) * 5, z: start.z + Math.sin(angle) * d + Math.cos(angle) * Math.sin(d / 70) * 5 }));
    const path = makePath(`map:${id}`, id, 'trunk', pts, samples);
    trackPaths[id] = path; net.paths.push(path); net.junctions.push(start);
    for (const stop of track.stops) {
      const i = samples.findIndex(d => Math.abs(d-positions.get(stop.id)!) < .01);
      const s = path.cum[i]; const at = pointAt(path,s);
      gates.push({stop,pathId:path.id,s,pos:at.p,heading:Math.atan2(at.tan.x,at.tan.z)});
    }
    for (const crossing of track.crossings) {
      const i = samples.findIndex(d => Math.abs(d-crossingDistance(crossing)) < .01);
      const s = path.cum[i]; const at = pointAt(path,s);
      forks.push({crossing,pathId:path.id,s,pos:at.p,heading:Math.atan2(at.tan.x,at.tan.z)});
      net.junctions.push(at.p);
      crossing.branches.forEach((b,i)=>buildTrack(b.trackId,at.p,angle+(i-(crossing.branches.length-1)/2)*1.15,crossing.inDays));
    }
    const children=map.tracks.filter(t=>t.parentId===id&&!branchIds.has(t.id));
    children.forEach((child,i)=>{
      const gate=gates.find(g=>g.stop.id===child.fromStopId && g.stop.trackId===id);
      const at=gate?pointAt(path,gate.s):pointAt(path,path.length*.4);
      buildTrack(child.id,at.p,angle+(i%2?-.85:.85), gate?.stop.inDays??0);
    });
  };
  roots.forEach((t,i)=>{
    // A deliberately small, evenly spaced set of roads, all accessible from the ring.
    const at = pointAt(net.ring, net.ring.length * ((i + .25) / Math.max(roots.length,1)));
    buildTrack(t.id,at.p,Math.atan2(at.p.z,at.p.x));
  });
  // Malformed/cyclic branch references never hide a track from the shared map.
  map.tracks.filter(t=>!built.has(t.id)).forEach((t,i)=>{
    const at=pointAt(net.ring,net.ring.length*((i+.5)/map.tracks.length));
    buildTrack(t.id,at.p,Math.atan2(at.p.z,at.p.x));
  });
  for(const p of net.paths) for(const pt of p.pts) net.radius=Math.max(net.radius,Math.hypot(pt.x,pt.z));
  const majorIds = new Set(map.tracks.flatMap(t => majorStops(t).map(s => s.id)));
  const majorGates = gates.filter(g => majorIds.has(g.stop.id));
  const bundles = map.tracks.flatMap(track => monthBundles(track).map(bundle => {
    const anchor = gates.find(g => g.stop.id === bundle.stops[0].id)!;
    const at = pointAt(trackPaths[track.id], anchor.s);
    const month = new Date(`${bundle.month}-15T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' });
    return { bundle, trackId: track.id, pathId: anchor.pathId, s: anchor.s,
      pos: { x: at.p.x-at.tan.z*10, z: at.p.z+at.tan.x*10 }, heading: anchor.heading,
      title: `${month} bills · ${bundle.count}` };
  }));
  return {net,gates,majorGates,bundles,forks,trackPaths};
}

/** Shortest path on the actual lane geometry. Connections are projected onto each road. */
export function laneRoute(net: CityNet, from: Vec2, to: Vec2): Vec2[] {
  const start=nearest(net,from.x,from.z), end=nearest(net,to.x,to.z);
  const split = new Map(net.paths.map(p=>[p.id,[0,p.length]]));
  const arc=(n:ReturnType<typeof nearest>)=>n.path.cum[n.seg]+n.t*(n.path.cum[n.seg+1]-n.path.cum[n.seg]);
  split.get(start.path.id)!.push(arc(start)); split.get(end.path.id)!.push(arc(end));
  const joins:{a:Path;sa:number;b:Path;sb:number}[]=[];
  for(const a of net.paths) for(const sa of [0,a.length]) {
    const pos=pointAt(a,sa).p;
    for(const b of net.paths) if(a!==b) {
      const n=nearest(net,pos.x,pos.z,p=>p===b);
      if(n.dist<.1) { const sb=arc(n); split.get(b.id)!.push(sb); joins.push({a,sa,b,sb}); }
    }
  }
  const nodes:{path:Path;s:number;pos:Vec2;edges:{id:number;cost:number}[]}[]=[];
  const indexes=new Map<string,number[]>();
  for(const path of net.paths) {
    const ss=split.get(path.id)!.sort((a,b)=>a-b).filter((d,i,a)=>!i||d-a[i-1]>.001);
    const ids=ss.map(s=>{nodes.push({path,s,pos:pointAt(path,s).p,edges:[]});return nodes.length-1;}); indexes.set(path.id,ids);
    for(let i=1;i<ids.length;i++) {const a=ids[i-1],b=ids[i],cost=ss[i]-ss[i-1];nodes[a].edges.push({id:b,cost});nodes[b].edges.push({id:a,cost});}
  }
  const idAt=(p:Path,s:number)=>indexes.get(p.id)!.reduce((best,id)=>Math.abs(nodes[id].s-s)<Math.abs(nodes[best].s-s)?id:best);
  for(const j of joins) {const a=idAt(j.a,j.sa),b=idAt(j.b,j.sb);nodes[a].edges.push({id:b,cost:0});nodes[b].edges.push({id:a,cost:0});}
  // Closed loop seam.
  const ringIds=indexes.get(net.ring.id)!; const ra=ringIds[0],rb=ringIds.at(-1)!;nodes[ra].edges.push({id:rb,cost:0});nodes[rb].edges.push({id:ra,cost:0});
  const source=idAt(start.path,arc(start)),target=idAt(end.path,arc(end));
  const dist=nodes.map(()=>Infinity),prev=nodes.map(()=>-1),visited=new Set<number>();dist[source]=0;
  while(visited.size<nodes.length){let u=-1;for(let i=0;i<nodes.length;i++)if(!visited.has(i)&&(u<0||dist[i]<dist[u]))u=i;if(u<0||!Number.isFinite(dist[u])||u===target)break;visited.add(u);for(const e of nodes[u].edges)if(dist[u]+e.cost<dist[e.id]){dist[e.id]=dist[u]+e.cost;prev[e.id]=u;}}
  if(!Number.isFinite(dist[target])) return [];
  const chain:number[]=[];for(let u=target;u!==-1;u=prev[u])chain.unshift(u);
  const route:Vec2[]=[start.point];
  for(let i=1;i<chain.length;i++){const a=nodes[chain[i-1]],b=nodes[chain[i]];if(a.path===b.path){const n=Math.max(1,Math.ceil(Math.abs(b.s-a.s)/3));for(let j=1;j<=n;j++)route.push(pointAt(a.path,a.s+(b.s-a.s)*j/n).p);}else route.push(b.pos);}
  return route;
}
