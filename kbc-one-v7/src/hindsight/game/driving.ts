import { type CityNet, type Nearest, type Path, nearest, pointAt } from './network';

export interface Car { x:number; z:number; heading:number; speed:number; pathId?:string; laneS?:number; laneDirection?:number; junctionLock?:{x:number;z:number}; }
export interface Input { up:boolean; down:boolean; left:boolean; right:boolean; brake:boolean; }
export const NO_INPUT:Input={up:false,down:false,left:false,right:false,brake:false};
export interface DriveLimits { maxSpeed:number; throttle:number; }
export interface StepResult { car:Car; near:Nearest; scraped:boolean; }
const wrap=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
const arc=(n:Nearest)=>n.path.cum[n.seg]+n.t*(n.path.cum[n.seg+1]-n.path.cum[n.seg]);

/** Lane-following driving: direction input selects junctions, never steers into buildings. */
export function step(car:Car,input:Input,dt:number,net:CityNet,limits:DriveLimits):StepResult {
  let c={...car}; const duration=Math.min(Math.max(dt,0),1);
  const count=Math.max(1,Math.ceil(duration/.05));
  for(let frame=0;frame<count;frame++) {
    const d=duration/count;
    const current=net.paths.find(p=>p.id===c.pathId);
    const n=nearest(net,c.x,c.z,current?p=>p===current:undefined);
    let path=n.path,s=arc(n),direction=c.laneDirection??(Math.sin(c.heading)*n.tangent.x+Math.cos(c.heading)*n.tangent.z>=0?1:-1);
    let speed=c.speed;
    if(input.brake) speed-=Math.sign(speed)*Math.min(Math.abs(speed),60*d);
    else if(input.up) speed+=28*d;
    else if(input.down) speed-= (speed>0?55:20)*d;
    else speed*=Math.exp(-2*d);
    speed=Math.max(-12,Math.min(limits.maxSpeed*limits.throttle,speed));
    if(Math.abs(speed)<.05) speed=0;
    if(c.junctionLock&&Math.hypot(c.x-c.junctionLock.x,c.z-c.junctionLock.z)>13)c.junctionLock=undefined;
    if(!c.junctionLock && (input.left||input.right) && speed>=0) {
      const choices:{path:Path;s:number;direction:number;angle:number;distance:number}[]=[];
      for(const p of net.paths) if(p!==path) {
        const nn=nearest(net,c.x,c.z,q=>q===p),ps=arc(nn);
        if(nn.dist>5)continue;
        // A junction must be a physical endpoint of either path, not an overpass.
        if(ps>5&&ps<p.length-5&&s>5&&s<path.length-5)continue;
        for(const dir of [1,-1])if((dir===1&&ps<p.length-1)||(dir===-1&&ps>1)) {
          const angle=wrap(Math.atan2(nn.tangent.x*dir,nn.tangent.z*dir)-c.heading);
          if(input.left?angle<-.18&&angle>-2.8:angle>.18&&angle<2.8) choices.push({path:p,s:ps,direction:dir,angle,distance:nn.dist});
        }
      }
      choices.sort((a,b)=>a.distance-b.distance||Math.abs(a.angle)-Math.abs(b.angle));
      if(choices[0]) {const chosen=choices[0];path=chosen.path;s=chosen.s;direction=chosen.direction;c.junctionLock={x:c.x,z:c.z};}
    }
    s+=speed*d*direction;
    if(path.branch==='ring')s=(s%path.length+path.length)%path.length;
    else if(s<0||s>path.length) {
      const end=pointAt(path,s<0?0:path.length).p;
      const outward=direction*Math.sign(speed||1);
      const heading=c.heading+(speed<0?Math.PI:0);
      const choices:{path:Path;s:number;direction:number;angle:number}[]=[];
      for(const p of net.paths)if(p!==path){const nn=nearest(net,end.x,end.z,q=>q===p);if(nn.dist>.2)continue;const ps=arc(nn);for(const dir of [1,-1])if((dir>0&&ps<p.length-.1)||(dir<0&&ps>.1))choices.push({path:p,s:ps,direction:dir,angle:Math.abs(wrap(Math.atan2(nn.tangent.x*dir,nn.tangent.z*dir)-heading))});}
      choices.sort((a,b)=>a.angle-b.angle);
      if(choices[0]) {const choice=choices[0];path=choice.path;s=choice.s;direction=choice.direction*(speed<0?-1:1);c.junctionLock=end;}
      else {s=Math.max(0,Math.min(path.length,s));speed=0;}
    }
    const at=pointAt(path,s);
    c={...c,...at.p,heading:Math.atan2(at.tan.x*direction,at.tan.z*direction),speed,pathId:path.id,laneS:s,laneDirection:direction};
  }
  const near=nearest(net,c.x,c.z,p=>p.id===c.pathId);
  return {car:c,near,scraped:false};
}
