/** Render-only data. The engine supplies all road centre-lines; art never changes driving geometry. */
export type Point = { x: number; z: number };
export type ArtRoad = { id: string; points: Point[]; color: string; width?: number; name?: string; ghosts?: boolean };
export type Tower = { x: number; z: number; w: number; d: number; h: number; rot: number; color: string; seed: number };
export type BoxInstance = { at: [number, number, number]; size: [number, number, number]; rot?: number; color?: string };
export const PALETTE = { sky: '#14283e', glass: '#1c344a', cyan: '#63e5ff', amber: '#ffca80', violet: '#a99bff', mint: '#83f4d0' };
export const DISTRICT_COLORS: Record<string, string> = { work: '#ffca80', home: '#63e5ff', family: '#ff9bb1', abroad: '#91aeff', later: '#b4c8ff', care: '#b0a5d6' };
export function seeded(seed: number) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function roadSample(points: Point[], distance: number) {
  for (let i = 1; i < points.length; i++) { const a = points[i - 1], b = points[i]; const length = Math.hypot(b.x - a.x, b.z - a.z); if (distance <= length || i === points.length - 1) { const t = Math.max(0, Math.min(1, distance / (length || 1))); return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, heading: Math.atan2(b.x - a.x, b.z - a.z) }; } distance -= length; }
  return { ...(points[0] ?? {x:0,z:0}), heading: 0 };
}
export function roadLength(points: Point[]) { return points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-points[i].x,p.z-points[i].z),0); }
export function distanceToRoad(p: Point, road: ArtRoad) {
  let best = Infinity;
  for (let i=1;i<road.points.length;i++) { const a=road.points[i-1], b=road.points[i], dx=b.x-a.x,dz=b.z-a.z; const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz || 1))); best=Math.min(best,Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz)); }
  return best;
}
export function makeTowers(roads: ArtRoad[], home: Point = {x:0,z:0}): Tower[] {
  const random=seeded(1026), towers: Tower[]=[];
  for (const road of roads) {
    const length=roadLength(road.points);
    for(let s=12;s<Math.min(length,850);s+=22+random()*9) {
      const p=roadSample(road.points,s);
      for(const side of [-1,1]) for(let row=0;row<2;row++) {
        const w=8+random()*10,d=9+random()*11,off=(road.width??11)/2+8+w*.6+row*27;
        const x=p.x+Math.cos(p.heading)*off*side,z=p.z-Math.sin(p.heading)*off*side;
        if(Math.hypot(x-home.x,z-home.z)<100 || roads.some(r=>distanceToRoad({x,z},r)<Math.max(w,d)*.7+(r.width??11)/2+2)) continue;
        if(towers.some(t=>Math.hypot(t.x-x,t.z-z)<(Math.max(w,d)+Math.max(t.w,t.d))*.55)) continue;
        towers.push({x,z,w,d,h:14+random()**1.6*66+row*9,rot:p.heading,color:road.color,seed:Math.floor(random()*1000)});
      }
    }
  }
  return towers;
}
export function previewRoads(): ArtRoad[] {
  const colors=[PALETTE.cyan,PALETTE.amber,PALETTE.violet,PALETTE.mint,'#ff9bb1','#91aeff'];
  const names=['Moving house','Work quarter','Later life','Everyday','Family district','New horizons'];
  const roads:ArtRoad[]=[{id:'everyday',name:'Everyday ring',color:PALETTE.amber,width:14,points:Array.from({length:97},(_,i)=>({x:Math.sin(i/96*Math.PI*2)*120,z:Math.cos(i/96*Math.PI*2)*120}))}];
  for(let i=0;i<6;i++){const a=i*Math.PI/3;roads.push({id:`preview-${i}`,name:names[i],color:colors[i],width:14,ghosts:i===0,points:Array.from({length:34},(_,j)=>{const d=120+j*18;return{x:Math.sin(a)*d+Math.cos(a)*Math.sin(j*.17)*12,z:Math.cos(a)*d-Math.sin(a)*Math.sin(j*.17)*12}})});}
  roads.push({id:'home-street',name:'Your block',color:PALETTE.cyan,width:14,points:[{x:0,z:-120},{x:0,z:120}]});
  roads.push({id:'market-mile',color:PALETTE.amber,width:12,points:[{x:-120,z:0},{x:120,z:0}]});
  return roads;
}
