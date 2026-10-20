import { describe, expect, test } from 'bun:test';
import { worldFor } from '@/one/world';
import { districtNumbers, financeParts } from './FinanceBuildings';
import { PLOTS, districtPlots } from './layout';

describe('round 2 district geography and own progress',()=>{
 test('all district shorelines have visible water between them',()=>{
  const plots=Object.values(PLOTS);
  for(let a=0;a<plots.length;a++)for(let b=a+1;b<plots.length;b++){
   expect(Math.hypot(plots[a].x-plots[b].x,plots[a].z-plots[b].z)).toBeGreaterThan(44);
  }
 });
 test('owned harbour districts and locked islets stay separated at full unlock size',()=>{
  for(const persona of ['tom','karim','sofie','lina']){
   const plots=Object.values(districtPlots(worldFor(persona).areas));
   for(let a=0;a<plots.length;a++)for(let b=a+1;b<plots.length;b++){
    expect(Math.hypot(plots[a].x-plots[b].x,plots[a].z-plots[b].z)).toBeGreaterThan(64);
   }
  }
 });
 test('mortgage architecture follows finance, independent of lesson stage',()=>{
  const home=worldFor('karim').areas.find(a=>a.id==='home')!;
  const first=districtNumbers({...home,stage:0}),last=districtNumbers({...home,stage:4});
  expect(financeParts(first,'#ffffff')).toEqual(financeParts(last,'#ffffff'));
  expect(first.percent).toBe(home.finance.mortgage!.percent);
  const parts=financeParts(first,'#ffffff')!;
  expect(parts.detail.length).toBe(home.finance.mortgage!.paymentsMade);
 });
 test('missing rent history produces no invented payment bricks',()=>{
  const home=worldFor('tom').areas.find(a=>a.id==='home')!;
  expect(home.finance.rent!.paymentsMade).toBeNull();
  expect(financeParts(districtNumbers(home),'#ffffff')!.detail).toHaveLength(0);
 });
 test('goal tank inputs preserve each own goal, not combined wealth',()=>{
  const savings=worldFor('tom').areas.find(a=>a.id==='savings')!;
  expect(districtNumbers(savings).goals).toEqual(savings.finance.goals);
  expect(districtNumbers(savings).goals!.length).toBeGreaterThan(0);
 });
 test('pension and insurance attachments preserve nullable source facts',()=>{
  const world=worldFor('karim'),home=districtNumbers(world.areas.find(a=>a.id==='home')!),pension=districtNumbers(world.areas.find(a=>a.id==='pension')!);
  expect(home.insured).toBe(true);expect(home.foundation).toBe(true);
  expect(pension.years).toBeNull();expect(home.solar).toBeUndefined();
 });
});
