import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PEOPLE } from '../../one/people';
import { lifeOf } from '../../one/road';
import { roadmapFor } from '../../one/roadmap/model';
import { buildMapNetwork, gateFor, laneRoute } from './mapNetwork';
import { nearest, pointAt } from './network';
import { NO_INPUT, step, type Car } from './driving';
import { STREET_Z } from './streets';

for(const id of ['tom','karim','sofie','lina'])test(`${id}: every model checkpoint has a connected road and road-only tap route`,()=>{
  const map=roadmapFor(PEOPLE[id],{...lifeOf(PEOPLE[id]),plan:[]});const world=buildMapNetwork(map);
  assert.deepEqual(Object.keys(world.trackPaths).sort(),map.tracks.map(t=>t.id).sort());
  assert.equal(world.gates.length,map.tracks.reduce((sum,t)=>sum+t.stops.length,0));
  for(const gate of world.gates){const route=laneRoute(world.net,{x:-25,z:STREET_Z},gate.pos);assert.ok(route.length>1,gate.stop.id);assert.ok(Math.hypot(route.at(-1)!.x-gate.pos.x,route.at(-1)!.z-gate.pos.z)<.01);for(const p of route)assert.ok(nearest(world.net,p.x,p.z).dist<.1,`off road: ${gate.stop.id}`);}
  for(const track of map.tracks){const gates=world.gates.filter(g=>g.stop.trackId===track.id);for(let i=1;i<gates.length;i++)assert.ok(gates[i].s-gates[i-1].s>=15.9);}
  for(const fork of world.forks)for(const branch of fork.crossing.branches){const path=world.trackPaths[branch.trackId];assert.ok(path);assert.ok(Math.hypot(path.pts[0].x-fork.pos.x,path.pts[0].z-fork.pos.z)<.01);}
});
test('throttle follows curves exactly; steering away from a junction cannot leave the road',()=>{
  const map=roadmapFor(PEOPLE.karim,{...lifeOf(PEOPLE.karim),plan:[]}),{net,trackPaths}=buildMapNetwork(map);
  const path=trackPaths.freelance,at=pointAt(path,20);let car:Car={...at.p,heading:Math.atan2(at.tan.x,at.tan.z),speed:0};
  for(let i=0;i<300;i++){car=step(car,{...NO_INPUT,up:true,left:i%2===0,right:i%2!==0},1/60,net,{maxSpeed:38,throttle:1}).car;assert.ok(nearest(net,car.x,car.z).dist<.001);}
  assert.ok(car.laneS!>100);const moving=car.speed;
  for(let i=0;i<60;i++)car=step(car,{...NO_INPUT,brake:true},1/60,net,{maxSpeed:38,throttle:1}).car;
  assert.ok(moving>0);assert.equal(car.speed,0);
});
test('left/right actually select separate lanes at a model fork',()=>{
  const map=roadmapFor(PEOPLE.karim,{...lifeOf(PEOPLE.karim),plan:[]}),world=buildMapNetwork(map),fork=world.forks[0];
  const path=world.trackPaths[fork.crossing.trackId],at=pointAt(path,fork.s-2);
  const results=[];
  for(const direction of ['left','right'] as const){let car:Car={...at.p,heading:Math.atan2(at.tan.x,at.tan.z),speed:12};for(let i=0;i<60;i++)car=step(car,{...NO_INPUT,up:true,[direction]:true},1/60,world.net,{maxSpeed:24,throttle:1}).car;results.push(car.pathId);assert.ok(nearest(world.net,car.x,car.z).dist<.001);}
  assert.notEqual(results[0],results[1]);assert.ok(results.every(p=>fork.crossing.branches.some(b=>world.trackPaths[b.trackId].id===p)));
});

test("Sofie's appointment wins over the first-home start-marker alias",()=>{
  const map=roadmapFor(PEOPLE.sofie,{...lifeOf(PEOPLE.sofie),plan:[]}),world=buildMapNetwork(map);
  const gate=gateFor(world,"first-home");assert.equal(gate?.stop.id,"first-home");assert.equal(gate?.stop.trackId,"first-home");assert.ok(gate!.stop.actions.length>0);
  assert.equal(gateFor(world,"start:first-home")?.stop.trackId,"everyday");
});
