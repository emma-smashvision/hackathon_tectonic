/** Render-only geography. Progress and access always come from the world model. */
export type SceneArea = { id: string; name?: string; title?: string; stage: number; locked?: boolean; active?: boolean; lanterns?: number; lanternCount?: number; signposts?:readonly {id:string}[] };
export type SceneStorm = { id: string; areaId: string; prepared?: boolean; status?: string };
export type SceneWorld = { personaId?: string; areas: readonly SceneArea[]; storms?: readonly SceneStorm[] };
export type Plot = { x: number; z: number; color: string; kind: string };
export const PLOTS: Record<string, Plot> = {
 home:{x:-52,z:31,color:'#ffb86b',kind:'home'},
 car:{x:-20,z:93,color:'#5ee7ff',kind:'car'},
 family:{x:37,z:53,color:'#e7b0a0',kind:'family'},
 kids:{x:88,z:-74,color:'#a8d8ad',kind:'kids'},
 savings:{x:-60,z:-50,color:'#4ef0b0',kind:'savings'},
 investments:{x:46,z:-39,color:'#b6b4ea',kind:'investments'},
 pension:{x:37,z:-112,color:'#b49bff',kind:'pension'},
 work:{x:-101,z:-14,color:'#ff7bc8',kind:'work'},
 abroad:{x:-100,z:58,color:'#8eacdc',kind:'abroad'},
 'private-banking':{x:-14,z:-88,color:'#d3c39b',kind:'private-banking'},
 care:{x:95,z:13,color:'#a2c9ba',kind:'care'},
};
export function plotFor(id:string,index=0):Plot { return PLOTS[id]??PLOTS[id.replace('-garden','')]??{x:Math.cos(index*2.4)*62,z:Math.sin(index*2.4)*62,color:'#a4c5d8',kind:id}; }
export function growthStage(stage:number){ return Math.max(0,Math.min(4,Math.floor(Number.isFinite(stage)?stage:0))); }
export function isFogged(area:SceneArea){return area.locked===true||area.active===false;}
export function cameraTarget(focus:string|null|undefined){const p=focus?plotFor(focus):{x:0,z:0};return {x:p.x,z:p.z};}

export type DistrictPlot = Plot & { scale:number };
export type DistrictLayout = Record<string,DistrictPlot>;
/** Own places occupy the inner harbour; unexplored chapters remain small outer islets. */
export function districtPlots(areas:readonly SceneArea[]):DistrictLayout {
 const result:DistrictLayout={};
 const order=(area:SceneArea)=>{const p=plotFor(area.id);return Math.atan2(.576*p.x+.817*p.z,.817*p.x-.576*p.z);};
 const open=areas.filter(a=>!isFogged(a)).sort((a,b)=>order(a)-order(b));
 const locked=areas.filter(isFogged).sort((a,b)=>order(a)-order(b));
 const place=(list:readonly SceneArea[],radius:number,start:number,scale:number)=>list.forEach((area,i)=>{
  const angle=start+i/list.length*Math.PI*2,u=Math.cos(angle)*radius,v=Math.sin(angle)*radius;
  result[area.id]={...plotFor(area.id),x:.817*u+.576*v,z:-.576*u+.817*v,scale};
 });
 place(open,Math.max(75,open.length*11),-Math.PI*.75,1.6);
 place(locked,Math.max(153,open.length*11+75),-Math.PI*.87,.7);
 return result;
}
